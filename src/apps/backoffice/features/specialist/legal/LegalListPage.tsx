// Specialist: giấy tờ kiểm dịch và hải quan của các đơn đã đặt cọc. Nhà xe làm trọn gói, Specialist là người làm và báo tiến độ (PRD mục 3).
import { ReadMore } from '@shared/ui/ReadMore'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { clearanceProgress, docsDueAt, isClearanceOverdue } from '@shared/lib/booking'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useNow } from '@shared/ui/useNow'
import { EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'

type Tab = 'todo' | 'working' | 'done'

export default function LegalListPage() {
  const { session } = useAuth()
  const now = useNow()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.specialist.name === session!.name && b.payment && b.clearance)
  const groups: Record<Tab, typeof mine> = {
    todo: mine.filter(b => b.status === 'waybill_issued'),
    working: mine.filter(b => b.status === 'clearance_in_progress'),
    done: mine.filter(b => b.clearance!.doneAt),
  }
  const shown = groups[tab]

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Giấy tờ chuyến đi</h1>
          <ReadMore text={'Khách không làm thủ tục thông quan. Bạn tiếp nhận Vận đơn, làm giấy kiểm dịch và hải quan, cập nhật từng hạng mục kèm ảnh để khách và quản lý theo dõi.'} />
        </div>
        <ListLayout<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Vận đơn mới', groups.todo.length], ['working', 'Đang làm', groups.working.length], ['done', 'Đã xong', groups.done.length]]}>
          {shown.map(b => {
            const p = clearanceProgress(b.clearance!)
            const late = isClearanceOverdue(b, now)
            return (
              <OrderCard key={b.id} id={b.id} customer={b.customer} route={`${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`} kind={b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}
                badge={<BookingStatusBadge status={b.status} audience="staff" />} alert={late}
                meta={[['fa-calendar-day', 'Khởi hành', formatDate(b.departAt)], ['fa-file-signature', 'Tiến độ', `${p.done}/${p.total} hạng mục`], ...(b.waybill ? [['fa-file-contract', 'Vận đơn', b.waybill.no] as [string, string, string]] : [])]}
                note={(late || b.clearance!.flags.length > 0) ? <>{late && <span style={{ color: 'var(--red)' }}>Quá {formatDateTime(docsDueAt(b.departAt))} mà giấy tờ chưa xong. </span>}{b.clearance!.flags.length > 0 && <span style={{ color: 'var(--red)' }}>Khách báo sai {b.clearance!.flags.length} chỗ.</span>}</> : undefined}
                action={<Link to={`/specialist/legal/${b.id}`} className={`btn btn-sm ${tab === 'done' ? 'btn-ghost' : 'btn-primary'}`}>{tab === 'todo' ? 'Tiếp nhận' : tab === 'working' ? 'Làm giấy tờ' : 'Xem'}</Link>} />
            )
          })}
          {all && !shown.length && <EmptyCard text="Không có đơn nào ở mục này." />}
        </ListLayout>
      </div>
    </div>
  )
}
