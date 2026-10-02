// Quy tắc của luồng đặt đơn, duyệt báo giá và đặt cọc (Flow 1). Khớp docs/PRD.md mục 2, 10, 11, 12.
// Các đơn giá ở cuối file là số mẫu để chạy thử: PRD chưa có biểu giá chính thức. Thay bằng bảng giá thật khi có.
import { BIG_TRUCK_FACTOR } from './public-pricing'

// ===== Cọc, báo giá =====
export const DEPOSIT_RATE = 0.5 // cọc cố định 50% (PRD mục 11.1)
export const QUOTE_VALID_HOURS = 48 // hạn giữ báo giá; quá hạn thì đơn hết hiệu lực
export const DOCS_CUTOFF_HOUR = 18 // hạn nộp giấy cần thông tin của hệ thống: 18:00 ngày D-1

// ===== Hạng xe (PRD mục 10) =====
export type VehicleClass = 'light' | 'medium' | 'heavy'
export const VEHICLE_CLASS: Record<VehicleClass, { label: string; kind: string; stalls: string; maxStalls: number }> = {
  light: { label: 'Light', kind: 'Xe tải nhẹ / Van', stalls: '2 ngăn', maxStalls: 2 },
  medium: { label: 'Medium', kind: 'Xe tải trung', stalls: '4 đến 6 ngăn', maxStalls: 6 },
  heavy: { label: 'Heavy', kind: 'Xe tải nặng', stalls: '9 ngăn', maxStalls: 9 },
}

// ===== Hồ sơ ngựa (PRD mục 2.1, 12) =====
export type HorseDocType = 'passport' | 'vaccine' | 'lab'
export const HORSE_DOC: Record<HorseDocType, { label: string; short: string; hint: string; hasExpiry: boolean }> = {
  passport: { label: 'Hộ chiếu ngựa (FEI / National Passport)', short: 'Hộ chiếu', hint: 'Có sơ đồ nhận dạng và số microchip trùng chip trên thân ngựa.', hasExpiry: false },
  vaccine: { label: 'Sổ tiêm phòng', short: 'Sổ tiêm', hint: 'Cúm ngựa còn hạn trong 6 đến 12 tháng, Uốn ván còn hiệu lực.', hasExpiry: true },
  lab: { label: 'Xét nghiệm EIA / Coggins', short: 'Xét nghiệm', hint: 'Kết quả âm tính trong vòng 6 đến 12 tháng.', hasExpiry: true },
}
export const HORSE_BREEDS = ['Thoroughbred', 'Arabian', 'Quarter Horse', 'Warmblood', 'Appaloosa', 'Khác']
export const HORSE_DOC_TYPES = Object.keys(HORSE_DOC) as HorseDocType[]

// ===== Chăm sóc trên xe (PRD mục 2.4) =====
export const TARGET_TEMP = { min: 20, max: 24, default: 22 }

// ===== Trạng thái đơn (PRD mục 13). Khách thấy nhãn tiếng Việt; nội bộ thấy thêm mã gốc. =====
export type BookingStatus =
  | 'pending_intake' | 'under_review' | 'pending_commercial' | 'awaiting_payment' | 'quote_expired' // Flow 1
  | 'awaiting_clearance_docs' | 'documents_submitted' | 'pending_resubmission' | 'documentation_delayed' | 'legal_docs_approved' | 'dispatch_approved' // Flow 2
  | 'route_planning' | 'route_plan_completed' | 'trip_manifest_approved' | 'ready_for_pickup' | 'en_route_to_pickup' // Flow 3
  | 'in_transit' | 'delivered_pending_settlement' // Flow 4
  | 'cancelled' // khách hủy đơn (PRD mục 8.3)
export type Tone = 'info' | 'warning' | 'success' | 'danger' | 'muted' | 'orange'
export const BOOKING_STATUS: Record<BookingStatus, { code: string; label: string; customerLabel: string; tone: Tone }> = {
  pending_intake: { code: 'Pending Manager Intake', label: 'Chờ Manager tiếp nhận', customerLabel: 'Đã gửi, chờ tiếp nhận', tone: 'info' },
  under_review: { code: 'Under Internal Review', label: 'Đang thẩm định nội bộ', customerLabel: 'Đang thẩm định', tone: 'info' },
  pending_commercial: { code: 'Pending Final Commercial Approval', label: 'Chờ Manager duyệt báo giá', customerLabel: 'Đang lập báo giá', tone: 'orange' },
  awaiting_payment: { code: 'Awaiting Payment', label: 'Chờ khách đặt cọc', customerLabel: 'Chờ đặt cọc', tone: 'warning' },
  quote_expired: { code: 'Quote Expired', label: 'Báo giá hết hạn', customerLabel: 'Báo giá hết hạn', tone: 'muted' },
  awaiting_clearance_docs: { code: 'Awaiting Clearance Documents', label: 'Chờ khách nộp giấy tờ pháp lý', customerLabel: 'Chờ bạn nộp giấy tờ', tone: 'success' },
  documents_submitted: { code: 'Documents Submitted - Pending Review', label: 'Chờ Specialist duyệt hồ sơ', customerLabel: 'Đã nộp, chờ kiểm tra', tone: 'info' },
  pending_resubmission: { code: 'Pending Resubmission', label: 'Chờ khách nộp lại', customerLabel: 'Cần bạn nộp lại giấy tờ', tone: 'danger' },
  documentation_delayed: { code: 'Documentation Delayed', label: 'Đình trệ do thiếu hồ sơ', customerLabel: 'Quá hạn nộp giấy tờ', tone: 'danger' },
  legal_docs_approved: { code: 'Legal Docs Approved', label: 'Hồ sơ pháp lý đã duyệt, chờ lệnh xuất bến', customerLabel: 'Hồ sơ đã duyệt', tone: 'success' },
  dispatch_approved: { code: 'Dispatch Approved', label: 'Lệnh xuất bến đã duyệt', customerLabel: 'Đã duyệt xuất bến', tone: 'success' },
  route_planning: { code: 'Route Planning in Progress', label: 'Đang lập lộ trình chi tiết', customerLabel: 'Đang lập lộ trình', tone: 'info' },
  route_plan_completed: { code: 'Route Plan Completed', label: 'Chờ Manager duyệt Trip Manifest', customerLabel: 'Lộ trình chờ duyệt', tone: 'orange' },
  trip_manifest_approved: { code: 'Trip Manifest Approved', label: 'Trip Manifest đã duyệt, chờ Driver và Escort nhận lệnh', customerLabel: 'Lộ trình đã duyệt', tone: 'success' },
  ready_for_pickup: { code: 'Ready for Pickup', label: 'Sẵn sàng đón ngựa', customerLabel: 'Sẵn sàng đón ngựa', tone: 'success' },
  en_route_to_pickup: { code: 'En Route to Pickup', label: 'Xe đang đến điểm đón', customerLabel: 'Xe đang đến điểm đón', tone: 'info' },
  in_transit: { code: 'In Transit', label: 'Đang vận chuyển', customerLabel: 'Đang vận chuyển', tone: 'info' },
  delivered_pending_settlement: { code: 'Delivered - Pending Settlement', label: 'Đã giao, chờ quyết toán', customerLabel: 'Đã giao ngựa', tone: 'success' },
  cancelled: { code: 'Cancelled', label: 'Khách đã hủy đơn', customerLabel: 'Đã hủy', tone: 'muted' },
}

// Các bước khách thấy trên thanh tiến độ của đơn (các luồng sau sẽ thêm bước vào cuối)
export const BOOKING_STEPS = ['Gửi đơn', 'Thẩm định', 'Báo giá', 'Đặt cọc', 'Giấy tờ pháp lý', 'Lộ trình', 'Vận chuyển', 'Quyết toán']
export const stepOf = (s: BookingStatus): number => ({
  pending_intake: 0, under_review: 1, pending_commercial: 1, awaiting_payment: 2, quote_expired: 2,
  awaiting_clearance_docs: 4, documents_submitted: 4, pending_resubmission: 4, documentation_delayed: 4, legal_docs_approved: 4, dispatch_approved: 5,
  route_planning: 5, route_plan_completed: 5, trip_manifest_approved: 5, ready_for_pickup: 6, en_route_to_pickup: 6,
  in_transit: 6, delivered_pending_settlement: 7, cancelled: 0,
}[s])

// Tra cứu công khai ở trang chủ chỉ cho thấy 5 bước gọn
export const PUBLIC_STEPS = ['Gửi đơn', 'Thẩm định', 'Đặt cọc', 'Chuẩn bị chuyến', 'Vận chuyển']
export const publicStepOf = (s: BookingStatus): number => (s === 'pending_intake' || s === 'cancelled' ? 0 : s === 'under_review' || s === 'pending_commercial' ? 1 : s === 'awaiting_payment' || s === 'quote_expired' ? 2 : s === 'in_transit' || s === 'delivered_pending_settlement' ? 4 : 3)

// ===== Giấy tờ pháp lý khách nộp sau khi đặt cọc (Flow 2, PRD mục 3.4, 12) =====
export type ClearanceDocType = 'health_cert' | 'customs_declaration' | 'poa' | 'quarantine_cert' | 'ata_carnet' | 'commercial_invoice'
export type ClearanceOption = 'quarantine' | 'ata' | 'invoice'
export const CLEARANCE_DOC: Record<ClearanceDocType, { label: string; short: string; hint: string; international: boolean; option?: ClearanceOption; optionLabel?: string }> = {
  health_cert: { label: 'Giấy chứng nhận kiểm dịch động vật vận chuyển (Health Cert)', short: 'Health Cert', hint: 'Bản có mộc đỏ của Chi cục Thú y. Microchip phải khớp ngựa trong đơn.', international: false },
  customs_declaration: { label: 'Tờ khai hải quan điện tử', short: 'Tờ khai hải quan', hint: 'Bản đã phân luồng hoặc có mã tiếp nhận. Biển số xe và cửa khẩu phải khớp Carrier Info Sheet.', international: true },
  poa: { label: 'Giấy ủy quyền áp tải (PoA)', short: 'PoA', hint: 'Đã ký, đóng mộc đỏ. Đúng họ tên, CCCD / hộ chiếu của Driver và Escort trong Carrier Info Sheet.', international: false },
  quarantine_cert: { label: 'Giấy chứng nhận cách ly kiểm dịch trước xuất phát', short: 'Giấy cách ly', hint: 'Nộp sau khi hoàn thành thời gian cách ly 7 đến 14 ngày.', international: true, option: 'quarantine', optionLabel: 'Nước đến yêu cầu cách ly kiểm dịch trước xuất phát' },
  ata_carnet: { label: 'Sổ ATA Carnet (bản scan cuống sổ)', short: 'ATA Carnet', hint: 'Chỉ khi đi thi đấu, triển lãm theo diện tạm nhập, tái xuất.', international: true, option: 'ata', optionLabel: 'Chuyến đi thi đấu / triển lãm (tạm nhập, tái xuất)' },
  commercial_invoice: { label: 'Hóa đơn thương mại (PDF)', short: 'Hóa đơn thương mại', hint: 'Chỉ khi người gửi bán ngựa cho người nhận. Cần để đối chiếu với tờ khai hải quan.', international: true, option: 'invoice', optionLabel: 'Người gửi bán ngựa cho người nhận' },
}
export const REJECT_REASONS = ['Sai biển số xe', 'Sai mã microchip', 'Thiếu mộc', 'Giấy hết hạn', 'Giấy phép không hợp lệ', 'Sai cửa khẩu', 'PoA không hợp lệ']

// ===== Đơn giá mẫu (PRD chưa có biểu giá chính thức) =====
export const CLASS_FACTOR: Record<VehicleClass, number> = { light: 1, medium: BIG_TRUCK_FACTOR, heavy: 1.9 }
export const CREW_FEE_PER_DAY = 1_800_000 // 01 Driver + 01 Escort, mỗi ngày
export const SINGLE_STALL_FEE = 1_500_000 // khoang đơn mở rộng, mỗi ngựa
export const CARRIER_DATA_FEE = { domestic: 0, international: 300_000 } // Carrier Data Package (PRD mục 11.2: miễn phí hoặc 200.000 – 500.000 đ/chuyến)
export const DEMURRAGE_PER_HOUR = 400_000 // phí lưu xe chờ (PRD mục 11.3: 300.000 – 500.000 đ/giờ)
export const INSURANCE_RATE_BOOKING = 0.02 // trên giá trị bảo hiểm của giống ngựa
// Giá trị bảo hiểm theo giống (VNĐ). Khách không tự khai; số mẫu, chờ bảng giá thật của nhà bảo hiểm.
export const BREED_INSURED_VALUE: Record<string, number> = {
  Thoroughbred: 1_000_000_000, Arabian: 800_000_000, 'Quarter Horse': 600_000_000, Warmblood: 900_000_000, Appaloosa: 500_000_000, Khác: 400_000_000,
}

// ===== Lộ trình chi tiết và Trip Manifest (Flow 3, PRD mục 4.2) =====
export const MAX_CONTINUOUS_HOURS = 4 // ngựa không đi liên tục quá 3–4 giờ
export const TARGET_LEG_HOURS = 3.5
export const MIN_REST_MINUTES = 30
export const BORDER_WINDOW = { open: 7 * 60 + 30, close: 16 * 60 + 30 } // ETA cửa khẩu nên rơi vào 07:30–16:30

// ===== Hành trình và nhật ký (Flow 4, PRD mục 5) =====
export const DELAY_ALERT_MINUTES = 30 // trễ mốc 30–45 phút thì cờ vàng Delayed Check-in
export type WelfareCondition = 'normal' | 'stress' | 'sweating'
export const WELFARE_CONDITION: Record<WelfareCondition, { label: string; tone: Tone }> = {
  normal: { label: 'Bình thường', tone: 'success' },
  stress: { label: 'Căng thẳng (Stress)', tone: 'warning' },
  sweating: { label: 'Đổ mồ hôi nhiều', tone: 'warning' },
}

// ===== Hủy đơn và hoàn cọc (PRD mục 8.3) =====
export const REFUND_RATE = { d7: 0.8, d3: 0.5, beforeCutoff: 0.2, afterCutoff: 0, forceMajeure: 0.7 } // tỷ lệ hoàn trên tiền cọc
