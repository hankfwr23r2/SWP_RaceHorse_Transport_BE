// Specialist: đối chiếu hồ sơ pháp lý một đơn. Mọi điểm đối chiếu đạt thì duyệt; sai sót thì yêu cầu khách nộp lại (bắt buộc chọn lý do).
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { CLEARANCE_DOC, REJECT_REASONS, type ClearanceDocType } from '@shared/config/booking-rules'
import { docsDueAt, legalChecks } from '@shared/lib/booking'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi, vehiclesApi } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useToast } from '@shared/ui/toast'
import { History, TripSummary } from '../../../shared/BookingParts'
import s from '../../../shared/booking.module.css'

function Review({ b, team, onDone }: { b: Booking; team: Parameters<typeof legalChecks>[1]; onDone: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { session } = useAuth()
  const checks = legalChecks(b, team)
  const submittedDocs = (Object.keys(b.clearance!.docs) as ClearanceDocType[])
  const [ok, setOk] = useState<string[]>([])
  const [fixing, setFixing] = useState(false)
  const [reasons, setReasons] = useState<string[]>([])
  const [docs, setDocs] = useState<ClearanceDocType[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const all = ok.length === checks.length

  const run = async (fn: () => Promise<unknown>, msg: string, after?: () => void) => {
    setBusy(true)
    try { await fn(); toast(msg); onDone(); after?.() } catch (e) { toast(e instanceof Error ? e.message : 'Không thực hiện được', 'error'); setBusy(false) }
  }
  const toggle = <T,>(list: T[], v: T, on: boolean) => (on ? [...list, v] : list.filter(x => x !== v))
  const startFix = () => { setFixing(true); setDocs(submittedDocs.filter(d => checks.some(c => c.doc === d && !ok.includes(c.id)))) }

  return (
    <>
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-folder-open" /> Hồ sơ khách nộp</h3><span className="sub-text">Nộp {b.clearance?.submittedAt && formatDateTime(b.clearance.submittedAt)}</span></div>
        <div style={{ display: 'grid', gap: 8 }}>
          {submittedDocs.map(t => {
            const f = b.clearance!.docs[t]!
            return <div key={t} className={s.horse} style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}><div><b>{CLEARANCE_DOC[t].label}</b><div className={s.horseMeta}><i className="fa-solid fa-file-pdf" /> {f.fileName} · lần nộp {f.version}</div></div><span className="badge badge-info">Đã nộp</span></div>
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-list-check" /> Đối chiếu</h3><span className="sub-text">{ok.length}/{checks.length} đạt</span></div>
        <div className={s.reasonList} role="group" aria-label="Điểm cần đối chiếu">
          {checks.map(c => (
            <label key={c.id} style={{ alignItems: 'flex-start' }}><input type="checkbox" checked={ok.includes(c.id)} onChange={e => { const on = e.target.checked; setOk(x => toggle(x, c.id, on)) }} style={{ marginTop: 3 }} />
              <span><b>{CLEARANCE_DOC[c.doc].short}:</b> {c.label}</span></label>
          ))}
        </div>
      </div>

      <div className="card">
        <div className={s.actionBar}>
          <div><b>{all ? 'Mọi điểm đối chiếu đạt' : 'Chưa thể duyệt'}</b><div className={s.hint}>{all ? 'Duyệt toàn bộ hồ sơ để chuyển Điều phối kiểm tra sẵn sàng.' : 'Cần tick đạt tất cả điểm đối chiếu. Điểm nào sai thì yêu cầu khách nộp lại.'}</div></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={startFix} disabled={busy}><i className="fa-solid fa-rotate-left" /> Yêu cầu bổ sung</button>
            <button className="btn btn-primary" disabled={!all || busy} onClick={() => run(() => bookingsApi.approveLegal(b.id, session!.name), `Đã duyệt hồ sơ pháp lý ${b.id}`, () => navigate('/specialist/legal'))}><i className="fa-solid fa-stamp" /> Duyệt toàn bộ hồ sơ pháp lý</button>
          </div>
        </div>
        {fixing && (
          <div className={`${s.actionBox} ${s.actionDanger}`} style={{ marginTop: 14 }}>
            <b>Yêu cầu khách nộp lại</b>
            <div><div className={s.hint} style={{ marginBottom: 6 }}>Giấy cần nộp lại</div>
              <div className={s.reasonList}>{submittedDocs.map(t => <label key={t}><input type="checkbox" checked={docs.includes(t)} onChange={e => { const on = e.target.checked; setDocs(x => toggle(x, t, on)) }} />{CLEARANCE_DOC[t].label}</label>)}</div></div>
            <div><div className={s.hint} style={{ marginBottom: 6 }}>Lý do (bắt buộc chọn)</div>
              <div className={s.reasonList}>{REJECT_REASONS.map(r => <label key={r}><input type="checkbox" checked={reasons.includes(r)} onChange={e => { const on = e.target.checked; setReasons(x => toggle(x, r, on)) }} />{r}</label>)}</div></div>
            <div className="form-group" style={{ margin: 0 }}><label htmlFor="fixnote">Ghi chú cho khách</label><textarea id="fixnote" className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Biển số trên tờ khai là 29H-12346, cần sửa thành 29H-12345." /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setFixing(false)}>Hủy</button>
              <button className="btn btn-danger" disabled={busy || !reasons.length || !docs.length} onClick={() => run(() => bookingsApi.requestClearanceFix(b.id, session!.name, { docs, reasons, note: note.trim() }), 'Đã yêu cầu khách nộp lại giấy tờ', () => navigate('/specialist/legal'))}>Gửi yêu cầu nộp lại</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function LegalReviewPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const { data: b, reload } = useLoad(() => bookingsApi.get(id), [id])
  const { data: vehicles } = useLoad(vehiclesApi.list)
  const { data: crew } = useLoad(crewApi.list)

  if (!b || !vehicles || !crew) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  if (b.intake?.specialist.name !== session!.name) return <div className="page"><div className="wrap"><div className="alert alert-danger"><i className="fa-solid fa-lock" /><div>Đơn {b.id} không được giao cho bạn. <Link to="/specialist/legal" className="text-orange font-semibold">Về danh sách</Link></div></div></div></div>

  const v = vehicles.find(x => x.id === b.fleet?.vehicleId)
  const driver = crew.find(x => x.id === b.fleet?.driverId)
  const escort = crew.find(x => x.id === b.fleet?.escortId)
  const team = v && driver && escort ? { plate: v.plate, driverName: driver.name, driverId: driver.idNumber ?? '', escortName: escort.name, escortId: escort.idNumber ?? '' } : null

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/specialist/legal">Hồ sơ pháp lý</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1>Đơn {b.id}</h1><BookingStatusBadge status={b.status} audience="staff" /></div>
        <div className={s.layout}>
          <div className={s.main}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3></div><TripSummary b={b} /></div>
            {team && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-id-card" /> Dữ liệu chuẩn để đối chiếu</h3></div>
                <dl className={s.grid}>
                  <div><dt>Biển số xe</dt><dd>{team.plate}</dd></div>
                  <div><dt>Tài xế</dt><dd>{team.driverName}<div className={s.sub}>{team.driverId}</div></dd></div>
                  <div><dt>Hộ tống</dt><dd>{team.escortName}<div className={s.sub}>{team.escortId}</div></dd></div>
                  <div><dt>Microchip</dt><dd>{b.horses.map(h => h.microchip).join(', ')}</dd></div>
                  {b.gate && <div><dt>Cửa khẩu</dt><dd>{b.gate}</dd></div>}
                </dl>
              </div>
            )}
            {b.status === 'documents_submitted' && team && <Review key={b.clearance?.submittedAt} b={b} team={team} onDone={reload} />}
            {b.status === 'documents_submitted' && !team && <div className="alert alert-danger"><i className="fa-solid fa-circle-exclamation" /><div>Đơn chưa có phương án xe, không đối chiếu được.</div></div>}
            {['awaiting_clearance_docs', 'documentation_delayed'].includes(b.status) && <div className="alert alert-info"><i className="fa-solid fa-hourglass-half" /><div>Khách chưa nộp giấy tờ. Hạn nộp {formatDateTime(docsDueAt(b.departAt))}.</div></div>}
            {b.status === 'pending_resubmission' && <div className="alert alert-warning"><i className="fa-solid fa-hourglass-half" /><div><b>Đang chờ khách nộp lại.</b> {b.clearance?.rejection?.reasons.join(', ')}. {b.clearance?.rejection?.note}</div></div>}
            {['legal_docs_approved', 'dispatch_approved'].includes(b.status) && <div className="alert alert-success"><i className="fa-solid fa-stamp" /><div>Đã duyệt hồ sơ pháp lý {b.clearance?.approvedAt && formatDateTime(b.clearance.approvedAt)}.</div></div>}
          </div>
          <aside className={s.side}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" /> Nhật ký đơn</h3></div><History b={b} /></div>
          </aside>
        </div>
      </div>
    </div>
  )
}
