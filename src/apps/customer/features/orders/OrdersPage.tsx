// Đơn của tôi: danh sách. Chuyển từ CUS/don_cua_toi.html + renderList().
import { useState } from 'react'
import { Link } from 'react-router'
import { PAYMENT_HOURS } from '@shared/config/business-rules'
import { choiceDeadline, paymentDeadline } from '@shared/lib/deadlines'
import { formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { choiceExpired } from '@shared/lib/order-status'
import { useAuth } from '@shared/auth/AuthContext'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { useStaggerIn } from '@shared/motion/motion'
import { orderTotal, type Order } from '@shared/types/order'
import { StatusBadge } from './StatusBadge'
import s from './Orders.module.css'

const TABS: [string, string, (o: Order) => boolean][] = [
  ['all', 'Tất cả', () => true],
  ['processing', 'Chờ thẩm định', o => ['processing', 'choose_option', 'rechecking'].includes(o.status)],
  ['awaiting_payment', 'Chờ thanh toán', o => o.status === 'awaiting_payment'],
  ['paid', 'Đã thanh toán', o => o.status === 'paid'],
  ['in_transit', 'Đang vận chuyển', o => o.status === 'in_transit'],
  ['delivered', 'Chờ nghiệm thu', o => o.status === 'delivered' || o.status === 'disputed'],
  ['closed', 'Đã đóng', o => ['completed', 'rejected', 'cancelled'].includes(o.status)],
]

export default function OrdersPage() {
  const { session } = useAuth()
  const { data: orders = [] } = useLoad(() => customerOrdersApi.list(session!.name), [session?.name])
  const [tab, setTab] = useState('all')
  const waiting = orders.filter(o => o.status === 'awaiting_payment')
  const choosing = orders.filter(o => o.status === 'choose_option' && !choiceExpired(o))
  const list = orders.filter(TABS.find(t => t[0] === tab)![2])
  const rowsRef = useStaggerIn('tbody tr', [tab, orders.length])

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Cổng Khách hàng</Link> / <span className="text-orange font-semibold">Đơn của tôi</span></div>
        <div className="page-header">
          <h1>Đơn của tôi</h1>
          <p>Theo dõi trạng thái các đơn vận chuyển. Khi đơn được duyệt, bạn có {PAYMENT_HOURS} giờ để thanh toán 100% giá trị đơn.</p>
        </div>

        <div className={s.alerts}>
          {choosing.length > 0 && (
            <div className="alert alert-danger"><i className="fa-solid fa-circle-exclamation" /><div>
              Bạn có <strong>{choosing.length} đơn cần phản hồi</strong> do hồ sơ ngựa có vấn đề ({choosing.map(o => o.id).join(', ')}).
              Hạn gần nhất: <strong>{formatDateTime(Math.min(...choosing.map(o => choiceDeadline(o.offer!.sentAt))))}</strong>.
            </div></div>
          )}
          {waiting.length > 0 && (
            <div className="alert alert-warning"><i className="fa-solid fa-credit-card" /><div>
              Bạn có <strong>{waiting.length} đơn đã được duyệt</strong> đang chờ thanh toán.
              Hạn gần nhất: <strong>{formatDateTime(Math.min(...waiting.map(o => paymentDeadline(o.approvedAt!, o.departAt))))}</strong>. Quá hạn đơn sẽ tự hủy.
            </div></div>
          )}
        </div>

        <div className="card">
          <div className="tabs">
            {TABS.map(([key, label, match]) => (
              <button key={key} className={`tab ${key === tab ? 'active' : ''}`} onClick={() => setTab(key)}>{label}<span className="count">{orders.filter(match).length}</span></button>
            ))}
          </div>
          <div ref={rowsRef} className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã đơn</th><th>Tuyến đường</th><th>Khởi hành</th><th className="text-right">Tổng giá trị đơn</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
              <tbody>
                {list.length ? list.map(o => (
                  <tr key={o.id}>
                    <td className="font-semibold text-orange nowrap">{o.id}</td>
                    <td>{o.routeShort}{o.border && <div className="sub-text"><i className="fa-solid fa-flag" /> {o.border}</div>}</td>
                    <td className="nowrap">{formatDate(o.departAt)}</td>
                    <td className="text-right font-semibold nowrap">{formatVND(orderTotal(o))}</td>
                    <td><StatusBadge order={o} /></td>
                    <td className="text-right nowrap">
                      {o.status === 'awaiting_payment'
                        ? <Link className="btn btn-primary btn-sm" to={`/orders/${o.id}`}><i className="fa-solid fa-credit-card" /> Thanh toán</Link>
                        : o.status === 'delivered'
                          ? <Link className="btn btn-primary btn-sm" to={`/acceptance?id=${o.id}`}><i className="fa-solid fa-clipboard-check" /> Nghiệm thu</Link>
                          : <Link className="btn btn-ghost btn-sm" to={`/orders/${o.id}`}><i className="fa-solid fa-eye" /> Xem</Link>}
                    </td>
                  </tr>
                )) : <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 24 }}>Không có đơn nào</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
