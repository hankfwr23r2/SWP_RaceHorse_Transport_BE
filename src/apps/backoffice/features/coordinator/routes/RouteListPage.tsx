// Coordinator: lập lộ trình chi tiết từng chặng sau khi lệnh xuất bến được phát (Flow 3, PRD mục 4).
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { Tabs } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

type Tab = 'todo' | 'waiting' | 'done'

export default function RouteListPage() {
  const { session } = useAuth()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.coordinator.name === session!.name)
  const groups: Record<Tab, typeof mine> = {
    todo: mine.filter(b => b.status === 'route_planning'),
    waiting: mine.filter(b => b.status === 'route_plan_completed'),
    done: mine.filter(b => ['trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup'].includes(b.status)),
  }
  const shown = groups[tab].sort((a, z) => a.departAt - z.departAt)

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Lộ trình chi tiết</h1>
          <p>Chia chặng, chọn trạm nghỉ xả cơ, trạm thú y khẩn cấp và giờ tới cửa khẩu. Ngựa không đi liên tục quá 4 giờ.</p>
        </div>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Cần lập lộ trình', groups.todo.length], ['waiting', 'Chờ Manager duyệt', groups.waiting.length], ['done', 'Đã duyệt Manifest', groups.done.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {shown.map(b => (
                <tr key={b.id}>
                  <td className={s.id}>{b.id}</td>
                  <td>{b.customer}</td>
                  <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                  <td className="nowrap">{formatDate(b.departAt)}{b.fleet && <div className={s.sub}>ETD {formatDateTime(b.fleet.etd)}</div>}</td>
                  <td><BookingStatusBadge status={b.status} audience="staff" />{b.route?.returnNote && <div className={s.sub} style={{ color: 'var(--red)' }}>Manager trả về</div>}</td>
                  <td className="text-right"><Link to={`/coordinator/routes/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Lập lộ trình' : 'Xem'}</Link></td>
                </tr>
              ))}
              {all && !shown.length && <tr><td colSpan={6}><div className={s.empty}><i className="fa-solid fa-circle-check" />Không có đơn nào ở mục này.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
