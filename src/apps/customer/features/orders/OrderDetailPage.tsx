// Chi tiết đơn phía khách (Flow 1): tiến độ, bước tiếp theo, bổ sung hồ sơ, báo giá, đặt cọc, Carrier Info Sheet.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { BOOKING_STEPS, HORSE_DOC, stepOf, VEHICLE_CLASS } from '@shared/config/booking-rules'
import { BANK, HOTLINE, REFUND_POLICY } from '@shared/config/business-rules'
import { COUNTRIES } from '@shared/config/network'
import { CANCELLABLE, insuranceFee, refundOf, vehicleClassOf } from '@shared/lib/booking'
import { formatClock, formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { customerBookingsApi, type CustomerBookingView, type TeamInfo } from '@shared/services/bookings'
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
import { ClearanceCard } from './ClearanceCard'
import { POST_PAYMENT, ROUTE_STAGE, ROUTE_VISIBLE, nextStep } from './nextStep'
import s from './OrderDetail.module.css'

const TONE: Record<string, string> = { info: s.nextInfo, orange: s.nextOrange, warning: s.nextWarning, danger: s.nextDanger, success: s.nextSuccess, muted: s.nextMuted }
const placeName = (n: string) => n.split(' — ')[0]

function Progress({ b }: { b: CustomerBookingView }) {
  const at = stepOf(b.status)
  const expired = b.status === 'quote_expired'
  return (
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
  const pay = async () => {
    setBusy(true)
    try { await customerBookingsApi.payDeposit(owner, b.id); toast('Đã đặt cọc và ký hợp đồng vận tải'); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không thanh toán được', 'error'); setBusy(false); onDone() }
  }
  return (
    <div className={`card ${s.pay}`}>
      <div className="card-header"><h3><i className="fa-solid fa-credit-card" /> Đặt cọc giữ xe</h3></div>
      <div className={s.payAmount}><span>Số tiền cần đặt cọc (50%)</span><strong>{formatVND(b.quote!.deposit)}</strong></div>
      <div className={s.bank} aria-label="Thông tin chuyển khoản">
        <div><span>Ngân hàng</span><b>{BANK.name}</b></div>
        <div><span>Số tài khoản</span><b>{BANK.account}</b></div>
        <div><span>Chủ tài khoản</span><b>{BANK.owner}</b></div>
        <div><span>Nội dung</span><b>{b.id} COC</b></div>
      </div>
      <details className={s.contract}>
        <summary>Xem điều khoản Hợp đồng vận tải</summary>
        <ul>
          <li>Nhà xe chỉ vận chuyển. Bạn tự chuẩn bị và khai báo hồ sơ pháp lý, kiểm dịch, hải quan.</li>
          <li>Một đơn đi riêng một xe, không ghép ngựa của đơn khác.</li>
          <li>Nhiên liệu và phí cầu đường quyết toán theo hóa đơn thực tế sau chuyến.</li>
          <li>Phí lưu xe chờ {formatVND(b.quote!.demurragePerHour)} mỗi giờ khi chậm do giấy tờ của bạn.</li>
          <li>Hủy đơn sau khi đặt cọc theo bảng hoàn cọc ở cột bên phải.</li>
        </ul>
      </details>
      <label className={s.ack}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /><span>Tôi đã đọc và chấp thuận Hợp đồng vận tải, đồng ý đặt cọc {formatVND(b.quote!.deposit)}.</span></label>
      <button className="btn btn-primary btn-lg btn-full" disabled={!ok || busy} onClick={pay}>{busy ? 'Đang xử lý…' : 'Thanh toán cọc và ký hợp đồng'}</button>
      <p className="form-hint" style={{ textAlign: 'center' }}>Bản thử nghiệm: bấm thanh toán là ghi nhận đã nhận cọc.</p>
    </div>
  )
}

function CarrierSheet({ b, team }: { b: CustomerBookingView; team?: TeamInfo }) {
  if (!team || !b.fleet) return null
  const cls = VEHICLE_CLASS[vehicleClassOf(team.vehicle.stalls)]
  const row = (k: string, v: string) => <div><span>{k}</span><b>{v || '—'}</b></div>
  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-id-card" /> Carrier Info Sheet</h3><span className="badge badge-success">Chính thức</span></div>
      <p className="form-hint" style={{ marginBottom: 12 }}>Dùng thông tin này để xin Giấy kiểm dịch và mở Tờ khai hải quan. Biển số và cửa khẩu phải khớp từng chữ trên giấy tờ.</p>
      <div className={s.sheet}>
        <div className={s.sheetGrid}>
          <div className={s.sheetBox}>
            <h4>Phương tiện</h4>
            {row('Biển kiểm soát', team.vehicle.plate)}{row('Hạng xe', `${cls.label} · ${team.vehicle.stalls} ngăn`)}{row('Loại thùng', 'Thùng điều hòa chuyên dụng')}
            {row('Số khung (VIN)', team.vehicle.vin)}{row('Số đăng kiểm', team.vehicle.inspectionNo)}{b.type === 'international' && row('Giấy phép liên vận', team.vehicle.transitPermit)}
          </div>
          <div className={s.sheetBox}>
            <h4>Tuyến</h4>
            {row('Mã đơn', b.id)}{row('Khởi hành', formatDateTime(b.fleet.etd))}
            {b.type === 'international' && <>{row('Cửa khẩu', b.gate ?? '')}{row('Trạm hải quan dự kiến', `Chi cục Hải quan cửa khẩu ${(b.gate ?? '').split(' – ')[0]}`)}{row('ETA cửa khẩu', b.fleet.etaBorder ? formatDateTime(b.fleet.etaBorder) : '')}</>}
          </div>
          <div className={s.sheetBox}>
            <h4>Tài xế (Driver)</h4>
            {row('Họ tên', team.driver.name)}{row('CCCD / Hộ chiếu', team.driver.idNumber)}{row('Số GPLX', team.driver.license)}{row('Điện thoại', team.driver.phone)}
          </div>
          <div className={s.sheetBox}>
            <h4>Chăm sóc (Escort)</h4>
            {row('Họ tên', team.escort.name)}{row('CCCD / Hộ chiếu', team.escort.idNumber)}{row('Điện thoại', team.escort.phone)}
          </div>
        </div>
      </div>
    </div>
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
  const r = refundOf(b.departAt, paid, now, fm)
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
          <div><span>Hoàn lại ({Math.round(r.rate * 100)}%)</span><b className="text-green">{formatVND(r.refund)}</b></div>
          <div><span>Không hoàn</span><b className="text-red">{formatVND(r.lost)}</b></div>
        </div>
      ) : <div className="alert alert-info"><i className="fa-solid fa-circle-info" /><div>Bạn chưa đặt cọc nên hủy đơn không mất phí.</div></div>}
      {paid > 0 && <label className={s.ack} style={{ margin: '14px 0' }}><input type="checkbox" checked={fm} onChange={e => setFm(e.target.checked)} /><span>Hủy vì bất khả kháng (dịch bệnh, thiên tai, ngựa ốm có giấy chứng nhận). Nhân viên sẽ đối chiếu giấy tờ.</span></label>}
      <div className="form-group" style={{ margin: 0 }}><label htmlFor="cr" className="required">Lý do hủy</label><textarea id="cr" className="form-control" rows={3} value={reason} onChange={e => setReason(e.target.value)} /></div>
    </Modal>
  )
}

// Lộ trình đã được Manager duyệt (Flow 3): các chặng, trạm nghỉ, cửa khẩu và nhắc chuẩn bị bản gốc
function RouteCard({ b }: { b: CustomerBookingView }) {
  const r = b.route!
  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-map-location-dot" /> Lộ trình đã duyệt</h3>{b.manifest && <span className="badge badge-success">{b.manifest.tripId}</span>}</div>
      <ol className={s.legList}>
        {r.legs.map((l, i) => (
          <li key={l.no}>
            <div><b>Chặng {l.no}:</b> {l.from} → {l.to}</div>
            <div className="sub-text">Khởi hành {formatDateTime(l.departAt)} · đến khoảng {formatClock(l.arriveAt)}</div>
            {r.rests[i] && <div className="sub-text"><i className="fa-solid fa-mug-hot" /> Nghỉ {r.rests[i].minutes} phút tại {r.rests[i].name}</div>}
          </li>
        ))}
      </ol>
      {r.borderEta && <p className="form-hint" style={{ marginTop: 10 }}><i className="fa-solid fa-flag" /> Dự kiến tới cửa khẩu {b.gate} lúc {formatDateTime(r.borderEta)}.</p>}
      <div className="alert alert-info" style={{ marginTop: 14 }}><i className="fa-solid fa-folder-open" /><div><b>Nhắc bàn giao:</b> chuẩn bị sẵn các bản gốc hồ sơ (Hộ chiếu ngựa, Giấy kiểm dịch, PoA{b.type === 'international' ? ', Import Permit' : ''}…) để giao cho tài xế tại điểm đón.</div></div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const owner = session!.name
  const now = useNow()
  const { data: b, reload } = useLoad(() => customerBookingsApi.get(owner, id), [owner, id])
  const [cancelling, setCancelling] = useState(false)
  const { data: team } = useLoad(() => customerBookingsApi.team(owner, id), [owner, id, b?.status])
  const reloadAll = () => reload()
  // Đang chạy: cập nhật định kỳ để thấy mốc check-in mới
  const running = b?.status === 'en_route_to_pickup' || b?.status === 'in_transit'
  useEffect(() => { if (running) reload() }, [now, running, reload])

  if (b === undefined) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  const next = nextStep(b, now)
  const cls = VEHICLE_CLASS[vehicleClassOf(team?.vehicle.stalls ?? Math.max(b.horses.length, 1))] // xe thật khi đã chốt, chưa chốt thì theo số ngựa
  const events = [
    { time: b.createdAt, text: 'Bạn đã gửi đơn' },
    ...(b.medical?.status === 'approved' && b.medical.at ? [{ time: b.medical.at, text: 'Thẩm định y tế đạt' }] : []),
    ...(b.fleet && ['awaiting_payment', 'quote_expired', 'awaiting_clearance_docs'].includes(b.status) ? [{ time: b.fleet.confirmedAt, text: 'Phương án xe và lộ trình đã chốt' }] : []),
    ...(b.quote ? [{ time: b.quote.sentAt, text: 'Báo giá được gửi cho bạn' }] : []),
    ...(b.payment ? [{ time: b.payment.paidAt, text: `Đặt cọc ${formatVND(b.payment.amount)}, ký hợp đồng` }] : []),
  ].sort((x, y) => x.time - y.time)

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Tổng quan</Link> / <Link to="/orders">Đơn của tôi</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className={`page-header ${s.titleRow}`}><h1>Đơn {b.id}</h1><BookingStatusBadge status={b.status} /></div>

        <div className={s.layout}>
          <div className={s.main}>
            <Progress b={b} />
            <div className={`${s.next} ${TONE[next.tone]}`} role="status">
              <i className={`fa-solid ${next.icon}`} aria-hidden="true" />
              <div><h2>{next.title}</h2><p>{next.text}</p></div>
            </div>

            {b.status === 'under_review' && b.medical?.status === 'resubmit' && <Resubmit b={b} owner={owner} onDone={reloadAll} />}

            {/* Từ khi lộ trình được lập: hành trình và lộ trình lên trước, giấy tờ thu gọn */}
            {ROUTE_STAGE.includes(b.status) && b.trip && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-location-dot" /> Hành trình</h3>{b.status === 'in_transit' && <span className="badge badge-info">Đang chạy</span>}</div>
                <TripTimeline b={b} now={now} />
              </div>
            )}
            {ROUTE_VISIBLE.includes(b.status) && b.route && <RouteCard b={b} />}
            {POST_PAYMENT.includes(b.status) && (ROUTE_STAGE.includes(b.status)
              ? (
                <details className={`card ${s.fold}`}>
                  <summary><i className="fa-solid fa-file-circle-check" /> Giấy tờ pháp lý và Carrier Info Sheet</summary>
                  <div className={s.foldBody}><ClearanceCard b={b} team={team} owner={owner} onDone={reloadAll} /><CarrierSheet b={b} team={team} /></div>
                </details>
              ) : (
                <>
                  <ClearanceCard b={b} team={team} owner={owner} onDone={reloadAll} />
                  <CarrierSheet b={b} team={team} />
                </>
              ))}

            {b.quote && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-file-invoice-dollar" /> Báo giá</h3></div>
                {team && b.fleet && <p className="form-hint" style={{ marginBottom: 12 }}>Xe {team.vehicle.plate} · tài xế {team.driver.name} · hộ tống {team.escort.name}</p>}
                <QuoteSheet {...b.quote} expiresAt={b.status === 'awaiting_payment' ? b.quote.expiresAt : undefined} />
              </div>
            )}

            {b.status === 'awaiting_payment' && b.quote && <PayCard b={b} owner={owner} onDone={reloadAll} />}

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
              <div className="card-header"><h3><i className="fa-solid fa-horse-head" /> {b.horses.length} ngựa · xe {cls.label}</h3></div>
              {b.horses.map(h => (
                <div key={h.horseId} className={s.horseRow}>
                  <div><b>{h.name}</b> <small>Chip {h.microchip} · {h.breed} · {SEX_LABEL[h.sex]}</small></div>
                  <div style={{ textAlign: 'right' }}>{h.stall === 'single' ? 'Khoang đơn' : 'Khoang tiêu chuẩn'} · {h.targetTemp}°C</div>
                  <small>{h.insurance.opted ? `Mua bảo hiểm, phí ${formatVND(insuranceFee(h.breed))}` : 'Từ chối bảo hiểm (trách nhiệm hạn chế)'}</small>
                </div>
              ))}
            </div>
          </div>

          <aside className={s.side}>
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" /> Diễn biến</h3></div>
              <ol className={s.timeline}>
                {events.map(e => <li key={e.time + e.text} className={s.tl}><span className={s.tlDot}><i className="fa-solid fa-check" aria-hidden="true" /></span><div>{e.text}<div className={s.tlTime}>{formatDateTime(e.time)}</div></div></li>)}
              </ol>
            </div>
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-rotate-left" /> Hủy đơn và hoàn cọc</h3></div>
              <table className={s.policy}><tbody>{REFUND_POLICY.map(([c, r]) => <tr key={c}><td>{c}</td><td>{r}</td></tr>)}</tbody></table>
              {CANCELLABLE.includes(b.status) && <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setCancelling(true)}><i className="fa-solid fa-ban" /> Hủy đơn này</button>}
              <p className="form-hint" style={{ marginTop: 10 }}>Cần hỗ trợ? Gọi <a href={`tel:${HOTLINE.replace(/\s/g, '')}`} className="text-orange font-semibold">{HOTLINE}</a>.</p>
            </div>
          </aside>
        </div>
      </div>
      {cancelling && <CancelModal b={b} owner={owner} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); reloadAll() }} />}
    </div>
  )
}
