// Hàm thuần của luồng đặt đơn → duyệt báo giá → đặt cọc (Flow 1). Khớp docs/PRD.md mục 2, 10, 11.
import {
  BORDER_WINDOW, CARRIER_DATA_FEE, CLEARANCE_DOC, CLASS_FACTOR, CREW_FEE_PER_DAY, DEPOSIT_RATE, DOCS_CUTOFF_HOUR, HORSE_DOC, HORSE_DOC_TYPES,
  BREED_INSURED_VALUE, INSURANCE_RATE_BOOKING, DELAY_ALERT_MINUTES, MAX_CONTINUOUS_HOURS, MIN_REST_MINUTES, QUOTE_VALID_HOURS, REFUND_RATE, TARGET_LEG_HOURS, SINGLE_STALL_FEE, VEHICLE_CLASS, type ClearanceDocType, type HorseDocType, type VehicleClass,
} from '../config/booking-rules'
import { DAY, HOUR, MIN_LEAD_DAYS } from '../config/business-rules'
import { COUNTRY_LOCATIONS, GATES, VET_POINTS } from '../config/network'
import { AVG_SPEED_KMH, BORDER_HOURS, DRIVE_HOURS_PER_DAY } from '../config/public-pricing'
import type { Vehicle } from '../services/mock/fleet'
import type { StaffMember } from '../services/mock/staff'
import type { Adjustment, Booking, Checkpoint, Clearance, HorseProfile, PlaceRef, Quote, QuoteLine, RestStop, RouteLeg, RoutePlan, VetPoint, WelfareLog } from '../types/booking'
import { atHour, dayKey, startOfDay } from './dates'
import { formatVND } from './format'
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
// Hạn nộp giấy cần thông tin của hệ thống: 18:00 ngày D-1
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
export const findLocation = (id: string) => Object.values(COUNTRY_LOCATIONS).flat().find(l => l.id === id)

export function routeKm(origin: PlaceRef, dest: PlaceRef, gate?: string) {
  const a = findLocation(origin.id)
  const b = findLocation(dest.id)
  if (!a || !b) return 0
  const g = gate ? GATES.find(x => x.name === gate) : undefined
  return roadKm(g ? haversineKm(a, g) + haversineKm(g, b) : haversineKm(a, b))
}
export const travelHours = (km: number, international: boolean) => km / AVG_SPEED_KMH + (international ? BORDER_HOURS : 0)
export const tripDays = (km: number, international: boolean) => Math.max(1, Math.ceil(travelHours(km, international) / DRIVE_HOURS_PER_DAY))

// ===== Báo giá (PRD mục 2.5) =====
const roundK = (n: number) => Math.round(n / 1000) * 1000
const insuredValue = (breed: string) => BREED_INSURED_VALUE[breed] ?? BREED_INSURED_VALUE['Khác']
export const insuranceFee = (breed: string) => roundK(insuredValue(breed) * INSURANCE_RATE_BOOKING)

type QuoteInput = Pick<Booking, 'type' | 'origin' | 'dest' | 'gate' | 'horses'>

export function quoteLines(b: QuoteInput, vehicle: Pick<Vehicle, 'capacity'>) {
  const international = b.type === 'international'
  const cls = vehicleClassOf(vehicle.capacity)
  const km = routeKm(b.origin, b.dest, b.gate)
  const days = tripDays(km, international)
  const singles = b.horses.filter(h => h.stall === 'single').length
  const insured = b.horses.filter(h => h.insurance.opted)
  const lines: QuoteLine[] = [
    { label: 'Cước vận chuyển nguyên chuyến', detail: `Xe ${VEHICLE_CLASS[cls].label} (${VEHICLE_CLASS[cls].stalls}) · ${km} km`, amount: roundK(truckCost(km, false) * CLASS_FACTOR[cls]) },
    { label: 'Nhân sự kỹ thuật (01 Driver + 01 Escort)', detail: `${days} ngày × ${formatVND(CREW_FEE_PER_DAY)}`, amount: days * CREW_FEE_PER_DAY },
    { label: 'Carrier Info Sheet & hỗ trợ thủ tục barie', detail: international ? 'Phí tiện ích mỗi chuyến' : 'Đã gồm trong cước', amount: international ? CARRIER_DATA_FEE.international : CARRIER_DATA_FEE.domestic },
  ]
  if (singles) lines.push({ label: 'Khoang đơn mở rộng', detail: `${singles} ngựa × ${formatVND(SINGLE_STALL_FEE)}`, amount: singles * SINGLE_STALL_FEE })
  if (insured.length) lines.push({ label: 'Bảo hiểm Động vật Sống', detail: `${insured.length} ngựa mua bảo hiểm`, amount: insured.reduce((t, h) => t + insuranceFee(h.breed), 0) })
  return { lines, km, days, cls }
}

export function finalizeQuote(lines: QuoteLine[], adjustments: Adjustment[], sentAt: number, sentBy: string, demurragePerHour: number): Quote {
  const subtotal = lines.reduce((t, l) => t + l.amount, 0)
  const total = Math.max(0, subtotal + adjustments.reduce((t, a) => t + a.amount, 0))
  return { lines, adjustments, subtotal, total, deposit: roundK(total * DEPOSIT_RATE), demurragePerHour, sentAt, expiresAt: sentAt + QUOTE_VALID_HOURS * HOUR, sentBy }
}

export const isQuoteExpired = (b: Pick<Booking, 'status' | 'quote'>, now = Date.now()) => b.status === 'awaiting_payment' && !!b.quote && now > b.quote.expiresAt

// ===== Cổng chuyển bước =====
// Cả thẩm định y tế và phương án xe được duyệt thì đơn mới sang Manager duyệt báo giá
export const reviewDone = (b: Pick<Booking, 'medical' | 'fleet'>) => b.medical?.status === 'approved' && !!b.fleet

// ===== Xe, nhân sự =====
// Đơn còn giữ xe và nhân sự: từ lúc thẩm định tới khi hoàn tất (các luồng sau thêm trạng thái vào đây)
export const HOLDING: Booking['status'][] = ['under_review', 'pending_commercial', 'awaiting_payment', 'awaiting_clearance_docs', 'documents_submitted', 'pending_resubmission', 'documentation_delayed', 'legal_docs_approved', 'dispatch_approved', 'route_planning', 'route_plan_completed', 'trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit']
// Xe đang được giữ cho đơn khác có ngày đi cách ngày này dưới 3 ngày
export function reservedVehicleIds(all: Booking[], departAt: number, exceptId?: string) {
  return new Set(all
    .filter(o => o.id !== exceptId && HOLDING.includes(o.status) && o.fleet && Math.abs(o.departAt - departAt) < 3 * DAY)
    .map(o => o.fleet!.vehicleId))
}

type Task = 'specialist' | 'coordinator'
// Số đơn người này đang phải làm (chưa xong phần việc của mình)
export const staffLoad = (staffId: string, task: Task, all: Booking[]) => all.filter(o =>
  o.status === 'under_review' && (task === 'specialist'
    ? o.intake?.specialist.id === staffId && o.medical?.status !== 'approved'
    : o.intake?.coordinator.id === staffId && !o.fleet)).length

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

// ===== Giấy tờ pháp lý (Flow 2, PRD mục 3.4 – 3.5) =====
export const blankClearance = (): Clearance => ({ options: { quarantine: false, ata: false, invoice: false }, docs: {} })

// Giấy khách phải nộp: Health Cert và PoA cho mọi chuyến; quốc tế thêm tờ khai hải quan và các giấy tùy chọn khách đã tick
export function requiredClearanceDocs(type: Booking['type'], options: Clearance['options']): ClearanceDocType[] {
  const all = Object.keys(CLEARANCE_DOC) as ClearanceDocType[]
  return all.filter(t => {
    const d = CLEARANCE_DOC[t]
    if (!d.international) return true
    return type === 'international' && (!d.option || options[d.option])
  })
}
export const missingClearanceDocs = (b: Pick<Booking, 'type'> & { clearance?: Clearance }) => {
  const c = b.clearance ?? blankClearance()
  return requiredClearanceDocs(b.type, c.options).filter(t => !c.docs[t])
}

export interface LegalCheck { id: string; doc: ClearanceDocType; label: string }
interface TeamForCheck { plate: string; driverName: string; driverId: string; escortName: string; escortId: string }

// Các điểm Specialist phải đối chiếu trên bộ hồ sơ khách nộp
export function legalChecks(b: Pick<Booking, 'type' | 'horses' | 'gate' | 'departAt' | 'clearance'>, team: TeamForCheck): LegalCheck[] {
  const c = b.clearance ?? blankClearance()
  const has = (t: ClearanceDocType) => !!c.docs[t]
  const chips = b.horses.map(h => h.microchip).join(', ')
  const out: LegalCheck[] = []
  if (has('health_cert')) out.push(
    { id: 'hc-chip', doc: 'health_cert', label: `Microchip trên Health Cert khớp ngựa trong đơn: ${chips}` },
    { id: 'hc-valid', doc: 'health_cert', label: 'Health Cert còn hạn đến hết ngày giao dự kiến, có mộc đỏ' },
  )
  if (has('customs_declaration')) out.push(
    { id: 'cd-plate', doc: 'customs_declaration', label: `Phương tiện vận chuyển trên tờ khai là biển số ${team.plate}` },
    { id: 'cd-gate', doc: 'customs_declaration', label: `Cửa khẩu trên tờ khai là ${b.gate ?? '—'}, khớp kế hoạch lộ trình` },
  )
  if (has('poa')) out.push({ id: 'poa-crew', doc: 'poa', label: `PoA ghi đúng ${team.driverName} (${team.driverId}) và ${team.escortName} (${team.escortId})` })
  if (has('quarantine_cert')) out.push({ id: 'qc-done', doc: 'quarantine_cert', label: 'Giấy cách ly xác nhận đã hoàn thành thời gian cách ly và còn hiệu lực' })
  if (has('ata_carnet')) out.push({ id: 'ata-info', doc: 'ata_carnet', label: `Thông tin xe ${team.plate} và tài xế ${team.driverName} khớp trên cuống sổ ATA Carnet` })
  if (has('commercial_invoice')) out.push({ id: 'inv-match', doc: 'commercial_invoice', label: 'Giá trị và thông tin trên hóa đơn thương mại khớp tờ khai hải quan' })
  return out
}

// Quá 18:00 ngày D-1 mà chưa nộp đủ: Documentation Delayed (PRD mục 3.7)
export const isDocsOverdue = (b: Pick<Booking, 'status' | 'departAt'>, now = Date.now()) =>
  (b.status === 'awaiting_clearance_docs' || b.status === 'pending_resubmission') && now > docsDueAt(b.departAt)

// ===== Lộ trình chi tiết (Flow 3, PRD mục 4.2) =====
const placeName = (n: string) => n.split(' — ')[0]
const MIN = 60_000

// Chia chặng đều nhau theo danh sách trạm nghỉ. Ngựa không đi liên tục quá 3–4 giờ.
export function layoutLegs(from: string, to: string, etd: number, rests: Pick<RestStop, 'name' | 'minutes'>[], driveHours: number): RouteLeg[] {
  const n = rests.length + 1
  const legMs = (driveHours / n) * 60 * MIN
  const names = [placeName(from), ...rests.map(r => r.name || `Trạm nghỉ ${rests.indexOf(r) + 1}`), placeName(to)]
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

// Phương án mặc định cho Coordinator chỉnh: chia chặng vừa đủ, mỗi trạm nghỉ 45 phút
export function buildRoutePlan(b: Pick<Booking, 'type' | 'origin' | 'dest' | 'gate'>, fleet: { etd: number; stops: string[] }): RoutePlan {
  const international = b.type === 'international'
  const driveHours = routeKm(b.origin, b.dest, b.gate) / AVG_SPEED_KMH
  const n = Math.max(1, Math.ceil(driveHours / TARGET_LEG_HOURS))
  const preset = fleet.stops.map(x => x.split(' — ')[0]).filter(Boolean)
  const rests: RestStop[] = Array.from({ length: n - 1 }, (_, i) => ({ afterLeg: i + 1, name: preset[i] ?? '', minutes: 45, facilities: 'Bóng mát, nguồn nước máy sạch' }))
  const legs = layoutLegs(b.origin.name, b.dest.name, fleet.etd, rests, driveHours)
  const area = (country: string) => VET_POINTS.filter(v => (country === 'VN' ? !/^\+/.test(v.phone) : /^\+/.test(v.phone)))
  const vets: VetPoint[] = [area('VN')[0], area(b.dest.country)[0]].filter(Boolean).filter((v, i, a) => a.findIndex(x => x.name === v.name) === i).map(v => ({ name: v.name, phone: v.phone, near: v.area }))
  return { legs, rests, vets, borderEta: international ? estimateBorderEta(legs) : undefined }
}

const minutesOfDay = (t: number) => new Date(t).getHours() * 60 + new Date(t).getMinutes()
export const borderOutsideWindow = (t: number) => minutesOfDay(t) < BORDER_WINDOW.open || minutesOfDay(t) > BORDER_WINDOW.close

// Kiểm tra quy tắc chia chặng: lỗi chặn hoàn tất; cảnh báo chuyển cho Manager xem như đề nghị ngoại lệ
export function validateRoutePlan(plan: Pick<RoutePlan, 'legs' | 'rests' | 'vets' | 'borderEta'>, international: boolean) {
  const errors: string[] = []
  const warnings: string[] = []
  plan.legs.forEach(l => {
    const h = (l.arriveAt - l.departAt) / (60 * MIN)
    if (h > MAX_CONTINUOUS_HOURS) errors.push(`Chặng ${l.no} đi liên tục ${h.toFixed(1)} giờ, vượt ${MAX_CONTINUOUS_HOURS} giờ. Thêm trạm nghỉ.`)
  })
  plan.rests.forEach((r, i) => {
    if (r.minutes < MIN_REST_MINUTES) errors.push(`Trạm nghỉ ${i + 1} chỉ ${r.minutes} phút, tối thiểu ${MIN_REST_MINUTES} phút.`)
    if (!r.name.trim()) errors.push(`Trạm nghỉ ${i + 1} chưa có tên.`)
  })
  if (!plan.vets.length) errors.push('Cần ít nhất một Trạm Thú y khẩn cấp dọc tuyến.')
  if (international) {
    if (!plan.borderEta) errors.push('Chưa có giờ dự kiến tới cửa khẩu.')
    else if (borderOutsideWindow(plan.borderEta)) warnings.push('ETA cửa khẩu ngoài khung 07:30–16:30, cần Manager phê duyệt ngoại lệ.')
  }
  return { errors, warnings }
}

// ===== Trip Manifest (PRD mục 4.3) =====
export const tripIdOf = (bookingId: string) => `TRP-${bookingId.slice(-4)}`

// Chứng từ nhà xe cấp cho tài xế mang theo, và bản gốc tài xế phải thu của khách tại điểm đón
export function manifestDocuments(b: Pick<Booking, 'type' | 'clearance'>) {
  const intl = b.type === 'international'
  const o = b.clearance?.options
  return {
    system: [
      'Bản in Lệnh điều vận chi tiết (Trip Manifest) có chữ ký duyệt',
      'Bản in Carrier Info Sheet chính thức',
      ...(intl ? ['Giấy phép vận tải liên vận quốc tế CLV / song phương (bản gốc kèm xe)'] : []),
      'Sổ đăng kiểm xe chuyên dụng và Bảo hiểm trách nhiệm dân sự còn hiệu lực',
      '02 bản "Biên bản Giao nhận Động vật sống & Chứng từ gốc" (ký tay với người gửi)',
      '02 bản "Biên bản Bàn giao & Hoàn tất chuyến đi" (ký tay với người nhận)',
    ],
    originals: [
      'Hộ chiếu ngựa bản gốc (FEI / National Passport)',
      'Giấy chứng nhận kiểm dịch động vật (Health Cert), bản gốc mộc đỏ',
      ...(intl ? ['Giấy phép nhập khẩu (Import Permit), bản gốc hoặc bản in có mã QR'] : []),
      'Phiếu xét nghiệm EIA/EVA, bản gốc kèm 02 bản sao công chứng',
      'Giấy ủy quyền áp tải (PoA), bản gốc có chữ ký và con dấu mộc đỏ của chủ ngựa',
      ...(o?.ata ? ['Sổ ATA Carnet bản gốc (diện tạm nhập, tái xuất)'] : []),
      ...(o?.invoice ? ['Hóa đơn thương mại, 03 đến 05 bản gốc ký tên, đóng dấu mộc'] : []),
    ],
  }
}

// ===== Hành trình thực tế (Flow 4, PRD mục 5) =====
// Các mốc check-in của chuyến: đón ngựa, từng trạm nghỉ, cửa khẩu và thông quan (quốc tế), giao ngựa
export function buildCheckpoints(b: Pick<Booking, 'type' | 'origin' | 'dest' | 'route' | 'gate'>): Checkpoint[] {
  const r = b.route
  if (!r) return []
  const place = (n: string) => n.split(' — ')[0]
  const rests: Checkpoint[] = r.rests.map((x, i) => ({ id: `rest-${i + 1}`, type: 'rest', label: `Dừng nghỉ xả cơ ${i + 1}`, place: x.name, plannedAt: r.legs[i]?.arriveAt ?? r.legs[0].departAt }))
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
export const currentCheckpoint = (b: Pick<Booking, 'trip'>) => b.trip?.checkpoints.find(c => !c.doneAt)
export const checkpointState = (cp: Checkpoint, current?: Checkpoint): 'done' | 'current' | 'locked' => (cp.doneAt ? 'done' : cp === current ? 'current' : 'locked')
// "In Transit - Leg N": số trạm nghỉ đã qua + 1
export const legNumber = (b: Pick<Booking, 'trip'>) => (b.trip?.checkpoints.filter(c => c.type === 'rest' && c.doneAt).length ?? 0) + 1

// Mốc chưa check-in mà đã quá giờ dự kiến từ 30 phút: Delayed Check-in cho Coordinator
export function delayedCheckpoint(b: Pick<Booking, 'trip' | 'status'>, now = Date.now()) {
  if (b.status !== 'in_transit') return undefined
  const cp = currentCheckpoint(b)
  const waiting = cp && !cp.arrivedAt && cp.type !== 'customs'
  return waiting && now - cp.plannedAt >= DELAY_ALERT_MINUTES * 60_000 ? cp : undefined
}
export const lastWelfare = (b: Pick<Booking, 'trip'>): WelfareLog | undefined => b.trip?.welfare[b.trip.welfare.length - 1]
export const needsAttention = (w?: WelfareLog) => !!w && w.condition !== 'normal'

// ===== Hủy đơn và hoàn cọc (PRD mục 8.3) =====
// Tính theo mốc thời gian thực lúc khách bấm Hủy: ≥ 7 ngày 80%, từ 3 đến dưới 7 ngày 50%, từ 72 giờ đến 18:00 D-1 20%, sau đó 0%. Bất khả kháng 70%.
export function refundOf(departAt: number, deposit: number, now = Date.now(), forceMajeure = false) {
  const daysLeft = (departAt - now) / 86_400_000
  const rate = forceMajeure ? REFUND_RATE.forceMajeure : daysLeft >= 7 ? REFUND_RATE.d7 : daysLeft >= 3 ? REFUND_RATE.d3 : now <= docsDueAt(departAt) ? REFUND_RATE.beforeCutoff : REFUND_RATE.afterCutoff
  const refund = roundK(deposit * rate)
  return { rate, refund, lost: deposit - refund }
}
// Còn hủy được khi xe chưa nhận ngựa. Sau thông quan hay trên đường thì xử lý theo ngoại lệ (mục 8.1).
export const CANCELLABLE: Booking['status'][] = ['pending_intake', 'under_review', 'pending_commercial', 'awaiting_payment', 'awaiting_clearance_docs', 'documents_submitted', 'pending_resubmission', 'documentation_delayed', 'legal_docs_approved', 'dispatch_approved', 'route_planning', 'route_plan_completed', 'trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup']
