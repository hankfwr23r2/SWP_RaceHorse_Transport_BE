// Coordinator: kiểm tra sẵn sàng và phát lệnh xuất bến sau khi Specialist duyệt hồ sơ pháp lý (PRD mục 3.6).
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { docsDueAt } from '@shared/lib/booking'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { Tabs } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

type Tab = 'todo' | 'waiting' | 'done'

export default function DispatchListPage() {
  const { session } = useAuth()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.coordinator.name === session!.name && b.payment)
  const groups: Record<Tab, typeof mine> = {
    todo: mine.filter(b => b.status === 'legal_docs_approved'),
    waiting: mine.filter(b => ['awaiting_clearance_docs', 'documents_submitted', 'pending_resubmission', 'documentation_delayed'].includes(b.status)),
    done: mine.filter(b => b.status === 'dispatch_approved'),
  }
  const shown = groups[tab]

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Lệnh xuất bến</h1>
          <p>Chỉ phát lệnh khi Specialist đã duyệt hồ sơ pháp lý. Kiểm tra lần cuối xe, tài xế, hộ tống rồi đẩy lệnh xuống app Driver và Escort.</p>
        </div>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Sẵn sàng phát lệnh', groups.todo.length], ['waiting', 'Chờ hồ sơ pháp lý', groups.waiting.length], ['done', 'Đã phát lệnh', groups.done.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>{tab === 'waiting' ? 'Hạn nộp giấy' : 'Duyệt pháp lý'}</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {shown.map(b => (
                <tr key={b.id}>
                  <td className={s.id}>{b.id}</td>
                  <td>{b.customer}</td>
                  <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                  <td className="nowrap">{formatDate(b.departAt)}</td>
                  <td className="nowrap">{tab === 'waiting' ? formatDateTime(docsDueAt(b.departAt)) : b.clearance?.approvedAt ? formatDateTime(b.clearance.approvedAt) : '—'}</td>
                  <td><BookingStatusBadge status={b.status} audience="staff" />{b.status === 'documentation_delayed' && <div className={s.sub} style={{ color: 'var(--red)' }}>Hoãn lệnh xuất bến</div>}</td>
                  <td className="text-right"><Link to={`/coordinator/dispatch/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Kiểm tra và phát lệnh' : 'Xem'}</Link></td>
                </tr>
              ))}
              {all && !shown.length && <tr><td colSpan={7}><div className={s.empty}><i className="fa-solid fa-circle-check" />Không có đơn nào ở mục này.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
