// Đơn đặt chuyến theo quy trình mới (Flow 1). Khớp docs/PRD.md mục 2, 13. Các luồng 2–6 sẽ thêm trạng thái và trường vào đây.
import type { BookingStatus, ClearanceDocType, ClearanceOption, HorseDocType, WelfareCondition } from '../config/booking-rules'
import type { CountryCode } from '../config/network'

export type Sex = 'stallion' | 'mare' | 'gelding'
export const SEX_LABEL: Record<Sex, string> = { stallion: 'Đực', mare: 'Cái', gelding: 'Thiến' }

// ===== Hồ sơ ngựa =====
export interface HorseDoc { fileName: string; uploadedAt: number; expiresAt?: number }
export interface HorseProfile {
  id: string
  owner: string
  name: string
  microchip: string // khóa định danh, không sửa sau khi lưu
  breed: string
  sex: Sex
  color: string
  birthYear: number
  marks: string
  docs: Partial<Record<HorseDocType, HorseDoc>>
  completedTrips: number
  createdAt: number
}

// ===== Đơn =====
export type TransportType = 'domestic' | 'international'
export interface PlaceRef { id: string; name: string; country: CountryCode }
export interface Party { name: string; phone: string; idNumber: string; address: string }
export type StallType = 'standard' | 'single'

export interface BookingHorse {
  horseId: string
  name: string
  microchip: string
  breed: string
  sex: Sex
  stall: StallType
  targetTemp: number
  feeding: string
  water: string
  careNote: string
  insurance: { opted: boolean }
}

export interface StaffRef { id: string; name: string }

export interface MedicalReview {
  status: 'pending' | 'approved' | 'resubmit'
  temp: number
  restPlan: string
  welfareNote: string
  at?: number
  by?: string
  resubmit?: { reason: string; items: { horseId: string; doc: HorseDocType }[]; at: number }
}

export interface FleetPlan {
  vehicleId: string
  driverId: string
  escortId: string
  etd: number
  etaBorder?: number
  etaDest: number
  stops: string[]
  note: string
  confirmedAt: number
  by: string
}

export interface QuoteLine { label: string; detail: string; amount: number }
export interface Adjustment { label: string; amount: number } // dương: phụ phí; âm: chiết khấu
export interface Quote {
  lines: QuoteLine[]
  adjustments: Adjustment[]
  subtotal: number
  total: number
  deposit: number
  demurragePerHour: number
  sentAt: number
  expiresAt: number
  sentBy: string
}

// ===== Giấy tờ pháp lý khách nộp sau cọc (Flow 2) =====
export interface ClearanceFile extends HorseDoc { version: number }
export interface ClearanceRejection { docs: ClearanceDocType[]; reasons: string[]; note: string; at: number; by: string }
export interface Clearance {
  options: Record<ClearanceOption, boolean> // giấy tùy chọn áp dụng cho chuyến này (quốc tế)
  docs: Partial<Record<ClearanceDocType, ClearanceFile>>
  submittedAt?: number
  rejection?: ClearanceRejection // lần yêu cầu nộp lại gần nhất
  approvedAt?: number
  approvedBy?: string
  delayedAt?: number // quá 18:00 D-1 chưa đủ hồ sơ
}
export interface Readiness { confirmedAt: number; by: string } // Coordinator xác nhận sẵn sàng, phát lệnh xuất bến

// ===== Lộ trình chi tiết và Trip Manifest (Flow 3) =====
export interface RouteLeg { no: number; from: string; to: string; departAt: number; arriveAt: number }
export interface RestStop { afterLeg: number; name: string; minutes: number; facilities: string }
export interface VetPoint { name: string; phone: string; near: string }
export interface RoutePlan {
  legs: RouteLeg[]
  rests: RestStop[]
  vets: VetPoint[]
  borderEta?: number // quốc tế: giờ tới cửa khẩu
  completedAt?: number
  by?: string
  returnNote?: string // Manager trả về, lý do
}
export interface Manifest {
  tripId: string // TRP-NNNN
  approvedAt: number
  approvedBy: string
  acks: { driver?: number; escort?: number } // Driver và Escort đã nhận lệnh trên app
  departedAt?: number // Driver bắt đầu đi đến điểm đón
}

// ===== Hành trình thực tế (Flow 4) =====
export type CheckpointType = 'pickup' | 'rest' | 'border' | 'customs' | 'delivery'
export interface Checkpoint {
  id: string // pickup, rest-1, border, customs, delivery
  type: CheckpointType
  label: string
  place: string
  plannedAt: number
  arrivedAt?: number // Driver check-in tại mốc (kèm ảnh chụp trực tiếp)
  doneAt?: number // mốc hoàn tất: xuất phát (pickup), tiếp tục hành trình (rest), thông quan, giao xong
  photo?: string
  by?: string
  chips?: string[] // pickup: microchip đã quét
  originals?: string[] // pickup: bản gốc đã thu
  handoverPhoto?: string // pickup, delivery: ảnh biên bản có chữ ký hai bên
  stampPhotos?: string[] // customs: ảnh mộc đỏ Health Cert, ATA Carnet
  returnedOriginals?: boolean // delivery: đã trả hồ sơ gốc
}
export interface WelfareLog {
  id: string
  checkpointId: string
  at: number
  by: string
  condition: WelfareCondition
  waterLiters: number
  hay: boolean
  temp: number // nhiệt độ khoang
  photo: string
  note: string
}
export interface TripRun { checkpoints: Checkpoint[]; welfare: WelfareLog[]; startedAt?: number; deliveredAt?: number }

export interface Cancellation { at: number; reason: string; rate: number; refund: number; forceMajeure: boolean }

export interface Payment { paidAt: number; amount: number; reference: string; contractSignedAt: number }
export interface HistoryEntry { time: number; actor: string; text: string }

export interface Booking {
  id: string // ORD-2026-NNNN
  customer: string
  createdAt: number
  type: TransportType
  origin: PlaceRef
  dest: PlaceRef
  gate?: string // cửa khẩu khách chọn (chỉ quốc tế), khóa theo đơn
  departAt: number
  consignor: Party
  consignee: Party
  horses: BookingHorse[]
  importPermit?: HorseDoc // chỉ quốc tế
  status: BookingStatus

  // ----- nội bộ (khách không thấy) -----
  intake?: { at: number; by: string; specialist: StaffRef; coordinator: StaffRef }
  history: HistoryEntry[]

  // ----- kết quả từng bước -----
  medical?: MedicalReview
  fleet?: FleetPlan
  quote?: Quote
  payment?: Payment
  clearance?: Clearance
  readiness?: Readiness
  route?: RoutePlan
  manifest?: Manifest
  trip?: TripRun
  cancellation?: Cancellation
}
