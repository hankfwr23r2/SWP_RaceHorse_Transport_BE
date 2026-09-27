// Nghiệm thu & bàn giao ngựa. Chuyển từ CUS/acceptance.html + acceptance.js.
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ACCEPTANCE_HOURS, HOTLINE, HOUR, ISSUE_RESPONSE_HOURS } from '@shared/config/business-rules'
import { ACCEPTANCE_ISSUE_TYPES, HANDOVER_DOCS_CROSS_BORDER, HANDOVER_DOCS_DOMESTIC, NORMAL_RANGE } from '@shared/config/documents'
import { acceptanceDeadline } from '@shared/lib/deadlines'
import { formatDateTime, formatVND, timeLeftText } from '@shared/lib/format'
import { useAuth } from '@shared/auth/AuthContext'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { useStaggerIn } from '@shared/motion/motion'
import { orderTotal, type Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import s from '../orders/Orders.module.css'
import a from './Acceptance.module.css'

const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => <div className="info-row"><span className="label">{label}</span><span className="value">{children}</span></div>
const inRange = (v: number, [min, max]: readonly number[]) => v >= min && v <= max
// Chưa có số đo (hộ tống chỉ đo thân nhiệt, hoặc đã xóa báo cáo) thì hiện "—". NaN lưu qua JSON thành null.
const missing = (v: number | null) => v == null || Number.isNaN(v)
const unit = (v: number | null, u: string) => (missing(v) ? '—' : `${v}${u}`)
const Verdict = ({ ok }: { ok: boolean }) => ok ? <span className="badge badge-success">Bình thường</span> : <span className="badge badge-danger">Bất thường</span>

export default function AcceptancePage() {
  const [params] = useSearchParams()
  const toast = useToast()
  const { session } = useAuth()
  const { data: orders, reload } = useLoad(() => customerOrdersApi.list(session!.name), [session?.name])
  const [modal, setModal] = useState<'accept' | 'issue' | null>(null)
  const cardsRef = useStaggerIn('.card', [orders?.length])
  const [issue, setIssue] = useState({ type: ACCEPTANCE_ISSUE_TYPES[0], note: '', files: [] as string[], invalid: false })
  if (!orders) return null

  const id = params.get('id')
  const order = id ? orders.find(o => o.id === id && o.handover) : orders.find(o => (o.status === 'delivered' || o.status === 'disputed') && o.handover)

  if (!order) {
    return (
      <div className="page"><div className="wrap">
        <div className="page-header"><h1>Nghiệm thu &amp; Bàn giao Ngựa</h1></div>
        <div className="alert alert-info"><i className="fa-solid fa-circle-info" /><div>Hiện không có đơn nào chờ nghiệm thu. Đơn sẽ xuất hiện ở đây khi ngựa được giao tới điểm đến. <Link to="/orders" className="text-orange font-semibold">Xem Đơn của tôi →</Link></div></div>
      </div></div>
    )
  }

  const h = order.handover!
  const horse = order.horses[0].name
  const chip = order.horses[0].chip ?? ''
  const deadline = acceptanceDeadline(order.deliveredAt!)
  const docs = order.border ? HANDOVER_DOCS_CROSS_BORDER : HANDOVER_DOCS_DOMESTIC
  const total = formatVND(orderTotal(order))

  const save = async (patch: Partial<Order>, message: string) => {
    await customerOrdersApi.update(session!.name, order.id, patch)
    setModal(null)
    toast(message)
    reload()
  }
  const sendIssue = () => {
    if (!issue.note.trim()) return setIssue({ ...issue, invalid: true })
    save({ status: 'disputed', issue: { time: Date.now(), type: issue.type, note: issue.note.trim(), files: issue.files } }, `Đã gửi báo cáo cho đơn ${order.id}. Quản lý sẽ liên hệ trong ${ISSUE_RESPONSE_HOURS} giờ.`)
  }

  const badge = order.status === 'delivered'
    ? <span className="badge badge-warning"><i className="fa-regular fa-clock" /> Chờ bạn nghiệm thu · còn {timeLeftText(deadline)}</span>
    : order.status === 'disputed'
      ? <span className="badge badge-danger"><i className="fa-solid fa-flag" /> Đang xử lý báo cáo</span>
      : <span className="badge badge-success"><i className="fa-solid fa-circle-check" /> Đã nghiệm thu · {formatDateTime(order.acceptedAt!)}</span>

  const banner = order.status === 'delivered'
    ? <div className="alert alert-info"><i className="fa-solid fa-circle-info" /><div>Ngựa đã được giao lúc <strong>{formatDateTime(order.deliveredAt!)}</strong>. Vui lòng kiểm tra và xác nhận nghiệm thu trước <strong>{formatDateTime(deadline)}</strong>. Nếu có vấn đề, hãy báo ngay trong thời hạn này. Quá hạn không phản hồi, hệ thống sẽ tự động nghiệm thu.</div></div>
    : order.status === 'disputed' && order.issue
      ? <div className="alert alert-warning"><i className="fa-solid fa-flag" /><div><strong>Đã gửi báo cáo lúc {formatDateTime(order.issue.time)}</strong>: {order.issue.type} — {order.issue.note.replace(/[.\s]+$/, '')}{order.issue.files.length ? ` (${order.issue.files.length} tệp đính kèm)` : ''}.<br />Quản lý sẽ liên hệ với bạn trước <strong>{formatDateTime(order.issue.time + ISSUE_RESPONSE_HOURS * HOUR)}</strong>. Tự động nghiệm thu đang tạm dừng cho tới khi báo cáo được xử lý.</div></div>
      : order.status === 'completed'
        ? <div className="alert alert-info"><i className="fa-solid fa-file-signature" /><div>{order.acceptedBy === 'auto'
          ? <>Đơn được <strong>tự động nghiệm thu</strong> lúc {formatDateTime(order.acceptedAt!)} do không có phản hồi trong {ACCEPTANCE_HOURS} giờ sau khi giao. Biên bản nghiệm thu điện tử đã gửi tới {order.customerEmail}.</>
          : <>Bạn đã xác nhận nghiệm thu lúc <strong>{formatDateTime(order.acceptedAt!)}</strong>. Biên bản nghiệm thu điện tử đã gửi tới {order.customerEmail}.</>}</div></div>
        : null

  const payment = (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-receipt" /> Thanh toán</h3></div>
      <Row label="Tổng giá trị đơn">{total}</Row>
      <Row label="Đã thanh toán (100%)"><span style={{ color: 'var(--green)' }}>{total}</span></Row>
      <Row label="Thanh toán lúc">{formatDateTime(order.paidAt!)}</Row>
      <p className={s.hint}>Đơn đã thanh toán đủ trước chuyến đi. Nghiệm thu không phát sinh thêm chi phí.</p>
    </div>
  )

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal"><i className="fa-solid fa-house" /> Cổng Khách hàng</Link> / <Link to="/orders">Đơn của tôi</Link> / <span className="text-orange font-semibold">Nghiệm thu</span></div>
        <div className={`page-header ${s.titleRow}`}><h1>Nghiệm thu đơn {order.id}</h1>{badge}</div>
        {banner && <div style={{ marginBottom: 16 }}>{banner}</div>}

        <div ref={cardsRef} className={s.layout}>
          <div>
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-handshake" /> Thông tin bàn giao</h3></div>
              <Row label="Mã đơn"><span className="text-orange">{order.id}</span></Row>
              <Row label="Ngựa bàn giao">{horse} (Microchip #{chip})</Row>
              <Row label="Điểm đi">{order.from}</Row>
              <Row label="Điểm đến (nơi bàn giao)">{order.to}</Row>
              <Row label="Thời điểm giao">{formatDateTime(order.deliveredAt!)}</Row>
              <Row label="Xe">{h.vehicle}</Row>
              <Row label="Người bàn giao">{h.groom} (NV chăm sóc) · {h.driver} (tài xế)</Row>
            </div>

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-heart-pulse" /> Sức khỏe ngựa: lúc nhận so với lúc giao</h3></div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr>
                    <th>Chỉ số</th>
                    <th>Lúc nhận<div className="sub-text">{h.inspector} (kiểm dịch viên) · {formatDateTime(h.pickup.time)}</div></th>
                    <th>Lúc giao<div className="sub-text">{h.groom} (NV chăm sóc) · {formatDateTime(h.delivery.time)}</div></th>
                    <th>Đánh giá lúc giao</th>
                  </tr></thead>
                  <tbody>
                    <tr><td>Thân nhiệt <div className="sub-text">Tham khảo {NORMAL_RANGE.temp[0]}–{NORMAL_RANGE.temp[1]}°C</div></td><td>{unit(h.pickup.temp, '°C')}</td><td className="font-semibold">{unit(h.delivery.temp, '°C')}</td><td>{missing(h.delivery.temp) ? '—' : <Verdict ok={inRange(h.delivery.temp, NORMAL_RANGE.temp)} />}</td></tr>
                    <tr><td>Nhịp tim <div className="sub-text">Tham khảo {NORMAL_RANGE.heart[0]}–{NORMAL_RANGE.heart[1]} bpm</div></td><td>{unit(h.pickup.heart, ' bpm')}</td><td className="font-semibold">{unit(h.delivery.heart, ' bpm')}</td><td>{missing(h.delivery.heart) ? '—' : <Verdict ok={inRange(h.delivery.heart, NORMAL_RANGE.heart)} />}</td></tr>
                    <tr><td>Ăn uống</td><td>{h.pickup.eat}</td><td className="font-semibold">{h.delivery.eat}</td><td><Verdict ok={h.delivery.eat === 'Bình thường'} /></td></tr>
                    <tr><td>Thể trạng</td><td>{h.pickup.body}</td><td className="font-semibold">{h.delivery.body}</td><td><Verdict ok={h.delivery.body === 'Không chấn thương'} /></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-camera" /> Hình ảnh bàn giao</h3><span className="sub-text">Chụp lúc {formatDateTime(order.deliveredAt! - 5 * 60000)}</span></div>
              <div className={a.photos}>
                <figure><img src="https://images.unsplash.com/photo-1598974357801-cbca100e65d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60" alt="Bàn giao tại cửa khoang chuồng" /><figcaption>1. Bàn giao tại cửa khoang chuồng</figcaption></figure>
                <figure><img src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60" alt={`Thể trạng ngựa ${horse}`} /><figcaption>2. Thể trạng ngựa {horse}</figcaption></figure>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-list-check" /> Tiêu chuẩn bàn giao</h3></div>
              <div className={a.checklist}>
                {[<><strong>Đúng ngựa:</strong> microchip #{chip} khớp với hộ chiếu</>,
                  <><strong>Thể trạng:</strong> không chấn thương xương khớp, không trầy xước</>,
                  <><strong>Chỉ số sức khỏe:</strong> trong ngưỡng bình thường</>,
                  <><strong>Giấy tờ bàn giao:</strong> {docs.join(', ')}</>].map((t, i) => <div key={i} className={a.check}><span className={a.checkIcon}><i className="fa-solid fa-check" /></span><span>{t}</span></div>)}
              </div>
            </div>
          </div>

          <aside className={s.side}>
            {order.status !== 'completed' && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-signature" /> Xác nhận</h3></div>
                {order.status === 'delivered' && (
                  <div className={s.deadline}>
                    <div><i className="fa-regular fa-clock" /> Còn <strong>{timeLeftText(deadline)}</strong></div>
                    <div className={s.deadlineSub}>Tự động nghiệm thu lúc {formatDateTime(deadline)}</div>
                  </div>
                )}
                <button className="btn btn-primary btn-full" onClick={() => setModal('accept')}><i className="fa-solid fa-signature" /> Xác nhận nghiệm thu</button>
                {order.status === 'delivered'
                  ? <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => { setIssue({ type: ACCEPTANCE_ISSUE_TYPES[0], note: '', files: [], invalid: false }); setModal('issue') }}><i className="fa-solid fa-flag" /> Báo vấn đề</button>
                  : <p className={s.hint}>Cần hỗ trợ thêm về báo cáo, vui lòng liên hệ hotline <strong>{HOTLINE}</strong>.</p>}
              </div>
            )}
            {payment}
            {order.status === 'completed' && <Link to="/orders" className="btn btn-ghost btn-full"><i className="fa-solid fa-arrow-left" /> Về Đơn của tôi</Link>}
          </aside>
        </div>
      </div>

      {modal === 'accept' && (
        <Modal title={<>Xác nhận nghiệm thu đơn <span className="text-orange">{order.id}</span>?</>} onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Xem lại</button><button className="btn btn-primary" onClick={() => save({ status: 'completed', acceptedAt: Date.now(), acceptedBy: 'customer' }, `Đã nghiệm thu đơn ${order.id}. Biên bản đã gửi tới ${order.customerEmail}.`)}>Xác nhận nghiệm thu</button></>}>
          <p>Khi xác nhận, bạn đồng ý rằng:</p>
          <ul className={s.effects}>
            <li><i className="fa-solid fa-check" style={{ color: 'var(--green)' }} /> <span>Đã nhận đủ ngựa và giấy tờ như danh sách bàn giao.</span></li>
            <li><i className="fa-solid fa-check" style={{ color: 'var(--green)' }} /> <span>Tình trạng ngựa khi nhận khớp với chỉ số và hình ảnh trên trang.</span></li>
            <li><i className="fa-solid fa-circle-info" style={{ color: 'var(--blue)' }} /> <span>Đơn chuyển sang <strong>Hoàn thành</strong>, biên bản nghiệm thu điện tử được gửi qua email. Sau khi xác nhận, không thể báo vấn đề cho đơn này nữa.</span></li>
          </ul>
        </Modal>
      )}
      {modal === 'issue' && (
        <Modal title={<>Báo vấn đề khi nhận ngựa · <span className="text-orange">{order.id}</span></>} onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-danger" onClick={sendIssue}>Gửi báo cáo</button></>}>
          <div className="form-group"><label className="required">Loại vấn đề</label><select className="form-control" value={issue.type} onChange={e => setIssue({ ...issue, type: e.target.value })}>{ACCEPTANCE_ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="required">Mô tả</label><textarea rows={3} className={`form-control ${issue.invalid ? 'invalid' : ''}`} placeholder="Mô tả tình trạng bạn gặp khi nhận ngựa..." value={issue.note} onChange={e => setIssue({ ...issue, note: e.target.value, invalid: false })} /></div>
          <div className="form-group"><label>Ảnh / video minh chứng</label><input type="file" multiple className="form-control" onChange={e => setIssue({ ...issue, files: [...(e.target.files ?? [])].map(f => f.name) })} /></div>
          <p className={s.hint}>Quản lý sẽ liên hệ trong {ISSUE_RESPONSE_HOURS} giờ. Trong lúc xử lý, tự động nghiệm thu được tạm dừng.</p>
        </Modal>
      )}
    </div>
  )
}
