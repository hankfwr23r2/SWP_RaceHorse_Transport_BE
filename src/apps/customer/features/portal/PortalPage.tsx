// Tổng quan của khách sau đăng nhập: việc cần làm, số liệu nhanh, đường đi của một đơn.
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { BOOKING_STEPS, DEPOSIT_RATE, QUOTE_VALID_HOURS } from '@shared/config/booking-rules'
import { MIN_LEAD_DAYS } from '@shared/config/business-rules'
import { horseReadiness } from '@shared/lib/booking'
import { formatDate } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { customerBookingsApi } from '@shared/services/bookings'
import { horsesApi } from '@shared/services/horses'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useNow } from '@shared/ui/useNow'
import { nextStep } from '../orders/nextStep'
import s from './PortalPage.module.css'

const STEP_TEXT = [
  'Chọn ngựa từ Hồ sơ ngựa, khai tuyến đường và dịch vụ.',
  'Kiểm dịch viên và Điều phối viên thẩm định song song.',
  `Nhận báo giá chính thức, có hiệu lực ${QUOTE_VALID_HOURS} giờ.`,
  `Đặt cọc ${DEPOSIT_RATE * 100}% để giữ xe, nhận Carrier Info Sheet.`,
  'Xin giấy kiểm dịch, mở tờ khai, nộp lên hệ thống trước 18:00 ngày D-1.',
]

export default function PortalPage() {
  const { session } = useAuth()
  const owner = session!.name
  const now = useNow()
  const { data: orders } = useLoad(() => customerBookingsApi.list(owner), [owner])
  const { data: horses } = useLoad(() => horsesApi.list(owner), [owner])
  const ref = useStaggerIn('[data-card]', [orders?.length, horses?.length])

  const withNext = (orders ?? []).map(b => ({ b, next: nextStep(b, now) }))
  const todo = withNext.filter(x => x.next.actionNeeded)
  const inProgress = withNext.filter(x => ['pending_intake', 'under_review', 'pending_commercial'].includes(x.b.status)).length
  const ready = (horses ?? []).filter(h => horseReadiness(h).ok).length
  const needDocs = (horses ?? []).length - ready

  return (
    <div ref={ref} className="page">
      <div className="wrap">
        <section className={s.hero} data-card>
          <div>
            <span className={s.hello}><i className="fa-solid fa-hand" /> Xin chào, {owner}</span>
            <h1>Vận chuyển ngựa đua <span>an toàn, minh bạch từng bước</span></h1>
            <p>Việt Nam, Lào, Campuchia. Một đơn đi riêng một xe, một tài xế và một nhân viên chăm sóc đi kèm. Đặt trước tối thiểu {MIN_LEAD_DAYS} ngày.</p>
          </div>
          <div className={s.heroActions}>
            <Link to="/booking/route" className="btn btn-white btn-lg"><i className="fa-solid fa-plus" /> Đặt chuyến mới</Link>
            <Link to="/horses" className={`btn btn-lg ${s.ghostLight}`}><i className="fa-solid fa-horse-head" /> Hồ sơ ngựa</Link>
          </div>
        </section>

        <section className={s.stats} data-card aria-label="Số liệu nhanh">
          <Link to="/orders" className={s.stat}><b>{todo.length}</b><span>Việc cần bạn làm</span></Link>
          <Link to="/orders" className={s.stat}><b>{inProgress}</b><span>Đơn đang thẩm định</span></Link>
          <Link to="/horses" className={s.stat}><b>{ready}</b><span>Ngựa sẵn sàng đặt</span></Link>
          <Link to="/horses" className={`${s.stat} ${needDocs ? s.statWarn : ''}`}><b>{needDocs}</b><span>Ngựa cần bổ sung giấy</span></Link>
        </section>

        <section className="card" data-card>
          <div className="card-header"><h3><i className="fa-solid fa-bell" /> Việc cần làm</h3>{orders && <Link to="/orders" className={s.more}>Tất cả đơn</Link>}</div>
          {orders && !todo.length && <p className={s.none}><i className="fa-solid fa-circle-check" /> Bạn không có việc nào đang chờ. Đơn của bạn đang được xử lý.</p>}
          <div className={s.todoList}>
            {todo.map(({ b, next }) => (
              <Link key={b.id} to={`/orders/${b.id}`} className={`${s.todo} ${next.tone === 'danger' ? s.todoDanger : s.todoWarn}`}>
                <i className={`fa-solid ${next.icon}`} aria-hidden="true" />
                <div><b>{b.id}</b> <BookingStatusBadge status={b.status} /><div className={s.todoTitle}>{next.title}</div><div className={s.todoSub}>Khởi hành {formatDate(b.departAt)} · {b.horses.length} ngựa</div></div>
                <span className="btn btn-primary btn-sm">Xử lý</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card" data-card>
          <div className="card-header"><h3><i className="fa-solid fa-list-ol" /> Một đơn đi qua những bước nào</h3></div>
          <ol className={s.steps}>
            {BOOKING_STEPS.map((label, i) => <li key={label}><span className={s.stepNum}>{i + 1}</span><div><b>{label}</b><p>{STEP_TEXT[i]}</p></div></li>)}
          </ol>
        </section>
      </div>
    </div>
  )
}
