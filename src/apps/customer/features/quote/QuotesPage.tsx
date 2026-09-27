// Báo giá của tôi. Chuyển từ CUS/bao_gia.html (trang tĩnh, 1 báo giá mẫu).
// Nay hiện báo giá của các đơn đã duyệt, chờ thanh toán trong bộ đơn chuẩn.
// Giữ nguyên nội dung "đặt cọc 50%" của bản cũ dù trái quy tắc thanh toán 100%: xem docs/PRD.md mục 11.
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { DAY } from '@shared/config/business-rules'
import { formatDate, formatVND } from '@shared/lib/format'
import { useAuth } from '@shared/auth/AuthContext'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { useStaggerIn } from '@shared/motion/motion'
import { orderTotal } from '@shared/types/order'
import { useToast } from '@shared/ui/toast'
import s from '../orders/Orders.module.css'

const QUOTE_VALID_DAYS = 7
const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => <div className="info-row"><span className="label">{label}</span><span className="value">{children}</span></div>

export default function QuotesPage() {
  const toast = useToast()
  const { session } = useAuth()
  const { data: orders } = useLoad(() => customerOrdersApi.list(session!.name), [session?.name])
  const [picked, setPicked] = useState<string>()
  const cardsRef = useStaggerIn('.card, .btn, .alert', [picked, !!orders])
  if (!orders) return null
  const quotes = orders.filter(o => o.status === 'awaiting_payment')
  const o = quotes.find(q => q.id === picked) ?? quotes[0]

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Cổng Khách hàng</Link> / <span className="text-orange font-semibold">Báo giá Chính thức</span></div>
        <div className="page-header">
          <h1>Báo giá Vận chuyển Chính thức</h1>
          <p>Quản lý đã hoàn tất thẩm định điều kiện vận chuyển & thủ tục thú y cho yêu cầu của bạn. Vui lòng xem xét bảng chi phí bên dưới và xác nhận để đặt cọc.</p>
        </div>

        {!o ? (
          <div className="alert alert-info"><i className="fa-solid fa-circle-info" /><div>Hiện chưa có báo giá nào chờ bạn xác nhận. <Link to="/orders" className="text-orange font-semibold">Xem Đơn của tôi →</Link></div></div>
        ) : (
          <>
            {quotes.length > 1 && (
              <div className="tabs">{quotes.map(q => <button key={q.id} className={`tab ${q.id === o.id ? 'active' : ''}`} onClick={() => setPicked(q.id)}>{q.id}</button>)}</div>
            )}
            <div ref={cardsRef} className={s.layout}>
              <div>
                <div className="card">
                  <div className="card-header"><h3><i className="fa-solid fa-file-lines" /> Thông tin Đơn hàng</h3><span className="badge badge-info"><i className="fa-solid fa-certificate" /> Đã có Báo giá</span></div>
                  <Row label="Mã Vận đơn:"><span className="font-bold text-orange">{o.id}</span></Row>
                  <Row label="Tuyến đường:">{o.from} → {o.border ? `Cửa khẩu ${o.border} → ` : ''}{o.to}</Row>
                  <Row label="Chiến mã:">{o.horses.map(h => `${h.name} — ${h.breed}`).join('; ')}</Row>
                  <Row label="Ngày khởi hành dự kiến:"><span className="font-semibold">{formatDate(o.departAt)}</span></Row>
                  <Row label="Ngày lập báo giá:">{formatDate(o.approvedAt!)}</Row>
                  <Row label="Hiệu lực báo giá:"><span className="text-red font-semibold"><i className="fa-regular fa-clock" /> {QUOTE_VALID_DAYS} ngày (hết hạn {formatDate(o.approvedAt! + QUOTE_VALID_DAYS * DAY)})</span></Row>
                </div>
                <div className="card">
                  <div className="card-header"><h3><i className="fa-solid fa-calculator" /> Bảng Chi phí Dịch vụ Chính thức</h3><span className="badge badge-success"><i className="fa-solid fa-check" /> Đã phê duyệt</span></div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Hạng mục dịch vụ</th><th className="text-right">Đơn giá</th><th className="text-center">SL</th><th className="text-right">Thành tiền</th></tr></thead>
                      <tbody>{o.services.map(svc => (
                        <tr key={svc[0]}><td><div className="font-semibold">{svc[0]}</div><div className="sub-text">{svc[1]}</div></td><td className="text-right nowrap">{formatVND(svc[2])}</td><td className="text-center">1</td><td className="text-right font-semibold nowrap">{formatVND(svc[2])}</td></tr>
                      ))}</tbody>
                      <tfoot><tr><td colSpan={3}>TỔNG CỘNG THANH TOÁN</td><td className="text-right nowrap">{formatVND(orderTotal(o))}</td></tr></tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <aside className={s.side}>
                <div className="card">
                  <div className="card-header"><h3><i className="fa-solid fa-credit-card" /> Đặt cọc Đơn hàng</h3></div>
                  <Row label="Tổng Giá trị Báo giá:"><span className="font-bold">{formatVND(orderTotal(o))}</span></Row>
                  <Row label="Số dư quyết toán khi giao:"><span className="text-muted">{formatVND(orderTotal(o))}</span></Row>
                  <div className="alert alert-success" style={{ marginTop: 12 }}><i className="fa-solid fa-shield-halved" /><div><strong>Phương thức bảo chứng an toàn:</strong><br />Hỗ trợ chuyển khoản ngân hàng (Vietcombank Corporate) hoặc QR Pay trực tuyến. Hợp đồng điện tử kèm chữ ký số sẽ tự động kích hoạt sau khi nhận cọc.</div></div>
                </div>
                <button className="btn btn-primary btn-full btn-lg" onClick={() => toast(`Bạn đã chấp thuận Báo giá! Hệ thống đã gửi hướng dẫn thanh toán tiền cọc ${formatVND(orderTotal(o) * 0.5)} vào email của ${o.customer}.`)}><i className="fa-solid fa-check" /> Chấp nhận Báo giá</button>
                <button className="btn btn-ghost btn-full" onClick={() => toast('Yêu cầu điều chỉnh đã được chuyển tiếp đến Quản lý phụ trách. Chúng tôi sẽ phản hồi trong 2 giờ làm việc.', 'info')}><i className="fa-solid fa-pen-to-square" /> Yêu cầu Điều chỉnh Báo giá</button>
                <div className="alert alert-warning"><i className="fa-solid fa-triangle-exclamation" /><div>Báo giá vận chuyển ngựa có hiệu lực trong <strong>{QUOTE_VALID_DAYS} ngày</strong> do biến động giá nhiên liệu và lịch kiểm dịch tại cửa khẩu.</div></div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
