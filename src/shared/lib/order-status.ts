// Trạng thái đơn phía khách. Chuyển nguyên từ don_cua_toi.js (currentStep, isAppraisalOverdue, choiceExpired…).
import { CUSTOMER_STEPS } from '../config/business-rules'
import type { Order } from '../types/order'
import { appraisalDeadline, choiceDeadline, paymentDeadline } from './deadlines'

// Bước hiện tại trên thanh tiến trình 5 bước của khách
export function currentStep(order: Order): number {
  switch (order.status) {
    case 'processing': case 'choose_option': case 'rechecking': case 'rejected': return 1
    case 'awaiting_payment': return 2
    case 'paid': case 'in_transit': return 3
    case 'delivered': case 'disputed': return 4
    case 'completed': return CUSTOMER_STEPS.length
    case 'cancelled': return order.approvedAt ? 2 : 1
  }
}

export const isAppraisalOverdue = (o: Order, now = Date.now()) => o.status === 'processing' && now > appraisalDeadline(o.submittedAt, o.departAt)
export const choiceExpired = (o: Order, now = Date.now()) => o.status === 'choose_option' && !!o.offer && now > choiceDeadline(o.offer.sentAt)
export const paymentOverdue = (o: Order, now = Date.now()) => o.status === 'awaiting_payment' && now > paymentDeadline(o.approvedAt!, o.departAt)
