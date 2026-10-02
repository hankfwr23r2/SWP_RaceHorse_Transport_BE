// Coordinator: lập lộ trình chi tiết một đơn. Hệ thống chia chặng đều theo trạm nghỉ và kiểm tra quy tắc chia chặng ngay khi sửa.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { MAX_CONTINUOUS_HOURS } from '@shared/config/booking-rules'
import { VET_POINTS } from '@shared/config/network'
import { AVG_SPEED_KMH } from '@shared/config/public-pricing'
import { buildRoutePlan, borderOutsideWindow, estimateBorderEta, layoutLegs, routeKm, validateRoutePlan } from '@shared/lib/booking'
import { formatClock, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import type { Booking, RestStop, VetPoint } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useToast } from '@shared/ui/toast'
import { History, TripSummary } from '../../../shared/BookingParts'
import s from '../../../shared/booking.module.css'

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const fromLocal = (v: string) => (v ? new Date(v).getTime() : NaN)

function Planner({ b, onDone }: { b: Booking; onDone: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { session } = useAuth()
  const international = b.type === 'international'
  const initial = useMemo(() => b.route ?? buildRoutePlan(b, { etd: b.fleet!.etd, stops: b.fleet!.stops }), [b])
  const driveHours = routeKm(b.origin, b.dest, b.gate) / AVG_SPEED_KMH

  const [etd, setEtd] = useState(toLocal(initial.legs[0].departAt))
  const [rests, setRests] = useState<RestStop[]>(initial.rests)
  const [vets, setVets] = useState<VetPoint[]>(initial.vets)
  const [borderText, setBorderText] = useState(initial.borderEta ? toLocal(initial.borderEta) : '')
  const [borderTouched, setBorderTouched] = useState(!!b.route?.borderEta)
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState('')

  const etdT = fromLocal(etd)
  const legs = useMemo(() => (Number.isNaN(etdT) ? initial.legs : layoutLegs(b.origin.name, b.dest.name, etdT, rests, driveHours)), [etdT, rests, b, driveHours, initial.legs])
  const borderEta = international ? (borderTouched ? fromLocal(borderText) : estimateBorderEta(legs)) : undefined
  const { errors, warnings } = validateRoutePlan({ legs, rests, vets, borderEta: borderEta && !Number.isNaN(borderEta) ? borderEta : undefined }, international)
  if (Number.isNaN(etdT)) errors.unshift('Nhập giờ khởi hành hợp lệ.')

  const setRest = (i: number, patch: Partial<RestStop>) => setRests(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const addVet = (name: string) => {
    const v = VET_POINTS.find(x => x.name === name)
    if (v && !vets.some(x => x.name === v.name)) setVets(x => [...x, { name: v.name, phone: v.phone, near: v.area }])
    setPick('')
  }

  const save = async () => {
    setBusy(true)
    try {
      await bookingsApi.saveRoutePlan(b.id, session!.name, { legs, rests: rests.map((r, i) => ({ ...r, afterLeg: i + 1 })), vets, borderEta: borderEta && !Number.isNaN(borderEta) ? borderEta : undefined })
      toast(`Đã hoàn tất lộ trình ${b.id}, trình Manager duyệt`)
      onDone()
      navigate('/coordinator/routes')
    } catch (e) { toast(e instanceof Error ? e.message : 'Không lưu được', 'error'); setBusy(false) }
  }

  return (
    <>
      {b.route?.returnNote && <div className="alert alert-danger"><i className="fa-solid fa-rotate-left" /><div><b>Manager trả về:</b> {b.route.returnNote}</div></div>}

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-route" /> Chặng di chuyển</h3><span className="sub-text">Tổng thời gian lái ≈ {driveHours.toFixed(1)} giờ · {legs.length} chặng</span></div>
        <div className="form-group" style={{ maxWidth: 320 }}><label htmlFor="etd" className="required">Giờ đón ngựa (ETD)</label><input id="etd" type="datetime-local" className="form-control" value={etd} onChange={e => setEtd(e.target.value)} /></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Chặng</th><th>Từ → Đến</th><th>Khởi hành</th><th>Đến</th><th className="text-right">Lái liên tục</th></tr></thead>
            <tbody>
              {legs.map(l => {
                const h = (l.arriveAt - l.departAt) / 3_600_000
                return <tr key={l.no}><td className="font-semibold">{l.no}</td><td>{l.from} → {l.to}</td><td className="nowrap">{formatDateTime(l.departAt)}</td><td className="nowrap">{formatClock(l.arriveAt)}</td><td className="text-right nowrap" style={{ color: h > MAX_CONTINUOUS_HOURS ? 'var(--red)' : undefined, fontWeight: 600 }}>{h.toFixed(1)} giờ</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-mug-hot" /> Trạm dừng nghỉ xả cơ</h3></div>
        <p className={s.hint} style={{ marginBottom: 10 }}>Trạm có bóng mát, nguồn nước máy sạch để Escort kiểm tra thể trạng và cho ngựa uống nước. Nghỉ tối thiểu 30 phút. Thêm hoặc bớt trạm thì hệ thống chia lại chặng.</p>
        <div className={s.stops}>
          {rests.map((r, i) => (
            <div key={i} className={s.stopRow} style={{ gridTemplateColumns: '1fr 110px 1fr 40px' }}>
              <input className="form-control" aria-label={`Tên trạm ${i + 1}`} placeholder="Tên trạm nghỉ" value={r.name} onChange={e => setRest(i, { name: e.target.value })} />
              <input className="form-control" aria-label={`Phút nghỉ trạm ${i + 1}`} inputMode="numeric" placeholder="Phút" value={r.minutes || ''} onChange={e => setRest(i, { minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              <input className="form-control" aria-label={`Tiện nghi trạm ${i + 1}`} placeholder="Tiện nghi" value={r.facilities} onChange={e => setRest(i, { facilities: e.target.value })} />
              <button className={s.iconBtn} aria-label={`Xóa trạm ${i + 1}`} onClick={() => setRests(x => x.filter((_, j) => j !== i))}><i className="fa-solid fa-trash" /></button>
            </div>
          ))}
          <div><button className="btn btn-outline btn-sm" onClick={() => setRests(x => [...x, { afterLeg: x.length + 1, name: '', minutes: 45, facilities: 'Bóng mát, nguồn nước máy sạch' }])}><i className="fa-solid fa-plus" /> Thêm trạm nghỉ</button></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-kit-medical" /> Trạm Thú y khẩn cấp dọc tuyến</h3></div>
        <p className={s.hint} style={{ marginBottom: 10 }}>Dùng khi ngựa đau bụng, sốt hoặc chấn thương. Cần ít nhất một trạm.</p>
        <ul style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {vets.map(v => <li key={v.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}><span><b>{v.name}</b> · {v.phone}<span className={s.sub}> ({v.near})</span></span><button className={s.iconBtn} style={{ width: 32, height: 32 }} aria-label={`Bỏ ${v.name}`} onClick={() => setVets(x => x.filter(y => y.name !== v.name))}><i className="fa-solid fa-xmark" /></button></li>)}
        </ul>
        <select className="form-control" style={{ maxWidth: 420 }} aria-label="Thêm trạm thú y" value={pick} onChange={e => addVet(e.target.value)}>
          <option value="">+ Thêm trạm thú y…</option>
          {VET_POINTS.filter(v => !vets.some(x => x.name === v.name)).map(v => <option key={v.name} value={v.name}>{v.name} ({v.area})</option>)}
        </select>
      </div>

      {international && (
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-flag" /> Cửa khẩu {b.gate}</h3></div>
          <div className="form-group" style={{ maxWidth: 320, margin: 0 }}>
            <label htmlFor="border" className="required">Giờ dự kiến tới cửa khẩu (ETA)</label>
            <input id="border" type="datetime-local" className="form-control" value={borderTouched ? borderText : borderEta ? toLocal(borderEta) : ''} onChange={e => { setBorderTouched(true); setBorderText(e.target.value) }} />
            <div className="form-hint" style={borderEta && borderOutsideWindow(borderEta) ? { color: 'var(--amber)' } : undefined}>Nên rơi vào 07:30–16:30 để thông quan và khám lâm sàng trong ngày. Hệ thống ước lượng theo hành trình.</div>
          </div>
        </div>
      )}

      <div className="card">
        {errors.length > 0 && <div className="alert alert-danger" style={{ marginBottom: 12 }}><i className="fa-solid fa-circle-exclamation" /><ul>{errors.map(e => <li key={e}>{e}</li>)}</ul></div>}
        {warnings.length > 0 && <div className="alert alert-warning" style={{ marginBottom: 12 }}><i className="fa-solid fa-triangle-exclamation" /><ul>{warnings.map(e => <li key={e}>{e}</li>)}</ul></div>}
        <div className={s.actionBar}>
          <div className={s.hint}>{errors.length ? 'Sửa các lỗi trên để hoàn tất.' : 'Hoàn tất để trình Manager duyệt Trip Manifest.'}</div>
          <button className="btn btn-primary" disabled={!!errors.length || busy} onClick={save}><i className="fa-solid fa-paper-plane" /> Hoàn tất lộ trình, trình Manager</button>
        </div>
      </div>
    </>
  )
}

export default function RoutePlannerPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const { data: b, reload } = useLoad(() => bookingsApi.get(id), [id])
  if (!b) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  if (b.intake?.coordinator.name !== session!.name) return <div className="page"><div className="wrap"><div className="alert alert-danger"><i className="fa-solid fa-lock" /><div>Đơn {b.id} không được giao cho bạn. <Link to="/coordinator/routes" className="text-orange font-semibold">Về danh sách</Link></div></div></div></div>

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/coordinator/routes">Lộ trình chi tiết</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1>Đơn {b.id}</h1><BookingStatusBadge status={b.status} audience="staff" /></div>
        <div className={s.layout}>
          <div className={s.main}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3></div><TripSummary b={b} /></div>
            {b.status === 'route_planning' && b.fleet && <Planner key={b.route?.returnNote ?? 'new'} b={b} onDone={reload} />}
            {b.status !== 'route_planning' && b.route && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-route" /> Lộ trình đã lập</h3><span className="sub-text">{b.route.completedAt && formatDateTime(b.route.completedAt)}</span></div>
                <ol style={{ display: 'grid', gap: 8, paddingLeft: 18, listStyle: 'decimal' }}>
                  {b.route.legs.map((l, i) => <li key={l.no}><b>{l.from} → {l.to}</b> · {formatDateTime(l.departAt)} – {formatClock(l.arriveAt)}{b.route!.rests[i] && <span className={s.sub}> · nghỉ {b.route!.rests[i].minutes} phút tại {b.route!.rests[i].name}</span>}</li>)}
                </ol>
                {b.route.borderEta && <p className={s.hint} style={{ marginTop: 10 }}>ETA cửa khẩu {b.gate}: {formatDateTime(b.route.borderEta)}</p>}
              </div>
            )}
          </div>
          <aside className={s.side}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" /> Nhật ký đơn</h3></div><History b={b} /></div>
          </aside>
        </div>
      </div>
    </div>
  )
}
