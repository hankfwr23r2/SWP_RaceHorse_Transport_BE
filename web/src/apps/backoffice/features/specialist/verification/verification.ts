// Quy tắc trang Xác minh hồ sơ. Chuyển từ Specialist/kiem_dich.js (progressOf, deadlineOf, TABS).
// - Kiểm dịch viên xác minh BẰNG TAY từng giấy của từng ngựa; hệ thống không tự đọc tài liệu.
// - Kiểm dịch viên KHÔNG từ chối đơn. Kết luận: hợp lệ → Điều phối; yêu cầu khách bổ sung; báo cáo vấn đề → Manager.
import { DOC_LABEL, FILE_PREFIX, requiredDocs, type DocKey } from '@shared/config/documents'
import { taskDeadline } from '@shared/lib/deadlines'
import type { DocDecision, Horse, Order } from '@shared/types/order'

export type VerifyState = 'verifying' | 'waiting' | 'passed' | 'reported'

const PASSED: Order['status'][] = ['awaiting_payment', 'paid', 'in_transit', 'delivered', 'disputed', 'completed']

// Tình trạng đơn với kiểm dịch viên `me` (null = không thuộc danh sách của người này)
export function verifyState(o: Order, me: string): VerifyState | null {
  if (o.inspector !== me) return null
  if (o.pending || o.status === 'choose_option') return 'reported'
  if (o.stage === 'inspecting' && o.waitingCustomer) return 'waiting'
  if (o.stage === 'inspecting' && (o.status === 'processing' || o.status === 'rechecking')) return 'verifying'
  if (o.stage === 'routing' || o.stage === 'approval' || PASSED.includes(o.status)) return 'passed'
  if (o.status === 'rejected' && o.rejectedStep === 1 && o.report?.inspector === me) return 'reported'
  return null
}

// Tên tệp khách đã tải lên cho một giấy của một ngựa
export const fileOf = (h: Horse, key: DocKey) => `${FILE_PREFIX[key]}_${h.name.replace(/\s+/g, '_')}.pdf`

export const docLabel = (horse: string, key: DocKey) => `${horse} · ${DOC_LABEL[key]}`

// Kết luận của một giấy. Đơn cũ không lưu từng giấy: đã qua kiểm dịch → hợp lệ; đã báo cáo → giấy nêu trong căn cứ là không hợp lệ.
export function decisionOf(o: Order, state: VerifyState, horse: string, key: DocKey): DocDecision | undefined {
  const saved = o.verification?.docs[horse]?.[key]
  if (saved || state === 'verifying' || state === 'waiting' || o.verification) return saved
  if (state === 'passed') return { decision: 'valid', reason: '' }
  const invalid = o.report?.evidence?.includes(docLabel(horse, key))
  return invalid ? { decision: 'invalid', reason: o.report!.note } : { decision: 'valid', reason: '' }
}

export interface DocItem { horse: Horse; key: DocKey; doc?: DocDecision }
export const docItems = (o: Order, state: VerifyState): DocItem[] =>
  o.horses.flatMap(horse => requiredDocs(!!o.border).map(key => ({ horse, key, doc: decisionOf(o, state, horse.name, key) })))

export function progressOf(o: Order, state: VerifyState) {
  const items = docItems(o, state)
  const decided = items.filter(i => i.doc).length
  const invalid = items.filter(i => i.doc?.decision === 'invalid').length
  return { total: items.length, decided, invalid, allDecided: decided === items.length, allValid: decided === items.length && invalid === 0 }
}

// Hạn xử lý: mốc sớm hơn của 2 ngày làm việc và khởi hành − 7 ngày; cộng thêm số ngày đã tạm dừng chờ khách
export const deadlineOf = (o: Order) => taskDeadline({
  assignedAt: o.task?.assignedAt ?? o.intakeAt ?? o.submittedAt,
  departure: o.departAt,
  pausedWorkingDays: o.task?.pausedWorkingDays ?? 0,
  specialDeadline: o.task?.specialDeadline,
}, 'inspector')

export const assignedAt = (o: Order) => o.task?.assignedAt ?? o.intakeAt ?? o.submittedAt
// Lúc kết luận (đơn đã xử lý)
export const closedAt = (o: Order) => o.verification?.closedAt ?? o.pending?.at ?? o.offer?.sentAt ?? o.rejectedAt
