// Tra cứu đơn công khai (trang chủ): mã đơn + 4 số cuối SĐT người đặt.
// Chỉ trả tiến trình, tuyến, ngày; không có tên khách, giá hay giấy tờ.
// Trước đây home.js có bộ TRACK_ORDERS riêng; nay suy ra từ bộ đơn chuẩn.
import { currentStep } from '../lib/order-status'
import type { Order } from '../types/order'
import { ordersApi } from './orders'

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

function toPublic(o: Order): PublicTracking {
  const route = o.routeShort.replace('(KH)', '(Campuchia)').replace('(LA)', '(Lào)')
  const base = { route, depart: o.departAt, step: currentStep(o) }
  switch (o.status) {
    case 'processing': case 'rechecking': return { ...base, status: 'Đang thẩm định' }
    case 'choose_option': return { ...base, status: 'Cần người đặt phản hồi', tone: 'warn', note: 'Hồ sơ cần người đặt chọn phương án xử lý. Vui lòng đăng nhập để xem chi tiết.' }
    case 'awaiting_payment': return { ...base, status: 'Chờ thanh toán', tone: 'warn' }
    case 'paid': return { ...base, status: 'Đã thanh toán · chờ khởi hành' }
    case 'in_transit': {
      const cp = o.trip?.checkpoints.find(c => c.state === 'current')
      return { ...base, status: 'Đang vận chuyển', now: cp && o.trip ? { place: `${cp.place} — ${cp.label.toLowerCase()}`, at: o.trip.updatedAt, eta: o.trip.eta } : undefined }
    }
    case 'delivered': case 'disputed': return { ...base, status: 'Đã giao · chờ nghiệm thu' }
    case 'completed': return { ...base, done: true, status: 'Hoàn thành', tone: 'done' }
    case 'rejected': return { ...base, status: 'Bị từ chối', tone: 'bad' }
    case 'cancelled': return { ...base, status: 'Đã hủy', tone: 'bad' }
  }
}

// null = không tìm thấy hoặc SĐT không khớp (không tiết lộ đơn có tồn tại hay không)
export async function trackOrder(code: string, phoneLast4: string): Promise<PublicTracking | null> {
  const order = await ordersApi.get(code)
  return order && order.phoneLast4 === phoneLast4 ? toPublic(order) : null
}
