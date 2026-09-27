// Trạng thái hiển thị ở trang Tiếp nhận, suy ra từ đơn chung (gốc: status của manager_tiep_nhan.js).
import { CHOICE_HOURS, HOUR } from '@shared/config/business-rules'
import type { Order } from '@shared/types/order'

export type IntakeStatus = 'new' | 'needs_manager' | 'inspecting' | 'routing' | 'rejected'

export function intakeStatus(o: Order): IntakeStatus | null {
  if (o.status === 'rejected') return o.rejectedStep === 2 ? null : 'rejected' // từ chối ở bước Phê duyệt thuộc trang Phê duyệt
  if (o.pending) return 'needs_manager'
  if (!['processing', 'choose_option', 'rechecking'].includes(o.status)) return null
  if (o.stage === 'intake') return 'new'
  if (o.stage === 'inspecting') return 'inspecting'
  if (o.stage === 'routing') return 'routing'
  return null // đang chờ Phê duyệt
}

// Đơn đã gửi phương án, đang chờ khách chọn (còn hạn)
export const waitingChoice = (o: Order) => o.status === 'choose_option' && !!o.offer && !o.pending
export const choiceHoursLeft = (o: Order) => Math.max(0, Math.ceil((o.offer!.sentAt + CHOICE_HOURS * HOUR - Date.now()) / HOUR))
