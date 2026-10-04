// Đơn của tôi: danh sách đơn đặt chuyến, xếp theo thứ tự trạng thái của luồng (đơn đã đóng ở cuối); đơn cần bạn xử lý được tô nổi.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { statusRank } from '@shared/config/booking-rules'
import { APPROVED_SUBS, ORDER_GROUPS, approvedSubOf, orderGroupOf, type ApprovedSub, type OrderGroup } from '@shared/lib/booking'
import { formatDate, formatVND } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { customerBookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useNow } from '@shared/ui/useNow'
import { nextStep } from './nextStep'
import s from './OrderDetail.module.css'

// Thanh dọc bên trái: Tất cả, Cần bạn xử lý, rồi các nhóm đơn theo thứ tự trên màn hình
type Filter = 'all' | 'action' | OrderGroup | ApprovedSub
const GROUP_KEYS = Object.keys(ORDER_GROUPS) as OrderGroup[]
const SUB_KEYS = Object.keys(APPROVED_SUBS) as ApprovedSub[]
const isFilter = (v: string | null): v is Filter => v === 'all' || v === 'action' || GROUP_KEYS.includes(v as OrderGroup) || SUB_KEYS.includes(v as ApprovedSub)

export default function OrdersPage() {
  const { session } = useAuth()
  const now = useNow()
  const { data: orders } = useLoad(() => customerBookingsApi.list(session!.name), [session?.name])
  const [params, setParams] = useSearchParams()
  const q = params.get('group')
  const [tab, setTabState] = useState<Filter>(isFilter(q) ? q : 'all')
  const setTab = (f: Filter) => { setTabState(f); setParams(f === 'all' ? {} : { group: f }, { replace: true }) }
  // Các mục nhỏ của Đã duyệt chỉ mở ra khi khách bấm vào Đã duyệt (hoặc đang xem một mục nhỏ)
  const approvedOpen = tab === 'approved' || SUB_KEYS.includes(tab as ApprovedSub)
  const all = (orders ?? []).map(b => ({ b, next: nextStep(b, now), group: orderGroupOf(b), sub: approvedSubOf(b) }))
  const match = (x: { next: { actionNeeded: boolean }; group: OrderGroup; sub?: ApprovedSub }, f: Filter) => f === 'all' || (f === 'action' ? x.next.actionNeeded : SUB_KEYS.includes(f as ApprovedSub) ? x.sub === f : x.group === f)
  const list = all.filter(x => match(x, tab)).sort((a, z) => statusRank(a.b.status) - statusRank(z.b.status) || a.b.departAt - z.b.departAt)
  const ref = useStaggerIn('[data-row]', [tab, all.length])

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Trang chủ</Link> / <span className="text-orange font-semibold">Đơn của tôi</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div className="page-header" style={{ margin: 0 }}>
            <h1>Đơn của tôi</h1>
            <p>Theo dõi từng đơn từ lúc gửi đến khi giao ngựa, xếp theo thứ tự các bước. Đơn cần bạn xử lý được tô nổi.</p>
          </div>
          <Link to="/booking/route" className="btn btn-primary"><i className="fa-solid fa-plus" /> Đặt chuyến mới</Link>
        </div>

        <div className={s.ordersLayout}>
        <nav className={s.sideNav} aria-label="Phân loại đơn">
          <h2>Phân loại đơn</h2>
          {([['all', 'Tất cả đơn', 'fa-layer-group', ''], ['action', 'Cần bạn xử lý', 'fa-bell', 'Đơn đang chờ bạn làm gì đó']] as [Filter, string, string, string][]).map(([k, label, icon, hint]) => (
            <button key={k} className={`${s.sideItem} ${tab === k ? s.sideItemOn : ''} ${k === 'action' ? s.sideItemAlert : ''}`} aria-pressed={tab === k} title={hint} onClick={() => setTab(k)}>
              <i className={`fa-solid ${icon}`} aria-hidden="true" /><span>{label}</span><span className={s.count}>{all.filter(x => match(x, k)).length}</span>
            </button>
          ))}
          <hr className={s.sideRule} />
          {GROUP_KEYS.map(k => (
            <div key={k} style={{ display: 'contents' }}>
              <button className={`${s.sideItem} ${tab === k ? s.sideItemOn : ''}`} aria-pressed={tab === k} aria-expanded={k === 'approved' ? approvedOpen : undefined} title={ORDER_GROUPS[k].hint} onClick={() => setTab(k)}>
                <i className={`fa-solid ${ORDER_GROUPS[k].icon}`} aria-hidden="true" /><span>{ORDER_GROUPS[k].label}{k === 'approved' && <i className={`fa-solid fa-chevron-${approvedOpen ? 'up' : 'down'}`} aria-hidden="true" style={{ marginLeft: 8, fontSize: '0.7rem' }} />}</span><span className={s.count}>{all.filter(x => x.group === k).length}</span>
              </button>
              {k === 'approved' && approvedOpen && SUB_KEYS.map(sk => (
                <button key={sk} className={`${s.sideItem} ${s.sideSub} ${tab === sk ? s.sideItemOn : ''}`} aria-pressed={tab === sk} title={APPROVED_SUBS[sk].hint} onClick={() => setTab(sk)}>
                  <i className={`fa-solid ${APPROVED_SUBS[sk].icon}`} aria-hidden="true" /><span>{APPROVED_SUBS[sk].label}</span><span className={s.count}>{all.filter(x => x.sub === sk).length}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div>
        {tab !== 'all' && tab !== 'action' && <p className="form-hint" style={{ marginBottom: 12 }}>{(SUB_KEYS.includes(tab as ApprovedSub) ? APPROVED_SUBS[tab as ApprovedSub] : ORDER_GROUPS[tab as OrderGroup]).hint}.</p>}
        {orders && !list.length ? (
          <div className={s.empty}><i className="fa-solid fa-box-open" /><h3>Không có đơn nào ở mục này</h3><p>Chọn mục khác hoặc đặt chuyến mới.</p></div>
        ) : (
          <div ref={ref} className={s.list}>
            {list.map(({ b, next, sub }) => (
              <article key={b.id} data-row className={`${s.row} ${next.actionNeeded ? s.rowAction : ''}`}>
                <div>
                  <div className={s.rowTop}>
                    <span className={s.rowId}>{b.id}</span>
                    <BookingStatusBadge status={b.status} />
                    <span className="badge badge-muted">{b.type === 'international' ? 'Quốc tế' : 'Trong nước'}</span>
                    {sub && <span className="badge badge-orange">{APPROVED_SUBS[sub].label}</span>}
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
      </div>
    </div>
  )
}
