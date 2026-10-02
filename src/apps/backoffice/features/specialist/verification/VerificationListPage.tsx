// Specialist: hồ sơ được giao thẩm định y tế (PRD mục 2.4, nhánh A).
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { Tabs } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

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
          <p>Hồ sơ ngựa được giao cho bạn. Đối chiếu hộ chiếu, microchip, xét nghiệm và đặt chỉ dẫn an sinh cho chuyến đi.</p>
        </div>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Cần thẩm định', groups.todo.length], ['waiting', 'Chờ khách bổ sung', groups.waiting.length], ['done', 'Đã đạt y tế', groups.done.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>Ngựa</th><th>{tab === 'waiting' ? 'Yêu cầu bổ sung' : 'Giao lúc'}</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {shown.map(b => (
                <tr key={b.id}>
                  <td className={s.id}>{b.id}</td>
                  <td>{b.customer}</td>
                  <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                  <td className="nowrap">{formatDate(b.departAt)}</td>
                  <td>{b.horses.length}</td>
                  <td className="nowrap">{tab === 'waiting' ? formatDateTime(b.medical!.resubmit!.at) : formatDateTime(b.intake!.at)}</td>
                  <td className="text-right"><Link to={`/specialist/verification/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Thẩm định' : 'Xem'}</Link></td>
                </tr>
              ))}
              {all && !shown.length && <tr><td colSpan={7}><div className={s.empty}><i className="fa-solid fa-circle-check" />Không có hồ sơ nào ở mục này.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
