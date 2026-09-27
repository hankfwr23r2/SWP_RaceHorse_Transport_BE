// Quy tắc trang Chuẩn bị giấy tờ chuyến đi (đơn ĐÃ THANH TOÁN). Chuyển từ Specialist/thu_tuc.js (itemsOf, progressOf, TABS).
// - Khách gửi BẢN GỐC trước 17:00 D−3; kiểm dịch viên đối chiếu với bản scan đã xác minh rồi xác nhận đã nhận.
// - Giấy do cơ quan chức năng cấp: làm thủ tục bên ngoài hệ thống, rồi nhập số giấy, cơ quan cấp, ngày cấp, hiệu lực, bản scan.
//   Giấy có thời hạn phải còn hiệu lực đến hết ngày giao dự kiến.
// - Bàn giao cho Điều phối viên trước 12:00 D−2, chỉ khi mọi giấy đã đủ. Kiểm dịch viên KHÔNG từ chối đơn: vướng thì báo Manager.
import { DOC_LABEL, PROCEDURES, proceduresFor, requiredDocs, type DocKey, type ProcedureKey } from '@shared/config/documents'
import { expiresEarly } from '@shared/lib/trip'
import type { Order } from '@shared/types/order'

export type PapersState = 'preparing' | 'ready' | 'handed' | 'reported'

export const procedureExpiresEarly = (o: Order, key: ProcedureKey) => {
  const p = o.papers?.procedures[key]
  return !!(p && PROCEDURES[key].hasValidity && p.validUntil && expiresEarly(p.validUntil, o.departAt, o.duration))
}

export type PapersItem =
  | { kind: 'procedure'; key: ProcedureKey; label: string; done: boolean }
  | { kind: 'original'; horse: string; key: DocKey; label: string; done: boolean }

// Mọi việc của một đơn: giấy cơ quan cấp + bản gốc từng giấy của từng ngựa
export function itemsOf(o: Order): PapersItem[] {
  const procedures = proceduresFor(!!o.border).map(key => ({ kind: 'procedure' as const, key, label: PROCEDURES[key].label, done: !!o.papers?.procedures[key] && !procedureExpiresEarly(o, key) }))
  const originals = o.horses.flatMap(h => requiredDocs(!!o.border).map(key => ({ kind: 'original' as const, horse: h.name, key, label: `${h.name} · ${DOC_LABEL[key]}`, done: !!o.papers?.originals[h.name]?.[key] })))
  return [...procedures, ...originals]
}

export function progressOf(o: Order) {
  const items = itemsOf(o)
  const done = items.filter(i => i.done).length
  return { total: items.length, done, ready: done === items.length }
}

// Tình trạng giấy tờ của đơn với kiểm dịch viên `me` (null = không thuộc danh sách)
export function papersState(o: Order, me: string): PapersState | null {
  if (o.inspector !== me || !o.papers) return null
  if (o.papers.handedAt) return 'handed'
  if (o.papersReport) return 'reported'
  if (o.status !== 'paid') return null
  return progressOf(o).ready ? 'ready' : 'preparing'
}
