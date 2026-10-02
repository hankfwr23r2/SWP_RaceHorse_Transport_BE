import { BOOKING_STATUS, type BookingStatus, type Tone } from '../config/booking-rules'

const ICON: Record<BookingStatus, string> = {
  pending_intake: 'fa-inbox',
  under_review: 'fa-magnifying-glass',
  pending_commercial: 'fa-file-invoice-dollar',
  awaiting_payment: 'fa-credit-card',
  quote_expired: 'fa-hourglass-end',
  awaiting_clearance_docs: 'fa-file-circle-plus',
  documents_submitted: 'fa-file-circle-check',
  pending_resubmission: 'fa-file-circle-exclamation',
  documentation_delayed: 'fa-triangle-exclamation',
  legal_docs_approved: 'fa-stamp',
  dispatch_approved: 'fa-truck-fast',
  route_planning: 'fa-route',
  route_plan_completed: 'fa-map-location-dot',
  trip_manifest_approved: 'fa-clipboard-check',
  ready_for_pickup: 'fa-circle-check',
  en_route_to_pickup: 'fa-truck-moving',
  in_transit: 'fa-truck-fast',
  delivered_pending_settlement: 'fa-flag-checkered',
  cancelled: 'fa-ban',
}
const CLASS: Record<Tone, string> = { info: 'badge-info', warning: 'badge-warning', success: 'badge-success', danger: 'badge-danger', muted: 'badge-muted', orange: 'badge-orange' }

// Nhãn trạng thái đơn. Khách thấy nhãn dễ hiểu; nội bộ thấy nhãn nghiệp vụ, mã gốc theo PRD nằm ở tooltip.
export function BookingStatusBadge({ status, audience = 'customer' }: { status: BookingStatus; audience?: 'customer' | 'staff' }) {
  const s = BOOKING_STATUS[status]
  return (
    <span className={`badge ${CLASS[s.tone]}`} title={s.code}>
      <i className={`fa-solid ${ICON[status]}`} aria-hidden="true" /> {audience === 'customer' ? s.customerLabel : s.label}
    </span>
  )
}
