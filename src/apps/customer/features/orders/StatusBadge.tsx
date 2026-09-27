// Nhãn trạng thái đơn phía khách. Chuyển từ statusBadge() của don_cua_toi.js.
import { HOUR, URGENT_HOURS } from '@shared/config/business-rules'
import { appraisalDeadline, choiceDeadline, paymentDeadline, priorityDeadline } from '@shared/lib/deadlines'
import { formatDateTime, timeLeftText } from '@shared/lib/format'
import { choiceExpired, isAppraisalOverdue } from '@shared/lib/order-status'
import type { Order } from '@shared/types/order'

export function paymentLeft(o: Order) {
  const ms = paymentDeadline(o.approvedAt!, o.departAt) - Date.now()
  return { ms, text: timeLeftText(paymentDeadline(o.approvedAt!, o.departAt)), urgent: ms < URGENT_HOURS * HOUR }
}

export function StatusBadge({ order: o }: { order: Order }) {
  switch (o.status) {
    case 'processing': return isAppraisalOverdue(o)
      ? <span className="badge badge-danger"><i className="fa-solid fa-bolt" /> Đang xử lý ưu tiên · trước {formatDateTime(priorityDeadline(o.submittedAt, o.departAt))}</span>
      : <span className="badge badge-info"><i className="fa-solid fa-hourglass-half" /> Chờ thẩm định · trước {formatDateTime(appraisalDeadline(o.submittedAt, o.departAt))}</span>
    case 'awaiting_payment': {
      const left = paymentLeft(o)
      return <span className={`badge ${left.urgent ? 'badge-danger' : 'badge-warning'}`}><i className="fa-regular fa-clock" /> Chờ thanh toán · còn {left.text}</span>
    }
    case 'paid': return <span className="badge badge-success"><i className="fa-solid fa-check" /> Đã thanh toán · chờ khởi hành</span>
    case 'in_transit': return <span className="badge badge-info"><i className="fa-solid fa-truck-moving" /> Đang vận chuyển · dự kiến giao {formatDateTime(o.trip!.eta)}</span>
    case 'delivered': return <span className="badge badge-warning"><i className="fa-solid fa-clipboard-check" /> Đã giao · chờ bạn nghiệm thu</span>
    case 'disputed': return <span className="badge badge-danger"><i className="fa-solid fa-triangle-exclamation" /> Đang xử lý báo cáo nghiệm thu</span>
    case 'completed': return <span className="badge badge-success"><i className="fa-solid fa-flag-checkered" /> Hoàn thành</span>
    case 'rejected': return <span className="badge badge-muted"><i className="fa-solid fa-xmark" /> Bị từ chối</span>
    case 'choose_option': return choiceExpired(o)
      ? <span className="badge badge-muted"><i className="fa-solid fa-clock" /> Quá hạn phản hồi</span>
      : <span className="badge badge-danger"><i className="fa-solid fa-circle-exclamation" /> Chờ bạn phản hồi · còn {timeLeftText(choiceDeadline(o.offer!.sentAt))}</span>
    case 'rechecking': return <span className="badge badge-info"><i className="fa-solid fa-magnifying-glass" /> Đang kiểm tra lại</span>
    case 'cancelled': return <span className="badge badge-muted"><i className="fa-solid fa-ban" /> Đã hủy</span>
  }
}
