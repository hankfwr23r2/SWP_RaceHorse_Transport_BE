// Specialist: hồ sơ pháp lý khách nộp sau cọc, cần đối chiếu (PRD mục 3.5). Specialist là người gác cổng duy nhất.
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

export default function LegalListPage() {
  const { session } = useAuth()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.specialist.name === session!.name && b.payment)
  const groups: Record<Tab, typeof mine> = {
    todo: mine.filter(b => b.status === 'documents_submitted'),
    waiting: mine.filter(b => ['awaiting_clearance_docs', 'pending_resubmission', 'documentation_delayed'].includes(b.status)),
    done: mine.filter(b => ['legal_docs_approved', 'dispatch_approved'].includes(b.status)),
  }
  const shown = groups[tab]

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Hồ sơ pháp lý</h1>
          <p>Giấy tờ khách nộp sau khi đặt cọc. Bạn là người duy nhất duyệt tính hợp lệ của hồ sơ thú y, kiểm dịch và hải quan.</p>
        </div>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Chờ duyệt', groups.todo.length], ['waiting', 'Chờ khách nộp', groups.waiting.length], ['done', 'Đã duyệt', groups.done.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>Hạn nộp</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {shown.map(b => (
                <tr key={b.id}>
                  <td className={s.id}>{b.id}</td>
                  <td>{b.customer}</td>
                  <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                  <td className="nowrap">{formatDate(b.departAt)}</td>
                  <td className="nowrap">{formatDateTime(docsDueAt(b.departAt))}{b.clearance?.submittedAt && <div className={s.sub}>Nộp {formatDateTime(b.clearance.submittedAt)}</div>}</td>
                  <td><BookingStatusBadge status={b.status} audience="staff" /></td>
                  <td className="text-right"><Link to={`/specialist/legal/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Duyệt hồ sơ' : 'Xem'}</Link></td>
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
