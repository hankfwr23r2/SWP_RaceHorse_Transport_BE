import { describe, expect, it } from 'vitest'
import { DAY, HOUR } from '../config/business-rules'
import { BOOKING_STATUS, BOOKING_STEPS, stepOf, statusRank, type BookingStatus } from '../config/booking-rules'
import type { Incident, IncidentExpense } from '../types/booking'
import { COUNTRY_LOCATIONS, PLACES, TRANSIT_STATIONS } from '../config/network'
import type { CrewMember, Vehicle } from '../services/mock/fleet'
import type { StaffMember } from '../services/mock/staff'
import type { Booking, BookingHorse, HorseProfile, VehicleTrip } from '../types/booking'
import {
  autoAssign, transitProgress, defaultPayer, incidentActionsFor, settlementOf, approvedSubOf, APPROVED_SUBS, orderGroupOf, ORDER_GROUPS, capacitiesFor, estimateQuote, busyResources, buildRoutePlan, gatesFor, suggestGate, suggestTransitStations, canCompleteClearance, classForHorses, defaultClearanceItems, deriveStatus, docsDueAt, earliestDeparture, finalizeQuote, horseReadiness,
  cancelRefund, insuranceFee, isClearanceOverdue, isDepartureAllowed, isQuoteExpired, layoutLegs, manifestDocuments, nextBookingId, quoteLines, refundOf, reviewDone, routeKm, suggestStaff,
  findLocation, managerBoardOf, managerCounts, orderTabOf, tripIdFor, validateRoutePlan, vehicleClassOf, waybillNoOf,
} from './booking'

const NOW = new Date(2026, 9, 1, 10, 0).getTime() // 01/10/2026 10:00

const horse = (docs: HorseProfile['docs']): HorseProfile => ({ id: 'H1', owner: 'x', name: 'A', microchip: 'VN-1', breed: 'Thoroughbred', sex: 'mare', color: 'Nâu', birthYear: 2020, marks: '', docs, completedTrips: 0, createdAt: NOW })
const doc = (expiresAt?: number) => ({ fileName: 'f.pdf', uploadedAt: NOW, expiresAt })
const bh = (over: Partial<BookingHorse> = {}): BookingHorse => ({ horseId: 'H1', name: 'A', microchip: 'VN-1', breed: 'Thoroughbred', sex: 'mare', stall: 'standard', targetTemp: 22, feeding: '', water: '', careNote: '', insurance: { opted: false }, ...over })

describe('ngày khởi hành', () => {
  it('sớm nhất là hôm nay + 30 ngày', () => {
    expect(earliestDeparture(NOW)).toBe(new Date(2026, 9, 31).getTime()) // 01/10 + 30 ngày = 31/10, 00:00
  })
  it('chặn ngày trong vòng 30 ngày, cho phép từ ngày thứ 30', () => {
    expect(isDepartureAllowed(earliestDeparture(NOW) - DAY, NOW)).toBe(false)
    expect(isDepartureAllowed(earliestDeparture(NOW), NOW)).toBe(true)
  })
  it('hạn nộp giấy là 18:00 ngày D-1', () => {
    const departure = new Date(2026, 10, 15).getTime()
    const due = new Date(docsDueAt(departure))
    expect([due.getMonth(), due.getDate(), due.getHours(), due.getMinutes()]).toEqual([10, 14, 18, 0])
  })
})

describe('hồ sơ ngựa', () => {
  const future = NOW + 200 * DAY
  it('đủ 3 giấy còn hạn là sẵn sàng đặt', () => {
    expect(horseReadiness(horse({ passport: doc(), vaccine: doc(future), lab: doc(future) }), NOW).ok).toBe(true)
  })
  it('thiếu giấy hoặc hết hạn thì báo đúng giấy', () => {
    const r = horseReadiness(horse({ passport: doc(), vaccine: doc(NOW - DAY) }), NOW)
    expect(r.ok).toBe(false)
    expect(r.missing).toEqual(['lab'])
    expect(r.expired).toEqual(['vaccine'])
  })
  it('giấy hết hạn trước ngày khởi hành thì không đủ điều kiện', () => {
    const h = horse({ passport: doc(), vaccine: doc(NOW + 10 * DAY), lab: doc(NOW + 100 * DAY) })
    expect(horseReadiness(h, NOW).ok).toBe(true)
    expect(horseReadiness(h, NOW + 40 * DAY).expired).toEqual(['vaccine'])
  })
})

describe('hạng xe', () => {
  it('theo số ngăn', () => {
    expect([2, 4, 6, 9].map(vehicleClassOf)).toEqual(['light', 'medium', 'medium', 'heavy'])
  })
  it('hạng nhỏ nhất đủ chỗ cho số ngựa', () => {
    expect([1, 2, 3, 6, 7, 9].map(classForHorses)).toEqual(['light', 'light', 'medium', 'medium', 'heavy', 'heavy'])
  })
})

describe('báo giá', () => {
  const origin = { id: 'KHO-DN', name: 'Kho Đồng Nai', country: 'VN' as const }
  const dest = { id: 'KHO-PNH', name: 'Kho Phnom Penh', country: 'KH' as const }
  const base = { type: 'international' as const, origin, dest, gate: 'Mộc Bài – Bavet', horses: [bh({ stall: 'single', insurance: { opted: true } }), bh()] }

  it('tuyến quốc tế qua cửa khẩu dài hơn đi thẳng', () => {
    expect(routeKm(origin, dest, 'Mộc Bài – Bavet')).toBeGreaterThan(0)
    expect(routeKm(origin, dest, 'Tịnh Biên – Phnom Den')).not.toBe(routeKm(origin, dest, 'Mộc Bài – Bavet'))
  })
  const labels = (vs: { capacity: number }[], h = base.horses) => quoteLines({ ...base, horses: h }, vs).lines.map(l => l.label)
  it('có dòng khoang đơn và bảo hiểm khi khách chọn, không có khi không chọn', () => {
    expect(labels([{ capacity: 2 }])).toContain('Khoang đơn mở rộng')
    expect(labels([{ capacity: 2 }])).toContain('Bảo hiểm Động vật Sống')
    const plain = labels([{ capacity: 2 }], [bh(), bh()])
    expect(plain).not.toContain('Khoang đơn mở rộng')
    expect(plain).not.toContain('Bảo hiểm Động vật Sống')
  })
  it('phí bảo hiểm tính theo giống, giống lạ lấy mức "Khác"', () => {
    expect(insuranceFee('Thoroughbred')).toBe(20_000_000)
    expect(insuranceFee('Arabian')).toBe(16_000_000)
    expect(insuranceFee('Giống chưa có trong bảng')).toBe(insuranceFee('Khác'))
    const ins = quoteLines(base, [{ capacity: 2 }]).lines.find(l => l.label === 'Bảo hiểm Động vật Sống')
    expect(ins?.amount).toBe(insuranceFee('Thoroughbred'))
  })
  it('mỗi xe có cước, nhân sự, nhiên liệu và BOT; không có phí lưu xe hay Carrier Info Sheet', () => {
    const { lines } = quoteLines(base, [{ capacity: 2 }, { capacity: 4 }])
    expect(lines.filter(l => /^Cước/.test(l.label))).toHaveLength(2)
    expect(lines.filter(l => /^Nhân sự/.test(l.label))).toHaveLength(2)
    expect(lines.filter(l => /^Nhiên liệu/.test(l.label))).toHaveLength(2)
    expect(lines.some(l => /lưu xe|Carrier/i.test(l.label))).toBe(false)
    expect(lines.some(l => /thủ tục/i.test(l.label))).toBe(true)
  })
  it('nhiên liệu và BOT cộng dự phòng 5% và lợi nhuận 5% trên km của lộ trình', () => {
    const { lines, km } = quoteLines(base, [{ capacity: 2 }])
    const fuel = lines.find(l => /^Nhiên liệu/.test(l.label))!
    expect(fuel.amount).toBe(Math.round((km * 9_000 * 1.05 * 1.05) / 1000) * 1000)
  })
  it('đơn nội địa không thu phí thủ tục, quốc tế thu 300.000', () => {
    const fee = (q: Parameters<typeof quoteLines>[0]) => quoteLines(q, [{ capacity: 2 }]).lines.find(l => /thủ tục/i.test(l.label))!.amount
    expect(fee({ ...base, type: 'domestic', gate: undefined, dest: { id: 'CLB-SG', name: 'CLB', country: 'VN' } })).toBe(0)
    expect(fee(base)).toBe(300_000)
  })
  it('xe hạng cao hơn thì cước cao hơn', () => {
    const cost = (capacity: number) => quoteLines(base, [{ capacity }]).lines[0].amount
    expect(cost(4)).toBeGreaterThan(cost(2))
    expect(cost(9)).toBeGreaterThan(cost(4))
  })
  it('cọc 30%, số dư 70%, cộng lại đúng tổng; phụ phí và chiết khấu vào tổng', () => {
    const lines = [{ label: 'Cước', detail: '', amount: 10_000_000 }, { label: 'Nhân sự', detail: '', amount: 2_000_000 }]
    const q = finalizeQuote(lines, [{ label: 'Phụ phí', amount: 1_000_000 }, { label: 'Chiết khấu', amount: -3_000_000 }], NOW, 'Quản lý')
    expect(q.subtotal).toBe(12_000_000)
    expect(q.total).toBe(10_000_000)
    expect(q.deposit).toBe(3_000_000)
    expect(q.balance).toBe(7_000_000)
    expect(q.deposit + q.balance).toBe(q.total)
    expect(q.expiresAt - q.sentAt).toBe(48 * HOUR)
  })
  it('quá 48 giờ chưa đặt cọc thì hết hạn', () => {
    const q = finalizeQuote([{ label: 'x', detail: '', amount: 1_000_000 }], [], NOW, 'Quản lý')
    expect(isQuoteExpired({ status: 'awaiting_payment', quote: q }, NOW + 47 * HOUR)).toBe(false)
    expect(isQuoteExpired({ status: 'awaiting_payment', quote: q }, NOW + 49 * HOUR)).toBe(true)
    expect(isQuoteExpired({ status: 'waybill_issued', quote: q }, NOW + 49 * HOUR)).toBe(false)
  })
})

describe('cổng chuyển sang duyệt báo giá', () => {
  const plan = { at: NOW, by: 'x', note: '' }
  const medical = { status: 'approved' as const }
  it('cần cả y tế đạt và phương án xe, lộ trình đã xác nhận', () => {
    expect(reviewDone({ medical, plan })).toBe(true)
    expect(reviewDone({ medical, plan: undefined })).toBe(false)
    expect(reviewDone({ medical: { ...medical, status: 'pending' }, plan })).toBe(false)
    expect(reviewDone({ medical: { ...medical, status: 'resubmit' }, plan })).toBe(false)
  })
})

describe('xe và nhân sự', () => {
  const order = (id: string, over: Partial<Booking>): Booking => ({
    id, customer: 'x', createdAt: NOW, type: 'domestic', origin: { id: 'KHO-DN', name: '', country: 'VN' }, dest: { id: 'CLB-SG', name: '', country: 'VN' },
    departAt: NOW + 40 * DAY, consignor: { name: '', phone: '', idNumber: '', address: '' }, consignee: { name: '', phone: '', idNumber: '', address: '' },
    horses: [], status: 'under_review', history: [], ...over,
  })
  const staff: StaffMember[] = [
    { id: 'KD-01', name: 'A', phone: '', role: 'inspector', status: 'working', kpi: { late: 0, transferredOut: 0 } },
    { id: 'KD-02', name: 'B', phone: '', role: 'inspector', status: 'working', kpi: { late: 0, transferredOut: 0 } },
    { id: 'KD-03', name: 'C', phone: '', role: 'inspector', status: 'off', kpi: { late: 0, transferredOut: 0 } },
    { id: 'DP-01', name: 'D', phone: '', role: 'coordinator', status: 'working', kpi: { late: 0, transferredOut: 0 } },
  ]
  const intake = { at: NOW, by: 'M', specialist: { id: 'KD-01', name: 'A' }, coordinator: { id: 'DP-01', name: 'D' } }

  it('xe và nhân sự đã giữ cho đơn khác cùng ngày đi thì bận, ngày xa thì rảnh', () => {
    const trip = (vehicleId: string): VehicleTrip => ({ tripId: 't', vehicleId, driverId: `D-${vehicleId}`, escortId: `E-${vehicleId}`, horseIds: [], acks: {} })
    const all = [order('ORD-2026-0001', { trips: [trip('VH-002')] }), order('ORD-2026-0002', { trips: [trip('VH-003')], departAt: NOW + 80 * DAY })]
    const busy = busyResources(all, NOW + 41 * DAY)
    expect([...busy.vehicles]).toEqual(['VH-002'])
    expect([...busy.crew].sort()).toEqual(['D-VH-002', 'E-VH-002'])
    expect(busyResources(all, NOW + 41 * DAY, 'ORD-2026-0001').vehicles.size).toBe(0)
  })
  it('gợi ý người ít việc nhất, bỏ người đang nghỉ', () => {
    const all = [order('ORD-2026-0001', { intake }), order('ORD-2026-0002', { intake })]
    expect(suggestStaff(staff, 'specialist', all).map(s => s.id)).toEqual(['KD-02', 'KD-01'])
  })
  it('mã đơn tăng dần theo năm', () => {
    expect(nextBookingId([], 2026)).toBe('ORD-2026-0001')
    expect(nextBookingId([{ id: 'ORD-2026-0107' }, { id: 'ORD-2025-0900' }], 2026)).toBe('ORD-2026-0108')
  })
})

describe('gán xe tự động (PRD mục 10.2)', () => {
  const veh = (id: string, capacity: number, over: Partial<Vehicle> = {}): Vehicle => ({ id, name: id, type: 'x', capacity, plate: id, inspectionNo: `KD-${id}`, transitPermit: `CLV-${id}`, ...over })
  const esc = (id: string): CrewMember => ({ id, name: id, role: 'escort', phone: '0' })
  const drv = (id: string): CrewMember => ({ id, name: id, role: 'driver', phone: '0' })
  const drivers = [drv('D1'), drv('D2'), drv('D3')] // tài xế không gắn với xe
  const none = { vehicles: new Set<string>(), crew: new Set<string>() }
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `H${i + 1}`)

  it('một xe đủ chỗ thì dùng đúng một xe, chọn xe nhỏ nhất đủ chỗ', () => {
    const r = autoAssign(ids(2), [veh('A', 6), veh('B', 2), veh('C', 9)], [...drivers, esc('E1'), esc('E2')], none)
    expect(r.ok).toBe(true)
    expect(r.trips).toHaveLength(1)
    expect(r.trips[0]).toMatchObject({ vehicleId: 'B', driverId: 'D1', escortId: 'E1', horseIds: ['H1', 'H2'] })
  })
  it('6 ngựa, không còn xe 6 chỗ: chia đều 3 + 3 cho hai xe, mỗi xe một Escort riêng', () => {
    const r = autoAssign(ids(6), [veh('A', 4), veh('B', 4), veh('C', 2)], [...drivers, esc('E1'), esc('E2'), esc('E3')], none)
    expect(r.ok).toBe(true)
    expect(r.trips.map(t => t.horseIds.length)).toEqual([3, 3])
    expect(new Set(r.trips.map(t => t.escortId)).size).toBe(2)
  })
  it('không xe nào vượt sức chứa, không sót ngựa (1, 2, 9, 10 ngựa)', () => {
    const fleet = [veh('A', 6), veh('B', 6), veh('C', 2), veh('D', 9)]
    for (const n of [1, 2, 9, 10]) {
      const r = autoAssign(ids(n), fleet, [...drivers, esc('E1'), esc('E2'), esc('E3')], none)
      expect(r.ok, `n=${n}`).toBe(true)
      expect(r.trips.flatMap(t => t.horseIds).sort()).toEqual(ids(n).sort())
      r.trips.forEach(t => expect(t.horseIds.length).toBeLessThanOrEqual(fleet.find(v => v.id === t.vehicleId)!.capacity))
    }
  })
  it('xe thiếu giấy đăng kiểm, xe bận, tài xế bận, Escort bận đều bị loại', () => {
    const fleet = [veh('A', 2, { inspectionNo: '' }), veh('B', 2), veh('C', 2), veh('D', 2)]
    const r = autoAssign(ids(2), fleet, [...drivers, esc('E1'), esc('E2')], { vehicles: new Set(['B']), crew: new Set(['E1', 'D1']) })
    expect(r.trips[0]).toMatchObject({ vehicleId: 'C', driverId: 'D2', escortId: 'E2' })
  })
  it('thiếu tài xế rảnh thì báo lỗi dù còn xe', () => {
    const r = autoAssign(ids(5), [veh('A', 4), veh('B', 4)], [drv('D1'), esc('E1'), esc('E2')], none)
    expect(r).toMatchObject({ ok: false, trips: [] })
    expect(r.reason).toMatch(/tài xế/)
  })
  it('thiếu xe hoặc thiếu Escort thì báo lỗi và không gán', () => {
    expect(autoAssign(ids(5), [veh('A', 2), veh('B', 2)], [...drivers, esc('E1'), esc('E2')], none)).toMatchObject({ ok: false, trips: [] })
    expect(autoAssign(ids(4), [veh('A', 2), veh('B', 2)], [...drivers, esc('E1')], none)).toMatchObject({ ok: false, trips: [] })
    expect(autoAssign([], [veh('A', 2)], [...drivers, esc('E1')], none).ok).toBe(false)
  })
  it('xe thiếu giấy đăng kiểm bị loại; tuyến quốc tế còn cần giấy phép liên vận', () => {
    const fleet = [veh('A', 2, { inspectionNo: '' }), veh('B', 2, { transitPermit: '' }), veh('C', 2)]
    expect(autoAssign(ids(2), fleet, [...drivers, esc('E1')], none).trips[0].vehicleId).toBe('B')
    expect(autoAssign(ids(2), fleet, [...drivers, esc('E1')], none, true).trips[0].vehicleId).toBe('C')
    expect(autoAssign(ids(2), [veh('A', 2, { inspectionNo: '' })], [...drivers, esc('E1')], none).ok).toBe(false)
  })
  it('mã chuyến theo thứ tự xe, mã Vận đơn theo 4 số cuối mã đơn', () => {
    expect(tripIdFor('ORD-2026-0114', 2)).toBe('TRP-0114-2')
    expect(waybillNoOf('ORD-2026-0114')).toBe('VD-0114')
  })
})

describe('giấy tờ do Specialist làm (Flow 2)', () => {
  it('nội địa chỉ có giấy kiểm dịch và giấy ủy quyền; quốc tế thêm tờ khai và giấy phép nhập khẩu', () => {
    expect(defaultClearanceItems('domestic').map(i => i.type)).toEqual(['health_cert', 'poa'])
    expect(defaultClearanceItems('international').map(i => i.type)).toEqual(['health_cert', 'poa', 'customs_declaration', 'import_permit'])
  })
  it('chưa xong hạng mục hoặc thiếu cờ thông quan thì chưa hoàn tất được', () => {
    const items = defaultClearanceItems('international')
    const base = { type: 'international' as const, horses: [bh({ horseId: 'H1' }), bh({ horseId: 'H2' })] }
    expect(canCompleteClearance({ ...base, clearance: { items, horsesCleared: [], flags: [] } })).toMatch(/hạng mục/)
    const done = items.map(i => ({ ...i, status: 'done' as const }))
    expect(canCompleteClearance({ ...base, clearance: { items: done, horsesCleared: ['H1'], flags: [] } })).toMatch(/thông quan/)
    expect(canCompleteClearance({ ...base, clearance: { items: done, horsesCleared: ['H1', 'H2'], flags: [] } })).toBeNull()
  })
  it('nội địa không đòi cờ thông quan', () => {
    const done = defaultClearanceItems('domestic').map(i => ({ ...i, status: 'done' as const }))
    expect(canCompleteClearance({ type: 'domestic', horses: [bh()], clearance: { items: done, horsesCleared: [], flags: [] } })).toBeNull()
  })
  it('quá 18:00 D-1 mà giấy tờ chưa xong thì cảnh báo, xong rồi thì không', () => {
    const departAt = new Date(2026, 10, 15).getTime()
    const due = docsDueAt(departAt)
    expect(isClearanceOverdue({ status: 'clearance_in_progress', departAt }, due - HOUR)).toBe(false)
    expect(isClearanceOverdue({ status: 'clearance_in_progress', departAt }, due + HOUR)).toBe(true)
    expect(isClearanceOverdue({ status: 'waybill_issued', departAt }, due + HOUR)).toBe(true)
    expect(isClearanceOverdue({ status: 'clearance_done', departAt }, due + HOUR)).toBe(false)
  })
})

describe('trạng thái đơn suy từ các chuyến', () => {
  const trip = (n: number, over: Partial<VehicleTrip> = {}): VehicleTrip => ({ tripId: tripIdFor('ORD-2026-0150', n), vehicleId: `V${n}`, driverId: 'd', escortId: 'e', horseIds: [], acks: { driver: 1, escort: 1 }, ...over })
  const done = { items: [], horsesCleared: [], flags: [], doneAt: 1 }
  it('Ready for Pickup khi giấy xong và mọi xe đã nhận lệnh', () => {
    expect(deriveStatus({ status: 'clearance_done', clearance: done, trips: [trip(1), trip(2, { acks: { driver: 1 } })] })).toBe('clearance_done')
    expect(deriveStatus({ status: 'clearance_done', clearance: done, trips: [trip(1), trip(2)] })).toBe('ready_for_pickup')
  })
  it('có xe đi trước thì đơn đang đến điểm đón / đang vận chuyển; giao xong hết mới Delivered', () => {
    const base = { status: 'ready_for_pickup' as const, clearance: done }
    expect(deriveStatus({ ...base, trips: [trip(1, { departedAt: 1 }), trip(2)] })).toBe('en_route_to_pickup')
    expect(deriveStatus({ ...base, trips: [trip(1, { run: { checkpoints: [], welfare: [], startedAt: 1 } }), trip(2)] })).toBe('in_transit')
    const delivered = { checkpoints: [], welfare: [], startedAt: 1, deliveredAt: 2 }
    expect(deriveStatus({ ...base, trips: [trip(1, { run: delivered }), trip(2, { run: { ...delivered, deliveredAt: undefined } })] })).toBe('in_transit')
    expect(deriveStatus({ ...base, trips: [trip(1, { run: delivered }), trip(2, { run: delivered })] })).toBe('delivered_pending_settlement')
  })
  it('không đổi trạng thái ngoài các giai đoạn Flow 3–4', () => {
    expect(deriveStatus({ status: 'awaiting_payment', clearance: done, trips: [trip(1)] })).toBe('awaiting_payment')
  })
})

describe('lộ trình chi tiết (Flow 3)', () => {
  const etd = new Date(2026, 10, 20, 5, 0).getTime()
  it('chia chặng đều, mỗi chặng nối tiếp sau khi nghỉ', () => {
    const legs = layoutLegs('Kho Đồng Nai — x', 'Kho Phnom Penh — y', etd, [{ name: 'Trảng Bàng', minutes: 45 }], 6)
    expect(legs.map(l => [l.from, l.to])).toEqual([['Kho Đồng Nai', 'Trảng Bàng'], ['Trảng Bàng', 'Kho Phnom Penh']])
    expect(legs[0].arriveAt - legs[0].departAt).toBe(3 * 3_600_000)
    expect(legs[1].departAt - legs[0].arriveAt).toBe(45 * 60_000)
  })
  it('phương án mặc định hợp lệ: không chặng nào quá 4 giờ, có trạm thú y', () => {
    const origin = { id: 'KHO-DN', name: 'Kho Đồng Nai', country: 'VN' as const }
    const dest = { id: 'KHO-VTE', name: 'Kho Viêng Chăn', country: 'LA' as const }
    const plan = buildRoutePlan({ type: 'international', origin, dest, gate: 'Lao Bảo – Densavanh' }, etd)
    expect(plan.legs.length).toBeGreaterThan(1)
    expect(plan.rests.length).toBe(plan.legs.length - 1)
    expect('vets' in plan).toBe(false)
    plan.rests.forEach(r => expect(r.name, 'trạm trung chuyển có tên gợi ý').toBeTruthy())
    expect(validateRoutePlan(plan, true).errors).toEqual([])
  })
  it('chặng quá 4 giờ, nghỉ dưới 30 phút, thiếu trạm thú y đều bị chặn', () => {
    const legs = layoutLegs('A', 'B', etd, [], 5)
    const r = validateRoutePlan({ legs, rests: [{ afterLeg: 1, name: 'X', minutes: 20, facilities: '' }], borderEta: undefined }, false)
    expect(r.errors.join(' | ')).toMatch(/vượt 4 giờ/)
    expect(r.errors.join(' | ')).toMatch(/tối thiểu 30 phút/)
    expect(r.errors.join(' | ')).not.toMatch(/Thú y/)
  })
  it('ETA cửa khẩu ngoài 07:30–16:30 chỉ là cảnh báo, quốc tế mà thiếu ETA là lỗi', () => {
    const legs = layoutLegs('A', 'B', etd, [{ name: 'X', minutes: 45 }], 6)
    const base = { legs, rests: [{ afterLeg: 1, name: 'X', minutes: 45, facilities: '' }], }
    expect(validateRoutePlan({ ...base, borderEta: new Date(2026, 10, 20, 6, 10).getTime() }, true)).toMatchObject({ errors: [], warnings: [expect.stringContaining('07:30–16:30')] })
    expect(validateRoutePlan({ ...base, borderEta: new Date(2026, 10, 20, 9, 0).getTime() }, true).warnings).toEqual([])
    expect(validateRoutePlan({ ...base }, true).errors.length).toBe(1)
  })
  it('chứng từ gốc khách giao: hộ chiếu, sổ tiêm, xét nghiệm; bộ giấy nhà xe quốc tế dài hơn nội địa', () => {
    const none = manifestDocuments({ type: 'domestic' })
    const intl = manifestDocuments({ type: 'international' })
    expect(none.originals.join()).toMatch(/Hộ chiếu ngựa/)
    expect(none.originals.join()).toMatch(/Sổ tiêm/)
    expect(none.originals.join()).toMatch(/xét nghiệm/)
    expect(none.originals.join()).not.toMatch(/Import Permit|ATA|thương mại/)
    expect(intl.system.length).toBeGreaterThan(none.system.length)
  })
})

describe('hủy đơn và hoàn cọc (PRD mục 8.3)', () => {
  const departAt = new Date(2026, 10, 20).getTime()
  const at = (days: number, hour = 12) => new Date(2026, 10, 20 - days, hour).getTime()
  const r = (now: number, fm = false) => refundOf(departAt, 10_000_000, now, fm)
  it('từ 7 ngày trở lên: hoàn 80%', () => expect(r(at(8))).toMatchObject({ rate: 0.8, refund: 8_000_000, lost: 2_000_000 }))
  it('đúng 7 ngày vẫn tính mốc 80%', () => expect(r(departAt - 7 * DAY).rate).toBe(0.8))
  it('từ 3 đến dưới 7 ngày: hoàn 50%', () => { expect(r(at(5)).rate).toBe(0.5); expect(r(departAt - 3 * DAY).rate).toBe(0.5) })
  it('dưới 3 ngày đến 18:00 D-1: hoàn 20%', () => { expect(r(at(2)).rate).toBe(0.2); expect(r(at(1, 17)).rate).toBe(0.2) })
  it('sau 18:00 D-1 hoặc đúng ngày đi: không hoàn', () => { expect(r(at(1, 19)).rate).toBe(0); expect(r(at(0, 6)).rate).toBe(0) })
  it('bất khả kháng: hoàn 70% bất kể mốc', () => { expect(r(at(8), true).rate).toBe(0.7); expect(r(at(0, 6), true).refund).toBe(7_000_000) })
})

describe('hoàn tiền khi hủy gồm cả số dư đã trả', () => {
  const departAt = new Date(2026, 10, 20).getTime()
  const late = new Date(2026, 10, 19, 19).getTime() // sau 18:00 D-1: không hoàn cọc
  it('chưa trả số dư: hoàn đúng phần cọc theo mốc', () => {
    expect(cancelRefund(departAt, 3_000_000, 0, departAt - 8 * DAY)).toMatchObject({ rate: 0.8, depositRefund: 2_400_000, balanceRefund: 0, refund: 2_400_000, lost: 600_000 })
  })
  it('đã trả số dư: hoàn 100% số dư cộng cọc theo mốc, kể cả khi mất hết cọc', () => {
    expect(cancelRefund(departAt, 3_000_000, 7_000_000, late)).toMatchObject({ rate: 0, depositRefund: 0, balanceRefund: 7_000_000, refund: 7_000_000, lost: 3_000_000 })
  })
  it('bất khả kháng: hoàn 70% cọc cộng 100% số dư', () => {
    expect(cancelRefund(departAt, 3_000_000, 7_000_000, late, true).refund).toBe(2_100_000 + 7_000_000)
  })
})

describe('thứ tự trạng thái đơn', () => {
  it('đi theo luồng từ gửi đơn đến giao ngựa, đơn đã đóng xếp cuối', () => {
    const flow = ['pending_intake', 'under_review', 'pending_commercial', 'awaiting_payment', 'waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'incident_reported', 'pending_emergency_approval', 'emergency_plan_active', 'delivered_pending_settlement', 'expenses_submitted', 'settlement_issued', 'payment_overdue', 'completed', 'quote_expired', 'cancelled'] as const
    const ranks = flow.map(statusRank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(new Set(ranks.slice(0, 18)).size).toBe(18)
    expect(statusRank('quote_expired')).toBeGreaterThan(statusRank('delivered_pending_settlement'))
  })
})

describe('cửa khẩu và trạm trung chuyển do Coordinator lập', () => {
  const place = (id: string) => { const l = findLocation(id)!; return { id, name: l.name, country: (Object.keys(COUNTRY_LOCATIONS) as (keyof typeof COUNTRY_LOCATIONS)[]).find(c => COUNTRY_LOCATIONS[c].some(x => x.id === id))! } }
  const dn = place('KHO-DN'), pnh = place('KHO-PNH'), vte = place('KHO-VTE'), sg = place('CLB-SG')
  it('chỉ có cửa khẩu của nước đến; tuyến nội địa không có cửa khẩu', () => {
    expect(gatesFor(dn, pnh).map(g => g.country)).toEqual(['KH', 'KH'])
    expect(gatesFor(dn, vte).every(g => g.country === 'LA')).toBe(true)
    expect(gatesFor(pnh, dn).every(g => g.country === 'KH')).toBe(true)
    expect(gatesFor(dn, sg)).toEqual([])
    expect(suggestGate(dn, sg)).toBeUndefined()
  })
  it('gợi ý cửa khẩu có tổng quãng đường ngắn nhất', () => {
    for (const [o, d] of [[dn, pnh], [dn, vte], [pnh, dn]] as const) {
      const best = gatesFor(o, d).map(g => g.name).sort((a, b) => routeKm(o, d, a) - routeKm(o, d, b))[0]
      expect(suggestGate(o, d)).toBe(best)
    }
    expect(suggestGate(dn, pnh)).toBe('Mộc Bài – Bavet')
  })
  it('gợi ý đúng số trạm trung chuyển, không trùng tên, lấy từ danh mục', () => {
    const names = suggestTransitStations(dn, vte, 'Lao Bảo – Densavanh', 3)
    expect(names).toHaveLength(3)
    expect(new Set(names).size).toBe(3)
    names.forEach(n => expect(TRANSIT_STATIONS.some(t => t.name === n)).toBe(true))
    expect(suggestTransitStations(dn, sg, undefined, 0)).toEqual([])
  })
  it('đổi cửa khẩu thì lộ trình đổi theo (quãng đường và trạm gợi ý)', () => {
    const a = suggestTransitStations(dn, pnh, 'Mộc Bài – Bavet', 1)
    const b = suggestTransitStations(dn, pnh, 'Tịnh Biên – Phnom Den', 1)
    expect(a).not.toEqual(b)
  })
})

describe('ước tính chi phí cho khách (bảng giá) dùng công thức báo giá thật', () => {
  const loc = (id: string) => { const l = findLocation(id)!; return { id, name: l.name, country: (Object.keys(COUNTRY_LOCATIONS) as (keyof typeof COUNTRY_LOCATIONS)[]).find(c => COUNTRY_LOCATIONS[c].some(x => x.id === id))! } }
  const city = (id: string) => { const p = PLACES.find(x => x.id === id)!; return { id, name: p.name, country: p.country } }
  const horse = (over: Partial<{ breed: string; single: boolean; insured: boolean }> = {}) => ({ breed: 'Thoroughbred', single: false, insured: false, ...over })
  it('số xe ước tính theo số ngựa: ít xe nhất, đủ chỗ', () => {
    expect([1, 2].map(n => capacitiesFor(n))).toEqual([[2], [2]])
    expect([3, 6].map(n => capacitiesFor(n))).toEqual([[6], [6]])
    expect([7, 9].map(n => capacitiesFor(n))).toEqual([[9], [9]])
    expect(capacitiesFor(10)).toEqual([9, 2])
    for (let n = 1; n <= 20; n++) expect(capacitiesFor(n).reduce((t, c) => t + c, 0)).toBeGreaterThanOrEqual(n)
  })
  it('đúng bằng báo giá thật: cùng dòng phí, cọc 30%, số dư 70%', () => {
    const o = loc('KHO-DN'), d = loc('CLB-SG')
    const e = estimateQuote({ origin: o, dest: d, horses: [horse({ single: true }), horse({ insured: true, breed: 'Arabian' })] })
    const direct = quoteLines({ type: 'domestic', origin: o, dest: d, gate: undefined, horses: [bh({ stall: 'single' }), bh({ insurance: { opted: true }, breed: 'Arabian' })] }, [{ capacity: 2 }])
    expect(e.lines).toEqual(direct.lines)
    expect(e.total).toBe(direct.lines.reduce((t, l) => t + l.amount, 0))
    expect(e.deposit + e.balance).toBe(e.total)
    expect(e.deposit).toBe(Math.round(e.total * 0.3 / 1000) * 1000)
    expect(e.gate).toBeUndefined()
    expect(e.vehicles).toEqual([2])
  })
  it('nhận cả các thành phố trên trang chủ: tuyến quốc tế có cửa khẩu tối ưu, phí thủ tục 300.000, quãng đường lớn hơn 0', () => {
    const a = estimateQuote({ origin: city('dni'), dest: city('pnh'), horses: [horse()] })
    expect(a.gate).toBe('Mộc Bài – Bavet')
    expect(a.km).toBeGreaterThan(0)
    expect(a.lines.some(l => /thủ tục/i.test(l.label) && l.amount === 300_000)).toBe(true)
    const b = estimateQuote({ origin: city('hcm'), dest: city('dn'), horses: [horse()] })
    expect(b.gate).toBeUndefined()
    expect(b.km).toBeGreaterThan(500)
  })
  it('nhiều ngựa thì nhiều xe, đắt hơn; thêm khoang đơn và bảo hiểm thì đắt hơn', () => {
    const base = estimateQuote({ origin: city('dni'), dest: city('pnh'), horses: Array.from({ length: 3 }, () => horse()) })
    const many = estimateQuote({ origin: city('dni'), dest: city('pnh'), horses: Array.from({ length: 10 }, () => horse()) })
    expect(many.vehicles).toEqual([9, 2])
    expect(many.total).toBeGreaterThan(base.total)
    const extras = estimateQuote({ origin: city('dni'), dest: city('pnh'), horses: Array.from({ length: 3 }, () => horse({ single: true, insured: true })) })
    expect(extras.total).toBeGreaterThan(base.total)
  })
})

describe('phân nhóm đơn cho khách (Đơn của tôi)', () => {
  it('mọi trạng thái thuộc đúng một nhóm có sẵn', () => {
    for (const st of Object.keys(BOOKING_STATUS) as BookingStatus[]) expect(Object.keys(ORDER_GROUPS), st).toContain(orderGroupOf({ status: st }))
  })
  it('vừa đặt, đã duyệt, đang di chuyển, hoàn thành, đóng', () => {
    const g = (status: BookingStatus) => orderGroupOf({ status })
    expect(['pending_intake', 'under_review', 'pending_commercial'].map(x => g(x as BookingStatus))).toEqual(['new', 'new', 'new'])
    expect(['awaiting_payment', 'waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup'].map(x => g(x as BookingStatus))).toEqual(Array(5).fill('approved'))
    expect(['en_route_to_pickup', 'in_transit'].map(x => g(x as BookingStatus))).toEqual(['moving', 'moving'])
    expect(['delivered_pending_settlement', 'expenses_submitted', 'settlement_issued', 'payment_overdue'].map(x => g(x as BookingStatus))).toEqual(Array(4).fill('settle'))
    expect(g('completed')).toBe('done')
    expect(['incident_reported', 'pending_emergency_approval', 'emergency_plan_active'].map(x => g(x as BookingStatus))).toEqual(Array(3).fill('moving'))
    expect(['quote_expired', 'cancelled'].map(x => g(x as BookingStatus))).toEqual(['closed', 'closed'])
  })
  it('đơn đang thẩm định mà Kiểm dịch viên yêu cầu bổ sung hồ sơ thì thuộc nhóm yêu cầu bổ sung', () => {
    expect(orderGroupOf({ status: 'under_review', medical: { status: 'resubmit' } })).toBe('supplement')
    expect(orderGroupOf({ status: 'under_review', medical: { status: 'pending' } })).toBe('new')
  })
})

describe('mục nhỏ trong nhóm Đã duyệt', () => {
  const sub = (status: BookingStatus, balance?: object) => approvedSubOf({ status, balance })
  it('chưa cọc, đã cọc, cần thanh toán lúc bốc ngựa, sẵn sàng đón', () => {
    expect(sub('awaiting_payment')).toBe('await_deposit')
    expect(['waybill_issued', 'clearance_in_progress', 'clearance_done'].map(x => sub(x as BookingStatus))).toEqual(Array(3).fill('deposited'))
    expect(sub('ready_for_pickup')).toBe('pay_at_pickup')
    expect(sub('ready_for_pickup', { amount: 1 })).toBe('ready')
  })
  it('mọi trạng thái của nhóm Đã duyệt có mục nhỏ; trạng thái khác thì không', () => {
    for (const st of Object.keys(BOOKING_STATUS) as BookingStatus[]) {
      const inGroup = orderGroupOf({ status: st }) === 'approved'
      expect(approvedSubOf({ status: st }) !== undefined, st).toBe(inGroup)
      if (inGroup) expect(Object.keys(APPROVED_SUBS)).toContain(approvedSubOf({ status: st }))
    }
  })
})

const inc = (status: Incident['status'], over: Partial<Incident> = {}): Incident => ({ id: 'INC-1', tripId: 'T1', kind: 'horse_health', reportedBy: 'x', reportedAt: 1, photo: 'a.jpg', note: '', status, expenses: [], ...over })
const exp = (amount: number, payer: IncidentExpense['payer'], over: Partial<IncidentExpense> = {}): IncidentExpense => ({ id: `E${amount}`, category: 'vet_fee', label: 'x', photo: 'p.jpg', amount, payer, at: 1, by: 'x', ...over })

describe('trạng thái đơn khi có sự cố (Flow 5)', () => {
  const trip = { tripId: 'T1', vehicleId: 'V', driverId: 'd', escortId: 'e', horseIds: [], acks: { driver: 1, escort: 1 }, run: { checkpoints: [], welfare: [], startedAt: 1 } }
  const done = { items: [], horsesCleared: [], flags: [], doneAt: 1 }
  const st = (incidents: Incident[], status: BookingStatus = 'in_transit') => deriveStatus({ status, trips: [trip], clearance: done, incidents })
  it('không có sự cố mở thì đang vận chuyển; có thì theo mức cần xử lý gấp nhất', () => {
    expect(st([])).toBe('in_transit')
    expect(st([inc('reported')])).toBe('incident_reported')
    expect(st([inc('pending_approval')])).toBe('pending_emergency_approval')
    expect(st([inc('active')])).toBe('emergency_plan_active')
    expect(st([inc('active'), inc('reported', { id: 'INC-2' })])).toBe('incident_reported')
    expect(st([inc('resolved')])).toBe('in_transit')
  })
  it('sự cố xử lý xong thì đơn về lại các trạng thái bình thường, kể cả khi đang ở trạng thái sự cố', () => {
    expect(st([inc('resolved')], 'emergency_plan_active')).toBe('in_transit')
  })
  it('đơn đã giao xong thì trạng thái giao xong, không bị kéo lại bởi sự cố đã xử lý', () => {
    const delivered = { ...trip, run: { checkpoints: [], welfare: [], startedAt: 1, deliveredAt: 2 } }
    expect(deriveStatus({ status: 'in_transit', trips: [delivered], clearance: done, incidents: [inc('resolved')] })).toBe('delivered_pending_settlement')
  })
})

describe('chi phí sự cố và quyết toán (PRD 11.5, Flow 6)', () => {
  it('bên chịu mặc định: ngựa thì khách, vận chuyển thì nhà xe, chuồng đệm khi tắc cửa khẩu thì nhà xe', () => {
    expect(defaultPayer('horse_health', 'vet_fee')).toBe('customer')
    expect(defaultPayer('horse_health', 'medicine')).toBe('customer')
    expect(defaultPayer('vehicle_breakdown', 'rescue')).toBe('carrier')
    expect(defaultPayer('vehicle_breakdown', 'repair')).toBe('carrier')
    expect(defaultPayer('horse_health', 'holding_stable')).toBe('customer')
    expect(defaultPayer('border_congestion', 'holding_stable')).toBe('carrier')
    expect(defaultPayer('border_congestion', 'medicine')).toBe('carrier') // tắc cửa khẩu: nhà xe chịu toàn bộ (PRD 11.5)
    expect(defaultPayer('vehicle_breakdown', 'other')).toBe('carrier')
  })
  it('phương án hợp lệ theo nhóm sự cố', () => {
    expect(incidentActionsFor('horse_health')).toEqual(['vet_clinic'])
    expect(incidentActionsFor('vehicle_breakdown')).toEqual(['repair_on_site', 'rescue_van'])
    expect(incidentActionsFor('border_congestion')).toEqual(['holding_stable'])
  })
  it('bảng quyết toán chỉ gồm khoản khách chịu, tổng đúng; không có khoản nào thì 0 đồng', () => {
    const b = { incidents: [inc('resolved', { expenses: [exp(1_000_000, 'customer'), exp(500_000, 'carrier'), exp(300_000, 'customer')] })] }
    const sheet = settlementOf(b)
    expect(sheet.items.map(i => i.amount)).toEqual([1_000_000, 300_000])
    expect(sheet.total).toBe(1_300_000)
    expect(settlementOf({ incidents: [] }).total).toBe(0)
    expect(settlementOf({}).items).toEqual([])
  })
})

describe('bước tiến độ khớp quy trình', () => {
  const at = (s: BookingStatus) => BOOKING_STEPS[stepOf(s)]
  it('mỗi trạng thái nằm đúng bước của Flow', () => {
    expect(['pending_intake', 'under_review', 'pending_commercial', 'awaiting_payment'].map(x => at(x as BookingStatus))).toEqual(['Gửi đơn', 'Thẩm định', 'Báo giá', 'Đặt cọc'])
    expect(['waybill_issued', 'clearance_in_progress'].map(x => at(x as BookingStatus))).toEqual(['Giấy tờ', 'Giấy tờ'])
    expect(['clearance_done', 'ready_for_pickup', 'en_route_to_pickup'].map(x => at(x as BookingStatus))).toEqual(Array(3).fill('Sẵn sàng'))
    expect(['in_transit', 'incident_reported', 'pending_emergency_approval', 'emergency_plan_active'].map(x => at(x as BookingStatus))).toEqual(Array(4).fill('Vận chuyển'))
    expect(['delivered_pending_settlement', 'expenses_submitted', 'settlement_issued', 'payment_overdue'].map(x => at(x as BookingStatus))).toEqual(Array(4).fill('Quyết toán'))
  })
  it('đơn hoàn tất qua hết mọi bước', () => { expect(stepOf('completed')).toBe(BOOKING_STEPS.length) })
  it('trạm dừng chân chỉ là mốc nhỏ của bước Vận chuyển', () => {
    const cp = (id: string, type: string, doneAt?: number) => ({ id, type, label: id, place: id, plannedAt: 0, doneAt })
    const run = { checkpoints: [cp('pickup', 'pickup', 1), cp('rest-1', 'rest', 2), cp('delivery', 'delivery')], welfare: [] }
    expect(transitProgress({ run } as never)).toEqual({ done: 2, total: 3, current: 'delivery' })
    expect(transitProgress({} as never)).toBeUndefined()
  })
})

describe('managerCounts', () => {
  it('đếm đơn chờ tiếp nhận, chờ duyệt giá, sự cố và xe đang chạy', () => {
    const inc = (status: string) => ({ status }) as Incident
    const n = managerCounts([
      { status: 'pending_intake' }, { status: 'pending_commercial' }, { status: 'pending_commercial' },
      { status: 'in_transit', incidents: [inc('pending_approval'), inc('active')] },
      { status: 'expenses_submitted' },
    ])
    expect(n).toEqual({ intake: 1, quote: 2, incident: 2, moving: 1 })
  })
})

describe('orderTabOf', () => {
  it('xếp đơn vào đúng tab theo giai đoạn và việc khách cần làm', () => {
    const o = (status: BookingStatus, extra = {}) => orderTabOf({ status, ...extra } as Parameters<typeof orderTabOf>[0])
    expect(o('pending_commercial')).toBe('confirm')
    expect(o('under_review', { medical: { status: 'resubmit' } })).toBe('supplement')
    expect(o('awaiting_payment')).toBe('pay')
    expect(o('clearance_in_progress')).toBe('prepare')
    expect(o('ready_for_pickup')).toBe('pay')
    expect(o('ready_for_pickup', { balance: {} })).toBe('prepare')
    expect(o('en_route_to_pickup', { balance: {} })).toBe('moving')
    expect(o('settlement_issued', { settlement: { total: 500000 } })).toBe('pay')
    expect(o('settlement_issued', { settlement: { total: 0 } })).toBe('settle')
    expect(o('rejected')).toBe('closed')
  })
})

describe('managerBoardOf', () => {
  it('mỗi trạng thái đang chạy thuộc đúng một cột; đơn đã đóng không có cột', () => {
    const all = Object.keys(BOOKING_STATUS) as BookingStatus[]
    const closed = all.filter(s => managerBoardOf(s) === undefined)
    expect(closed.sort()).toEqual(['cancelled', 'quote_expired', 'rejected'])
    expect(managerBoardOf('pending_intake')).toBe('intake')
    expect(managerBoardOf('incident_reported')).toBe('moving')
    expect(managerBoardOf('payment_overdue')).toBe('settle')
  })
})
