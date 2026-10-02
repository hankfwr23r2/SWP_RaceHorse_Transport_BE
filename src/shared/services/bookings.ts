// Service đơn đặt chuyến (Flow 1). Tên hàm theo REST để sau này thay bằng API Spring Boot.
// Mỗi hàm là một thao tác nghiệp vụ; trạng thái chỉ đổi qua các hàm này để giữ đúng cổng chuyển bước của PRD.
import { BOOKING_STATUS, CLEARANCE_DOC, DEMURRAGE_PER_HOUR, publicStepOf, type ClearanceDocType, type WelfareCondition } from '../config/booking-rules'
import { CANCELLABLE, blankClearance, buildCheckpoints, currentCheckpoint, finalizeQuote, manifestDocuments, isDocsOverdue, isQuoteExpired, missingClearanceDocs, nextBookingId, quoteLines, refundOf, reservedVehicleIds, reviewDone, tripIdOf, validateRoutePlan } from '../lib/booking'
import type { Adjustment, Booking, Clearance, ClearanceFile, FleetPlan, HistoryEntry, MedicalReview, RoutePlan, StaffRef, TripRun, WelfareLog } from '../types/booking'
import { crewApi, vehiclesApi } from './fleet'
import { seedBookings } from './mock/bookings'
import { createStore } from './store'

const store = createStore<Booking>('bookings', seedBookings)

const log = (b: Booking, actor: string, text: string): HistoryEntry[] => [...b.history, { time: Date.now(), actor, text }]
const must = (id: string) => {
  const b = store.get(id)
  if (!b) throw new Error(`Không tìm thấy đơn ${id}.`)
  return b
}
const expect = (b: Booking, status: Booking['status'], message: string) => {
  if (b.status !== status) throw new Error(message)
}

// Quy tắc hệ thống chạy mỗi lần đọc: báo giá quá 48 giờ chưa đặt cọc thì hết hiệu lực, nhả xe và nhân sự.
// Khi có backend, việc này do job phía server làm.
function applySystemRules() {
  store.all().filter(b => isQuoteExpired(b)).forEach(b => {
    store.update(b.id, { status: 'quote_expired', history: log(b, 'Hệ thống', 'Quá 48 giờ chưa đặt cọc: báo giá hết hạn, nhả xe và nhân sự') })
  })
  // Lệnh xuất bến đã phát: khóa xe, nhân sự, microchip và bắt đầu lập lộ trình chi tiết
  store.all().filter(b => b.status === 'dispatch_approved').forEach(b => {
    store.update(b.id, { status: 'route_planning', history: log(b, 'Hệ thống', 'Khóa thông tin xe, nhân sự và microchip. Bắt đầu lập lộ trình chi tiết') })
  })
  // Quá 18:00 D-1 chưa nộp đủ giấy: Documentation Delayed, báo Manager, Coordinator hoãn lệnh xuất bến
  store.all().filter(b => isDocsOverdue(b)).forEach(b => {
    store.update(b.id, { status: 'documentation_delayed', clearance: { ...(b.clearance ?? blankClearance()), delayedAt: Date.now() }, history: log(b, 'Hệ thống', 'Quá 18:00 ngày D-1 chưa đủ hồ sơ: đình trệ, báo Manager, hoãn lệnh xuất bến') })
  })
}

// Bỏ trường nội bộ trước khi đưa sang app khách; phương án xe chỉ hiện khi báo giá đã gửi
const QUOTED: Booking['status'][] = ['awaiting_payment', 'quote_expired', 'awaiting_clearance_docs', 'documents_submitted', 'pending_resubmission', 'documentation_delayed', 'legal_docs_approved', 'dispatch_approved', 'route_planning', 'route_plan_completed', 'trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']
// Khách chỉ thấy lộ trình sau khi Manager duyệt Trip Manifest
const ROUTE_SHOWN: Booking['status'][] = ['trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']
export type CustomerBookingView = Omit<Booking, 'intake' | 'history'>
const toCustomerView = (b: Booking): CustomerBookingView => {
  const { intake: _intake, history: _history, ...view } = structuredClone(b)
  if (!QUOTED.includes(b.status)) delete view.fleet
  if (!ROUTE_SHOWN.includes(b.status)) delete view.route
  return view
}

// Thông tin xe và nhân sự của đơn (Carrier Info Sheet, PRD mục 2.7). Khách chỉ lấy được của đơn mình, sau khi đã có báo giá.
export interface TeamInfo {
  vehicle: { plate: string; kind: string; stalls: number; vin: string; inspectionNo: string; transitPermit: string }
  driver: { name: string; phone: string; idNumber: string; license: string }
  escort: { name: string; phone: string; idNumber: string }
}

const SUBMITTABLE: Booking['status'][] = ['awaiting_clearance_docs', 'pending_resubmission', 'documentation_delayed']

// Tra cứu công khai: mã đơn + 4 số cuối SĐT người gửi. Chỉ trả tiến trình, tuyến, ngày; không có tên, giá hay giấy tờ.
export interface PublicTracking {
  route: string
  depart: number
  step: number
  done?: boolean
  status: string
  tone?: 'warn' | 'done' | 'bad'
  now?: { place: string; at: number; eta: number }
  note?: string
}

export interface NewBookingInput {
  type: Booking['type']
  origin: Booking['origin']
  dest: Booking['dest']
  gate?: string
  departAt: number
  consignor: Booking['consignor']
  consignee: Booking['consignee']
  horses: Booking['horses']
  importPermit?: Booking['importPermit']
}

// Công khai: không cần đăng nhập. null = không tìm thấy hoặc SĐT không khớp (không tiết lộ đơn có tồn tại hay không).
export const publicBookingsApi = {
  track: async (code: string, phoneLast4: string): Promise<PublicTracking | null> => {
    applySystemRules()
    const b = store.get(code.trim().toUpperCase())
    if (!b || b.consignor.phone.replace(/\D/g, '').slice(-4) !== phoneLast4) return null
    const short = (n: string) => n.split(' — ')[0]
    const cp = currentCheckpoint(b)
    const delivery = b.trip?.checkpoints.at(-1)
    return {
      route: `${short(b.origin.name)} → ${short(b.dest.name)}`, depart: b.departAt, step: publicStepOf(b.status),
      done: b.status === 'delivered_pending_settlement', status: BOOKING_STATUS[b.status].customerLabel,
      tone: b.status === 'quote_expired' ? 'bad' : b.status === 'delivered_pending_settlement' ? 'done' : ['awaiting_payment', 'pending_resubmission', 'documentation_delayed'].includes(b.status) || b.medical?.status === 'resubmit' ? 'warn' : undefined,
      now: b.status === 'in_transit' && cp && delivery ? { place: `${cp.place}, ${cp.label.toLowerCase()}`, at: b.trip!.checkpoints.filter(c => c.arrivedAt).at(-1)?.arrivedAt ?? b.trip!.startedAt ?? Date.now(), eta: delivery.plannedAt } : undefined,
      note: ['awaiting_payment', 'awaiting_clearance_docs', 'pending_resubmission', 'documentation_delayed'].includes(b.status) || b.medical?.status === 'resubmit' ? 'Đơn cần người đặt xử lý. Vui lòng đăng nhập để xem chi tiết.' : undefined,
    }
  },
}

// Dành cho app khách
export const customerBookingsApi = {
  list: async (customer: string): Promise<CustomerBookingView[]> => {
    applySystemRules()
    return store.all().filter(b => b.customer === customer).map(toCustomerView).sort((a, b) => b.createdAt - a.createdAt)
  },
  get: async (customer: string, id: string): Promise<CustomerBookingView | undefined> => {
    applySystemRules()
    const b = store.get(id)
    return b && b.customer === customer ? toCustomerView(b) : undefined
  },
  create: async (customer: string, input: NewBookingInput): Promise<CustomerBookingView> => {
    const now = Date.now()
    const b: Booking = { ...input, id: nextBookingId(store.all()), customer, createdAt: now, status: 'pending_intake', history: [{ time: now, actor: customer, text: 'Gửi yêu cầu đặt đơn' }] }
    return toCustomerView(store.add(b))
  },
  team: async (customer: string, id: string): Promise<TeamInfo | undefined> => {
    const b = store.get(id)
    if (!b || b.customer !== customer || !b.fleet || !QUOTED.includes(b.status)) return undefined
    const [vehicles, crew] = await Promise.all([vehiclesApi.list(), crewApi.list()])
    const v = vehicles.find(x => x.id === b.fleet!.vehicleId)
    const driver = crew.find(x => x.id === b.fleet!.driverId)
    const escort = crew.find(x => x.id === b.fleet!.escortId)
    if (!v || !driver || !escort) return undefined
    return {
      vehicle: { plate: v.plate, kind: v.name, stalls: v.capacity, vin: v.vin ?? '', inspectionNo: v.inspectionNo ?? '', transitPermit: v.transitPermit ?? '' },
      driver: { name: driver.name, phone: driver.phone, idNumber: driver.idNumber ?? '', license: driver.license ?? '' },
      escort: { name: escort.name, phone: escort.phone, idNumber: escort.idNumber ?? '' },
    }
  },
  // Khách hủy đơn: tính hoàn cọc theo mốc thời gian thực. Chưa đặt cọc thì hủy miễn phí.
  cancel: async (customer: string, id: string, reason: string, forceMajeure = false): Promise<CustomerBookingView> => {
    applySystemRules()
    const b = must(id)
    if (b.customer !== customer) throw new Error('Không có quyền với đơn này.')
    if (!CANCELLABLE.includes(b.status)) throw new Error('Đơn này không hủy được ở bước hiện tại.')
    if (!reason.trim()) throw new Error('Cần ghi lý do hủy.')
    const now = Date.now()
    const { rate, refund } = b.payment ? refundOf(b.departAt, b.payment.amount, now, forceMajeure) : { rate: 0, refund: 0 }
    return toCustomerView(store.update(id, {
      status: 'cancelled', cancellation: { at: now, reason: reason.trim(), rate, refund, forceMajeure },
      history: log(b, customer, b.payment ? `Hủy đơn, hoàn ${Math.round(rate * 100)}% tiền cọc (${refund.toLocaleString('en-US')} ₫)` : 'Hủy đơn (chưa đặt cọc)'),
    }))
  },
  // Khách nộp (hoặc nộp lại) giấy tờ pháp lý. docs: tên tệp từng giấy; giấy đổi tệp thì tăng phiên bản.
  submitClearance: async (customer: string, id: string, input: { options: Clearance['options']; docs: Partial<Record<ClearanceDocType, string>> }): Promise<CustomerBookingView> => {
    applySystemRules()
    const b = must(id)
    if (b.customer !== customer) throw new Error('Không có quyền với đơn này.')
    if (!SUBMITTABLE.includes(b.status)) throw new Error('Đơn này không ở bước nộp giấy tờ.')
    const old = b.clearance ?? blankClearance()
    const now = Date.now()
    const docs: Clearance['docs'] = {}
    ;(Object.keys(input.docs) as ClearanceDocType[]).forEach(t => {
      const name = input.docs[t]
      if (!name) return
      const prev = old.docs[t]
      docs[t] = prev && prev.fileName === name ? prev : ({ fileName: name, uploadedAt: now, version: (prev?.version ?? 0) + 1 } satisfies ClearanceFile)
    })
    const clearance: Clearance = { ...old, options: input.options, docs, submittedAt: now }
    const missing = missingClearanceDocs({ type: b.type, clearance })
    if (missing.length) throw new Error(`Còn thiếu: ${missing.map(t => CLEARANCE_DOC[t].short).join(', ')}.`)
    return toCustomerView(store.update(id, { clearance, status: 'documents_submitted', history: log(b, customer, b.status === 'pending_resubmission' ? 'Nộp lại giấy tờ pháp lý' : 'Nộp giấy tờ pháp lý') }))
  },
  // Khách đã cập nhật hồ sơ ngựa theo yêu cầu bổ sung, gửi lại cho Kiểm dịch viên
  resubmit: async (customer: string, id: string): Promise<CustomerBookingView> => {
    const b = must(id)
    if (b.customer !== customer) throw new Error('Không có quyền với đơn này.')
    if (b.medical?.status !== 'resubmit') throw new Error('Đơn này không có yêu cầu bổ sung.')
    return toCustomerView(store.update(id, { medical: { ...b.medical, status: 'pending', resubmit: undefined }, history: log(b, customer, 'Đã bổ sung hồ sơ, gửi lại Kiểm dịch viên') }))
  },
  // Thanh toán cọc 50% và ký hợp đồng vận tải (giả lập cổng thanh toán)
  payDeposit: async (customer: string, id: string): Promise<CustomerBookingView> => {
    applySystemRules()
    const b = must(id)
    if (b.customer !== customer) throw new Error('Không có quyền với đơn này.')
    if (b.status === 'quote_expired') throw new Error('Báo giá đã hết hạn 48 giờ, không thể đặt cọc.')
    expect(b, 'awaiting_payment', 'Đơn này không ở bước chờ đặt cọc.')
    const now = Date.now()
    return toCustomerView(store.update(id, {
      status: 'awaiting_clearance_docs',
      payment: { paidAt: now, amount: b.quote!.deposit, reference: `EQZ-${id.slice(-4)}-DEP`, contractSignedAt: now },
      history: log(b, customer, 'Đặt cọc 50%, ký hợp đồng vận tải'),
    }))
  },
}

// Dành cho app nội bộ
export const bookingsApi = {
  list: async (): Promise<Booking[]> => { applySystemRules(); return structuredClone(store.all()).sort((a, b) => a.createdAt - b.createdAt) },
  get: async (id: string): Promise<Booking | undefined> => { applySystemRules(); return structuredClone(store.get(id)) },

  // Manager: tiếp nhận và kích hoạt thẩm định, giao Kiểm dịch viên và Điều phối viên
  activate: async (id: string, by: string, specialist: StaffRef, coordinator: StaffRef): Promise<Booking> => {
    const b = must(id)
    expect(b, 'pending_intake', 'Đơn này đã được tiếp nhận.')
    return structuredClone(store.update(id, {
      status: 'under_review',
      intake: { at: Date.now(), by, specialist, coordinator },
      medical: { status: 'pending', temp: 22, restPlan: '', welfareNote: '' },
      history: log(b, by, `Tiếp nhận, giao ${specialist.name} (kiểm dịch) và ${coordinator.name} (điều phối)`),
    }))
  },

  // Specialist: đạt y tế (kèm chỉ dẫn an sinh)
  approveMedical: async (id: string, by: string, data: Pick<MedicalReview, 'temp' | 'restPlan' | 'welfareNote'>): Promise<Booking> => {
    const b = must(id)
    expect(b, 'under_review', 'Đơn không ở bước thẩm định.')
    const medical: MedicalReview = { status: 'approved', ...data, at: Date.now(), by }
    const next = { ...b, medical }
    return structuredClone(store.update(id, {
      medical, status: reviewDone(next) ? 'pending_commercial' : 'under_review',
      history: log(b, by, reviewDone(next) ? 'Xác nhận đạt y tế. Đủ điều kiện, chuyển Manager duyệt báo giá' : 'Xác nhận đạt y tế'),
    }))
  },

  // Specialist: yêu cầu khách bổ sung hồ sơ ngựa (bắt buộc ghi lý do)
  requestResubmission: async (id: string, by: string, reason: string, items: { horseId: string; doc: 'passport' | 'vaccine' | 'lab' }[]): Promise<Booking> => {
    const b = must(id)
    expect(b, 'under_review', 'Đơn không ở bước thẩm định.')
    if (!reason.trim()) throw new Error('Cần ghi lý do yêu cầu bổ sung.')
    if (!items.length) throw new Error('Chọn ít nhất một giấy cần bổ sung.')
    return structuredClone(store.update(id, {
      medical: { ...(b.medical ?? { temp: 22, restPlan: '', welfareNote: '' }), status: 'resubmit', at: Date.now(), by, resubmit: { reason: reason.trim(), items, at: Date.now() } },
      history: log(b, by, `Yêu cầu khách bổ sung hồ sơ: ${reason.trim()}`),
    }))
  },

  // Coordinator: xác nhận xe, tài xế, hộ tống và lộ trình
  confirmFleet: async (id: string, by: string, data: Omit<FleetPlan, 'confirmedAt' | 'by'>): Promise<Booking> => {
    const b = must(id)
    expect(b, 'under_review', 'Đơn không ở bước thẩm định.')
    const vehicle = (await vehiclesApi.list()).find(v => v.id === data.vehicleId)
    if (!vehicle) throw new Error('Chưa chọn xe.')
    if (vehicle.status === 'maintenance') throw new Error('Xe đang bảo dưỡng, chọn xe khác.')
    if (vehicle.capacity < b.horses.length) throw new Error(`Xe chỉ có ${vehicle.capacity} ngăn, đơn có ${b.horses.length} ngựa.`)
    if (reservedVehicleIds(store.all(), b.departAt, id).has(vehicle.id)) throw new Error('Xe đã được giữ cho đơn khác có ngày đi gần ngày này.')
    if (!data.escortId) throw new Error('Chưa chọn nhân viên hộ tống (Escort).')
    const fleet: FleetPlan = { ...data, driverId: vehicle.driverId, confirmedAt: Date.now(), by }
    const next = { ...b, fleet }
    return structuredClone(store.update(id, {
      fleet, status: reviewDone(next) ? 'pending_commercial' : 'under_review',
      history: log(b, by, reviewDone(next) ? 'Xác nhận phương án xe và lộ trình. Đủ điều kiện, chuyển Manager duyệt báo giá' : 'Xác nhận phương án xe và lộ trình'),
    }))
  },

  // Manager: dòng báo giá do hệ thống tính (chưa gồm phụ phí và chiết khấu)
  quoteDraft: async (id: string) => {
    const b = must(id)
    if (!b.fleet) throw new Error('Đơn chưa có phương án xe.')
    const vehicle = (await vehiclesApi.list()).find(v => v.id === b.fleet!.vehicleId)
    if (!vehicle) throw new Error('Không tìm thấy xe của đơn.')
    return quoteLines(b, vehicle)
  },

  // Manager: duyệt và gửi báo giá, khách có 48 giờ để đặt cọc
  sendQuote: async (id: string, by: string, adjustments: Adjustment[]): Promise<Booking> => {
    const b = must(id)
    expect(b, 'pending_commercial', 'Đơn không ở bước duyệt báo giá.')
    const { lines } = await bookingsApi.quoteDraft(id)
    const quote = finalizeQuote(lines, adjustments.filter(a => a.label.trim() && a.amount !== 0), Date.now(), by, DEMURRAGE_PER_HOUR)
    return structuredClone(store.update(id, { quote, status: 'awaiting_payment', history: log(b, by, 'Duyệt và gửi báo giá') }))
  },

  // Specialist: duyệt toàn bộ hồ sơ pháp lý (người gác cổng duy nhất)
  approveLegal: async (id: string, by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'documents_submitted', 'Đơn không ở bước chờ duyệt hồ sơ pháp lý.')
    return structuredClone(store.update(id, {
      status: 'legal_docs_approved', clearance: { ...(b.clearance ?? blankClearance()), approvedAt: Date.now(), approvedBy: by, rejection: undefined },
      history: log(b, by, 'Duyệt toàn bộ hồ sơ pháp lý, chuyển Điều phối kiểm tra sẵn sàng'),
    }))
  },

  // Specialist: yêu cầu khách nộp lại (bắt buộc chọn lý do và giấy cần nộp lại)
  requestClearanceFix: async (id: string, by: string, input: { docs: ClearanceDocType[]; reasons: string[]; note: string }): Promise<Booking> => {
    const b = must(id)
    expect(b, 'documents_submitted', 'Đơn không ở bước chờ duyệt hồ sơ pháp lý.')
    if (!input.reasons.length) throw new Error('Chọn ít nhất một lý do.')
    if (!input.docs.length) throw new Error('Chọn ít nhất một giấy cần nộp lại.')
    return structuredClone(store.update(id, {
      status: 'pending_resubmission', clearance: { ...(b.clearance ?? blankClearance()), rejection: { ...input, at: Date.now(), by } },
      history: log(b, by, `Yêu cầu nộp lại giấy tờ: ${input.reasons.join(', ')}`),
    }))
  },

  // Coordinator: xác nhận xe, tài xế, hộ tống sẵn sàng. Phát lệnh xuất bến xuống app Driver và Escort.
  confirmReadiness: async (id: string, by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'legal_docs_approved', 'Chưa thể phát lệnh xuất bến: hồ sơ pháp lý chưa được Specialist duyệt.')
    return structuredClone(store.update(id, {
      status: 'dispatch_approved', readiness: { confirmedAt: Date.now(), by },
      history: log(b, by, 'Xác nhận sẵn sàng, phát lệnh xuất bến (Dispatch Order) xuống Driver và Escort'),
    }))
  },

  // ===== Flow 3: lộ trình chi tiết và Trip Manifest =====
  // Coordinator: hoàn tất lộ trình chi tiết (chặn nếu vi phạm quy tắc chia chặng)
  saveRoutePlan: async (id: string, by: string, input: Pick<RoutePlan, 'legs' | 'rests' | 'vets' | 'borderEta'>): Promise<Booking> => {
    const b = must(id)
    expect(b, 'route_planning', 'Đơn không ở bước lập lộ trình chi tiết.')
    const { errors } = validateRoutePlan(input, b.type === 'international')
    if (errors.length) throw new Error(errors[0])
    return structuredClone(store.update(id, { status: 'route_plan_completed', route: { ...input, completedAt: Date.now(), by }, history: log(b, by, 'Hoàn tất lộ trình chi tiết, trình Manager duyệt Trip Manifest') }))
  },

  // Manager: trả lộ trình về Coordinator chỉnh lại (bắt buộc ghi lý do)
  returnRoutePlan: async (id: string, by: string, note: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'route_plan_completed', 'Đơn không ở bước chờ duyệt Trip Manifest.')
    if (!note.trim()) throw new Error('Cần ghi lý do trả về.')
    return structuredClone(store.update(id, { status: 'route_planning', route: { ...b.route!, returnNote: note.trim() }, history: log(b, by, `Trả lộ trình về Coordinator: ${note.trim()}`) }))
  },

  // Manager: duyệt Trip Manifest, đẩy lệnh điều vận xuống app Driver và Escort, báo khách
  approveManifest: async (id: string, by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'route_plan_completed', 'Đơn không ở bước chờ duyệt Trip Manifest.')
    return structuredClone(store.update(id, {
      status: 'trip_manifest_approved', manifest: { tripId: tripIdOf(id), approvedAt: Date.now(), approvedBy: by, acks: {} },
      route: { ...b.route!, returnNote: undefined },
      history: log(b, by, 'Duyệt Trip Manifest, đẩy lệnh điều vận xuống Driver và Escort, báo khách'),
    }))
  },

  // Driver / Escort: xác nhận đã nhận lệnh và chuẩn bị xong. Cả hai xác nhận thì Ready for Pickup.
  acknowledgeManifest: async (id: string, who: 'driver' | 'escort', by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'trip_manifest_approved', 'Đơn không ở bước nhận lệnh điều vận.')
    const acks = { ...b.manifest!.acks, [who]: Date.now() }
    const both = !!acks.driver && !!acks.escort
    return structuredClone(store.update(id, {
      manifest: { ...b.manifest!, acks }, status: both ? 'ready_for_pickup' : 'trip_manifest_approved',
      history: log(b, by, both ? `${who === 'driver' ? 'Tài xế' : 'Hộ tống'} xác nhận nhận lệnh. Xe và nhân sự sẵn sàng đón ngựa` : `${who === 'driver' ? 'Tài xế' : 'Hộ tống'} xác nhận đã nhận lệnh điều vận`),
    }))
  },

  // Driver: bắt đầu di chuyển đến điểm đón
  departToPickup: async (id: string, by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'ready_for_pickup', 'Xe chưa sẵn sàng: Driver và Escort cần xác nhận nhận lệnh trước.')
    return structuredClone(store.update(id, { status: 'en_route_to_pickup', manifest: { ...b.manifest!, departedAt: Date.now() }, history: log(b, by, 'Xe bắt đầu di chuyển đến điểm đón ngựa') }))
  },

  // ===== Flow 4: hành trình thực tế =====
  // Driver: tới điểm đón, check-in kèm ảnh chụp trực tiếp (tạo các mốc hành trình từ lộ trình đã duyệt)
  arriveAtPickup: async (id: string, by: string, photo: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'en_route_to_pickup', 'Xe chưa ở bước đến điểm đón.')
    if (!photo) throw new Error('Cần chụp ảnh tại điểm đón.')
    const trip: TripRun = b.trip ?? { checkpoints: buildCheckpoints(b), welfare: [] }
    const cp = trip.checkpoints[0]
    cp.arrivedAt = Date.now(); cp.photo = photo; cp.by = by
    return structuredClone(store.update(id, { trip, history: log(b, by, 'Tài xế đã tới điểm đón, check-in kèm ảnh') }))
  },

  // Escort: quét microchip từng con, phải khớp ngựa trong đơn
  scanChip: async (id: string, by: string, chip: string): Promise<Booking> => {
    const b = must(id)
    const pickup = b.trip?.checkpoints[0]
    if (!pickup?.arrivedAt || pickup.doneAt) throw new Error('Chưa tới bước quét microchip.')
    const code = chip.trim().toUpperCase()
    if (!b.horses.some(h => h.microchip.toUpperCase() === code)) throw new Error(`Microchip ${code} không khớp ngựa nào trong đơn. Dừng lại và báo Điều phối.`)
    pickup.chips = [...new Set([...(pickup.chips ?? []), code])]
    return structuredClone(store.update(id, { trip: b.trip, history: log(b, by, `Quét microchip ${code}, khớp hồ sơ`) }))
  },

  // Driver: tick các bản gốc đã nhận từ người gửi
  collectOriginals: async (id: string, by: string, items: string[]): Promise<Booking> => {
    const b = must(id)
    const pickup = b.trip?.checkpoints[0]
    if (!pickup?.arrivedAt || pickup.doneAt) throw new Error('Chưa tới bước thu chứng từ gốc.')
    pickup.originals = items
    return structuredClone(store.update(id, { trip: b.trip, history: log(b, by, `Thu chứng từ gốc ${items.length}/${manifestDocuments(b).originals.length}`) }))
  },

  // Driver: ảnh biên bản giao nhận có chữ ký hai bên (tại điểm đón hoặc điểm giao)
  uploadHandover: async (id: string, by: string, photo: string): Promise<Booking> => {
    const b = must(id)
    const cp = currentCheckpoint(b)
    if (!cp || !cp.arrivedAt || (cp.type !== 'pickup' && cp.type !== 'delivery')) throw new Error('Chưa tới bước ký biên bản.')
    cp.handoverPhoto = photo
    return structuredClone(store.update(id, { trip: b.trip, history: log(b, by, cp.type === 'pickup' ? 'Tải ảnh biên bản giao nhận ngựa và chứng từ gốc' : 'Tải ảnh biên bản bàn giao hoàn tất') }))
  },

  // Driver: bắt đầu hành trình (đủ: check-in, quét hết chip, thu đủ bản gốc, có biên bản)
  startJourney: async (id: string, by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'en_route_to_pickup', 'Xe chưa ở bước đến điểm đón.')
    const p = b.trip?.checkpoints[0]
    if (!p?.arrivedAt) throw new Error('Chưa check-in tại điểm đón.')
    if ((p.chips?.length ?? 0) < b.horses.length) throw new Error('Chưa quét đủ microchip của tất cả ngựa.')
    if ((p.originals?.length ?? 0) < manifestDocuments(b).originals.length) throw new Error('Chưa thu đủ chứng từ gốc.')
    if (!p.handoverPhoto) throw new Error('Chưa có ảnh biên bản giao nhận có chữ ký.')
    p.doneAt = Date.now()
    return structuredClone(store.update(id, { status: 'in_transit', trip: { ...b.trip!, startedAt: p.doneAt }, history: log(b, by, 'Bắt đầu hành trình (In Transit - Leg 1)') }))
  },

  // Driver: check-in tại trạm nghỉ, cửa khẩu hoặc điểm giao
  arriveCheckpoint: async (id: string, by: string, photo: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'in_transit', 'Chuyến chưa ở bước vận chuyển.')
    const cp = currentCheckpoint(b)
    if (!cp || !['rest', 'border', 'delivery'].includes(cp.type)) throw new Error('Mốc hiện tại không phải check-in tới nơi.')
    if (cp.arrivedAt) throw new Error('Đã check-in mốc này.')
    if (!photo) throw new Error('Cần chụp ảnh trực tiếp tại mốc.')
    const now = Date.now()
    cp.arrivedAt = now; cp.photo = photo; cp.by = by
    if (cp.type === 'border') cp.doneAt = now // tới cửa khẩu xong, mốc kế tiếp là thông quan
    return structuredClone(store.update(id, { trip: b.trip, history: log(b, by, `Check-in: ${cp.label.toLowerCase()} tại ${cp.place}`) }))
  },

  // Escort: nhật ký an sinh tại trạm nghỉ hoặc điểm giao
  submitWelfare: async (id: string, by: string, data: { condition: WelfareCondition; waterLiters: number; hay: boolean; temp: number; photo: string; note: string }): Promise<Booking> => {
    const b = must(id)
    expect(b, 'in_transit', 'Chuyến chưa ở bước vận chuyển.')
    const cp = currentCheckpoint(b)
    if (!cp?.arrivedAt || !['rest', 'delivery'].includes(cp.type)) throw new Error('Chỉ ghi nhật ký an sinh khi xe đã tới trạm nghỉ hoặc điểm giao.')
    if (!data.photo) throw new Error('Cần chụp ảnh ngựa trong khoang.')
    const trip = b.trip!
    const logEntry: WelfareLog = { id: `WL-${trip.welfare.length + 1}`, checkpointId: cp.id, at: Date.now(), by, ...data }
    trip.welfare = [...trip.welfare, logEntry]
    return structuredClone(store.update(id, { trip, history: log(b, by, `Nhật ký an sinh: ${data.condition === 'normal' ? 'bình thường' : data.condition === 'stress' ? 'căng thẳng' : 'đổ mồ hôi nhiều'}, ${data.temp}°C`) }))
  },

  // Driver: tiếp tục hành trình sau khi nghỉ (cần đã có nhật ký an sinh của trạm)
  continueJourney: async (id: string, by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'in_transit', 'Chuyến chưa ở bước vận chuyển.')
    const cp = currentCheckpoint(b)
    if (cp?.type !== 'rest' || !cp.arrivedAt) throw new Error('Chưa ở trạm nghỉ.')
    if (!b.trip!.welfare.some(w => w.checkpointId === cp.id)) throw new Error('Hộ tống chưa gửi nhật ký an sinh của trạm này.')
    cp.doneAt = Date.now()
    return structuredClone(store.update(id, { trip: b.trip, history: log(b, by, `Tiếp tục hành trình (Leg ${(b.trip!.checkpoints.filter(c => c.type === 'rest' && c.doneAt).length) + 1})`) }))
  },

  // Driver: thông quan xong, tải ảnh mộc đỏ
  customsCleared: async (id: string, by: string, stampPhotos: string[]): Promise<Booking> => {
    const b = must(id)
    expect(b, 'in_transit', 'Chuyến chưa ở bước vận chuyển.')
    const cp = currentCheckpoint(b)
    if (cp?.type !== 'customs') throw new Error('Chưa tới bước thông quan.')
    if (!stampPhotos.length) throw new Error('Cần ảnh trang mộc đỏ kiểm dịch và cuống ATA Carnet (nếu có).')
    const now = Date.now()
    cp.arrivedAt = now; cp.doneAt = now; cp.stampPhotos = stampPhotos; cp.by = by
    return structuredClone(store.update(id, { trip: b.trip, history: log(b, by, 'Đã thông quan thành công tại cửa khẩu') }))
  },

  // Driver: hoàn tất giao ngựa (có ảnh biên bản ký, đã trả bản gốc, Escort đã kiểm tra lần cuối)
  completeDelivery: async (id: string, by: string): Promise<Booking> => {
    const b = must(id)
    expect(b, 'in_transit', 'Chuyến chưa ở bước vận chuyển.')
    const cp = currentCheckpoint(b)
    if (cp?.type !== 'delivery' || !cp.arrivedAt) throw new Error('Chưa tới điểm giao.')
    if (!b.trip!.welfare.some(w => w.checkpointId === cp.id)) throw new Error('Hộ tống chưa kiểm tra thể trạng lần cuối.')
    if (!cp.handoverPhoto) throw new Error('Chưa có ảnh Biên bản Bàn giao & Hoàn tất có chữ ký.')
    const now = Date.now()
    cp.doneAt = now; cp.returnedOriginals = true
    return structuredClone(store.update(id, { status: 'delivered_pending_settlement', trip: { ...b.trip!, deliveredAt: now }, history: log(b, by, 'Hoàn tất giao ngựa. Chờ tài xế gửi chi phí để quyết toán') }))
  },
}
