// Dữ liệu mẫu của luồng đặt đơn (Flow 1): hồ sơ ngựa của khách mẫu và các đơn ở từng trạng thái.
// Đơn mẫu chạy hết Flow 1: từ chờ tiếp nhận tới đã đặt cọc. Sửa file này thì tăng MOCK_VERSION trong store.ts.
import type { ClearanceDocType, HorseDocType } from '../../config/booking-rules'
import { DAY, HOUR } from '../../config/business-rules'
import { COUNTRY_LOCATIONS } from '../../config/network'
import { buildCheckpoints, buildRoutePlan, finalizeQuote, layoutLegs, manifestDocuments, quoteLines, tripIdOf } from '../../lib/booking'
import { daysFromToday } from '../../lib/dates'
import type { Booking, BookingHorse, Clearance, ClearanceFile, FleetPlan, HorseDoc, HorseProfile, Manifest, Party, PlaceRef, Sex, TripRun, WelfareLog } from '../../types/booking'
import { CUSTOMER } from './orders'
import { seedCrew, seedVehicles } from './fleet'

const NOW = Date.now()
const doc = (daysAgo: number, expiresInDays?: number): HorseDoc => ({
  fileName: 'scan.pdf', uploadedAt: NOW - daysAgo * DAY, expiresAt: expiresInDays === undefined ? undefined : NOW + expiresInDays * DAY,
})
const cfile = (name: string, hoursAgo: number, version = 1): ClearanceFile => ({ fileName: name, uploadedAt: NOW - hoursAgo * HOUR, version })
const horse = (n: number, name: string, breed: string, sex: Sex, color: string, birthYear: number, marks: string, docs: Partial<Record<HorseDocType, HorseDoc>>, completedTrips: number): HorseProfile => ({
  id: `H-${String(n).padStart(3, '0')}`, owner: CUSTOMER.name, name, microchip: `VN-98521${n}`, breed, sex, color, birthYear, marks, docs, completedTrips, createdAt: NOW - 200 * DAY,
})

export const seedHorses = (): HorseProfile[] => [
  horse(1, 'Storm Runner', 'Thoroughbred', 'gelding', 'Nâu đỏ (Bay)', 2021, 'Sao trắng trán, tất trắng chân sau', { passport: doc(190), vaccine: doc(60, 170), lab: doc(40, 140) }, 5),
  horse(2, 'Bạch Phong', 'Arabian', 'mare', 'Bạch mã (White)', 2019, 'Đốm trắng nhỏ trên mũi', { passport: doc(190), vaccine: doc(60, 160), lab: doc(40, 150) }, 2),
  horse(3, 'Kim Lân', 'Thoroughbred', 'stallion', 'Hạt dẻ (Chestnut)', 2020, 'Vệt trắng dài giữa trán', { passport: doc(190), vaccine: doc(50, 200), lab: doc(30, 160) }, 6),
  horse(4, 'Thanh Vân', 'Warmblood', 'mare', 'Nâu đỏ (Bay)', 2018, 'Xoáy lông ở cổ bên trái', { passport: doc(120), vaccine: doc(30, 150) }, 1),
  horse(5, 'Hắc Mã', 'Quarter Horse', 'gelding', 'Đen (Black)', 2022, 'Không có dấu hiệu riêng', { passport: doc(100), vaccine: doc(300, -10), lab: doc(200, 90) }, 0),
  horse(6, 'Ngọc Long', 'Appaloosa', 'stallion', 'Đốm (Leopard)', 2021, 'Đốm đen toàn thân', { passport: doc(80), vaccine: doc(25, 180), lab: doc(20, 170) }, 0),
]

const place = (id: string): PlaceRef => {
  for (const [country, list] of Object.entries(COUNTRY_LOCATIONS)) {
    const l = list.find(x => x.id === id)
    if (l) return { id, name: l.name, country: country as PlaceRef['country'] }
  }
  throw new Error(`Không có địa điểm ${id}`)
}
const consignor: Party = { name: CUSTOMER.name, phone: '0901 456 789', idNumber: '3602 123 456', address: 'Ấp 5, Long Thành, Đồng Nai' }
const consignee = (name: string, address: string): Party => ({ name, phone: '0912 345 678', idNumber: '0310 987 654', address })

const bookingHorse = (h: HorseProfile, over: Partial<BookingHorse> = {}): BookingHorse => ({
  horseId: h.id, name: h.name, microchip: h.microchip, breed: h.breed, sex: h.sex,
  stall: 'standard', targetTemp: 22, feeding: 'Cỏ khô Timothy, yến mạch', water: 'Mỗi 3 giờ', careNote: '', insurance: { opted: false }, ...over,
})

export const seedBookings = (): Booking[] => {
  const horses = seedHorses()
  const h = (n: number) => horses[n - 1]
  const vehicles = seedVehicles()
  const vehicle = (id: string) => vehicles.find(v => v.id === id)!
  const plan = (vehicleId: string, driverId: string, escortId: string, departIn: number, border: boolean, by: string): FleetPlan => ({
    vehicleId, driverId, escortId, etd: daysFromToday(departIn, 5), etaBorder: border ? daysFromToday(departIn, 11) : undefined, etaDest: daysFromToday(departIn + (border ? 1 : 0), border ? 9 : 14),
    stops: border ? ['Trạm nghỉ Trảng Bàng — nghỉ 45 phút'] : ['Trạm nghỉ Long Khánh — nghỉ 30 phút'], note: '', confirmedAt: NOW - 20 * HOUR, by,
  })
  const common = { customer: CUSTOMER.name, consignor }
  const log = (time: number, actor: string, text: string) => ({ time, actor, text })
  const draftQuote = (b: Pick<Booking, 'type' | 'origin' | 'dest' | 'gate' | 'horses'>, vehicleId: string, sentAt: number) =>
    finalizeQuote(quoteLines(b, vehicle(vehicleId)).lines, [], sentAt, 'Quản lý', 400_000)
  const staffKD1 = { id: 'KD-01', name: 'Phạm Văn Hưng' }
  const staffKD2 = { id: 'KD-02', name: 'Nguyễn Thị Thu' }
  const staffDP1 = { id: 'DP-01', name: 'Trần Minh' }
  const staffDP3 = { id: 'DP-03', name: 'Phạm Tâm' }
  const intake = (at: number, specialist = staffKD1, coordinator = staffDP1) => ({ at, by: 'Quản lý', specialist, coordinator })
  const medicalOk = (at: number, by: string) => ({ status: 'approved' as const, temp: 22, restPlan: 'Nghỉ xả cơ 30 phút sau mỗi 3 giờ', welfareNote: '', at, by })

  const b1Horses = [bookingHorse(h(1), { insurance: { opted: true } }), bookingHorse(h(2))]
  const b2Horses = [bookingHorse(h(3), { stall: 'single' }), bookingHorse(h(6)), bookingHorse(h(2))]
  const b3Horses = [bookingHorse(h(3))]
  const b4Horses = [bookingHorse(h(1), { stall: 'single', insurance: { opted: true } }), bookingHorse(h(6))]
  const b5Horses = [bookingHorse(h(1)), bookingHorse(h(2)), bookingHorse(h(3), { stall: 'single' })]
  const b6Horses = [bookingHorse(h(2)), bookingHorse(h(6)), bookingHorse(h(1))]
  const b7Horses = [bookingHorse(h(6))]

  const intl = (id: string, from: string, to: string, gate: string) => ({ type: 'international' as const, origin: place(from), dest: place(to), gate, id })
  const dom = (id: string, from: string, to: string) => ({ type: 'domestic' as const, origin: place(from), dest: place(to), id })

  const b5Route = dom('ORD-2026-0105', 'KHO-BD', 'CLB-SG')
  const b6Route = intl('ORD-2026-0106', 'KHO-DN', 'KHO-PNH', 'Mộc Bài – Bavet')
  const b7Route = dom('ORD-2026-0107', 'KHO-DN', 'KHO-LA')
  const b4Route = intl('ORD-2026-0104', 'KHO-DN', 'KHO-VTE', 'Lao Bảo – Densavanh')


  // ===== Flow 2: giấy tờ pháp lý =====
  const b9Horses = [bookingHorse(h(1)), bookingHorse(h(6))]
  const b9Route = intl('ORD-2026-0109', 'KHO-DN', 'KHO-VTE', 'Lao Bảo – Densavanh')
  const b10Horses = [bookingHorse(h(3))]
  const b10Route = dom('ORD-2026-0110', 'KHO-LA', 'KHO-BD')
  const b11Horses = [bookingHorse(h(2)), bookingHorse(h(6))]
  const b11Route = dom('ORD-2026-0111', 'KHO-DN', 'CLB-SG')
  const b12Horses = [bookingHorse(h(1))]
  const b12Route = dom('ORD-2026-0112', 'KHO-BD', 'CLB-SG')
  const paid = (route: ReturnType<typeof dom> | ReturnType<typeof intl>, hs: BookingHorse[], vehicleId: string, hoursAgo: number) => {
    const q = draftQuote({ ...route, horses: hs }, vehicleId, NOW - (hoursAgo + 24) * HOUR)
    return { quote: q, payment: { paidAt: NOW - hoursAgo * HOUR, amount: q.deposit, reference: `EQZ-${route.id.slice(-4)}-DEP`, contractSignedAt: NOW - hoursAgo * HOUR } }
  }
  const clearance = (docs: Partial<Record<ClearanceDocType, ClearanceFile>>, extra: Partial<Clearance> = {}): Clearance => ({ options: { quarantine: false, ata: false, invoice: !!docs.commercial_invoice }, docs, ...extra })
  const hist = (b: string, ...rest: [number, string, string][]) => [log(NOW - 9 * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 7 * DAY, 'Quản lý', b), ...rest.map(([t, a, x]) => log(NOW - t, a, x))]

  // Các đơn Flow 3: dùng xe VH-007 (tài xế Nguyễn Văn Hùng) và hộ tống NV-02 (Võ Thị Lan) để thử app Driver và Escort
  const flow3Bookings = (): Booking[] => {
    const mk = (n: number, route: ReturnType<typeof dom> | ReturnType<typeof intl>, hs: BookingHorse[], vehicleId: string, driverId: string, escortId: string, departIn: number, ageDays: number, status: Booking['status'], extra: Partial<Booking> = {}): Booking => {
      const depart = daysFromToday(departIn)
      const fleet = plan(vehicleId, driverId, escortId, departIn, route.type === 'international', staffDP1.name)
      const base = { ...common, ...route, createdAt: NOW - ageDays * DAY, departAt: depart, consignee: consignee(route.type === 'international' ? 'Trung tâm Kiểm dịch Phnom Penh' : 'CLB Cưỡi ngựa Sài Gòn', route.type === 'international' ? 'Phnom Penh, Campuchia' : 'Quận 2, TP.HCM'), horses: hs, importPermit: route.type === 'international' ? doc(20) : undefined }
      return {
        ...base, status, intake: intake(NOW - (ageDays - 1) * DAY, staffKD1, staffDP1), medical: medicalOk(NOW - (ageDays - 2) * DAY, staffKD1.name), fleet,
        ...paid(route, hs, vehicleId, (ageDays - 3) * 24),
        clearance: clearance({ health_cert: cfile(`health_cert_${n}.pdf`, 90), poa: cfile(`poa_${n}.pdf`, 90), ...(route.type === 'international' ? { customs_declaration: cfile(`to_khai_${n}.pdf`, 90) } : {}) }, { submittedAt: NOW - 90 * HOUR, approvedAt: NOW - 60 * HOUR, approvedBy: staffKD1.name }),
        readiness: { confirmedAt: NOW - 48 * HOUR, by: staffDP1.name },
        history: [log(NOW - ageDays * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 60 * HOUR, staffKD1.name, 'Duyệt toàn bộ hồ sơ pháp lý'), log(NOW - 48 * HOUR, staffDP1.name, 'Xác nhận sẵn sàng, phát lệnh xuất bến'), log(NOW - 47 * HOUR, 'Hệ thống', 'Khóa thông tin xe, nhân sự và microchip. Bắt đầu lập lộ trình chi tiết')],
        ...extra,
      }
    }
    const routeOf = (b: Booking) => buildRoutePlan(b, { etd: b.fleet!.etd, stops: b.fleet!.stops })
    const manifest = (b: Booking, acks: Manifest['acks'], departed?: number): Manifest => ({ tripId: tripIdOf(b.id), approvedAt: NOW - 30 * HOUR, approvedBy: 'Quản lý', acks, departedAt: departed })
    const hist = (b: Booking, ...more: [number, string, string][]) => [...b.history, ...more.map(([t, a, x]) => log(NOW - t, a, x))]

    const b13 = mk(113, intl('ORD-2026-0113', 'KHO-DN', 'KHO-PNH', 'Mộc Bài – Bavet'), [bookingHorse(h(1)), bookingHorse(h(2))], 'VH-009', 'TX-09', 'NV-03', 36, 14, 'route_plan_completed')
    const r13 = routeOf(b13)
    b13.route = { ...r13, borderEta: daysFromToday(36, 6) + 10 * 60_000, completedAt: NOW - 2 * HOUR, by: staffDP1.name } // ETA cửa khẩu 06:10, ngoài khung giờ: cần Manager phê duyệt ngoại lệ
    b13.history = hist(b13, [2 * HOUR, staffDP1.name, 'Hoàn tất lộ trình chi tiết, trình Manager duyệt Trip Manifest'])

    const b14 = mk(114, dom('ORD-2026-0114', 'KHO-DN', 'CLB-SG'), [bookingHorse(h(3)), bookingHorse(h(6))], 'VH-007', 'TX-07', 'NV-02', 20, 12, 'trip_manifest_approved')
    b14.route = { ...routeOf(b14), completedAt: NOW - 32 * HOUR, by: staffDP1.name }
    b14.manifest = manifest(b14, {})
    b14.history = hist(b14, [32 * HOUR, staffDP1.name, 'Hoàn tất lộ trình chi tiết, trình Manager duyệt Trip Manifest'], [30 * HOUR, 'Quản lý', 'Duyệt Trip Manifest, đẩy lệnh điều vận xuống Driver và Escort, báo khách'])

    const b15 = mk(115, dom('ORD-2026-0115', 'KHO-LA', 'KHO-BD'), [bookingHorse(h(2))], 'VH-007', 'TX-07', 'NV-02', 12, 20, 'ready_for_pickup')
    b15.route = { ...routeOf(b15), completedAt: NOW - 32 * HOUR, by: staffDP1.name }
    b15.manifest = manifest(b15, { driver: NOW - 20 * HOUR, escort: NOW - 18 * HOUR })
    b15.history = hist(b15, [30 * HOUR, 'Quản lý', 'Duyệt Trip Manifest, đẩy lệnh điều vận xuống Driver và Escort, báo khách'], [18 * HOUR, 'Võ Thị Lan', 'Hộ tống xác nhận nhận lệnh. Xe và nhân sự sẵn sàng đón ngựa'])

    const b16 = mk(116, dom('ORD-2026-0116', 'KHO-BD', 'CLB-SG'), [bookingHorse(h(1)), bookingHorse(h(3))], 'VH-007', 'TX-07', 'NV-02', 1, 35, 'en_route_to_pickup')
    b16.route = { ...routeOf(b16), completedAt: NOW - 40 * HOUR, by: staffDP1.name }
    b16.manifest = manifest(b16, { driver: NOW - 5 * HOUR, escort: NOW - 4 * HOUR }, NOW - 1 * HOUR)
    b16.history = hist(b16, [30 * HOUR, 'Quản lý', 'Duyệt Trip Manifest, đẩy lệnh điều vận xuống Driver và Escort, báo khách'], [1 * HOUR, 'Nguyễn Văn Hùng', 'Xe bắt đầu di chuyển đến điểm đón ngựa'])
    // ===== Flow 4: hành trình đang chạy =====
    const crewName = (id: string) => seedCrew().find(c => c.id === id)!.name
    const fillTrip = (b: Booking, done: number, welfareOverride: Partial<WelfareLog>[] = []): TripRun => {
      const cps = buildCheckpoints(b)
      const driver = crewName(b.fleet!.driverId), escort = crewName(b.fleet!.escortId)
      cps.forEach((cp, i) => {
        if (i >= done) return
        cp.arrivedAt = cp.plannedAt + 3 * 60_000
        cp.photo = `capture_${cp.id}.jpg`
        cp.by = driver
        cp.doneAt = cp.arrivedAt + (cp.type === 'rest' ? 45 * 60_000 : 5 * 60_000)
        if (cp.type === 'pickup') { cp.chips = b.horses.map(h => h.microchip); cp.originals = manifestDocuments(b).originals; cp.handoverPhoto = 'bien_ban_giao_nhan.jpg' }
        if (cp.type === 'customs') cp.stampPhotos = ['health_cert_stamp.jpg']
        if (cp.type === 'delivery') { cp.handoverPhoto = 'bien_ban_ban_giao.jpg'; cp.returnedOriginals = true }
      })
      const welfare: WelfareLog[] = cps.filter(c => c.doneAt && (c.type === 'rest' || c.type === 'delivery')).map((c, i) => ({
        id: `WL-${i + 1}`, checkpointId: c.id, at: c.arrivedAt! + 8 * 60_000, by: escort, condition: 'normal', waterLiters: 8, hay: true, temp: 22, photo: `ngua_${c.id}.jpg`, note: '', ...welfareOverride[i],
      }))
      return { checkpoints: cps, welfare, startedAt: cps[0].doneAt, deliveredAt: done >= cps.length ? cps[cps.length - 1].doneAt : undefined }
    }
    const withRoute = (b: Booking, etd: number, hours: number, restName: string, borderAt?: number) => {
      const rests = [{ name: restName, minutes: 45 }]
      b.fleet = { ...b.fleet!, etd }
      b.route = {
        legs: layoutLegs(b.origin.name, b.dest.name, etd, rests, hours), rests: [{ afterLeg: 1, name: restName, minutes: 45, facilities: 'Bóng mát, nguồn nước máy sạch' }],
        vets: [{ name: 'Phòng khám Thú y Long Thành', phone: '0251 3 840 115', near: 'Đồng Nai' }, { name: 'Trạm Thú y Trảng Bàng', phone: '0276 3 881 342', near: 'Tây Ninh' }],
        borderEta: borderAt, completedAt: etd - 40 * HOUR, by: staffDP1.name,
      }
      b.manifest = manifest(b, { driver: etd - 5 * HOUR, escort: etd - 4 * HOUR }, etd - 90 * 60_000)
    }

    const b17 = mk(117, dom('ORD-2026-0117', 'KHO-DN', 'KHO-LA'), [bookingHorse(h(3)), bookingHorse(h(6))], 'VH-007', 'TX-07', 'NV-02', 0, 33, 'in_transit')
    withRoute(b17, NOW - 6.5 * HOUR, 5, 'Trạm nghỉ Long Khánh')
    b17.trip = fillTrip(b17, 2) // đã nhận ngựa và qua trạm nghỉ 1; mốc giao ngựa trễ 45 phút so với dự kiến
    b17.history = hist(b17, [6.5 * HOUR, 'Nguyễn Văn Hùng', 'Bắt đầu hành trình (In Transit - Leg 1)'], [3.2 * HOUR, 'Nguyễn Văn Hùng', 'Tiếp tục hành trình (Leg 2)'])

    const b18 = mk(118, intl('ORD-2026-0118', 'KHO-DN', 'KHO-PNH', 'Mộc Bài – Bavet'), [bookingHorse(h(1)), bookingHorse(h(2))], 'VH-009', 'TX-09', 'NV-03', 0, 34, 'in_transit')
    withRoute(b18, NOW - 4 * HOUR, 6, 'Trạm nghỉ Trảng Bàng', NOW + 1.5 * HOUR)
    b18.trip = fillTrip(b18, 2, [{ condition: 'stress', temp: 24, note: 'Storm Runner đổ mồ hôi nhẹ, đã xịt nước làm mát', waterLiters: 10 }])
    b18.history = hist(b18, [4 * HOUR, 'Trần Quốc Bảo', 'Bắt đầu hành trình (In Transit - Leg 1)'])

    const b19 = mk(119, dom('ORD-2026-0119', 'KHO-BD', 'CLB-SG'), [bookingHorse(h(2))], 'VH-004', 'TX-04', 'NV-04', -1, 34, 'delivered_pending_settlement')
    withRoute(b19, NOW - 9 * HOUR, 5, 'Trạm nghỉ Thủ Dầu Một')
    b19.trip = fillTrip(b19, 3)
    b19.history = hist(b19, [9 * HOUR, 'Phạm Văn D', 'Bắt đầu hành trình (In Transit - Leg 1)'], [3 * HOUR, 'Phạm Văn D', 'Hoàn tất giao ngựa. Chờ tài xế gửi chi phí để quyết toán'])
    return [b13, b14, b15, b16, b17, b18, b19]
  }

  return [
    { ...common, ...intl('ORD-2026-0101', 'KHO-DN', 'KHO-PNH', 'Mộc Bài – Bavet'), createdAt: NOW - 3 * HOUR, departAt: daysFromToday(45), consignee: consignee('Trung tâm Kiểm dịch Phnom Penh', 'Phnom Penh, Campuchia'),
      horses: b1Horses, importPermit: doc(5), status: 'pending_intake', history: [log(NOW - 3 * HOUR, CUSTOMER.name, 'Gửi yêu cầu đặt đơn')] },

    { ...common, ...dom('ORD-2026-0102', 'KHO-LA', 'CLB-SG'), createdAt: NOW - 1 * DAY, departAt: daysFromToday(38), consignee: consignee('CLB Cưỡi ngựa Sài Gòn', 'Quận 2, TP.HCM'),
      horses: b2Horses, status: 'under_review', intake: intake(NOW - 20 * HOUR), medical: { status: 'pending', temp: 22, restPlan: '', welfareNote: '' },
      history: [log(NOW - 1 * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 20 * HOUR, 'Quản lý', 'Tiếp nhận, giao Phạm Văn Hưng (kiểm dịch) và Trần Minh (điều phối)')] },

    { ...common, ...dom('ORD-2026-0103', 'KHO-BD', 'KHO-DN'), createdAt: NOW - 2 * DAY, departAt: daysFromToday(50), consignee: consignee('Trang trại Đua ngựa Long Thành', 'Long Thành, Đồng Nai'),
      horses: b3Horses, status: 'under_review', intake: intake(NOW - 40 * HOUR, staffKD1, staffDP3),
      medical: { status: 'resubmit', temp: 22, restPlan: '', welfareNote: '', at: NOW - 5 * HOUR, by: staffKD1.name, resubmit: { reason: 'Phiếu xét nghiệm EIA bị mờ, không đọc được ngày lấy mẫu. Vui lòng tải lại bản rõ nét.', items: [{ horseId: h(3).id, doc: 'lab' }], at: NOW - 5 * HOUR } },
      fleet: plan('VH-002', 'TX-02', 'NV-01', 50, false, staffDP3.name),
      history: [log(NOW - 2 * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 40 * HOUR, 'Quản lý', 'Tiếp nhận, giao Phạm Văn Hưng và Phạm Tâm'), log(NOW - 20 * HOUR, staffDP3.name, 'Xác nhận phương án xe và lộ trình'), log(NOW - 5 * HOUR, staffKD1.name, 'Yêu cầu khách bổ sung xét nghiệm EIA của Kim Lân')] },

    { ...common, ...b4Route, createdAt: NOW - 3 * DAY, departAt: daysFromToday(60), consignee: consignee('Trang trại Ngựa Viêng Chăn', 'Viêng Chăn, Lào'),
      horses: b4Horses, importPermit: doc(10), status: 'pending_commercial', intake: intake(NOW - 2 * DAY, staffKD2, staffDP1),
      medical: medicalOk(NOW - 30 * HOUR, staffKD2.name), fleet: plan('VH-006', 'TX-05', 'NV-02', 60, true, staffDP1.name),
      history: [log(NOW - 3 * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 2 * DAY, 'Quản lý', 'Tiếp nhận, giao Nguyễn Thị Thu và Trần Minh'), log(NOW - 36 * HOUR, staffDP1.name, 'Xác nhận phương án xe và lộ trình'), log(NOW - 30 * HOUR, staffKD2.name, 'Xác nhận đạt y tế')] },

    { ...common, ...b5Route, createdAt: NOW - 4 * DAY, departAt: daysFromToday(40), consignee: consignee('CLB Cưỡi ngựa Sài Gòn', 'Quận 2, TP.HCM'),
      horses: b5Horses, status: 'awaiting_payment', intake: intake(NOW - 3 * DAY, staffKD2, staffDP1),
      medical: medicalOk(NOW - 2 * DAY, staffKD2.name), fleet: plan('VH-009', 'TX-09', 'NV-03', 40, false, staffDP1.name),
      quote: draftQuote({ ...b5Route, horses: b5Horses }, 'VH-009', NOW - 10 * HOUR),
      history: [log(NOW - 4 * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 10 * HOUR, 'Quản lý', 'Duyệt và gửi báo giá')] },

    { ...common, ...b6Route, createdAt: NOW - 6 * DAY, departAt: daysFromToday(55), consignee: consignee('Trung tâm Kiểm dịch Phnom Penh', 'Phnom Penh, Campuchia'),
      horses: b6Horses, importPermit: doc(12), status: 'awaiting_clearance_docs', intake: intake(NOW - 5 * DAY, staffKD1, staffDP1),
      medical: medicalOk(NOW - 4 * DAY, staffKD1.name), fleet: plan('VH-004', 'TX-04', 'NV-04', 55, true, staffDP1.name),
      quote: draftQuote({ ...b6Route, horses: b6Horses }, 'VH-004', NOW - 2 * DAY),
      payment: { paidAt: NOW - 1 * DAY, amount: draftQuote({ ...b6Route, horses: b6Horses }, 'VH-004', NOW).deposit, reference: 'EQZ-0106-DEP', contractSignedAt: NOW - 1 * DAY },
      history: [log(NOW - 6 * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 2 * DAY, 'Quản lý', 'Duyệt và gửi báo giá'), log(NOW - 1 * DAY, CUSTOMER.name, 'Đặt cọc 50%, ký hợp đồng vận tải')] },

    { ...common, ...b7Route, createdAt: NOW - 7 * DAY, departAt: daysFromToday(33), consignee: consignee('Kho Long An', 'Đức Hòa, Long An'),
      horses: b7Horses, status: 'quote_expired', intake: intake(NOW - 6 * DAY, staffKD2, staffDP3),
      medical: medicalOk(NOW - 5 * DAY, staffKD2.name), fleet: plan('VH-006', 'TX-05', 'NV-05', 33, false, staffDP3.name),
      quote: draftQuote({ ...b7Route, horses: b7Horses }, 'VH-006', NOW - 3 * DAY),
      history: [log(NOW - 7 * DAY, CUSTOMER.name, 'Gửi yêu cầu đặt đơn'), log(NOW - 3 * DAY, 'Quản lý', 'Duyệt và gửi báo giá'), log(NOW - 1 * DAY, 'Hệ thống', 'Quá 48 giờ chưa đặt cọc: báo giá hết hạn, nhả xe và nhân sự')] },
    { ...common, ...b9Route, createdAt: NOW - 9 * DAY, departAt: daysFromToday(62), consignee: consignee('Trang trại Ngựa Viêng Chăn', 'Viêng Chăn, Lào'),
      horses: b9Horses, importPermit: doc(14), status: 'documents_submitted', intake: intake(NOW - 7 * DAY, staffKD1, staffDP1),
      medical: medicalOk(NOW - 6 * DAY, staffKD1.name), fleet: plan('VH-008', 'TX-08', 'NV-03', 62, true, staffDP1.name), ...paid(b9Route, b9Horses, 'VH-008', 90),
      clearance: clearance({ health_cert: cfile('health_cert_0109.pdf', 5), customs_declaration: cfile('to_khai_0109.pdf', 5), poa: cfile('poa_0109.pdf', 5), commercial_invoice: cfile('hoa_don_0109.pdf', 5) }, { submittedAt: NOW - 5 * HOUR }),
      history: hist('Tiếp nhận, giao Phạm Văn Hưng và Trần Minh', [3 * DAY, 'Quản lý', 'Duyệt và gửi báo giá'], [90 * HOUR, CUSTOMER.name, 'Đặt cọc 50%, ký hợp đồng vận tải'], [5 * HOUR, CUSTOMER.name, 'Nộp giấy tờ pháp lý']) },

    { ...common, ...b10Route, createdAt: NOW - 9 * DAY, departAt: daysFromToday(47), consignee: consignee('Trang trại Bình Dương', 'Bình Dương'),
      horses: b10Horses, status: 'pending_resubmission', intake: intake(NOW - 7 * DAY, staffKD1, staffDP1),
      medical: medicalOk(NOW - 6 * DAY, staffKD1.name), fleet: plan('VH-011', 'TX-11', 'NV-04', 47, false, staffDP1.name), ...paid(b10Route, b10Horses, 'VH-011', 80),
      clearance: clearance({ health_cert: cfile('health_cert_0110.pdf', 20), poa: cfile('poa_0110.pdf', 20) }, { submittedAt: NOW - 20 * HOUR, rejection: { docs: ['health_cert'], reasons: ['Thiếu mộc'], note: 'Health Cert thiếu mộc giáp lai ở trang 2. Vui lòng nộp bản đầy đủ mộc.', at: NOW - 6 * HOUR, by: staffKD1.name } }),
      history: hist('Tiếp nhận, giao Phạm Văn Hưng và Trần Minh', [80 * HOUR, CUSTOMER.name, 'Đặt cọc 50%, ký hợp đồng vận tải'], [20 * HOUR, CUSTOMER.name, 'Nộp giấy tờ pháp lý'], [6 * HOUR, staffKD1.name, 'Yêu cầu nộp lại giấy tờ: Thiếu mộc']) },

    { ...common, ...b11Route, createdAt: NOW - 10 * DAY, departAt: daysFromToday(52), consignee: consignee('CLB Cưỡi ngựa Sài Gòn', 'Quận 2, TP.HCM'),
      horses: b11Horses, status: 'legal_docs_approved', intake: intake(NOW - 8 * DAY, staffKD2, staffDP1),
      medical: medicalOk(NOW - 7 * DAY, staffKD2.name), fleet: plan('VH-012', 'TX-12', 'NV-05', 52, false, staffDP1.name), ...paid(b11Route, b11Horses, 'VH-012', 100),
      clearance: clearance({ health_cert: cfile('health_cert_0111.pdf', 30), poa: cfile('poa_0111.pdf', 30) }, { submittedAt: NOW - 30 * HOUR, approvedAt: NOW - 3 * HOUR, approvedBy: staffKD2.name }),
      history: hist('Tiếp nhận, giao Nguyễn Thị Thu và Trần Minh', [100 * HOUR, CUSTOMER.name, 'Đặt cọc 50%, ký hợp đồng vận tải'], [30 * HOUR, CUSTOMER.name, 'Nộp giấy tờ pháp lý'], [3 * HOUR, staffKD2.name, 'Duyệt toàn bộ hồ sơ pháp lý, chuyển Điều phối kiểm tra sẵn sàng']) },

    { ...common, ...b12Route, createdAt: NOW - 12 * DAY, departAt: daysFromToday(44), consignee: consignee('CLB Cưỡi ngựa Sài Gòn', 'Quận 2, TP.HCM'),
      horses: b12Horses, status: 'route_planning', intake: intake(NOW - 10 * DAY, staffKD1, staffDP1),
      medical: medicalOk(NOW - 9 * DAY, staffKD1.name), fleet: plan('VH-013', 'TX-13', 'NV-01', 44, false, staffDP1.name), ...paid(b12Route, b12Horses, 'VH-013', 140),
      clearance: clearance({ health_cert: cfile('health_cert_0112.pdf', 50), poa: cfile('poa_0112.pdf', 50) }, { submittedAt: NOW - 50 * HOUR, approvedAt: NOW - 20 * HOUR, approvedBy: staffKD1.name }),
      readiness: { confirmedAt: NOW - 18 * HOUR, by: staffDP1.name },
      history: hist('Tiếp nhận, giao Phạm Văn Hưng và Trần Minh', [140 * HOUR, CUSTOMER.name, 'Đặt cọc 50%, ký hợp đồng vận tải'], [50 * HOUR, CUSTOMER.name, 'Nộp giấy tờ pháp lý'], [20 * HOUR, staffKD1.name, 'Duyệt toàn bộ hồ sơ pháp lý, chuyển Điều phối kiểm tra sẵn sàng'], [18 * HOUR, staffDP1.name, 'Xác nhận sẵn sàng, phát lệnh xuất bến (Dispatch Order) xuống Driver và Escort'], [18 * HOUR, 'Hệ thống', 'Khóa thông tin xe, nhân sự và microchip. Bắt đầu lập lộ trình chi tiết']) },
    // ===== Flow 3: lộ trình chi tiết và Trip Manifest =====
    ...flow3Bookings(),
  ]
}
