// Chi tiết đơn phía khách: tiến độ, bước tiếp theo, bổ sung hồ sơ, báo giá, đặt cọc, tiến độ giấy tờ, xe và ngựa, trả số dư.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { BOOKING_STEPS, HORSE_DOC, INCIDENT_COST_POLICY, stepOf, VEHICLE_CLASS } from '@shared/config/booking-rules'
import { BANK, HOTLINE, REFUND_POLICY } from '@shared/config/business-rules'
import { COUNTRIES } from '@shared/config/network'
import { CANCELLABLE, cancelRefund, insuranceFee, vehicleClassOf } from '@shared/lib/booking'
import { formatClock, formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { customerBookingsApi, type CustomerBookingView, type TripTeam } from '@shared/services/bookings'
import { horsesApi } from '@shared/services/horses'
import { useLoad } from '@shared/services/useLoad'
import { SEX_LABEL, type HorseProfile } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { Modal } from '@shared/ui/Modal'
import { QuoteSheet } from '@shared/ui/QuoteSheet'
import { TripTimeline } from '@shared/ui/TripTimeline'
import { useToast } from '@shared/ui/toast'
import { useNow } from '@shared/ui/useNow'
import { HorseFormModal } from '../horses/HorseFormModal'
import { IncidentsCard, SettlementCard } from './SettlementCard'
import { ClearanceProgressCard } from './ClearanceProgressCard'
import { POST_PAYMENT, ROUTE_STAGE, ROUTE_VISIBLE, nextStep } from './nextStep'
import s from './OrderDetail.module.css'

const TONE: Record<string, string> = { info: s.nextInfo, orange: s.nextOrange, warning: s.nextWarning, danger: s.nextDanger, success: s.nextSuccess, muted: s.nextMuted }
const placeName = (n: string) => n.split(' — ')[0]

function Progress({ b }: { b: CustomerBookingView }) {
  const at = stepOf(b.status)
  const expired = b.status === 'quote_expired' || b.status === 'rejected'
  return (
    <>
    <p className={s.stepNow2}>{at >= BOOKING_STEPS.length ? 'Đơn đã hoàn tất' : `Bước ${at + 1}/${BOOKING_STEPS.length}: ${BOOKING_STEPS[at]}`}</p>
    <ol className={s.progress} aria-label="Tiến độ đơn">
      {BOOKING_STEPS.map((label, i) => {
        const done = i < at
        const state = done ? s.stepDone : i === at ? (expired ? s.stepStop : s.stepNow) : ''
        return (
          <li key={label} className={`${s.stepItem} ${state}`} aria-current={i === at ? 'step' : undefined}>
            <span className={s.stepNum}>{done ? <i className="fa-solid fa-check" aria-hidden="true" /> : expired && i === at ? <i className="fa-solid fa-xmark" aria-hidden="true" /> : i + 1}</span>
            <div>{label}</div>
          </li>
        )
      })}
    </ol>
    </>
  )
}

function Resubmit({ b, owner, onDone }: { b: CustomerBookingView; owner: string; onDone: () => void }) {
  const toast = useToast()
  const { data: horses, reload } = useLoad(() => horsesApi.list(owner), [owner])
  const [edit, setEdit] = useState<HorseProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const items = b.medical?.resubmit?.items ?? []
  const send = async () => {
    setBusy(true)
    try { await customerBookingsApi.resubmit(owner, b.id); toast('Đã gửi lại cho Kiểm dịch viên'); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không gửi được', 'error'); setBusy(false) }
  }
  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-file-circle-exclamation" /> Hồ sơ cần bổ sung</h3></div>
      <div className={s.fix}>
        {items.map(it => {
          const h = horses?.find(x => x.id === it.horseId)
          return (
            <div key={it.horseId + it.doc} className={s.fixItem}>
              <span><b>{h?.name ?? it.horseId}</b>: {HORSE_DOC[it.doc].label}</span>
              {h && <button className="btn btn-primary btn-sm" onClick={() => setEdit(h)}>Cập nhật giấy</button>}
            </div>
          )
        })}
      </div>
      <p className="form-hint" style={{ margin: '12px 0' }}>Cập nhật xong các giấy trên, bấm gửi lại để Kiểm dịch viên kiểm tra tiếp.</p>
      <button className="btn btn-primary" disabled={busy} onClick={send}><i className="fa-solid fa-paper-plane" /> {busy ? 'Đang gửi…' : 'Đã bổ sung, gửi lại'}</button>
      {edit && <HorseFormModal owner={owner} horse={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); toast('Đã cập nhật giấy') }} />}
    </div>
  )
}

function PayCard({ b, owner, onDone }: { b: CustomerBookingView; owner: string; onDone: () => void }) {
  const toast = useToast()
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [why, setWhy] = useState('')
  // Khách không đồng ý báo giá: đóng đơn (Cancelled), chưa cọc nên miễn phí
  const reject = async () => {
    setBusy(true)
    try { await customerBookingsApi.cancel(owner, b.id, `Từ chối báo giá${why.trim() ? `: ${why.trim()}` : ''}`); toast('Đã từ chối báo giá, đơn được đóng và không mất phí'); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không từ chối được', 'error'); setBusy(false) }
  }
  const pay = async () => {
    setBusy(true)
    try { await customerBookingsApi.payDeposit(owner, b.id); toast('Đã đặt cọc, nhà xe bắt đầu làm giấy tờ'); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không thanh toán được', 'error'); setBusy(false); onDone() }
  }
  return (
    <div className={`card ${s.pay}`}>
      <div className="card-header"><h3><i className="fa-solid fa-credit-card" /> Đặt cọc giữ xe</h3></div>
      <div className={s.payAmount}><span>Số tiền cần đặt cọc (30%)</span><strong>{formatVND(b.quote!.deposit)}</strong></div>
      <div className={s.bank} aria-label="Thông tin chuyển khoản">
        <div><span>Ngân hàng</span><b>{BANK.name}</b></div>
        <div><span>Số tài khoản</span><b>{BANK.account}</b></div>
        <div><span>Chủ tài khoản</span><b>{BANK.owner}</b></div>
        <div><span>Nội dung</span><b>{b.id} COC</b></div>
      </div>
      <details className={s.contract}>
        <summary>Xem điều khoản vận chuyển</summary>
        <ul>
          <li>Nhà xe làm trọn gói giấy kiểm dịch và hải quan. Bạn chỉ cần cung cấp hồ sơ ngựa và giao bản gốc cho tài xế.</li>
          <li>Giá cố định, đã gồm nhiên liệu và phí cầu đường. Không phụ thu ngoài phiếu báo giá.</li>
          <li>Đặt cọc 30% để nhận vận đơn. {formatVND(b.quote!.balance)} còn lại thanh toán vào ngày bốc ngựa.</li>
          <li>Các xe của đơn chỉ chở ngựa của đơn này, không ghép ngựa của đơn khác.</li>
          <li>Hủy đơn sau khi đặt cọc theo bảng hoàn cọc ở cột bên phải.</li>
        </ul>
      </details>
      <label className={s.ack}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /><span>Tôi đã đọc và đồng ý điều khoản vận chuyển, đồng ý đặt cọc {formatVND(b.quote!.deposit)}.</span></label>
      <button className="btn btn-primary btn-lg btn-full" disabled={!ok || busy} onClick={pay}>{busy ? 'Đang xử lý…' : 'Thanh toán cọc'}</button>
      <p className="form-hint" style={{ textAlign: 'center' }}>Bản thử nghiệm: bấm thanh toán là ghi nhận đã nhận cọc.</p>
      <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} disabled={busy} onClick={() => setRejecting(true)}><i className="fa-solid fa-ban" /> Không đồng ý, từ chối báo giá</button>
      {rejecting && (
        <Modal onClose={() => setRejecting(false)} title="Từ chối báo giá?" subtitle="Bạn chưa đặt cọc nên không mất phí. Đơn sẽ đóng, xe và nhân sự được nhả cho đơn khác."
          footer={<><button className="btn btn-ghost" onClick={() => setRejecting(false)}>Xem lại báo giá</button><button className="btn btn-danger" disabled={busy} onClick={reject}>Xác nhận từ chối</button></>}>
          <div className="form-group" style={{ margin: 0 }}><label htmlFor="rq">Lý do (không bắt buộc)</label><textarea id="rq" className="form-control" rows={3} placeholder="Ví dụ: giá cao hơn dự kiến" value={why} onChange={e => setWhy(e.target.value)} /></div>
        </Modal>
      )}
    </div>
  )
}

// Xe và ngựa trên từng xe (PRD mục 10.2): một đơn có thể có nhiều xe
function TripsCard({ team }: { team: TripTeam[] }) {
  if (!team.length) return null
  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-truck" /> {team.length > 1 ? `${team.length} xe của đơn` : 'Xe của đơn'}</h3></div>
      {team.map((t, i) => (
        <div key={t.tripId} className={s.horseRow}>
          <div><b>{team.length > 1 ? `Xe ${i + 1}: ` : ''}{t.vehicle.plate}</b> <small>{t.vehicle.kind} · {t.vehicle.stalls} ngăn · mã chuyến {t.tripId}</small></div>
          <div style={{ textAlign: 'right' }}>Tài xế {t.driver.name} · hộ tống {t.escort.name}</div>
          <small>Chở: {t.horseNames.join(', ')}</small>
        </div>
      ))}
    </div>
  )
}

// Thanh toán 70% còn lại vào ngày bốc ngựa
function BalanceCard({ b, owner, onDone, showAction = true }: { b: CustomerBookingView; owner: string; onDone: () => void; showAction?: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!b.quote || !POST_PAYMENT.includes(b.status)) return null
  const pay = async () => {
    setBusy(true)
    try { await customerBookingsApi.payBalance(owner, b.id); toast('Đã thanh toán số dư'); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không thanh toán được', 'error'); setBusy(false) }
  }
  const canPay = !b.balance && (b.status === 'ready_for_pickup' || b.status === 'en_route_to_pickup')
  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-wallet" /> Thanh toán</h3></div>
      <div className={s.bank}>
        <div><span>Đặt cọc 30%</span><b>{formatVND(b.payment?.amount ?? b.quote.deposit)} · đã trả</b></div>
        <div><span>Còn lại 70% (ngày bốc ngựa)</span><b>{formatVND(b.quote.balance)}{b.balance ? ' · đã trả' : ''}</b></div>
      </div>
      {canPay && showAction && <button className="btn btn-primary btn-lg btn-full" style={{ marginTop: 12 }} disabled={busy} onClick={pay}>{busy ? 'Đang xử lý…' : `Thanh toán ${formatVND(b.quote.balance)}`}</button>}
      {!b.balance && !canPay && showAction && <p className="form-hint" style={{ marginTop: 10 }}>Nút thanh toán sẽ mở khi xe sẵn sàng đón ngựa.</p>}
      {canPay && showAction && <p className="form-hint" style={{ textAlign: 'center' }}>Bản thử nghiệm: bấm thanh toán là ghi nhận đã nhận tiền.</p>}
    </div>
  )
}

// Chính sách chi phí sự cố (PRD mục 11.5), ẩn sau nút để đỡ rối
function IncidentPolicy() {
  return (
    <details className={`card ${s.fold}`}>
      <summary><i className="fa-solid fa-shield-halved" /> Ai chịu chi phí khi có sự cố?</summary>
      <div className={s.foldBody}>
        {INCIDENT_COST_POLICY.map(p => (
          <div key={p.group} style={{ marginBottom: 12 }}>
            <b>{p.group}: {p.who === 'customer' ? 'khách chịu' : 'nhà xe chịu'}</b>
            <ul>{p.items.map(i => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>
    </details>
  )
}

// Hủy đơn: hiện số tiền hoàn theo mốc thời gian ngay lúc bấm (PRD mục 8.3)
function CancelModal({ b, owner, onClose, onDone }: { b: CustomerBookingView; owner: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const now = useNow()
  const [reason, setReason] = useState('')
  const [fm, setFm] = useState(false)
  const [busy, setBusy] = useState(false)
  const paid = b.payment?.amount ?? 0
  const bal = b.balance?.amount ?? 0
  const r = cancelRefund(b.departAt, paid, bal, now, fm)
  const send = async () => {
    setBusy(true)
    try { await customerBookingsApi.cancel(owner, b.id, reason, fm); toast('Đã hủy đơn'); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không hủy được', 'error'); setBusy(false) }
  }
  return (
    <Modal onClose={onClose} title={`Hủy đơn ${b.id}`} subtitle="Số tiền hoàn được tính theo thời điểm bạn bấm xác nhận."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Giữ đơn</button><button className="btn btn-danger" disabled={busy || !reason.trim()} onClick={send}>Xác nhận hủy đơn</button></>}>
      {paid > 0 ? (
        <div className={s.refundBox}>
          <div><span>Tiền cọc đã đặt</span><b>{formatVND(paid)}</b></div>
          <div><span>Hoàn lại tiền cọc ({Math.round(r.rate * 100)}%)</span><b className="text-green">{formatVND(r.depositRefund)}</b></div>
          {bal > 0 && <div><span>Số dư 70% đã trả (hoàn 100%)</span><b className="text-green">{formatVND(r.balanceRefund)}</b></div>}
          <div><span>Tổng hoàn lại</span><b className="text-green">{formatVND(r.refund)}</b></div>
          <div><span>Không hoàn</span><b className="text-red">{formatVND(r.lost)}</b></div>
        </div>
      ) : <div className="alert alert-info"><i className="fa-solid fa-circle-info" /><div>Bạn chưa đặt cọc nên hủy đơn không mất phí.</div></div>}
      {paid > 0 && <label className={s.ack} style={{ margin: '14px 0' }}><input type="checkbox" checked={fm} onChange={e => setFm(e.target.checked)} /><span>Hủy vì bất khả kháng (dịch bệnh, thiên tai, ngựa ốm có giấy chứng nhận). Nhân viên sẽ đối chiếu giấy tờ.</span></label>}
      <div className="form-group" style={{ margin: 0 }}><label htmlFor="cr" className="required">Lý do hủy</label><textarea id="cr" className="form-control" rows={3} value={reason} onChange={e => setReason(e.target.value)} /></div>
    </Modal>
  )
}

// Lộ trình đã được Manager duyệt (Flow 3): các chặng, trạm trung chuyển, cửa khẩu và nhắc chuẩn bị bản gốc
function RouteCard({ b }: { b: CustomerBookingView }) {
  const r = b.route!
  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-map-location-dot" /> Lộ trình</h3></div>
      <ol className={s.legList}>
        {r.legs.map((l, i) => (
          <li key={l.no}>
            <div><b>Chặng {l.no}:</b> {l.from} → {l.to}</div>
            <div className="sub-text">Khởi hành {formatDateTime(l.departAt)} · đến khoảng {formatClock(l.arriveAt)}</div>
            {r.rests[i] && <div className="sub-text"><i className="fa-solid fa-location-dot" /> Trạm trung chuyển {r.rests[i].name}: dừng {r.rests[i].minutes} phút</div>}
          </li>
        ))}
      </ol>
      {r.borderEta && <p className="form-hint" style={{ marginTop: 10 }}><i className="fa-solid fa-flag" /> Dự kiến tới cửa khẩu {b.gate} lúc {formatDateTime(r.borderEta)}.</p>}
      <div className="alert alert-info" style={{ marginTop: 14 }}><i className="fa-solid fa-folder-open" /><div><b>Nhắc bàn giao:</b> chuẩn bị sẵn các bản gốc hồ sơ (Hộ chiếu ngựa, Sổ tiêm, Phiếu xét nghiệm) để giao cho tài xế tại điểm đón.</div></div>
    </div>
  )
}

type Tab = 'journey' | 'docs' | 'pay' | 'history' | 'info'
const TAB_LABEL: Record<Tab, string> = { journey: 'Hành trình', docs: 'Giấy tờ', pay: 'Thanh toán', history: 'Lịch sử', info: 'Thông tin đơn' }

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const owner = session!.name
  const now = useNow()
  const { data: b, reload } = useLoad(() => customerBookingsApi.get(owner, id), [owner, id])
  const [cancelling, setCancelling] = useState(false)
  const [picked, setPicked] = useState<Tab | null>(null)
  const { data: team = [] } = useLoad(() => customerBookingsApi.team(owner, id), [owner, id, b?.status])
  const reloadAll = () => reload()
  // Đang chạy: cập nhật định kỳ để thấy mốc check-in mới
  const running = ['en_route_to_pickup', 'in_transit', 'incident_reported', 'pending_emergency_approval', 'emergency_plan_active'].includes(b?.status ?? '')
  useEffect(() => { if (running) reload() }, [now, running, reload])

  if (b === undefined) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  const next = nextStep(b, now)
  const hasJourney = (b.trips ?? []).some(t => t.run) || (ROUTE_VISIBLE.includes(b.status) && !!b.route)
  const tabs: Tab[] = [...(hasJourney ? ['journey' as const] : []), ...(POST_PAYMENT.includes(b.status) ? ['docs' as const] : []), ...(b.quote ? ['pay' as const] : []), 'history', 'info']
  // Tab mặc định theo giai đoạn: đang đi đường thì Hành trình, đang làm giấy thì Giấy tờ, còn lại Thanh toán / Thông tin
  const auto: Tab = ROUTE_STAGE.includes(b.status) ? 'journey' : POST_PAYMENT.includes(b.status) ? 'docs' : b.quote ? 'pay' : 'info'
  const tab = picked && tabs.includes(picked) ? picked : tabs.includes(auto) ? auto : 'info'
  // Hạng của từng xe khi đã chốt (đơn nhiều xe liệt kê hết), chưa chốt thì theo số ngựa
  const clsLabel = (team.length ? team.map(t => t.vehicle.stalls) : [Math.max(b.horses.length, 1)]).map(n => VEHICLE_CLASS[vehicleClassOf(n)].label).join(' + ')
  const events = [
    { time: b.createdAt, text: 'Bạn đã gửi đơn' },
    ...(b.medical?.status === 'approved' && b.medical.at ? [{ time: b.medical.at, text: 'Thẩm định y tế đạt' }] : []),
    ...(b.route?.completedAt ? [{ time: b.route.completedAt, text: `Phương án ${b.trips?.length ?? 1} xe và lộ trình đã chốt` }] : []),
    ...(b.quote ? [{ time: b.quote.sentAt, text: 'Báo giá được gửi cho bạn' }] : []),
    ...(b.payment ? [{ time: b.payment.paidAt, text: `Đặt cọc ${formatVND(b.payment.amount)}, cấp vận đơn ${b.waybill?.no ?? ''}` }] : []),
    ...(b.clearance?.doneAt ? [{ time: b.clearance.doneAt, text: 'Giấy kiểm dịch và hải quan đã xong' }] : []),
    ...(b.balance ? [{ time: b.balance.paidAt, text: `Thanh toán 70% còn lại ${formatVND(b.balance.amount)}` }] : []),
    ...(b.settlement ? [{ time: b.settlement.issuedAt, text: 'Nhà xe phát hành bảng quyết toán' }] : []),
    ...(b.settlement?.paid ? [{ time: b.settlement.paid.paidAt, text: 'Hoàn tất quyết toán và đánh giá, đóng đơn' }] : []),
  ].sort((x, y) => x.time - y.time)
  const route = `${placeName(b.origin.name)} → ${placeName(b.dest.name)}`
  const payOpen = b.status === 'settlement_issued' || b.status === 'payment_overdue'
  const canPayBalance = !b.balance && (b.status === 'ready_for_pickup' || b.status === 'en_route_to_pickup')
  const needResubmit = b.status === 'under_review' && b.medical?.status === 'resubmit'

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Trang chủ</Link> / <Link to="/orders">Đơn của tôi</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className={`page-header ${s.titleRow}`}><div><h1>Đơn {b.id}</h1><p>{route} · khởi hành {formatDate(b.departAt)} · {b.horses.length} ngựa</p></div><BookingStatusBadge status={b.status} /></div>

        <div className={s.main}>
          <Progress b={b} />

          {/* Việc của bạn bây giờ: thẻ nổi + form hành động ngay bên dưới */}
          <div className={`${s.next} ${TONE[next.tone]}`} role="status">
            <i className={`fa-solid ${next.icon}`} aria-hidden="true" />
            <div className={s.nextBody}>
              <span className={s.nextTag}>{next.actionNeeded ? 'Việc của bạn bây giờ' : 'Bạn không cần làm gì lúc này'}</span>
              <h2>{next.title}</h2><p>{next.text}</p>
              {b.status === 'rejected' && <Link to="/booking/route" className="btn btn-primary"><i className="fa-solid fa-plus" /> Đặt chuyến mới</Link>}
              {next.cta && <a href="#viec-cua-ban" className="btn btn-primary" onClick={e => { e.preventDefault(); document.getElementById('viec-cua-ban')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{next.cta} <i className="fa-solid fa-arrow-down" /></a>}
            </div>
          </div>
          {(needResubmit || b.status === 'awaiting_payment' || canPayBalance || payOpen) && (
            <div id="viec-cua-ban" className={s.main}>
              {needResubmit && <Resubmit b={b} owner={owner} onDone={reloadAll} />}
              {b.status === 'awaiting_payment' && b.quote && <PayCard b={b} owner={owner} onDone={reloadAll} />}
              {canPayBalance && <BalanceCard b={b} owner={owner} onDone={reloadAll} />}
              {payOpen && <SettlementCard b={b} owner={owner} onDone={reloadAll} />}
            </div>
          )}

          <div className={s.tabs} role="tablist" aria-label="Chi tiết đơn">
            {tabs.map(k => <button key={k} role="tab" aria-selected={tab === k} className={`${s.tab} ${tab === k ? s.tabOn : ''}`} onClick={() => setPicked(k)}>{TAB_LABEL[k]}</button>)}
          </div>

          {tab === 'journey' && (
            <>
              {(b.trips ?? []).some(t => t.run) && (
                <div className="card">
                  <div className="card-header"><h3><i className="fa-solid fa-location-dot" /> Hành trình</h3>{b.status === 'in_transit' && <span className="badge badge-info">Đang chạy</span>}</div>
                  {b.trips!.filter(t => t.run).map((t, i) => (
                    <div key={t.tripId}>
                      {b.trips!.length > 1 && <p className="form-hint" style={{ margin: '8px 0' }}><b>Xe {b.trips!.indexOf(t) + 1}</b> · {t.tripId}</p>}
                      <TripTimeline trip={t} now={now} />
                      {i < b.trips!.filter(x => x.run).length - 1 && <hr style={{ margin: '14px 0' }} />}
                    </div>
                  ))}
                </div>
              )}
              <IncidentsCard b={b} />
              {ROUTE_VISIBLE.includes(b.status) && b.route && <RouteCard b={b} />}
              <TripsCard team={team} />
            </>
          )}

          {tab === 'docs' && <ClearanceProgressCard b={b} owner={owner} onDone={reloadAll} />}

          {tab === 'pay' && (
            <>
              {POST_PAYMENT.includes(b.status) && <BalanceCard b={b} owner={owner} onDone={reloadAll} showAction={false} />}
              {!payOpen && <SettlementCard b={b} owner={owner} onDone={reloadAll} />}
              {b.quote && (
                <div className="card">
                  <div className="card-header"><h3><i className="fa-solid fa-file-invoice-dollar" /> Báo giá</h3></div>
                  <QuoteSheet {...b.quote} expiresAt={b.status === 'awaiting_payment' ? b.quote.expiresAt : undefined} />
                </div>
              )}
              <IncidentPolicy />
            </>
          )}

          {tab === 'history' && (
            <>
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" /> Lịch sử đơn</h3></div>
                <ol className={s.timeline}>
                  {events.map(e => <li key={e.time + e.text} className={s.tl}><span className={s.tlDot}><i className="fa-solid fa-check" aria-hidden="true" /></span><div>{e.text}<div className={s.tlTime}>{formatDateTime(e.time)}</div></div></li>)}
                </ol>
              </div>
            </>
          )}

          {tab === 'info' && (
            <>
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3></div>
                <dl className={s.grid}>
                  <div><dt>Loại chuyến</dt><dd>{b.type === 'international' ? `Quốc tế (${COUNTRIES[b.origin.country].name} → ${COUNTRIES[b.dest.country].name})` : 'Trong nước'}</dd></div>
                  <div><dt>Ngày khởi hành</dt><dd>{formatDate(b.departAt)}</dd></div>
                  <div><dt>Điểm đón</dt><dd>{placeName(b.origin.name)}</dd></div>
                  <div><dt>Điểm giao</dt><dd>{placeName(b.dest.name)}</dd></div>
                  {b.gate && <div><dt>Cửa khẩu (đã khóa)</dt><dd>{b.gate}</dd></div>}
                  <div><dt>Người gửi</dt><dd>{b.consignor.name}</dd></div>
                  <div><dt>Người nhận</dt><dd>{b.consignee.name}</dd></div>
                </dl>
              </div>
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-horse-head" /> {b.horses.length} ngựa · xe {clsLabel}</h3></div>
                {b.horses.map(h => (
                  <div key={h.horseId} className={s.horseRow}>
                    <div><b>{h.name}</b> <small>Chip {h.microchip} · {h.breed} · {SEX_LABEL[h.sex]}</small></div>
                    <div style={{ textAlign: 'right' }}>{h.stall === 'single' ? 'Khoang đơn' : 'Khoang tiêu chuẩn'} · {h.targetTemp}°C</div>
                    <small>{h.insurance.opted ? `Mua bảo hiểm, phí ${formatVND(insuranceFee(h.breed))}` : 'Từ chối bảo hiểm (trách nhiệm hạn chế)'}</small>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-rotate-left" /> Hủy đơn và hoàn cọc</h3></div>
                <table className={s.policy}><tbody>{REFUND_POLICY.map(([c, r]) => <tr key={c}><td>{c}</td><td>{r}</td></tr>)}</tbody></table>
                {CANCELLABLE.includes(b.status) && <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setCancelling(true)}><i className="fa-solid fa-ban" /> Hủy đơn này</button>}
              </div>
            </>
          )}

          <p className="form-hint">Cần hỗ trợ? Gọi <a href={`tel:${HOTLINE.replace(/\s/g, '')}`} className="text-orange font-semibold">{HOTLINE}</a>.</p>
        </div>
      </div>
      {cancelling && <CancelModal b={b} owner={owner} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); reloadAll() }} />}
    </div>
  )
}
