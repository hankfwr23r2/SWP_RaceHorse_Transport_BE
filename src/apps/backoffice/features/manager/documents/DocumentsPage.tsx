// Manager: theo dõi hồ sơ pháp lý của các đơn đã đặt cọc. Đơn quá hạn 18:00 D-1 hiện cảnh báo (PRD mục 3.7).
import { useState } from 'react'
import { docsDueAt } from '@shared/lib/booking'
import { formatDate, formatDateTime, formatVND, timeLeftText } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useNow } from '@shared/ui/useNow'
import { Tabs } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

type Tab = 'late' | 'waiting' | 'review' | 'ready'

export default function DocumentsPage() {
  const now = useNow()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('late')
  const list = (all ?? []).filter(b => b.payment)
  const groups: Record<Tab, typeof list> = {
    late: list.filter(b => b.status === 'documentation_delayed'),
    waiting: list.filter(b => ['awaiting_clearance_docs', 'pending_resubmission'].includes(b.status)),
    review: list.filter(b => b.status === 'documents_submitted'),
    ready: list.filter(b => ['legal_docs_approved', 'dispatch_approved'].includes(b.status)),
  }
  const shown = groups[tab].sort((a, z) => docsDueAt(a.departAt) - docsDueAt(z.departAt))

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Theo dõi hồ sơ pháp lý</h1>
          <p>Mọi đơn đã đặt cọc. Hạn nộp giấy tờ là 18:00 ngày trước ngày khởi hành. Quá hạn, Coordinator hoãn lệnh xuất bến và phí lưu xe bắt đầu tính.</p>
        </div>
        {groups.late.length > 0 && <div className="alert alert-danger" style={{ marginBottom: 16 }}><i className="fa-solid fa-triangle-exclamation" /><div><b>{groups.late.length} đơn quá hạn nộp giấy tờ.</b> Xử lý theo hợp đồng và điều kiện thực tế.</div></div>}
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['late', 'Quá hạn', groups.late.length], ['waiting', 'Chờ khách nộp', groups.waiting.length], ['review', 'Đang duyệt', groups.review.length], ['ready', 'Đã duyệt', groups.ready.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>Hạn nộp giấy</th><th>Phụ trách</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {shown.map(b => {
                const due = docsDueAt(b.departAt)
                const open = ['awaiting_clearance_docs', 'pending_resubmission'].includes(b.status)
                return (
                  <tr key={b.id}>
                    <td className={s.id}>{b.id}</td>
                    <td>{b.customer}</td>
                    <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                  <td className="nowrap">{formatDate(b.departAt)}</td>
                  <td className="nowrap">{formatDateTime(due)}{open && <div className={s.sub} style={{ color: due - now < 6 * 3_600_000 ? 'var(--red)' : undefined }}>Còn {timeLeftText(due, now)}</div>}{b.status === 'documentation_delayed' && b.quote && <div className={s.sub} style={{ color: 'var(--red)' }}>Lưu xe {formatVND(b.quote.demurragePerHour)}/giờ</div>}</td>
                    <td>{b.intake?.specialist.name}<div className={s.sub}>{b.intake?.coordinator.name}</div></td>
                    <td><BookingStatusBadge status={b.status} audience="staff" /></td>
                  </tr>
                )
              })}
              {all && !shown.length && <tr><td colSpan={7}><div className={s.empty}><i className="fa-solid fa-circle-check" />Không có đơn nào ở mục này.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
