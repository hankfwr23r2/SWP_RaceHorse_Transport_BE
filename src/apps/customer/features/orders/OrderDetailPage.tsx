// Đơn của tôi: chi tiết đơn. Chuyển từ showDetail(), sidePanel(), papersHtml(), openPay(), cancelOverdue() (don_cua_toi.js).
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BANK, CUSTOMER_STEPS, HOTLINE, OFFICE_ADDRESS, PAYMENT_HOURS, REFUND_POLICY } from '@shared/config/business-rules'
import { DOC_LABEL, FILE_PREFIX, PROCEDURES, proceduresFor, type DocKey } from '@shared/config/documents'
import { appraisalDeadline, choiceDeadline, originalsDue, paymentDeadline, priorityDeadline } from '@shared/lib/deadlines'
import { formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { choiceExpired, currentStep, isAppraisalOverdue } from '@shared/lib/order-status'
import { useAuth } from '@shared/auth/AuthContext'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { useStaggerIn } from '@shared/motion/motion'
import { horseLabel, orderTotal, type Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { ChoicePanel } from './ChoicePanel'
import { StatusBadge, paymentLeft } from './StatusBadge'
import s from './Orders.module.css'

const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => <div className="info-row"><span className="label">{label}</span><span className="value">{children}</span></div>
const tel = (p: string) => `tel:${p.replace(/\s/g, '')}`

const missingOriginals = (o: Order) => Object.entries(o.papers!.originals).flatMap(([horse, docs]) =>
  Object.entries(docs).filter(([, at]) => !at).map(([k]) => `${DOC_LABEL[k as DocKey]} (${horse})`))

function Stepper({ order }: { order: Order }) {
  const step = currentStep(order)
  const failed = order.status === 'rejected' || order.status === 'cancelled'
  return (
    <div className={s.stepper}>
      {CUSTOMER_STEPS.map((label, i) => {
        const cls = failed && i === step ? s.failed : i < step ? s.completed : i === step ? s.active : ''
        const icon = failed && i === step ? <i className="fa-solid fa-xmark" /> : i < step ? <i className="fa-solid fa-check" /> : i + 1
        return <div key={label} className={`${s.step} ${cls}`}><div className={s.stepNum}>{icon}</div><div>{label}</div></div>
      })}
    </div>
  )
}

function Banner({ order: o }: { order: Order }) {
  const box = (cls: string, icon: string, body: ReactNode) => <div className={`alert ${cls}`} style={{ marginBottom: 16 }}><i className={`fa-solid ${icon}`} /><div>{body}</div></div>
  switch (o.status) {
    case 'processing':
      return isAppraisalOverdue(o)
        ? box('alert-warning', 'fa-bolt', <>
          <strong>Đơn đang được Quản lý xử lý ưu tiên</strong> vì chưa kịp thẩm định trong hạn {formatDateTime(appraisalDeadline(o.submittedAt, o.departAt))}.
          <ul className={s.priorityList}>
            <li><i className="fa-solid fa-truck" /> Chỗ xe cho ngày khởi hành <strong>{formatDate(o.departAt)}</strong> vẫn được giữ, ngày khởi hành không đổi.</li>
            <li><i className="fa-regular fa-clock" /> Cam kết có kết quả trước <strong>{formatDateTime(priorityDeadline(o.submittedAt, o.departAt))}</strong>{Date.now() > priorityDeadline(o.submittedAt, o.departAt) && ' — Quản lý phụ trách sẽ gọi trực tiếp cho bạn'}.</li>
            <li><i className="fa-solid fa-headset" /> Nếu có thắc mắc hoặc cần hỗ trợ về đơn, vui lòng liên hệ hotline <strong>{HOTLINE}</strong>.</li>
          </ul></>)
        : box('alert-info', 'fa-hourglass-half', <>Đơn đang được thẩm định: xác minh hồ sơ thú y và lập kế hoạch vận chuyển. Kết quả trước <strong>{formatDateTime(appraisalDeadline(o.submittedAt, o.departAt))}</strong>. Khi đơn được duyệt, bạn có {PAYMENT_HOURS} giờ để thanh toán.{o.note && <><br />{o.note}</>}</>)
    case 'rejected':
      return box('alert-danger', 'fa-circle-xmark', <><strong>Đơn bị từ chối ở {o.rejectedStep === 0 ? 'bước Tiếp nhận' : 'bước Thẩm định hồ sơ'}</strong> lúc {formatDateTime(o.rejectedAt!)}. {o.reason} Bạn chưa thanh toán nên không phát sinh chi phí.</>)
    case 'choose_option':
      if (!o.offer) return null
      return choiceExpired(o)
        ? box('alert-warning', 'fa-clock', <><strong>Đã quá hạn phản hồi</strong> (hạn {formatDateTime(choiceDeadline(o.offer.sentAt))}). Quản lý sẽ xem xét và liên hệ với bạn. Cần hỗ trợ, gọi hotline <strong>{HOTLINE}</strong>.</>)
        : box('alert-warning', 'fa-circle-exclamation', <><strong>Cần phản hồi của bạn.</strong> Hồ sơ có vấn đề không thể khắc phục bằng bổ sung giấy tờ. Vui lòng chọn phương án xử lý bên dưới trước <strong>{formatDateTime(choiceDeadline(o.offer.sentAt))}</strong>. Quá hạn không phản hồi, Quản lý có thể từ chối đơn.</>)
    case 'rechecking':
      return box('alert-info', 'fa-magnifying-glass', <><strong>Bạn đã yêu cầu kiểm tra lại lúc {formatDateTime(o.recheckAt ?? Date.now())}.</strong> Một kiểm dịch viên khác đang xem lại hồ sơ từ đầu. Ngày khởi hành {formatDate(o.departAt)} vẫn giữ nguyên.</>)
    case 'cancelled':
      return box('alert-danger', 'fa-ban', <><strong>Đơn đã hủy.</strong> {o.reason}</>)
    case 'paid': {
      const missing = o.papers ? missingOriginals(o) : []
      return missing.length ? box('alert-warning', 'fa-envelope-open-text', <>
        <strong>Vui lòng gửi bản gốc {missing.length} giấy tờ trước {formatDateTime(originalsDue(o.departAt))}</strong>: {missing.join('; ')}.<br />
        Gửi chuyển phát hoặc mang trực tiếp đến {OFFICE_ADDRESS}. Qua cửa khẩu và trạm kiểm dịch chỉ chấp nhận bản gốc. Chưa có đủ bản gốc, chuyến đi có thể không khởi hành được.</>) : null
    }
    default: return null
  }
}

function Papers({ order: o, onOpen }: { order: Order; onOpen: (file: string, title: string) => void }) {
  const { originals, procedures } = o.papers!
  const scan = (file: string, title: string) => <button className={s.scan} onClick={() => onOpen(file, title)}><i className="fa-regular fa-file-pdf" /> Bản scan</button>
  return (
    <>
      <table className="data-table">
        <thead><tr><th colSpan={3}>Giấy do cơ quan chức năng cấp · công ty làm thủ tục</th></tr></thead>
        <tbody>
          {proceduresFor(!!o.border).map(k => {
            const p = procedures[k]
            return (
              <tr key={k}>
                <td className="font-semibold">{PROCEDURES[k].label}</td>
                <td>{p ? <>{PROCEDURES[k].numberLabel} <strong>{p.number}</strong><div className="sub-text">{p.agency} · cấp {formatDate(p.issuedAt)}{p.validUntil ? ` · hiệu lực đến ${formatDate(p.validUntil)}` : ''}</div></> : <span className="badge badge-muted">Đang làm thủ tục</span>}</td>
                <td className="text-right">{p && scan(p.file, PROCEDURES[k].label)}</td>
              </tr>
            )
          })}
        </tbody>
        <thead><tr><th colSpan={3}>Giấy tờ của bạn · cần gửi bản gốc</th></tr></thead>
        <tbody>
          {Object.entries(originals).flatMap(([horse, docs]) => [
            <tr key={horse} className={s.groupRow}><td colSpan={3}>{horse}</td></tr>,
            ...Object.entries(docs).map(([k, at]) => (
              <tr key={`${horse}-${k}`}>
                <td>{DOC_LABEL[k as DocKey]}</td>
                <td>{at ? <><span className="badge badge-success">Đã nhận bản gốc</span><div className="sub-text">{formatDateTime(at)}</div></> : <span className="badge badge-warning">Chưa nhận bản gốc</span>}</td>
                <td className="text-right">{scan(`${FILE_PREFIX[k as DocKey]}_${horse.replace(/\s+/g, '_')}.pdf`, `${DOC_LABEL[k as DocKey]} · ${horse}`)}</td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
      <p className={s.hint}>Bản gốc đi cùng ngựa trên xe và được trả lại khi giao ngựa.</p>
    </>
  )
}

function PolicyCard() {
  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-shield-halved" /> Cam kết &amp; hoàn tiền</h3></div>
      <ul className={s.checks}>
        <li><i className="fa-solid fa-file-signature" /> Hợp đồng điện tử và hóa đơn gửi qua email ngay sau khi thanh toán</li>
        <li><i className="fa-solid fa-umbrella" /> Ngựa được bảo hiểm theo gói đã chọn trong suốt hành trình</li>
        <li><i className="fa-solid fa-location-dot" /> Theo dõi hành trình và sức khỏe ngựa ngay trong mục Đơn của tôi</li>
      </ul>
      <table className={s.policy}>
        <thead><tr><th>Trường hợp</th><th className="text-right">Hoàn tiền</th></tr></thead>
        <tbody>{REFUND_POLICY.map(([c, r]) => <tr key={c}><td>{c}</td><td className="text-right font-semibold">{r}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

function SidePanel({ order: o, onPay, onCancel }: { order: Order; onPay: () => void; onCancel: () => void }) {
  const total = formatVND(orderTotal(o))
  switch (o.status) {
    case 'awaiting_payment': {
      const left = paymentLeft(o)
      return <>
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-credit-card" /> Thanh toán</h3></div>
          <Row label="Tổng giá trị đơn">{total}</Row>
          <div className={s.payTotal}>Cần thanh toán: <span className="text-orange">{total}</span></div>
          <div className={`${s.deadline} ${left.urgent ? s.urgent : ''}`}>
            <div><i className="fa-regular fa-clock" /> Còn <strong>{left.text}</strong></div>
            <div className={s.deadlineSub}>Hạn thanh toán: {formatDateTime(paymentDeadline(o.approvedAt!, o.departAt))}</div>
          </div>
          <button className="btn btn-primary btn-full" onClick={onPay}><i className="fa-solid fa-credit-card" /> Thanh toán ngay</button>
          <p className={s.hint}>Quá hạn chưa thanh toán, đơn sẽ tự hủy.</p>
        </div>
        <PolicyCard />
      </>
    }
    case 'paid': return <>
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-circle-check" style={{ color: 'var(--green)' }} /> Đã thanh toán</h3></div>
        <Row label="Số tiền">{total}</Row>
        <Row label="Thanh toán lúc">{formatDateTime(o.paidAt!)}</Row>
        <div className={s.subTitle}>Bước tiếp theo</div>
        <ol className={s.stops}>
          <li>Hợp đồng điện tử và hóa đơn đã gửi qua email</li>
          {o.papers && <li>Gửi bản gốc giấy tờ của ngựa trước {formatDateTime(originalsDue(o.departAt))} (xem mục Giấy tờ chuyến đi)</li>}
          <li>Ngày {formatDate(o.departAt)}: kiểm dịch viên kiểm tra sức khỏe ngựa tại chỗ trước khi lên xe</li>
          <li>Khởi hành; theo dõi hành trình ngay trên trang này</li>
        </ol>
      </div>
      <PolicyCard />
    </>
    case 'delivered': case 'disputed': return (
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-clipboard-check" /> Chờ nghiệm thu</h3></div>
        <Row label="Giao ngựa lúc">{formatDateTime(o.deliveredAt!)}</Row>
        <Row label="Đã thanh toán">{total}</Row>
        <Link to={`/acceptance?id=${o.id}`} className="btn btn-primary btn-full" style={{ marginTop: 12 }}><i className="fa-solid fa-clipboard-check" /> Nghiệm thu ngay</Link>
      </div>)
    case 'completed': return (
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-flag-checkered" style={{ color: 'var(--green)' }} /> Hoàn thành</h3></div>
        <Row label="Đã thanh toán">{total}</Row>
        <Row label="Thanh toán lúc">{formatDateTime(o.paidAt!)}</Row>
        <Link to={`/acceptance?id=${o.id}`} className="btn btn-primary btn-full" style={{ marginTop: 12 }}><i className="fa-solid fa-clipboard-check" /> Xem biên bản nghiệm thu</Link>
      </div>)
    case 'in_transit': {
      const trip = o.trip!
      const current = trip.checkpoints.find(c => c.state === 'current')!
      const done = trip.checkpoints.filter(c => c.state === 'done').length
      const percent = Math.round(done / (trip.checkpoints.length - 1) * 100)
      return <>
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-truck-moving" /> Vị trí hiện tại</h3></div>
          <div className={s.tripNow}>{current.place}</div>
          <div className="sub-text">{current.label}</div>
          <div className={s.progress}><div style={{ width: `${percent}%` }} /></div>
          <Row label="Đã qua">{done}/{trip.checkpoints.length - 1} điểm</Row>
          <Row label="Dự kiến giao ngựa">{formatDateTime(trip.eta)}</Row>
          <Row label="Xe">{o.vehicle} · {trip.plate}</Row>
          <div className={s.subTitle}>Liên hệ trên xe</div>
          {trip.contacts.map(([role, name, phone]) => <Row key={name} label={`${role}: ${name}`}><a href={tel(phone)} className="text-orange"><i className="fa-solid fa-phone" /> {phone}</a></Row>)}
          <Row label="Hotline công ty"><span className="text-orange">{HOTLINE}</span></Row>
        </div>
        <PolicyCard />
      </>
    }
    case 'processing': {
      const overdue = isAppraisalOverdue(o)
      return <>
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-circle-info" /> Thanh toán</h3></div>
          <Row label="Tổng giá trị đơn">{total}</Row>
          <Row label={overdue ? 'Cam kết kết quả (ưu tiên)' : 'Hạn thẩm định'}>{formatDateTime(overdue ? priorityDeadline(o.submittedAt, o.departAt) : appraisalDeadline(o.submittedAt, o.departAt))}</Row>
          <p className={s.hint}>Chưa cần thanh toán. Bạn sẽ nhận yêu cầu thanh toán 100% khi đơn được duyệt.</p>
          {overdue && <>
            <a href={tel(HOTLINE)} className="btn btn-ghost btn-full" style={{ marginTop: 12 }}><i className="fa-solid fa-headset" /> Liên hệ hỗ trợ: {HOTLINE}</a>
            <button className={s.linkMuted} onClick={onCancel}>Không muốn chờ? Hủy đơn miễn phí</button>
          </>}
        </div>
        <PolicyCard />
      </>
    }
    case 'rechecking': case 'choose_option': return (
      <div className="card">
        <Row label="Tổng giá trị đơn">{total}</Row>
        <p className={s.hint}>Chưa cần thanh toán. Bạn sẽ nhận yêu cầu thanh toán 100% khi đơn được duyệt.</p>
        <a href={tel(HOTLINE)} className="btn btn-ghost btn-full" style={{ marginTop: 12 }}><i className="fa-solid fa-headset" /> Liên hệ hỗ trợ: {HOTLINE}</a>
      </div>)
    default: return (
      <div className="card">
        <Row label="Tổng giá trị đơn">{total}</Row>
        <p className={s.hint}>Đơn đã đóng, không phát sinh thanh toán.</p>
        <Link to="/booking/route" className="btn btn-primary btn-full" style={{ marginTop: 12 }}><i className="fa-solid fa-paper-plane" /> Đặt chuyến mới</Link>
      </div>)
  }
}

function PayModal({ order: o, onClose, onPaid }: { order: Order; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<'bank' | 'qr'>('bank')
  const total = formatVND(orderTotal(o))
  return (
    <Modal title={<>Thanh toán đơn <span className="text-orange">{o.id}</span></>} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Để sau</button><button className="btn btn-primary" onClick={onPaid}>Tôi đã thanh toán</button></>}>
      <div className={s.payAmount}>
        <span>Số tiền cần thanh toán</span>
        <strong>{total}</strong>
        <span className={s.deadlineSub}>Hạn: {formatDateTime(paymentDeadline(o.approvedAt!, o.departAt))}</span>
      </div>
      <div className={s.methods}>
        <label className={s.method}><input type="radio" checked={method === 'bank'} onChange={() => setMethod('bank')} /> <i className="fa-solid fa-building-columns" /> Chuyển khoản ngân hàng</label>
        <label className={s.method}><input type="radio" checked={method === 'qr'} onChange={() => setMethod('qr')} /> <i className="fa-solid fa-qrcode" /> Quét mã QR</label>
      </div>
      {method === 'bank' ? <>
        <Row label="Ngân hàng">{BANK.name}</Row>
        <Row label="Số tài khoản">{BANK.account}</Row>
        <Row label="Chủ tài khoản">{BANK.owner}</Row>
        <Row label="Số tiền">{total}</Row>
        <Row label="Nội dung chuyển khoản"><span className="text-orange">{o.id}</span></Row>
        <p className={s.hint}>Ghi đúng nội dung chuyển khoản là mã đơn để hệ thống tự đối soát.</p>
      </> : (
        <div className={s.qr}>
          <div className={s.qrBox}><i className="fa-solid fa-qrcode" /></div>
          <p className={s.hint}>Mở ứng dụng ngân hàng và quét mã. Số tiền và nội dung <strong>{o.id}</strong> đã được điền sẵn.</p>
        </div>
      )}
    </Modal>
  )
}

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { session } = useAuth()
  const { data: order, reload } = useLoad(() => customerOrdersApi.get(session!.name, id), [id, session?.name])
  const [modal, setModal] = useState<'pay' | 'cancel' | null>(null)
  const [doc, setDoc] = useState<{ file: string; title: string } | null>(null)
  const cardsRef = useStaggerIn('.card', [id, order?.status])

  if (!order) return <div className="page"><div className="wrap"><p className="text-muted">Không tìm thấy đơn {id}.</p></div></div>

  const update = async (patch: Partial<Order>, message: string) => {
    await customerOrdersApi.update(session!.name, order.id, patch)
    setModal(null)
    toast(message)
    reload()
    window.scrollTo(0, 0)
  }
  const approved = ['awaiting_payment', 'paid', 'in_transit', 'delivered', 'completed'].includes(order.status) || (order.status === 'cancelled' && !!order.approvedAt)
  const inTransit = order.status === 'in_transit'
  const choosing = order.status === 'choose_option' && !choiceExpired(order)

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Cổng Khách hàng</Link> / <Link to="/orders">Đơn của tôi</Link> / <span className="text-orange font-semibold">{order.id}</span></div>
        <div className={`page-header ${s.titleRow}`}><h1>Đơn {order.id}</h1><StatusBadge order={order} /></div>
        <Stepper order={order} />
        <Banner order={order} />

        <div ref={cardsRef} className={s.layout}>
          <div>
            {choosing && <ChoicePanel order={order} onApply={update} />}

            {inTransit && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-route" /> Hành trình</h3><span className="sub-text">Cập nhật lúc {formatDateTime(order.trip!.updatedAt)}</span></div>
                <ol className={s.timeline}>
                  {order.trip!.checkpoints.map(c => (
                    <li key={c.label} className={`${s.point} ${s[c.state]}`}>
                      <div className={s.dot}>{c.state === 'done' ? <i className="fa-solid fa-check" /> : c.state === 'current' ? <i className="fa-solid fa-truck-moving" /> : null}</div>
                      <div>
                        <div className={s.pointLabel}>{c.label}{c.state === 'current' && <> <span className="badge badge-info">Đang ở đây</span></>}</div>
                        <div className="sub-text">{c.place} · {c.state === 'next' ? 'dự kiến ' : ''}{formatDateTime(c.time)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {inTransit && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-heart-pulse" /> Sức khỏe ngựa trên đường</h3></div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Thời điểm</th><th>Thân nhiệt</th><th>Nhịp tim</th><th>Ghi chú của NV chăm sóc</th></tr></thead>
                    <tbody>{order.trip!.health.map(h => <tr key={h.time}><td className="nowrap">{formatDateTime(h.time)}</td><td>{h.temp}</td><td>{h.heart}</td><td className="text-muted">{h.note}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-file-lines" /> Thông tin đơn</h3></div>
              <Row label="Gửi đơn lúc">{formatDateTime(order.submittedAt)}</Row>
              <Row label="Điểm đi">{order.from}</Row>
              <Row label="Điểm đến">{order.to}</Row>
              <Row label="Loại tuyến">{order.border ? `Xuyên quốc gia · cửa khẩu ${order.border}` : 'Nội địa'}</Row>
              <Row label="Quãng đường / Thời gian">{order.distance} · {order.duration}</Row>
              <Row label="Ngày khởi hành"><span className="text-orange">{formatDate(order.departAt)}</span></Row>
              <Row label={`Ngựa (${order.horses.length})`}>{order.horses.map(h => <div key={h.name}>{horseLabel(h)}</div>)}</Row>
            </div>

            {approved && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-clipboard-check" /> Kết quả thẩm định</h3></div>
                <ul className={s.checks}>
                  <li><i className="fa-solid fa-circle-check" /> Hồ sơ ngựa hợp lệ — đã được kiểm dịch viên xác nhận</li>
                  <li><i className="fa-solid fa-circle-check" /> Đã lập kế hoạch vận chuyển — {order.vehicle}</li>
                  <li><i className="fa-solid fa-circle-check" /> Đơn được duyệt lúc {formatDateTime(order.approvedAt!)}</li>
                </ul>
                <div className={s.subTitle}>Lộ trình dự kiến</div>
                <ol className={s.stops}>{order.stops?.map(st => <li key={st}>{st}</li>)}</ol>
              </div>
            )}

            {order.papers && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-folder-open" /> Giấy tờ chuyến đi</h3><span className="sub-text">{order.papers.handedAt ? `Đã bàn giao cho đội vận chuyển lúc ${formatDateTime(order.papers.handedAt)}` : `Hạn gửi bản gốc: ${formatDateTime(originalsDue(order.departAt))}`}</span></div>
                <div className="table-wrap"><Papers order={order} onOpen={(file, title) => setDoc({ file, title })} /></div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-list-check" /> Dịch vụ đã chọn</h3></div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Dịch vụ</th><th>Lựa chọn</th><th className="text-right">Thành tiền</th></tr></thead>
                  <tbody>{order.services.map(svc => <tr key={svc[0]}><td className="font-semibold">{svc[0]}</td><td className="text-muted">{svc[1]}</td><td className="text-right nowrap">{formatVND(svc[2])}</td></tr>)}</tbody>
                  <tfoot><tr><td colSpan={2}>TỔNG GIÁ TRỊ ĐƠN</td><td className="text-right nowrap">{formatVND(orderTotal(order))}</td></tr></tfoot>
                </table>
              </div>
            </div>
          </div>

          <aside className={s.side}><SidePanel order={order} onPay={() => setModal('pay')} onCancel={() => setModal('cancel')} /></aside>
        </div>
      </div>

      {modal === 'pay' && <PayModal order={order} onClose={() => setModal(null)} onPaid={() => update({ status: 'paid', paidAt: Date.now() }, `Đã ghi nhận thanh toán đơn ${order.id}. Hợp đồng điện tử đã gửi qua email.`)} />}
      {modal === 'cancel' && (
        <Modal title={<>Hủy đơn <span className="text-orange">{order.id}</span>?</>} onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Tiếp tục chờ</button><button className="btn btn-danger" onClick={() => update({ status: 'cancelled', reason: `Bạn đã hủy đơn lúc ${formatDateTime(Date.now())} do quá hạn thẩm định (hạn ${formatDateTime(appraisalDeadline(order.submittedAt, order.departAt))}). Không phát sinh chi phí.` }, `Đã hủy đơn ${order.id}. Không phát sinh chi phí.`)}>Xác nhận hủy đơn</button></>}>
          <p>Đơn đang được xử lý ưu tiên, cam kết có kết quả trước <strong>{formatDateTime(priorityDeadline(order.submittedAt, order.departAt))}</strong>. Nếu hủy:</p>
          <ul className={s.effects}>
            <li><i className="fa-solid fa-circle-check" style={{ color: 'var(--green)' }} /> <span><strong>Không mất phí</strong> — bạn chưa thanh toán cho đơn này.</span></li>
            <li><i className="fa-solid fa-circle-xmark" style={{ color: 'var(--red)' }} /> <span>Đơn chuyển sang <strong>Đã hủy</strong>, chuyến ngày <strong>{formatDate(order.departAt)}</strong> sẽ không được thực hiện.</span></li>
            <li><i className="fa-solid fa-circle-xmark" style={{ color: 'var(--red)' }} /> <span>Không thể khôi phục. Muốn vận chuyển lại, bạn cần đặt đơn mới.</span></li>
          </ul>
        </Modal>
      )}
      {doc && (
        <Modal title={doc.title} onClose={() => setDoc(null)} footer={<button className="btn btn-ghost" onClick={() => setDoc(null)}>Đóng</button>}>
          <div className={s.docPreview}><i className="fa-regular fa-file-pdf" /><div>{doc.file}</div><div className="sub-text">Bản xem trước tài liệu</div></div>
        </Modal>
      )}
    </div>
  )
}
