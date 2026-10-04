// Hàm thuần của luồng đặt đơn → duyệt báo giá → đặt cọc (Flow 1). Khớp docs/PRD.md mục 2, 10, 11.
import {
  BORDER_WINDOW, CLEARANCE_DOC, CLEARANCE_FEE, CLASS_FACTOR, CREW_FEE_PER_DAY, DEPOSIT_RATE, DOCS_CUTOFF_HOUR, FUEL_BOT_PER_KM, FUEL_BUFFER_RATE, HORSE_DOC, HORSE_DOC_TYPES, MARGIN_RATE,
  BREED_INSURED_VALUE, INSURANCE_RATE_BOOKING, DELAY_ALERT_MINUTES, MAX_CONTINUOUS_HOURS, MIN_REST_MINUTES, QUOTE_VALID_HOURS, REFUND_RATE, TARGET_LEG_HOURS, SINGLE_STALL_FEE, VEHICLE_CLASS, EXPENSE_CATEGORY, type BookingStatus, type ClearanceDocType, type ExpenseCategory, type IncidentAction, type IncidentKind, type Payer, type HorseDocType, type VehicleClass,
} from '../config/booking-rules'
import { DAY, HOUR, MIN_LEAD_DAYS } from '../config/business-rules'
import { COUNTRY_LOCATIONS, GATES, PLACES, TRANSIT_STATIONS, type Gate } from '../config/network'
import { AVG_SPEED_KMH, BORDER_HOURS, DRIVE_HOURS_PER_DAY } from '../config/public-pricing'
import type { CrewMember, Vehicle } from '../services/mock/fleet'
import type { StaffMember } from '../services/mock/staff'
import type { Adjustment, Booking, BookingHorse, Checkpoint, Clearance, ClearanceItem, HorseProfile, PlaceRef, Quote, QuoteLine, SettlementItem, RestStop, RouteLeg, RoutePlan, TripRun, VehicleTrip, WelfareLog } from '../types/booking'
import { atHour, dayKey, startOfDay } from './dates'
import { haversineKm, roadKm, truckCost } from './pricing'

// ===== Ngày khởi hành =====
// Ngày sớm nhất được chọn: hôm nay + 30 ngày (00:00)
export function earliestDeparture(now = Date.now()) {
  const d = startOfDay(now)
  d.setDate(d.getDate() + MIN_LEAD_DAYS)
  return d.getTime()
}
export const toIsoDay = (t: number) => dayKey(new Date(t))
export const fromIsoDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime() }
export const isDepartureAllowed = (departAt: number, now = Date.now()) => departAt >= earliestDeparture(now)
// 18:00 ngày D-1: mốc cảnh báo giấy tờ chưa xong và mốc hoàn cọc
export const docsDueAt = (departAt: number) => atHour(new Date(departAt - DAY), DOCS_CUTOFF_HOUR)

// ===== Hồ sơ ngựa =====
// Đủ 3 giấy và còn hiệu lực tại mốc `at` (mặc định: hôm nay; khi đặt đơn: ngày khởi hành)
export function horseReadiness(h: HorseProfile, at = startOfDay(Date.now()).getTime()) {
  const missing: HorseDocType[] = HORSE_DOC_TYPES.filter(t => !h.docs[t])
  const expired: HorseDocType[] = HORSE_DOC_TYPES.filter(t => {
    const d = h.docs[t]
    return !!d && HORSE_DOC[t].hasExpiry && (d.expiresAt === undefined || d.expiresAt < at)
  })
  return { ok: !missing.length && !expired.length, missing, expired }
}

export const ageOf = (h: Pick<HorseProfile, 'birthYear'>, now = Date.now()) => new Date(now).getFullYear() - h.birthYear

// ===== Hạng xe =====
export const vehicleClassOf = (capacity: number): VehicleClass => (capacity <= VEHICLE_CLASS.light.maxStalls ? 'light' : capacity <= VEHICLE_CLASS.medium.maxStalls ? 'medium' : 'heavy')
// Hạng xe nhỏ nhất đủ chỗ cho số ngựa
export const classForHorses = (n: number): VehicleClass => vehicleClassOf(n)

// ===== Tuyến, quãng đường =====
// Điểm nhận / giao khi đặt đơn; bảng giá công khai còn nhận cả các thành phố trong PLACES
export const findLocation = (id: string) => Object.values(COUNTRY_LOCATIONS).flat().find(l => l.id === id) ?? PLACES.find(p => p.id === id)

export function routeKm(origin: PlaceRef, dest: PlaceRef, gate?: string) {
  const a = findLocation(origin.id)
  const b = findLocation(dest.id)
  if (!a || !b) return 0
  const g = gate ? GATES.find(x => x.name === gate) : undefined
  return roadKm(g ? haversineKm(a, g) + haversineKm(g, b) : haversineKm(a, b))
}
// Cửa khẩu Coordinator được chọn: của nước đến (hoặc nước đi nếu chiều về Việt Nam). Tuyến nội địa không có.
export function gatesFor(origin: PlaceRef, dest: PlaceRef): Gate[] {
  const country = dest.country !== 'VN' ? dest.country : origin.country
  return country === 'VN' ? [] : GATES.filter(g => g.country === country)
}
// Gợi ý cửa khẩu có tổng quãng đường ngắn nhất
export function suggestGate(origin: PlaceRef, dest: PlaceRef): string | undefined {
  const gates = gatesFor(origin, dest)
  return [...gates].sort((a, b) => routeKm(origin, dest, a.name) - routeKm(origin, dest, b.name))[0]?.name
}
// Gợi ý trạm trung chuyển: chia đều đường đi (điểm đón → cửa khẩu → điểm trả), mỗi điểm chia lấy trạm gần nhất chưa dùng
export function suggestTransitStations(origin: PlaceRef, dest: PlaceRef, gate: string | undefined, count: number): string[] {
  const a = findLocation(origin.id), b = findLocation(dest.id)
  if (!a || !b || count <= 0) return []
  const g = gate ? GATES.find(x => x.name === gate) : undefined
  const pts = g ? [a, g, b] : [a, b]
  const seg = pts.slice(1).map((p, i) => haversineKm(pts[i], p))
  const total = seg.reduce((t, x) => t + x, 0)
  const used = new Set<string>()
  return Array.from({ length: count }, (_, i) => {
    let d = (total * (i + 1)) / (count + 1)
    let k = 0
    while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++ }
    const f = seg[k] ? d / seg[k] : 0
    const at = { lat: pts[k].lat + (pts[k + 1].lat - pts[k].lat) * f, lng: pts[k].lng + (pts[k + 1].lng - pts[k].lng) * f }
    const best = TRANSIT_STATIONS.filter(s => !used.has(s.name)).sort((x, y) => haversineKm(at, x) - haversineKm(at, y))[0]
    used.add(best.name)
    return best.name
  })
}
export const travelHours = (km: number, international: boolean) => km / AVG_SPEED_KMH + (international ? BORDER_HOURS : 0)
export const tripDays = (km: number, international: boolean) => Math.max(1, Math.ceil(travelHours(km, international) / DRIVE_HOURS_PER_DAY))

// ===== Báo giá (PRD mục 2.5) =====
const roundK = (n: number) => Math.round(n / 1000) * 1000
const insuredValue = (breed: string) => BREED_INSURED_VALUE[breed] ?? BREED_INSURED_VALUE['Khác']
export const insuranceFee = (breed: string) => roundK(insuredValue(breed) * INSURANCE_RATE_BOOKING)

type QuoteInput = Pick<Booking, 'type' | 'origin' | 'dest' | 'gate' | 'horses'>

export function quoteLines(b: QuoteInput, vehicles: Pick<Vehicle, 'capacity'>[]) {
  const international = b.type === 'international'
  const km = routeKm(b.origin, b.dest, b.gate)
  const days = tripDays(km, international)
  const m = 1 + MARGIN_RATE
  const many = vehicles.length > 1
  const lines: QuoteLine[] = []
  vehicles.forEach((v, i) => {
    const cls = vehicleClassOf(v.capacity)
    const tag = many ? ` (xe ${i + 1}/${vehicles.length})` : ''
    lines.push(
      { label: `Cước vận chuyển nguyên chuyến${tag}`, detail: `Xe ${VEHICLE_CLASS[cls].label} (${VEHICLE_CLASS[cls].stalls}) · ${km} km`, amount: roundK(truckCost(km, false) * CLASS_FACTOR[cls] * m) },
      { label: `Nhân sự kỹ thuật, 01 tài xế + 01 hộ tống${tag}`, detail: `${days} ngày`, amount: roundK(days * CREW_FEE_PER_DAY * m) },
      { label: `Nhiên liệu và BOT${tag}`, detail: `Ước tính theo lộ trình ${km} km, đã gồm dự phòng`, amount: roundK(km * FUEL_BOT_PER_KM * (1 + FUEL_BUFFER_RATE) * m) },
    )
  })
  const singles = b.horses.filter(h => h.stall === 'single').length
  if (singles) lines.push({ label: 'Khoang đơn mở rộng', detail: `${singles} ngựa`, amount: singles * SINGLE_STALL_FEE })
  lines.push({ label: 'Thủ tục kiểm dịch và hải quan', detail: international ? 'Nhà xe làm trọn gói' : 'Nhà xe làm giấy kiểm dịch trong nước', amount: international ? CLEARANCE_FEE.international : CLEARANCE_FEE.domestic })
  const insured = b.horses.filter(h => h.insurance.opted)
  if (insured.length) lines.push({ label: 'Bảo hiểm Động vật Sống', detail: `${insured.length} ngựa mua bảo hiểm`, amount: insured.reduce((t, h) => t + insuranceFee(h.breed), 0) })
  return { lines, km, days }
}

// ===== Ước tính chi phí cho khách (Tra cứu cước / Bảng giá) =====
// Số xe ước tính theo số ngựa: ít xe nhất theo hạng xe (9, 6, 2 ngăn). Khi đặt thật, hệ thống tự gán theo đội xe rảnh.
export function capacitiesFor(n: number): number[] {
  const out: number[] = []
  let left = n
  const { light, medium, heavy } = VEHICLE_CLASS
  while (left > heavy.maxStalls) { out.push(heavy.maxStalls); left -= heavy.maxStalls }
  if (left > 0) out.push(left <= light.maxStalls ? light.maxStalls : left <= medium.maxStalls ? medium.maxStalls : heavy.maxStalls)
  return out
}

export interface EstimateHorse { breed: string; single: boolean; insured: boolean }
// Dùng đúng công thức báo giá thật (quoteLines, finalizeQuote); cửa khẩu lấy theo gợi ý tối ưu của nhà xe
export function estimateQuote(input: { origin: PlaceRef; dest: PlaceRef; horses: EstimateHorse[] }) {
  const gate = suggestGate(input.origin, input.dest)
  const vehicles = capacitiesFor(input.horses.length)
  const horses = input.horses.map((h, i): BookingHorse => ({
    horseId: `E${i}`, name: '', microchip: '', breed: h.breed, sex: 'gelding', stall: h.single ? 'single' : 'standard', targetTemp: 22, feeding: '', water: '', careNote: '', insurance: { opted: h.insured },
  }))
  const { lines, km, days } = quoteLines({ type: gate ? 'international' : 'domestic', origin: input.origin, dest: input.dest, gate, horses }, vehicles.map(capacity => ({ capacity })))
  const q = finalizeQuote(lines, [], 0, '')
  return { lines, km, days, gate, vehicles, hours: travelHours(km, !!gate), total: q.total, deposit: q.deposit, balance: q.balance }
}

export function finalizeQuote(lines: QuoteLine[], adjustments: Adjustment[], sentAt: number, sentBy: string): Quote {
  const subtotal = lines.reduce((t, l) => t + l.amount, 0)
  const total = Math.max(0, subtotal + adjustments.reduce((t, a) => t + a.amount, 0))
  const deposit = roundK(total * DEPOSIT_RATE)
  return { lines, adjustments, subtotal, total, deposit, balance: total - deposit, sentAt, expiresAt: sentAt + QUOTE_VALID_HOURS * HOUR, sentBy }
}

export const isQuoteExpired = (b: Pick<Booking, 'status' | 'quote'>, now = Date.now()) => b.status === 'awaiting_payment' && !!b.quote && now > b.quote.expiresAt

// ===== Cổng chuyển bước =====
// Cả thẩm định y tế và phương án xe + lộ trình được duyệt thì đơn mới sang Manager duyệt báo giá
export const reviewDone = (b: Pick<Booking, 'medical' | 'plan'>) => b.medical?.status === 'approved' && !!b.plan

// ===== Xe, nhân sự =====
// Đơn còn giữ xe và nhân sự: từ lúc thẩm định tới khi giao xong
export const HOLDING: Booking['status'][] = ['under_review', 'pending_commercial', 'awaiting_payment', 'waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'incident_reported', 'pending_emergency_approval', 'emergency_plan_active']
// Xe, tài xế và Escort đang được giữ cho đơn khác có ngày đi cách ngày này dưới 3 ngày
export function busyResources(all: Booking[], departAt: number, exceptId?: string) {
  const vehicles = new Set<string>()
  const crew = new Set<string>()
  all.filter(o => o.id !== exceptId && HOLDING.includes(o.status) && Math.abs(o.departAt - departAt) < 3 * DAY)
    .forEach(o => (o.trips ?? []).forEach(t => { vehicles.add(t.vehicleId); crew.add(t.driverId); crew.add(t.escortId) }))
  return { vehicles, crew }
}

// ===== Gán xe tự động (PRD mục 10.2) =====
export type AutoTrip = Pick<VehicleTrip, 'vehicleId' | 'driverId' | 'escortId' | 'horseIds'>
export interface AutoAssignResult { ok: boolean; reason?: string; trips: AutoTrip[] }

// Ít xe nhất; không xe nào đủ chỗ thì lấy các xe lớn nhất cho tới khi đủ chỗ, rồi chia đều (lần lượt từng ngựa, bỏ qua xe đã đầy).
// Xe phải có giấy đăng kiểm; tuyến quốc tế còn cần giấy phép liên vận (PRD mục 2.4)
export const vehicleDocsOk = (v: Pick<Vehicle, 'inspectionNo' | 'transitPermit'>, international: boolean) => !!v.inspectionNo && (!international || !!v.transitPermit)

export function autoAssign(horseIds: string[], vehicles: Vehicle[], crew: CrewMember[], busy: { vehicles: Set<string>; crew: Set<string> }, international = false): AutoAssignResult {
  const fail = (reason: string): AutoAssignResult => ({ ok: false, reason, trips: [] })
  const n = horseIds.length
  if (!n) return fail('Đơn chưa có ngựa.')
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
  const free = vehicles.filter(v => vehicleDocsOk(v, international) && !busy.vehicles.has(v.id))
  const drivers = crew.filter(c => c.role === 'driver' && !busy.crew.has(c.id)).sort(byId)
  const escorts = crew.filter(c => c.role === 'escort' && !busy.crew.has(c.id)).sort(byId)
  const single = [...free].filter(v => v.capacity >= n).sort((a, b) => a.capacity - b.capacity || byId(a, b))[0]
  const chosen: Vehicle[] = []
  if (single) chosen.push(single)
  else {
    let seats = 0
    for (const v of [...free].sort((a, b) => b.capacity - a.capacity || byId(a, b))) {
      chosen.push(v)
      seats += v.capacity
      if (seats >= n) break
    }
    if (seats < n) return fail(`Đội xe rảnh chỉ chở được ${seats}/${n} ngựa vào ngày này.`)
  }
  if (drivers.length < chosen.length) return fail(`Cần ${chosen.length} tài xế rảnh, hiện có ${drivers.length}.`)
  if (escorts.length < chosen.length) return fail(`Cần ${chosen.length} hộ tống rảnh, hiện có ${escorts.length}.`)
  const groups: string[][] = chosen.map(() => [])
  let i = 0
  for (const id of horseIds) {
    while (groups[i % chosen.length].length >= chosen[i % chosen.length].capacity) i++
    groups[i % chosen.length].push(id)
    i++
  }
  return { ok: true, trips: chosen.map((v, k) => ({ vehicleId: v.id, driverId: drivers[k].id, escortId: escorts[k].id, horseIds: groups[k] })) }
}

export const tripIdFor = (bookingId: string, index: number) => `TRP-${bookingId.slice(-4)}-${index}`
export const waybillNoOf = (bookingId: string) => `VD-${bookingId.slice(-4)}`

type Task = 'specialist' | 'coordinator'
// Số đơn người này đang phải làm (chưa xong phần việc của mình)
export const staffLoad = (staffId: string, task: Task, all: Booking[]) => all.filter(o =>
  o.status === 'under_review' && (task === 'specialist'
    ? o.intake?.specialist.id === staffId && o.medical?.status !== 'approved'
    : o.intake?.coordinator.id === staffId && !o.plan)).length

// Người đang làm việc, ít việc nhất lên đầu
export function suggestStaff(staff: StaffMember[], task: Task, all: Booking[]) {
  const role = task === 'specialist' ? 'inspector' : 'coordinator'
  return staff
    .filter(s => s.role === role && s.status === 'working')
    .map(s => ({ ...s, load: staffLoad(s.id, task, all) }))
    .sort((a, b) => a.load - b.load || a.id.localeCompare(b.id))
}

// ===== Mã đơn =====
export function nextBookingId(all: Pick<Booking, 'id'>[], year = new Date().getFullYear()) {
  const prefix = `ORD-${year}-`
  const max = Math.max(0, ...all.filter(o => o.id.startsWith(prefix)).map(o => Number(o.id.slice(prefix.length)) || 0))
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

// ===== Giấy tờ do Specialist làm (Flow 2, PRD mục 3) =====
export const defaultClearanceItems = (type: Booking['type']): ClearanceItem[] =>
  (Object.keys(CLEARANCE_DOC) as ClearanceDocType[])
    .filter(t => CLEARANCE_DOC[t].base && (type === 'international' || !CLEARANCE_DOC[t].international))
    .map(t => ({ type: t, status: 'todo', note: '', photos: [] }))
export const blankClearance = (type: Booking['type']): Clearance => ({ items: defaultClearanceItems(type), horsesCleared: [], flags: [] })
export const clearanceProgress = (c: Clearance) => ({ done: c.items.filter(i => i.status === 'done').length, total: c.items.length })

// Lý do chưa hoàn tất được (null = được)
export function canCompleteClearance(b: Pick<Booking, 'type' | 'horses' | 'clearance'>): string | null {
  const c = b.clearance
  if (!c) return 'Đơn chưa có danh sách giấy tờ.'
  const { done, total } = clearanceProgress(c)
  if (done < total) return `Còn ${total - done} hạng mục chưa xong.`
  if (b.type === 'international') {
    const missing = b.horses.filter(h => !c.horsesCleared.includes(h.horseId))
    if (missing.length) return `Chưa ghi nhận thông quan cho: ${missing.map(h => h.name).join(', ')}.`
  }
  return null
}

// Quá 18:00 ngày D-1 mà giấy tờ chưa xong: cảnh báo nội bộ cho Manager, không tính phí khách (PRD mục 3.4)
export const isClearanceOverdue = (b: Pick<Booking, 'status' | 'departAt'>, now = Date.now()) =>
  (b.status === 'waybill_issued' || b.status === 'clearance_in_progress') && now > docsDueAt(b.departAt)

// ===== Nhóm đơn cho khách (Đơn của tôi) =====
export type OrderGroup = 'new' | 'approved' | 'supplement' | 'moving' | 'settle' | 'closed' | 'done'
// Thứ tự hiển thị trên thanh dọc bên trái
export const ORDER_GROUPS: Record<OrderGroup, { label: string; icon: string; hint: string }> = {
  new: { label: 'Vừa đặt', icon: 'fa-paper-plane', hint: 'Đã gửi, đang chờ tiếp nhận, thẩm định và lập báo giá' },
  approved: { label: 'Đã duyệt', icon: 'fa-circle-check', hint: 'Đã có báo giá, đặt cọc, làm giấy tờ, chờ xe đón ngựa' },
  supplement: { label: 'Yêu cầu bổ sung', icon: 'fa-file-circle-exclamation', hint: 'Kiểm dịch viên cần bạn bổ sung hồ sơ ngựa' },
  moving: { label: 'Đang di chuyển', icon: 'fa-truck-fast', hint: 'Xe đang đến điểm đón hoặc đang chở ngựa' },
  settle: { label: 'Chờ quyết toán', icon: 'fa-receipt', hint: 'Ngựa đã giao, đang đối soát chi phí hoặc chờ bạn thanh toán và đánh giá' },
  closed: { label: 'Hết hạn / hủy / từ chối', icon: 'fa-ban', hint: 'Báo giá hết hạn, đơn đã hủy hoặc nhà xe từ chối đơn' },
  done: { label: 'Đã hoàn thành', icon: 'fa-flag-checkered', hint: 'Ngựa đã được giao' },
}
export function orderGroupOf(b: { status: BookingStatus; medical?: { status: string } }): OrderGroup {
  if (b.medical?.status === 'resubmit' && b.status === 'under_review') return 'supplement'
  switch (b.status) {
    case 'pending_intake': case 'under_review': case 'pending_commercial': return 'new'
    case 'awaiting_payment': case 'waybill_issued': case 'clearance_in_progress': case 'clearance_done': case 'ready_for_pickup': return 'approved'
    case 'en_route_to_pickup': case 'in_transit': case 'incident_reported': case 'pending_emergency_approval': case 'emergency_plan_active': return 'moving'
    case 'delivered_pending_settlement': case 'expenses_submitted': case 'settlement_issued': case 'payment_overdue': return 'settle'
    case 'completed': return 'done'
    case 'quote_expired': case 'cancelled': case 'rejected': return 'closed'
  }
}

// Tab của "Đơn hàng của tôi" (khách): mỗi đơn đúng một tab, xếp theo thứ tự các giai đoạn
export type OrderTab = 'confirm' | 'supplement' | 'pay' | 'prepare' | 'moving' | 'settle' | 'done' | 'closed'
export function orderTabOf(b: Pick<Booking, 'status' | 'medical' | 'balance' | 'settlement'>): OrderTab {
  switch (b.status) {
    case 'pending_intake': case 'under_review': return b.medical?.status === 'resubmit' && b.status === 'under_review' ? 'supplement' : 'confirm'
    case 'pending_commercial': return 'confirm'
    case 'awaiting_payment': return 'pay'
    case 'waybill_issued': case 'clearance_in_progress': case 'clearance_done': return 'prepare'
    case 'ready_for_pickup': return b.balance ? 'prepare' : 'pay'
    case 'en_route_to_pickup': return b.balance ? 'moving' : 'pay'
    case 'in_transit': case 'incident_reported': case 'pending_emergency_approval': case 'emergency_plan_active': return 'moving'
    case 'delivered_pending_settlement': case 'expenses_submitted': return 'settle'
    case 'settlement_issued': case 'payment_overdue': return b.settlement?.total ? 'pay' : 'settle'
    case 'completed': return 'done'
    case 'quote_expired': case 'cancelled': case 'rejected': return 'closed'
  }
}

// Cột của bảng Kanban trên trang Tổng quan của Manager: mỗi đơn đang chạy đúng một cột (đơn đã đóng không hiện)
export type BoardCol = 'intake' | 'review' | 'quote' | 'deposit' | 'prepare' | 'moving' | 'settle' | 'done'
export function managerBoardOf(s: BookingStatus): BoardCol | undefined {
  switch (s) {
    case 'pending_intake': return 'intake'
    case 'under_review': return 'review'
    case 'pending_commercial': return 'quote'
    case 'awaiting_payment': return 'deposit'
    case 'waybill_issued': case 'clearance_in_progress': case 'clearance_done': case 'ready_for_pickup': case 'en_route_to_pickup': return 'prepare'
    case 'in_transit': case 'incident_reported': case 'pending_emergency_approval': case 'emergency_plan_active': return 'moving'
    case 'delivered_pending_settlement': case 'expenses_submitted': case 'settlement_issued': case 'payment_overdue': return 'settle'
    case 'completed': return 'done'
    case 'quote_expired': case 'cancelled': case 'rejected': return undefined
  }
}

// Số đơn đang chờ Manager (menu và trang Tổng quan). `moving` chỉ để theo dõi, không phải việc cần xử lý.
export const managerCounts = (list: Pick<Booking, 'status' | 'incidents' | 'medical'>[]) => ({
  intake: list.filter(b => b.status === 'pending_intake').length,
  quote: list.filter(b => b.status === 'pending_commercial').length,
  incident: list.reduce((n, b) => n + (b.incidents ?? []).filter(i => i.status === 'pending_approval').length + (b.status === 'expenses_submitted' ? 1 : 0), 0),
  moving: list.filter(b => orderGroupOf(b) === 'moving').length,
})

// Nhóm Đã duyệt chia nhỏ theo việc khách cần làm về thanh toán
export type ApprovedSub = 'await_deposit' | 'deposited' | 'pay_at_pickup' | 'ready'
export const APPROVED_SUBS: Record<ApprovedSub, { label: string; icon: string; hint: string }> = {
  await_deposit: { label: 'Chờ đặt cọc', icon: 'fa-credit-card', hint: 'Bạn cần đặt cọc 30% trong 48 giờ để nhận vận đơn' },
  deposited: { label: 'Đã cọc, nhà xe chuẩn bị', icon: 'fa-file-signature', hint: 'Nhà xe làm giấy kiểm dịch, hải quan và chuẩn bị xe. Bạn không cần làm gì thêm' },
  pay_at_pickup: { label: 'Thanh toán lúc bốc ngựa', icon: 'fa-wallet', hint: 'Xe đã sẵn sàng. Trả 70% còn lại vào ngày bốc ngựa để xe được xuất bến' },
  ready: { label: 'Sẵn sàng đón ngựa', icon: 'fa-circle-check', hint: 'Đã thanh toán đủ. Chuẩn bị bản gốc hồ sơ ngựa để giao cho tài xế' },
}
export function approvedSubOf(b: { status: BookingStatus; balance?: unknown }): ApprovedSub | undefined {
  if (b.status === 'awaiting_payment') return 'await_deposit'
  if (b.status === 'waybill_issued' || b.status === 'clearance_in_progress' || b.status === 'clearance_done') return 'deposited'
  if (b.status === 'ready_for_pickup') return b.balance ? 'ready' : 'pay_at_pickup'
  return undefined
}

// ===== Trạng thái đơn suy từ các chuyến (PRD mục 13) =====
const DERIVED: BookingStatus[] = ['clearance_done', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'incident_reported', 'pending_emergency_approval', 'emergency_plan_active', 'delivered_pending_settlement']
export function deriveStatus(b: Pick<Booking, 'status' | 'trips' | 'clearance' | 'incidents'>): BookingStatus {
  if (!DERIVED.includes(b.status)) return b.status
  const trips = b.trips ?? []
  if (trips.length && trips.every(t => t.run?.deliveredAt)) return 'delivered_pending_settlement'
  const open = (b.incidents ?? []).filter(i => i.status !== 'resolved').map(i => i.status)
  if (open.includes('reported')) return 'incident_reported'
  if (open.includes('pending_approval')) return 'pending_emergency_approval'
  if (open.includes('active')) return 'emergency_plan_active'
  if (trips.some(t => t.run?.startedAt)) return 'in_transit'
  if (trips.some(t => t.departedAt)) return 'en_route_to_pickup'
  return trips.length && trips.every(t => t.acks.driver && t.acks.escort) ? 'ready_for_pickup' : 'clearance_done'
}

// ===== Lộ trình chi tiết (Flow 3, PRD mục 4.2) =====
const placeName = (n: string) => n.split(' — ')[0]
const MIN = 60_000

// Chia chặng đều nhau theo danh sách trạm trung chuyển. Ngựa không đi liên tục quá 3–4 giờ.
export function layoutLegs(from: string, to: string, etd: number, rests: Pick<RestStop, 'name' | 'minutes'>[], driveHours: number): RouteLeg[] {
  const n = rests.length + 1
  const legMs = (driveHours / n) * 60 * MIN
  const names = [placeName(from), ...rests.map(r => r.name || `Trạm trung chuyển ${rests.indexOf(r) + 1}`), placeName(to)]
  const legs: RouteLeg[] = []
  let t = etd
  for (let i = 0; i < n; i++) {
    legs.push({ no: i + 1, from: names[i], to: names[i + 1], departAt: Math.round(t), arriveAt: Math.round(t + legMs) })
    t += legMs + (rests[i]?.minutes ?? 0) * MIN
  }
  return legs
}

// Giờ xe tới cửa khẩu: ước lượng ở khoảng 60% hành trình
export function estimateBorderEta(legs: RouteLeg[]) {
  if (!legs.length) return undefined
  const start = legs[0].departAt, end = legs[legs.length - 1].arriveAt
  return Math.round(start + (end - start) * 0.6)
}

// Phương án mặc định cho Coordinator chỉnh: chia chặng vừa đủ, trạm trung chuyển gợi ý theo cửa khẩu, mỗi trạm dừng 45 phút
export function buildRoutePlan(b: Pick<Booking, 'type' | 'origin' | 'dest' | 'gate'>, etd: number): RoutePlan {
  const international = b.type === 'international'
  const driveHours = routeKm(b.origin, b.dest, b.gate) / AVG_SPEED_KMH
  const n = Math.max(1, Math.ceil(driveHours / TARGET_LEG_HOURS))
  const names = suggestTransitStations(b.origin, b.dest, b.gate, n - 1)
  const rests: RestStop[] = names.map((name, i) => ({ afterLeg: i + 1, name, minutes: 45, facilities: 'Bóng mát, nguồn nước máy sạch' }))
  const legs = layoutLegs(b.origin.name, b.dest.name, etd, rests, driveHours)
  return { legs, rests, borderEta: international ? estimateBorderEta(legs) : undefined }
}

const minutesOfDay = (t: number) => new Date(t).getHours() * 60 + new Date(t).getMinutes()
export const borderOutsideWindow = (t: number) => minutesOfDay(t) < BORDER_WINDOW.open || minutesOfDay(t) > BORDER_WINDOW.close

// Kiểm tra quy tắc chia chặng: lỗi chặn hoàn tất; cảnh báo chuyển cho Manager xem như đề nghị ngoại lệ
export function validateRoutePlan(plan: Pick<RoutePlan, 'legs' | 'rests' | 'borderEta'>, international: boolean) {
  const errors: string[] = []
  const warnings: string[] = []
  plan.legs.forEach(l => {
    const h = (l.arriveAt - l.departAt) / (60 * MIN)
    if (h > MAX_CONTINUOUS_HOURS) errors.push(`Chặng ${l.no} đi liên tục ${h.toFixed(1)} giờ, vượt ${MAX_CONTINUOUS_HOURS} giờ. Thêm trạm trung chuyển.`)
  })
  plan.rests.forEach((r, i) => {
    if (r.minutes < MIN_REST_MINUTES) errors.push(`Trạm trung chuyển ${i + 1} chỉ ${r.minutes} phút, tối thiểu ${MIN_REST_MINUTES} phút.`)
    if (!r.name.trim()) errors.push(`Trạm trung chuyển ${i + 1} chưa có tên.`)
  })
  if (international) {
    if (!plan.borderEta) errors.push('Chưa có giờ dự kiến tới cửa khẩu.')
    else if (borderOutsideWindow(plan.borderEta)) warnings.push('Giờ tới cửa khẩu ngoài khung 07:30–16:30, cần quản lý phê duyệt ngoại lệ.')
  }
  return { errors, warnings }
}

// ===== Lệnh điều xe (Trip Manifest, PRD mục 4.3) =====
// Chứng từ nhà xe cấp cho tài xế mang theo, và bản gốc tài xế phải thu của khách tại điểm đón
export function manifestDocuments(b: Pick<Booking, 'type'>) {
  const intl = b.type === 'international'
  return {
    system: [
      'Bản in Lệnh điều xe',
      'Vận đơn',
      'Giấy kiểm dịch, tờ khai, giấy ủy quyền áp tải nhà xe đã làm (bản in)',
      ...(intl ? ['Giấy phép vận tải liên vận quốc tế CLV / song phương (bản gốc kèm xe)'] : []),
      'Sổ đăng kiểm xe chuyên dụng và Bảo hiểm trách nhiệm dân sự còn hiệu lực',
      '02 bản "Biên bản Giao nhận Động vật sống & Chứng từ gốc" (ký tay với người gửi)',
      '02 bản "Biên bản Bàn giao & Hoàn tất chuyến đi" (ký tay với người nhận)',
    ],
    originals: [
      'Hộ chiếu ngựa bản gốc (FEI / National Passport)',
      'Sổ tiêm phòng',
      'Phiếu xét nghiệm EIA/EVA, bản gốc kèm 02 bản sao công chứng',
    ],
  }
}

// ===== Hành trình thực tế (Flow 4, PRD mục 5) =====
// Các mốc check-in của chuyến: đón ngựa, từng trạm trung chuyển, cửa khẩu và thông quan (quốc tế), giao ngựa
export function buildCheckpoints(b: Pick<Booking, 'type' | 'origin' | 'dest' | 'route' | 'gate'>): Checkpoint[] {
  const r = b.route
  if (!r) return []
  const place = (n: string) => n.split(' — ')[0]
  const rests: Checkpoint[] = r.rests.map((x, i) => ({ id: `rest-${i + 1}`, type: 'rest', label: `Trạm trung chuyển ${i + 1}`, place: x.name, plannedAt: r.legs[i]?.arriveAt ?? r.legs[0].departAt }))
  const mid: Checkpoint[] = [...rests]
  if (b.type === 'international' && r.borderEta) {
    mid.push({ id: 'border', type: 'border', label: 'Tới cửa khẩu', place: b.gate ?? 'Cửa khẩu', plannedAt: r.borderEta })
    mid.push({ id: 'customs', type: 'customs', label: 'Hoàn tất thông quan', place: b.gate ?? 'Cửa khẩu', plannedAt: r.borderEta + 90 * 60_000 })
  }
  mid.sort((x, y) => x.plannedAt - y.plannedAt || (x.type === 'border' ? -1 : 0))
  const last = r.legs[r.legs.length - 1]
  return [
    { id: 'pickup', type: 'pickup', label: 'Nhận ngựa tại điểm đón', place: place(b.origin.name), plannedAt: r.legs[0].departAt },
    ...mid,
    { id: 'delivery', type: 'delivery', label: 'Bàn giao tại điểm giao', place: place(b.dest.name), plannedAt: Math.max(last.arriveAt, (mid[mid.length - 1]?.plannedAt ?? 0) + 30 * 60_000) },
  ]
}

// Mốc đang chờ làm: mốc đầu tiên chưa hoàn tất
export const currentCheckpoint = (t: { run?: TripRun }) => t.run?.checkpoints.find(c => !c.doneAt)
export const checkpointState = (cp: Checkpoint, current?: Checkpoint): 'done' | 'current' | 'locked' => (cp.doneAt ? 'done' : cp === current ? 'current' : 'locked')
// Mốc nhỏ của bước Vận chuyển: các mốc (đón, trạm trung chuyển, cửa khẩu, giao) đã xong / tổng và mốc hiện tại
export function transitProgress(t: { run?: TripRun }): { done: number; total: number; current?: string } | undefined {
  const cps = t.run?.checkpoints
  if (!cps?.length) return undefined
  return { done: cps.filter(c => c.doneAt).length, total: cps.length, current: currentCheckpoint(t)?.label }
}
// "In Transit - Leg N": số trạm trung chuyển đã qua + 1
export const legNumber = (t: { run?: TripRun }) => (t.run?.checkpoints.filter(c => c.type === 'rest' && c.doneAt).length ?? 0) + 1

// Mốc chưa check-in mà đã quá giờ dự kiến từ 30 phút: Delayed Check-in cho Coordinator
export function delayedCheckpoint(t: { run?: TripRun }, now = Date.now()) {
  if (!t.run?.startedAt || t.run.deliveredAt) return undefined
  const cp = currentCheckpoint(t)
  const waiting = cp && !cp.arrivedAt && cp.type !== 'customs'
  return waiting && now - cp.plannedAt >= DELAY_ALERT_MINUTES * 60_000 ? cp : undefined
}
export const lastWelfare = (t: { run?: TripRun }): WelfareLog | undefined => t.run?.welfare[t.run.welfare.length - 1]
export const needsAttention = (w?: WelfareLog) => !!w && w.condition !== 'normal'

// ===== Hủy đơn và hoàn cọc (PRD mục 8.3) =====
// Tính theo mốc thời gian thực lúc khách bấm Hủy: ≥ 7 ngày 80%, từ 3 đến dưới 7 ngày 50%, từ 72 giờ đến 18:00 D-1 20%, sau đó 0%. Bất khả kháng 70%.
export function refundOf(departAt: number, deposit: number, now = Date.now(), forceMajeure = false) {
  const daysLeft = (departAt - now) / 86_400_000
  const rate = forceMajeure ? REFUND_RATE.forceMajeure : daysLeft >= 7 ? REFUND_RATE.d7 : daysLeft >= 3 ? REFUND_RATE.d3 : now <= docsDueAt(departAt) ? REFUND_RATE.beforeCutoff : REFUND_RATE.afterCutoff
  const refund = roundK(deposit * rate)
  return { rate, refund, lost: deposit - refund }
}
// Hủy đơn: hoàn cọc theo mốc cộng 100% số dư 70% nếu khách đã trả (PRD mục 8.3)
export function cancelRefund(departAt: number, deposit: number, balance: number, now = Date.now(), forceMajeure = false) {
  const d = refundOf(departAt, deposit, now, forceMajeure)
  return { rate: d.rate, depositRefund: d.refund, balanceRefund: balance, refund: d.refund + balance, lost: d.lost }
}
// Còn hủy được khi xe chưa nhận ngựa. Sau thông quan hay trên đường thì xử lý theo ngoại lệ (mục 8.1).
export const CANCELLABLE: Booking['status'][] = ['pending_intake', 'under_review', 'pending_commercial', 'awaiting_payment', 'waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup', 'en_route_to_pickup']

// ===== Sự cố và quyết toán (Flow 5, 6; PRD mục 6, 7, 11.5) =====
export const openIncidentOf = (b: Pick<Booking, 'incidents'>, tripId: string) => b.incidents?.find(i => i.tripId === tripId && i.status !== 'resolved')
// Ngựa thì khách chịu, vận chuyển thì nhà xe chịu; chuồng đệm do tắc cửa khẩu nhà xe chịu. Manager sửa được lúc đối soát.
export function defaultPayer(kind: IncidentKind, category: ExpenseCategory): Payer {
  if (kind === 'border_congestion') return 'carrier'
  return category === 'vet_fee' || category === 'medicine' || category === 'holding_stable' ? 'customer' : 'carrier'
}
export function incidentActionsFor(kind: IncidentKind): IncidentAction[] {
  return kind === 'horse_health' ? ['vet_clinic'] : kind === 'vehicle_breakdown' ? ['repair_on_site', 'rescue_van'] : ['holding_stable']
}
// Chỉ các khoản khách chịu vào bảng quyết toán
export function settlementOf(b: Pick<Booking, 'incidents'>): { items: SettlementItem[]; total: number } {
  const items = (b.incidents ?? []).flatMap(i => i.expenses).filter(e => e.payer === 'customer').map(e => ({ label: `${EXPENSE_CATEGORY[e.category]}: ${e.label}`, amount: e.amount, photo: e.photo }))
  return { items, total: items.reduce((n, i) => n + i.amount, 0) }
}
