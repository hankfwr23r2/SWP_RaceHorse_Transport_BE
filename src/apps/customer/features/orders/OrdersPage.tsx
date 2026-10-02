// Đơn của tôi: danh sách đơn đặt chuyến, đơn cần bạn xử lý lên đầu.
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatVND } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { customerBookingsApi, type CustomerBookingView } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useNow } from '@shared/ui/useNow'
import { POST_PAYMENT, nextStep } from './nextStep'
import s from './OrderDetail.module.css'

type TabKey = 'all' | 'action' | 'progress' | 'docs' | 'closed'
const TABS: [TabKey, string, (b: CustomerBookingView, action: boolean) => boolean][] = [
  ['all', 'Tất cả', () => true],
  ['action', 'Cần bạn xử lý', (_, a) => a],
  ['progress', 'Đang xử lý', b => ['pending_intake', 'under_review', 'pending_commercial'].includes(b.status)],
  ['docs', 'Đã đặt cọc', b => POST_PAYMENT.includes(b.status)],
  ['closed', 'Đã đóng', b => b.status === 'quote_expired' || b.status === 'cancelled'],
]

export default function OrdersPage() {
  const { session } = useAuth()
  const now = useNow()
  const { data: orders } = useLoad(() => customerBookingsApi.list(session!.name), [session?.name])
  const [tab, setTab] = useState<TabKey>('all')
  const all = (orders ?? []).map(b => ({ b, next: nextStep(b, now) }))
  const match = TABS.find(t => t[0] === tab)![2]
  const list = all.filter(x => match(x.b, x.next.actionNeeded)).sort((a, z) => Number(z.next.actionNeeded) - Number(a.next.actionNeeded) || z.b.createdAt - a.b.createdAt)
  const ref = useStaggerIn('[data-row]', [tab, all.length])

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Tổng quan</Link> / <span className="text-orange font-semibold">Đơn của tôi</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div className="page-header" style={{ margin: 0 }}>
            <h1>Đơn của tôi</h1>
            <p>Theo dõi từng đơn từ lúc gửi đến khi đặt cọc. Đơn cần bạn xử lý nằm trên cùng.</p>
          </div>
          <Link to="/booking/route" className="btn btn-primary"><i className="fa-solid fa-plus" /> Đặt chuyến mới</Link>
        </div>

        <div className={s.tabs} role="group" aria-label="Lọc đơn">
          {TABS.map(([k, label, m]) => (
            <button key={k} className={`${s.tab} ${tab === k ? s.tabOn : ''}`} aria-pressed={tab === k} onClick={() => setTab(k)}>
              {label}<span className={s.count}>{all.filter(x => m(x.b, x.next.actionNeeded)).length}</span>
            </button>
          ))}
        </div>

        {orders && !list.length ? (
          <div className={s.empty}><i className="fa-solid fa-box-open" /><h3>Không có đơn nào ở mục này</h3><p>Chọn mục khác hoặc đặt chuyến mới.</p></div>
        ) : (
          <div ref={ref} className={s.list}>
            {list.map(({ b, next }) => (
              <article key={b.id} data-row className={`${s.row} ${next.actionNeeded ? s.rowAction : ''}`}>
                <div>
                  <div className={s.rowTop}>
                    <span className={s.rowId}>{b.id}</span>
                    <BookingStatusBadge status={b.status} />
                    <span className="badge badge-muted">{b.type === 'international' ? 'Quốc tế' : 'Trong nước'}</span>
                  </div>
                  <div className={s.rowRoute}>{b.origin.name.split(' — ')[0]} → {b.dest.name.split(' — ')[0]}</div>
                  <div className={s.rowMeta}>
                    <span><i className="fa-solid fa-calendar-day" />Khởi hành {formatDate(b.departAt)}</span>
                    <span><i className="fa-solid fa-horse-head" />{b.horses.length} ngựa</span>
                    {b.gate && <span><i className="fa-solid fa-flag" />{b.gate}</span>}
                  </div>
                  <div className={`${s.rowNext} ${next.tone === 'danger' ? s.rowNextDanger : next.tone === 'warning' ? s.rowNextWarn : ''}`}>
                    <i className={`fa-solid ${next.icon}`} aria-hidden="true" /> <span><b>{next.title}.</b> {next.actionNeeded ? '' : next.text}</span>
                  </div>
                </div>
                <div className={s.rowSide}>
                  {b.quote && <div><div className={s.rowAmount}>{formatVND(b.quote.total)}</div><div className={s.rowAmountLbl}>Tổng tạm tính</div></div>}
                  <Link to={`/orders/${b.id}`} className={`btn btn-sm ${next.actionNeeded ? 'btn-primary' : 'btn-ghost'}`}>{next.actionNeeded ? 'Xử lý ngay' : 'Xem chi tiết'}</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
