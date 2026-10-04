// Coordinator: chuẩn bị bộ giấy cho Driver của từng xe (PRD mục 3.2, 4.3). Lệnh điều xe tự phát xuống app sau khi khách đặt cọc.
import { ReadMore } from '@shared/ui/ReadMore'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'

type Tab = 'todo' | 'done'
const OPEN = ['waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup']

export default function DispatchListPage() {
  const { session } = useAuth()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.coordinator.name === session!.name && b.payment && OPEN.includes(b.status))
  const groups: Record<Tab, typeof mine> = {
    todo: mine.filter(b => (b.trips ?? []).some(t => !t.driverPack)),
    done: mine.filter(b => (b.trips ?? []).every(t => t.driverPack)),
  }
  const shown = groups[tab]

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Giấy cho tài xế</h1>
          <ReadMore text={'Đơn đã đặt cọc. Lệnh điều xe đã phát xuống tài xế và hộ tống; bạn nhập bộ giấy để từng tài xế mang theo, xuất trình ở cửa khẩu và khi làm việc với cơ quan chức năng.'} />
        </div>
        <ListLayout<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Cần chuẩn bị', groups.todo.length], ['done', 'Đã nhập đủ', groups.done.length]]}>
          {shown.map(b => (
            <OrderCard key={b.id} id={b.id} customer={b.customer} route={`${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`} kind={b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}
              badge={<BookingStatusBadge status={b.status} audience="staff" />}
              meta={[['fa-calendar-day', 'Khởi hành', formatDate(b.departAt)], ['fa-truck', 'Bộ giấy cho tài xế', `${(b.trips ?? []).filter(t => t.driverPack).length}/${b.trips?.length ?? 0} xe`], ...(b.payment ? [['fa-wallet', 'Đã cọc lúc', formatDateTime(b.payment.paidAt)] as [string, string, string]] : [])]}
              action={<Link to={`/coordinator/dispatch/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Nhập bộ giấy' : 'Xem'}</Link>} />
          ))}
          {all && !shown.length && <EmptyCard text="Không có đơn nào ở mục này." />}
        </ListLayout>
      </div>
    </div>
  )
}
