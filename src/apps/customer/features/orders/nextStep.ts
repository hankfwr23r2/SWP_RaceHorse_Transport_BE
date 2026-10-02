// "Bước tiếp theo" của đơn phía khách: mỗi trạng thái nói rõ khách đang chờ ai, hoặc cần làm gì.
import { HOUR } from '@shared/config/business-rules'
import type { Tone } from '@shared/config/booking-rules'
import { currentCheckpoint, docsDueAt } from '@shared/lib/booking'
import { formatDateTime, formatVND, timeLeftText } from '@shared/lib/format'
import type { CustomerBookingView } from '@shared/services/bookings'

// Đã đặt cọc: có Carrier Info Sheet và phải nộp giấy tờ pháp lý
export const POST_PAYMENT: CustomerBookingView['status'][] = ['awaiting_clearance_docs', 'documents_submitted', 'pending_resubmission', 'documentation_delayed', 'legal_docs_approved', 'dispatch_approved', 'route_planning', 'route_plan_completed', 'trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']
// Từ lúc lập lộ trình chi tiết trở đi: hành trình quan trọng hơn giấy tờ đã duyệt
export const ROUTE_STAGE: CustomerBookingView['status'][] = ['route_planning', 'route_plan_completed', 'trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']
// Đã có lộ trình được duyệt: khách xem được tóm tắt hành trình
export const ROUTE_VISIBLE: CustomerBookingView['status'][] = ['trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']

export interface NextStep {
  tone: Tone
  icon: string
  title: string
  text: string
  actionNeeded: boolean // khách phải làm gì đó
}

// Còn bao lâu tới hạn nộp giấy tờ
const ms = (b: CustomerBookingView, now: number) => docsDueAt(b.departAt) - now

export function nextStep(b: CustomerBookingView, now: number): NextStep {
  switch (b.status) {
    case 'pending_intake':
      return { tone: 'info', icon: 'fa-inbox', title: 'Đang chờ Quản lý tiếp nhận', text: 'Quản lý sẽ giao Kiểm dịch viên và Điều phối viên thẩm định đơn của bạn.', actionNeeded: false }
    case 'under_review':
      return b.medical?.status === 'resubmit'
        ? { tone: 'danger', icon: 'fa-file-circle-exclamation', title: 'Cần bạn bổ sung hồ sơ ngựa', text: b.medical.resubmit?.reason ?? 'Kiểm dịch viên yêu cầu bổ sung giấy tờ.', actionNeeded: true }
        : { tone: 'info', icon: 'fa-magnifying-glass', title: 'Đang thẩm định', text: 'Kiểm dịch viên kiểm tra hồ sơ ngựa, Điều phối viên lập phương án xe và lộ trình. Hai việc chạy song song.', actionNeeded: false }
    case 'pending_commercial':
      return { tone: 'orange', icon: 'fa-file-invoice-dollar', title: 'Đang lập báo giá', text: 'Thẩm định đã xong. Quản lý đang duyệt báo giá chính thức để gửi cho bạn.', actionNeeded: false }
    case 'awaiting_payment': {
      const ms = b.quote!.expiresAt - now
      return { tone: ms < 12 * HOUR ? 'danger' : 'warning', icon: 'fa-credit-card', title: `Đặt cọc 50% trong ${timeLeftText(b.quote!.expiresAt, now)}`, text: `Báo giá có hiệu lực đến ${formatDateTime(b.quote!.expiresAt)}. Quá hạn, xe và nhân sự được nhả cho đơn khác.`, actionNeeded: true }
    }
    case 'quote_expired':
      return { tone: 'muted', icon: 'fa-hourglass-end', title: 'Báo giá đã hết hạn', text: 'Quá 48 giờ chưa đặt cọc nên xe và nhân sự đã được nhả. Bạn có thể tạo đơn mới.', actionNeeded: false }
    case 'awaiting_clearance_docs':
      return { tone: ms(b, now) < 12 * HOUR ? 'danger' : 'warning', icon: 'fa-file-circle-plus', title: `Nộp giấy tờ pháp lý trước ${formatDateTime(docsDueAt(b.departAt))}`, text: 'Dùng Carrier Info Sheet để xin Giấy kiểm dịch và mở Tờ khai hải quan, rồi tải lên hệ thống.', actionNeeded: true }
    case 'documents_submitted':
      return { tone: 'info', icon: 'fa-file-circle-check', title: 'Đã nộp giấy tờ, chờ kiểm tra', text: 'Kiểm dịch viên đang đối chiếu hồ sơ của bạn với thông tin xe, tài xế và ngựa.', actionNeeded: false }
    case 'pending_resubmission':
      return { tone: 'danger', icon: 'fa-file-circle-exclamation', title: 'Cần bạn nộp lại giấy tờ', text: b.clearance?.rejection ? `${b.clearance.rejection.reasons.join(', ')}. ${b.clearance.rejection.note}` : 'Kiểm dịch viên yêu cầu bổ sung giấy tờ.', actionNeeded: true }
    case 'documentation_delayed':
      return { tone: 'danger', icon: 'fa-triangle-exclamation', title: 'Quá hạn nộp giấy tờ, xe đang chờ', text: `Hạn là ${formatDateTime(docsDueAt(b.departAt))}. Bạn còn đến 06:00 ngày khởi hành để nộp. Thời gian xe chờ do thiếu hồ sơ tính phí lưu xe ${formatVND(b.quote?.demurragePerHour ?? 0)} mỗi giờ.`, actionNeeded: true }
    case 'legal_docs_approved':
      return { tone: 'success', icon: 'fa-stamp', title: 'Hồ sơ pháp lý đã được duyệt', text: 'Điều phối viên đang kiểm tra lần cuối xe, tài xế và hộ tống để ra lệnh xuất bến.', actionNeeded: false }
    case 'dispatch_approved':
      return { tone: 'success', icon: 'fa-truck-fast', title: 'Đã duyệt xuất bến', text: 'Xe chuyên dụng đang được chuẩn bị. Lộ trình chi tiết sẽ được lập và gửi bạn trước ngày khởi hành.', actionNeeded: false }
    case 'route_planning':
      return { tone: 'info', icon: 'fa-route', title: 'Đang lập lộ trình chi tiết', text: 'Điều phối viên chia chặng, chọn trạm nghỉ và trạm thú y dự phòng. Bạn sẽ nhận lộ trình khi Quản lý duyệt.', actionNeeded: false }
    case 'route_plan_completed':
      return { tone: 'orange', icon: 'fa-map-location-dot', title: 'Lộ trình đang chờ Quản lý duyệt', text: 'Lộ trình đã lập xong, Quản lý đang rà soát trước khi gửi xuống tài xế và hộ tống.', actionNeeded: false }
    case 'trip_manifest_approved':
      return { tone: 'success', icon: 'fa-clipboard-check', title: 'Lộ trình đã được duyệt', text: 'Hãy chuẩn bị sẵn các bản gốc hồ sơ (Hộ chiếu ngựa, Giấy kiểm dịch, PoA…) để bàn giao cho tài xế tại điểm đón.', actionNeeded: false }
    case 'ready_for_pickup':
      return { tone: 'success', icon: 'fa-circle-check', title: 'Tài xế và hộ tống đã sẵn sàng', text: `Xe sẽ đến điểm đón vào ${b.fleet ? formatDateTime(b.fleet.etd) : 'giờ đã hẹn'}. Hãy chuẩn bị sẵn các bản gốc hồ sơ để bàn giao.`, actionNeeded: false }
    case 'en_route_to_pickup':
      return { tone: 'info', icon: 'fa-truck-moving', title: 'Xe đang đến điểm đón ngựa', text: 'Vui lòng chuẩn bị bản gốc hồ sơ và có mặt tại điểm đón để ký biên bản giao nhận.', actionNeeded: false }
    case 'in_transit': {
      const cp = currentCheckpoint(b)
      return { tone: 'info', icon: 'fa-truck-fast', title: 'Ngựa đang trên đường', text: cp ? `Mốc tiếp theo: ${cp.label.toLowerCase()} tại ${cp.place}, dự kiến ${formatDateTime(cp.plannedAt)}.` : 'Đang trên đường tới điểm giao.', actionNeeded: false }
    }
    case 'cancelled':
      return { tone: 'muted', icon: 'fa-ban', title: 'Đơn đã hủy', text: b.cancellation ? (b.payment ? `Hoàn ${Math.round(b.cancellation.rate * 100)}% tiền cọc, tức ${formatVND(b.cancellation.refund)}. Tiền hoàn về tài khoản bạn dùng để đặt cọc.` : 'Đơn hủy khi chưa đặt cọc, không phát sinh phí.') : 'Đơn đã hủy.', actionNeeded: false }
    case 'delivered_pending_settlement':
      return { tone: 'success', icon: 'fa-flag-checkered', title: 'Đã giao ngựa an toàn', text: `Ngựa đã được bàn giao cho người nhận${b.trip?.deliveredAt ? ` lúc ${formatDateTime(b.trip.deliveredAt)}` : ''}. Chúng tôi sẽ gửi bảng quyết toán chi phí thực tế sau khi đối soát chứng từ.`, actionNeeded: false }
  }
}
