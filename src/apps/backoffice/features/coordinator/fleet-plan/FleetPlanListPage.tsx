// Coordinator: đơn được giao chốt xe, tài xế, hộ tống và lộ trình (PRD mục 2.4, nhánh B). Xe đã được hệ thống tự gán.
import { ReadMore } from '@shared/ui/ReadMore'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'

type Tab = 'todo' | 'done'

export default function FleetPlanListPage() {
  const { session } = useAuth()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.coordinator.name === session!.name)
  const todo = mine.filter(b => b.status === 'under_review')
  const done = mine.filter(b => b.status !== 'under_review' && b.plan)
  const shown = tab === 'todo' ? todo : done

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Xe và lộ trình</h1>
          <ReadMore text={'Đơn được giao cho bạn. Hệ thống đã tự gán xe, tài xế và hộ tống (nhiều xe nếu đơn đông ngựa). Bạn xem lại, sửa nếu cần, lập lộ trình chi tiết rồi xác nhận.'} />
        </div>
        <ListLayout<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Cần xác nhận', todo.length], ['done', 'Đã chốt', done.length]]}>
          {shown.map(b => (
            <OrderCard key={b.id} id={b.id} customer={b.customer} route={`${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`} kind={b.type === 'international' ? `Quốc tế · ${b.gate ?? 'chưa chọn cửa khẩu'}` : 'Trong nước'}
              meta={[['fa-calendar-day', 'Khởi hành', formatDate(b.departAt)], ['fa-horse-head', 'Ngựa', `${b.horses.length} con`], ['fa-truck', 'Số xe', `${b.trips?.length ?? 0}${b.plan ? ' · đã chốt' : ''}`], ['fa-clock', tab === 'done' ? 'Chốt lúc' : 'Giao lúc', formatDateTime(tab === 'done' ? b.plan!.at : b.intake!.at)]]}
              action={<Link to={`/coordinator/fleet-plan/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Xem và xác nhận' : 'Xem'}</Link>} />
          ))}
          {all && !shown.length && <EmptyCard text="Không có đơn nào ở mục này." />}
        </ListLayout>
      </div>
    </div>
  )
}
