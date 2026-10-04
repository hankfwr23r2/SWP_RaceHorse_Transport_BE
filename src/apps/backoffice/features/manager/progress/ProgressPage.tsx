// Manager: xem tổng quan trạng thái và tiến độ của mọi đơn (chỉ xem, không thao tác).
import { useState } from 'react'
import { BOOKING_STEPS, stepOf } from '@shared/config/booking-rules'
import { ORDER_GROUPS, orderGroupOf, transitProgress, type OrderGroup } from '@shared/lib/booking'
import { formatDate } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

function Steps({ b }: { b: Booking }) {
  const at = stepOf(b.status)
  const moving = at === 6 && (b.trips ?? []).some(t => t.run?.startedAt)
  return (
    <>
      <b>{at >= BOOKING_STEPS.length ? 'Đã qua mọi bước' : `Bước ${at + 1}/${BOOKING_STEPS.length}: ${BOOKING_STEPS[at]}`}</b>
      <ol className={s.stepBar} aria-label="Các bước của đơn">{BOOKING_STEPS.map((label, i) => <li key={label} title={label} className={i < at ? s.segDone : i === at ? s.segNow : ''} />)}</ol>
      {moving && (b.trips ?? []).map(t => { const p = transitProgress(t); return p && <div key={t.tripId} className={s.sub}>Xe {t.tripId}: mốc {Math.min(p.done + 1, p.total)}/{p.total}{p.current ? ` · ${p.current}` : ''}</div> })}
    </>
  )
}

const GROUPS = Object.keys(ORDER_GROUPS) as OrderGroup[]

export default function ProgressPage() {
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<OrderGroup>('moving')
  const list = all ?? []
  const by = (g: OrderGroup) => list.filter(b => orderGroupOf(b) === g)
  const shown = by(tab).sort((a, z) => a.departAt - z.departAt)
  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Tiến độ đơn</h1>
          <p>Tổng quan trạng thái và tiến độ của các đơn. Trang chỉ để xem.</p>
        </div>
        <ListLayout<OrderGroup> value={tab} onChange={setTab} tabs={GROUPS.map(g => [g, ORDER_GROUPS[g].label, by(g).length])}>
          {shown.map(b => (
            <OrderCard key={b.id} id={b.id} customer={b.customer} route={`${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`} kind={b.type === 'international' ? `Quốc tế${b.gate ? ` · ${b.gate}` : ''}` : 'Trong nước'}
              badge={<BookingStatusBadge status={b.status} audience="staff" />}
              meta={[['fa-calendar-day', 'Khởi hành', formatDate(b.departAt)], ['fa-horse-head', 'Ngựa', `${b.horses.length} con`], ['fa-truck', 'Số xe', `${b.trips?.length ?? 0}`]]}
              note={<Steps b={b} />} />
          ))}
          {all && !shown.length && <EmptyCard icon="fa-inbox" text="Không có đơn nào ở mục này." />}
        </ListLayout>
      </div>
    </div>
  )
}
