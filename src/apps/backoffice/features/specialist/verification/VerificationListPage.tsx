// Specialist: hồ sơ được giao thẩm định y tế (PRD mục 2.4, nhánh A).
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'

type Tab = 'todo' | 'waiting' | 'done'

export default function VerificationListPage() {
  const { session } = useAuth()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.specialist.name === session!.name && b.medical)
  const groups: Record<Tab, typeof mine> = {
    todo: mine.filter(b => b.medical!.status === 'pending'),
    waiting: mine.filter(b => b.medical!.status === 'resubmit'),
    done: mine.filter(b => b.medical!.status === 'approved'),
  }
  const shown = groups[tab]

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Thẩm định y tế</h1>
          <p>Hồ sơ ngựa được giao cho bạn. Đối chiếu hộ chiếu, microchip, xét nghiệm và xác nhận đạt y tế.</p>
        </div>
        <ListLayout<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Cần thẩm định', groups.todo.length], ['waiting', 'Chờ khách bổ sung', groups.waiting.length], ['done', 'Đã đạt y tế', groups.done.length]]}>
          {shown.map(b => (
            <OrderCard key={b.id} id={b.id} customer={b.customer} route={`${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`} kind={b.type === 'international' ? 'Quốc tế' : 'Trong nước'}
              meta={[['fa-calendar-day', 'Khởi hành', formatDate(b.departAt)], ['fa-horse-head', 'Ngựa', `${b.horses.length} con`], ['fa-clock', tab === 'waiting' ? 'Yêu cầu bổ sung' : 'Giao lúc', formatDateTime(tab === 'waiting' ? b.medical!.resubmit!.at : b.intake!.at)]]}
              action={<Link to={`/specialist/verification/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Thẩm định' : 'Xem'}</Link>} />
          ))}
          {all && !shown.length && <EmptyCard text="Không có hồ sơ nào ở mục này." />}
        </ListLayout>
      </div>
    </div>
  )
}
