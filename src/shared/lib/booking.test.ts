import { describe, expect, it } from 'vitest'
import { DAY, HOUR } from '../config/business-rules'
import type { StaffMember } from '../services/mock/staff'
import type { Booking, BookingHorse, HorseProfile } from '../types/booking'
import {
  blankClearance, classForHorses, docsDueAt, insuranceFee, earliestDeparture, finalizeQuote, horseReadiness, isDepartureAllowed, isDocsOverdue, isQuoteExpired,
  buildRoutePlan, layoutLegs, refundOf, legalChecks, manifestDocuments, missingClearanceDocs, nextBookingId, tripIdOf, validateRoutePlan, quoteLines, requiredClearanceDocs, reservedVehicleIds, reviewDone, routeKm, suggestStaff, vehicleClassOf,
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
  it('có dòng khoang đơn và bảo hiểm khi khách chọn, không có khi không chọn', () => {
    const labels = quoteLines(base, { capacity: 2 }).lines.map(l => l.label)
    expect(labels).toContain('Khoang đơn mở rộng')
    expect(labels).toContain('Bảo hiểm Động vật Sống')
    const plain = quoteLines({ ...base, horses: [bh(), bh()] }, { capacity: 2 }).lines.map(l => l.label)
    expect(plain).not.toContain('Khoang đơn mở rộng')
    expect(plain).not.toContain('Bảo hiểm Động vật Sống')
  })
  it('phí bảo hiểm tính theo giống, giống lạ lấy mức "Khác"', () => {
    expect(insuranceFee('Thoroughbred')).toBe(20_000_000)
    expect(insuranceFee('Arabian')).toBe(16_000_000)
    expect(insuranceFee('Giống chưa có trong bảng')).toBe(insuranceFee('Khác'))
    const ins = quoteLines(base, { capacity: 2 }).lines.find(l => l.label === 'Bảo hiểm Động vật Sống')
    expect(ins?.amount).toBe(insuranceFee('Thoroughbred'))
  })
  it('đơn nội địa không thu phí Carrier Info Sheet', () => {
    const lines = quoteLines({ ...base, type: 'domestic', gate: undefined, dest: { id: 'CLB-SG', name: 'CLB', country: 'VN' } }, { capacity: 2 }).lines
    expect(lines.find(l => l.label.startsWith('Carrier Info Sheet'))?.amount).toBe(0)
  })
  it('xe hạng cao hơn thì cước cao hơn', () => {
    const cost = (capacity: number) => quoteLines(base, { capacity }).lines[0].amount
    expect(cost(4)).toBeGreaterThan(cost(2))
    expect(cost(9)).toBeGreaterThan(cost(4))
  })
  it('cọc 50%, hiệu lực 48 giờ, phụ phí và chiết khấu vào tổng', () => {
    const lines = [{ label: 'Cước', detail: '', amount: 10_000_000 }, { label: 'Nhân sự', detail: '', amount: 2_000_000 }]
    const q = finalizeQuote(lines, [{ label: 'Phụ phí', amount: 1_000_000 }, { label: 'Chiết khấu', amount: -3_000_000 }], NOW, 'Quản lý', 400_000)
    expect(q.subtotal).toBe(12_000_000)
    expect(q.total).toBe(10_000_000)
    expect(q.deposit).toBe(5_000_000)
    expect(q.expiresAt - q.sentAt).toBe(48 * HOUR)
  })
  it('quá 48 giờ chưa đặt cọc thì hết hạn', () => {
    const q = finalizeQuote([{ label: 'x', detail: '', amount: 1_000_000 }], [], NOW, 'Quản lý', 400_000)
    expect(isQuoteExpired({ status: 'awaiting_payment', quote: q }, NOW + 47 * HOUR)).toBe(false)
    expect(isQuoteExpired({ status: 'awaiting_payment', quote: q }, NOW + 49 * HOUR)).toBe(true)
    expect(isQuoteExpired({ status: 'awaiting_clearance_docs', quote: q }, NOW + 49 * HOUR)).toBe(false)
  })
})

describe('cổng chuyển sang duyệt báo giá', () => {
  const fleet = { vehicleId: 'VH-001', driverId: 'TX-01', escortId: 'NV-01', etd: NOW, etaDest: NOW, stops: [], note: '', confirmedAt: NOW, by: 'x' }
  const medical = { status: 'approved' as const, temp: 22, restPlan: '', welfareNote: '' }
  it('cần cả y tế đạt và phương án xe', () => {
    expect(reviewDone({ medical, fleet })).toBe(true)
    expect(reviewDone({ medical, fleet: undefined })).toBe(false)
    expect(reviewDone({ medical: { ...medical, status: 'pending' }, fleet })).toBe(false)
    expect(reviewDone({ medical: { ...medical, status: 'resubmit' }, fleet })).toBe(false)
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

  it('xe đã giữ cho đơn khác cùng ngày đi thì không chọn được', () => {
    const fleet = { vehicleId: 'VH-002', driverId: '', escortId: '', etd: 0, etaDest: 0, stops: [], note: '', confirmedAt: 0, by: '' }
    const all = [order('ORD-2026-0001', { fleet }), order('ORD-2026-0002', { fleet: { ...fleet, vehicleId: 'VH-003' }, departAt: NOW + 80 * DAY })]
    expect([...reservedVehicleIds(all, NOW + 41 * DAY)]).toEqual(['VH-002'])
    expect(reservedVehicleIds(all, NOW + 41 * DAY, 'ORD-2026-0001').size).toBe(0)
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

describe('giấy tờ pháp lý (Flow 2)', () => {
  const none = blankClearance().options
  it('nội địa: Health Cert và PoA', () => {
    expect(requiredClearanceDocs('domestic', none)).toEqual(['health_cert', 'poa'])
    expect(requiredClearanceDocs('domestic', { quarantine: true, ata: true, invoice: true })).toEqual(['health_cert', 'poa'])
  })
  it('quốc tế: thêm tờ khai hải quan, giấy tùy chọn chỉ khi khách tick', () => {
    expect(requiredClearanceDocs('international', none)).toEqual(['health_cert', 'customs_declaration', 'poa'])
    expect(requiredClearanceDocs('international', { quarantine: false, ata: true, invoice: true })).toEqual(['health_cert', 'customs_declaration', 'poa', 'ata_carnet', 'commercial_invoice'])
  })
  it('báo đúng giấy còn thiếu', () => {
    const f = { fileName: 'x.pdf', uploadedAt: 0, version: 1 }
    expect(missingClearanceDocs({ type: 'domestic' })).toEqual(['health_cert', 'poa'])
    expect(missingClearanceDocs({ type: 'domestic', clearance: { options: none, docs: { health_cert: f } } })).toEqual(['poa'])
  })
  const team = { plate: '29H-12345', driverName: 'Nguyễn Văn A', driverId: '0123', escortName: 'Đỗ Thị Hạnh', escortId: '0456' }
  const base = { type: 'international' as const, horses: [bh({ microchip: 'VN-1' }), bh({ microchip: 'VN-2' })], gate: 'Mộc Bài – Bavet', departAt: NOW + 40 * DAY }
  it('điểm đối chiếu theo giấy đã nộp: biển số, cửa khẩu, microchip, tài xế', () => {
    const f = { fileName: 'x.pdf', uploadedAt: 0, version: 1 }
    const checks = legalChecks({ ...base, clearance: { options: none, docs: { health_cert: f, customs_declaration: f, poa: f } } }, team)
    const text = checks.map(c => c.label).join(' | ')
    expect(text).toContain('VN-1, VN-2')
    expect(text).toContain('29H-12345')
    expect(text).toContain('Mộc Bài – Bavet')
    expect(text).toContain('Nguyễn Văn A')
    expect(checks.map(c => c.doc)).toEqual(['health_cert', 'health_cert', 'customs_declaration', 'customs_declaration', 'poa'])
  })
  it('không có điểm đối chiếu cho giấy khách không nộp', () => {
    expect(legalChecks({ ...base, clearance: blankClearance() }, team)).toEqual([])
  })
  it('quá 18:00 D-1 chưa nộp đủ thì đình trệ, đã nộp rồi thì không', () => {
    const departAt = new Date(2026, 10, 15).getTime()
    const due = docsDueAt(departAt)
    expect(isDocsOverdue({ status: 'awaiting_clearance_docs', departAt }, due - HOUR)).toBe(false)
    expect(isDocsOverdue({ status: 'awaiting_clearance_docs', departAt }, due + HOUR)).toBe(true)
    expect(isDocsOverdue({ status: 'pending_resubmission', departAt }, due + HOUR)).toBe(true)
    expect(isDocsOverdue({ status: 'documents_submitted', departAt }, due + HOUR)).toBe(false)
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
    const plan = buildRoutePlan({ type: 'international', origin, dest, gate: 'Lao Bảo – Densavanh' }, { etd, stops: [] })
    expect(plan.legs.length).toBeGreaterThan(1)
    expect(plan.rests.length).toBe(plan.legs.length - 1)
    expect(plan.vets.length).toBeGreaterThan(0)
    plan.rests.forEach((r, i) => { r.name = `Trạm ${i + 1}` })
    expect(validateRoutePlan(plan, true).errors).toEqual([])
  })
  it('chặng quá 4 giờ, nghỉ dưới 30 phút, thiếu trạm thú y đều bị chặn', () => {
    const legs = layoutLegs('A', 'B', etd, [], 5)
    const r = validateRoutePlan({ legs, rests: [{ afterLeg: 1, name: 'X', minutes: 20, facilities: '' }], vets: [], borderEta: undefined }, false)
    expect(r.errors.join(' | ')).toMatch(/vượt 4 giờ/)
    expect(r.errors.join(' | ')).toMatch(/tối thiểu 30 phút/)
    expect(r.errors.join(' | ')).toMatch(/Trạm Thú y/)
  })
  it('ETA cửa khẩu ngoài 07:30–16:30 chỉ là cảnh báo, quốc tế mà thiếu ETA là lỗi', () => {
    const legs = layoutLegs('A', 'B', etd, [{ name: 'X', minutes: 45 }], 6)
    const base = { legs, rests: [{ afterLeg: 1, name: 'X', minutes: 45, facilities: '' }], vets: [{ name: 'v', phone: '1', near: 'n' }] }
    expect(validateRoutePlan({ ...base, borderEta: new Date(2026, 10, 20, 6, 10).getTime() }, true)).toMatchObject({ errors: [], warnings: [expect.stringContaining('07:30–16:30')] })
    expect(validateRoutePlan({ ...base, borderEta: new Date(2026, 10, 20, 9, 0).getTime() }, true).warnings).toEqual([])
    expect(validateRoutePlan({ ...base }, true).errors.length).toBe(1)
  })
  it('mã chuyến lấy 4 số cuối của mã đơn', () => {
    expect(tripIdOf('ORD-2026-0114')).toBe('TRP-0114')
  })
  it('chứng từ gốc: quốc tế thêm Import Permit, ATA và hóa đơn khi khách tick', () => {
    const none = manifestDocuments({ type: 'domestic', clearance: blankClearance() })
    const intl = manifestDocuments({ type: 'international', clearance: { options: { quarantine: false, ata: true, invoice: true }, docs: {} } })
    expect(none.originals.join()).not.toMatch(/Import Permit|ATA|thương mại/)
    expect(intl.originals.join()).toMatch(/Import Permit/)
    expect(intl.originals.join()).toMatch(/ATA/)
    expect(intl.originals.join()).toMatch(/thương mại/)
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
