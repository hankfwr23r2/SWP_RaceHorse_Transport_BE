// Coordinator: chốt xe, nhân sự và lộ trình một đơn trong một trang (PRD mục 2.4, nhánh B).
// Hệ thống đã tự gán xe, tài xế, hộ tống và chia ngựa lúc tiếp nhận; Coordinator xem lại, sửa nếu cần, lập lộ trình rồi xác nhận.
import { ReadMore } from '@shared/ui/ReadMore'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { MAX_CONTINUOUS_HOURS, VEHICLE_CLASS } from '@shared/config/booking-rules'
import { TRANSIT_STATIONS } from '@shared/config/network'
import { AVG_SPEED_KMH } from '@shared/config/public-pricing'
import { borderOutsideWindow, buildRoutePlan, busyResources, estimateBorderEta, gatesFor, layoutLegs, routeKm, suggestGate, validateRoutePlan, vehicleClassOf, vehicleDocsOk } from '@shared/lib/booking'
import { atHour } from '@shared/lib/dates'
import { formatClock, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi, vehiclesApi, type CrewMember, type Vehicle } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import type { Booking, RestStop, VehicleTrip } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useToast } from '@shared/ui/toast'
import { HorseConfigList, History, ReviewChips, TripSummary } from '../../../shared/BookingParts'
import s from '../../../shared/booking.module.css'
import { FormSelect } from '@shared/ui/FormSelect'

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const fromLocal = (v: string) => (v ? new Date(v).getTime() : NaN)

type Draft = Pick<VehicleTrip, 'vehicleId' | 'driverId' | 'escortId' | 'horseIds'>

function Plan({ b, vehicles, crew, all, onDone }: { b: Booking; vehicles: Vehicle[]; crew: CrewMember[]; all: Booking[]; onDone: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { session } = useAuth()
  const international = b.type === 'international'
  const busy = useMemo(() => busyResources(all, b.departAt, b.id), [all, b.departAt, b.id])
  const drivers = crew.filter(c => c.role === 'driver')
  const escorts = crew.filter(c => c.role === 'escort')

  // ----- xe, nhân sự, ngựa -----
  const [trips, setTrips] = useState<Draft[]>((b.trips ?? []).map(t => ({ vehicleId: t.vehicleId, driverId: t.driverId, escortId: t.escortId, horseIds: t.horseIds })))
  const [note, setNote] = useState(b.plan?.note ?? '')
  const [working, setWorking] = useState(false)
  const [reason, setReason] = useState<string | null>(null) // không null = đang nhập lý do từ chối đơn
  const setTrip = (i: number, patch: Partial<Draft>) => setTrips(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const moveHorse = (horseId: string, to: number) => setTrips(ts => ts.map((t, j) => ({ ...t, horseIds: j === to ? [...t.horseIds.filter(x => x !== horseId), horseId] : t.horseIds.filter(x => x !== horseId) })))
  const usedVehicles = new Set(trips.map(t => t.vehicleId))
  const usedDrivers = new Set(trips.map(t => t.driverId))
  const usedEscorts = new Set(trips.map(t => t.escortId))
  const capacityOf = (id: string) => vehicles.find(v => v.id === id)?.capacity ?? 0
  const tripErrors = trips.flatMap((t, i) => {
    const out: string[] = []
    if (t.horseIds.length > capacityOf(t.vehicleId)) out.push(`Xe ${i + 1} chỉ có ${capacityOf(t.vehicleId)} ngăn, đang xếp ${t.horseIds.length} ngựa.`)
    if (!t.horseIds.length) out.push(`Xe ${i + 1} chưa có ngựa nào.`)
    if (!t.driverId) out.push(`Xe ${i + 1} chưa chọn tài xế.`)
    if (!t.escortId) out.push(`Xe ${i + 1} chưa chọn nhân viên hộ tống.`)
    return out
  })

  // Thêm một xe còn rảnh (kèm tài xế và hộ tống rảnh) rồi chuyển ngựa sang; bỏ một xe thì ngựa của xe đó chuyển sang xe đầu tiên còn lại
  const addTrip = () => {
    const v = vehicles.find(x => vehicleDocsOk(x, international) && !busy.vehicles.has(x.id) && !usedVehicles.has(x.id))
    const d = drivers.find(c => !busy.crew.has(c.id) && !usedDrivers.has(c.id))
    const e = escorts.find(c => !busy.crew.has(c.id) && !usedEscorts.has(c.id))
    if (!v || !d || !e) { toast('Không còn xe, tài xế hoặc nhân viên hộ tống rảnh để thêm.', 'error'); return }
    setTrips(ts => [...ts, { vehicleId: v.id, driverId: d.id, escortId: e.id, horseIds: [] }])
  }
  const removeTrip = (i: number) => setTrips(ts => {
    if (ts.length < 2) return ts
    const rest = ts.filter((_, j) => j !== i)
    rest[0] = { ...rest[0], horseIds: [...rest[0].horseIds, ...ts[i].horseIds] }
    return rest
  })
  const reassign = async () => {
    setWorking(true)
    try {
      const r = await bookingsApi.assignPreview(b.id)
      if (!r.ok) toast(r.reason ?? 'Không gán được', 'error')
      else { setTrips(r.trips); toast('Đã gán lại tự động, kiểm tra rồi xác nhận') }
    } finally { setWorking(false) }
  }

  // ----- lộ trình (một lộ trình dùng chung cho mọi xe) -----
  // Cửa khẩu do Coordinator chọn (khách không chọn): mặc định là cửa khẩu có tổng quãng đường ngắn nhất
  const gates = gatesFor(b.origin, b.dest)
  const suggested = suggestGate(b.origin, b.dest)
  const [gate, setGate] = useState(b.gate ?? suggested ?? '')
  const driveHours = routeKm(b.origin, b.dest, gate || undefined) / AVG_SPEED_KMH
  const initial = useMemo(() => b.route ?? buildRoutePlan({ ...b, gate: gate || undefined }, atHour(new Date(b.departAt), 5)), [b]) // eslint-disable-line react-hooks/exhaustive-deps
  const [etd, setEtd] = useState(toLocal(initial.legs[0].departAt))
  const [rests, setRests] = useState<RestStop[]>(initial.rests)
  const [borderText, setBorderText] = useState(initial.borderEta ? toLocal(initial.borderEta) : '')
  const [borderTouched, setBorderTouched] = useState(!!b.route?.borderEta)
  const etdT = fromLocal(etd)
  // Gợi ý lại các trạm trung chuyển theo cửa khẩu (đổi cửa khẩu hoặc bấm "Gợi ý lại")
  const resuggest = (g: string) => {
    const plan = buildRoutePlan({ ...b, gate: g || undefined }, Number.isNaN(etdT) ? atHour(new Date(b.departAt), 5) : etdT)
    setRests(plan.rests)
    setBorderTouched(false)
  }
  const pickGate = (g: string) => { setGate(g); resuggest(g) }
  const legs = useMemo(() => (Number.isNaN(etdT) ? initial.legs : layoutLegs(b.origin.name, b.dest.name, etdT, rests, driveHours)), [etdT, rests, b, driveHours, initial.legs])
  const borderEta = international ? (borderTouched ? fromLocal(borderText) : estimateBorderEta(legs)) : undefined
  const route = { legs, rests: rests.map((r, i) => ({ ...r, afterLeg: i + 1 })), borderEta: borderEta && !Number.isNaN(borderEta) ? borderEta : undefined }
  const { errors: routeErrors, warnings } = validateRoutePlan(route, international)
  if (Number.isNaN(etdT)) routeErrors.unshift('Nhập giờ khởi hành hợp lệ.')
  if (international && !gates.some(g => g.name === gate)) routeErrors.unshift('Chọn cửa khẩu cho tuyến này.')
  const errors = [...tripErrors, ...routeErrors]
  const setRest = (i: number, patch: Partial<RestStop>) => setRests(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const confirm = async () => {
    setWorking(true)
    try {
      await bookingsApi.confirmPlan(b.id, session!.name, { trips, route, gate: international ? gate : undefined, note: note.trim() })
      toast(`Đã xác nhận ${trips.length} xe và lộ trình ${b.id}`)
      onDone()
      navigate('/coordinator/fleet-plan')
    } catch (e) { toast(e instanceof Error ? e.message : 'Không xác nhận được', 'error'); setWorking(false) }
  }

  const reject = async () => {
    setWorking(true)
    try {
      await bookingsApi.rejectOrder(b.id, session!.name, 'coordinator', reason ?? '')
      toast(`Đã từ chối ${b.id}, khách nhận được lý do`)
      onDone()
      navigate('/coordinator/fleet-plan')
    } catch (e) { toast(e instanceof Error ? e.message : 'Không từ chối được', 'error'); setWorking(false) }
  }

  return (
    <>
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-truck" /> {trips.length > 1 ? `${trips.length} xe của đơn` : 'Xe của đơn'}</h3><span style={{ display: 'flex', gap: 8 }}><button className="btn btn-outline btn-sm" onClick={addTrip}><i className="fa-solid fa-plus" /> Thêm xe</button><button className="btn btn-outline btn-sm" disabled={working} onClick={reassign}><i className="fa-solid fa-wand-magic-sparkles" /> Gán lại tự động</button></span></div>
        <ReadMore className={s.hint} text={'Hệ thống đã chọn ít xe nhất và chia đều ngựa. Bạn có thể đổi xe, tài xế, hộ tống hoặc chuyển ngựa sang xe khác. Xe, tài xế hoặc hộ tống đã giữ cho đơn khác, hoặc xe không đủ ngăn thì không chọn được.'} />
        {trips.map((t, i) => {
          const v = vehicles.find(x => x.id === t.vehicleId)
          return (
            <div key={i} className={s.pick} style={{ display: 'block', marginBottom: 12 }}>
              <div className={s.pickName} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Xe {i + 1}{v ? ` · ${v.plate} (${VEHICLE_CLASS[vehicleClassOf(v.capacity)].label}, ${v.capacity} ngăn)` : ''}</span>{trips.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeTrip(i)}><i className="fa-solid fa-trash" /> Bỏ xe này</button>}</div>
              <div className={s.form2} style={{ marginTop: 10, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <div className="form-group">
                  <label htmlFor={`veh${i}`}>Xe</label>
                  <FormSelect id={`veh${i}`} className="form-control" value={t.vehicleId} onChange={e => setTrip(i, { vehicleId: e.target.value })}>
                    {vehicles.map(x => {
                      const why = !vehicleDocsOk(x, international) ? 'thiếu giấy đăng kiểm / liên vận' : busy.vehicles.has(x.id) ? 'đã giữ cho đơn khác' : usedVehicles.has(x.id) && x.id !== t.vehicleId ? 'đã chọn ở xe khác' : ''
                      return <option key={x.id} value={x.id} disabled={!!why}>{x.plate} · {x.capacity} ngăn{why ? ` (${why})` : ''}</option>
                    })}
                  </FormSelect>
                </div>
                <div className="form-group">
                  <label htmlFor={`drv${i}`}>Tài xế</label>
                  <FormSelect id={`drv${i}`} className="form-control" value={t.driverId} onChange={e => setTrip(i, { driverId: e.target.value })}>
                    {drivers.map(c => {
                      const why = busy.crew.has(c.id) ? 'đã giữ cho đơn khác' : usedDrivers.has(c.id) && c.id !== t.driverId ? 'đã chọn ở xe khác' : ''
                      return <option key={c.id} value={c.id} disabled={!!why}>{c.name}{why ? ` (${why})` : ''}</option>
                    })}
                  </FormSelect>
                </div>
                <div className="form-group">
                  <label htmlFor={`esc${i}`}>Nhân viên hộ tống</label>
                  <FormSelect id={`esc${i}`} className="form-control" value={t.escortId} onChange={e => setTrip(i, { escortId: e.target.value })}>
                    {escorts.map(c => {
                      const why = busy.crew.has(c.id) ? 'đã giữ cho đơn khác' : usedEscorts.has(c.id) && c.id !== t.escortId ? 'đã chọn ở xe khác' : ''
                      return <option key={c.id} value={c.id} disabled={!!why}>{c.name}{why ? ` (${why})` : ''}</option>
                    })}
                  </FormSelect>
                </div>
              </div>
              <ul style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {t.horseIds.map(hid => {
                  const h = b.horses.find(x => x.horseId === hid)
                  return (
                    <li key={hid} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <span><b>{h?.name}</b> <span className={s.sub}>Chip {h?.microchip}</span></span>
                      {trips.length > 1 && (
                        <FormSelect className="form-control" style={{ width: 150 }} aria-label={`Chuyển ${h?.name} sang xe`} value={i} onChange={e => moveHorse(hid, Number(e.target.value))}>
                          {trips.map((_, j) => <option key={j} value={j}>Xe {j + 1}</option>)}
                        </FormSelect>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-route" /> Lộ trình chi tiết</h3><span className="sub-text">Tổng thời gian lái ≈ {driveHours.toFixed(1)} giờ · {legs.length} chặng · dùng chung cho mọi xe</span></div>
        <div className="form-group" style={{ maxWidth: 320 }}><label htmlFor="etd" className="required">Giờ đón ngựa</label><input id="etd" type="datetime-local" className="form-control" value={etd} onChange={e => setEtd(e.target.value)} /></div>
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

      {international && (
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-flag" /> Cửa khẩu</h3><span className="sub-text">Khách không chọn cửa khẩu, bạn chọn theo lộ trình</span></div>
          <div className="form-group" style={{ maxWidth: 420, margin: 0 }}>
            <label htmlFor="gate" className="required">Cửa khẩu đi qua</label>
            <FormSelect id="gate" className="form-control" value={gate} onChange={e => pickGate(e.target.value)}>
              {gates.map(g => <option key={g.name} value={g.name}>{g.name}{g.name === suggested ? ' (tối ưu: quãng đường ngắn nhất)' : ` · ${routeKm(b.origin, b.dest, g.name)} km`}</option>)}
            </FormSelect>
            <div className="form-hint">Chốt lộ trình xong, cửa khẩu bị khóa. Đổi cửa khẩu thì hệ thống gợi ý lại các trạm trung chuyển.</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-location-dot" /> Trạm trung chuyển</h3><button className="btn btn-outline btn-sm" onClick={() => resuggest(gate)}><i className="fa-solid fa-wand-magic-sparkles" /> Gợi ý lại</button></div>
        <p className={s.hint} style={{ marginBottom: 10 }}>Các điểm xe đi qua giữa điểm đón và điểm trả{international ? ', theo cửa khẩu đã chọn' : ''}. Tại mỗi trạm ngựa dừng tối thiểu 30 phút, hộ tống kiểm tra thể trạng và ghi nhật ký an sinh. Ngựa không đi liên tục quá 3–4 giờ giữa hai trạm.</p>
        <div className={s.stops}>
          {rests.map((r, i) => (
            <div key={i} className={s.stopRow} style={{ gridTemplateColumns: '1fr 110px 1fr 40px' }}>
              <input className="form-control" list="transit-stations" aria-label={`Tên trạm trung chuyển ${i + 1}`} placeholder="Tên trạm trung chuyển" value={r.name} onChange={e => setRest(i, { name: e.target.value })} />
              <input className="form-control" aria-label={`Phút dừng trạm ${i + 1}`} inputMode="numeric" placeholder="Phút" value={r.minutes || ''} onChange={e => setRest(i, { minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              <input className="form-control" aria-label={`Ghi chú trạm ${i + 1}`} placeholder="Ghi chú" value={r.facilities} onChange={e => setRest(i, { facilities: e.target.value })} />
              <button className={s.iconBtn} aria-label={`Xóa trạm ${i + 1}`} onClick={() => setRests(x => x.filter((_, j) => j !== i))}><i className="fa-solid fa-trash" /></button>
            </div>
          ))}
          <datalist id="transit-stations">{TRANSIT_STATIONS.map(x => <option key={x.name} value={x.name} />)}</datalist>
          <div><button className="btn btn-outline btn-sm" onClick={() => setRests(x => [...x, { afterLeg: x.length + 1, name: '', minutes: 45, facilities: 'Bóng mát, nguồn nước máy sạch' }])}><i className="fa-solid fa-plus" /> Thêm trạm trung chuyển</button></div>
        </div>
      </div>

      {international && (
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-flag" /> Giờ tới cửa khẩu {gate}</h3></div>
          <div className="form-group" style={{ maxWidth: 320, margin: 0 }}>
            <label htmlFor="border" className="required">Giờ dự kiến tới cửa khẩu</label>
            <input id="border" type="datetime-local" className="form-control" value={borderTouched ? borderText : borderEta ? toLocal(borderEta) : ''} onChange={e => { setBorderTouched(true); setBorderText(e.target.value) }} />
            <div className="form-hint" style={borderEta && borderOutsideWindow(borderEta) ? { color: 'var(--amber)' } : undefined}>Nên rơi vào 07:30–16:30 để thông quan và khám lâm sàng trong ngày. Hệ thống ước lượng theo hành trình.</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="form-group"><label htmlFor="pn">Ghi chú</label><input id="pn" className="form-control" value={note} onChange={e => setNote(e.target.value)} /></div>
        {errors.length > 0 && <div className="alert alert-danger" style={{ marginBottom: 12 }}><i className="fa-solid fa-circle-exclamation" /><ul>{errors.map(e => <li key={e}>{e}</li>)}</ul></div>}
        {warnings.length > 0 && <div className="alert alert-warning" style={{ marginBottom: 12 }}><i className="fa-solid fa-triangle-exclamation" /><ul>{warnings.map(e => <li key={e}>{e}</li>)}</ul></div>}
        <div className={s.actionBar}>
          <div className={s.hint}>{errors.length ? 'Sửa các lỗi trên để xác nhận.' : 'Xác nhận để chuyển quản lý duyệt báo giá (khi Kiểm dịch viên cũng đã duyệt y tế).'}</div>
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" disabled={working} onClick={() => setReason(reason === null ? '' : null)}><i className="fa-solid fa-ban" /> Không duyệt, từ chối đơn</button>
            <button className="btn btn-primary" disabled={!!errors.length || working} onClick={confirm}><i className="fa-solid fa-circle-check" /> Xác nhận xe và lộ trình</button>
          </span>
        </div>
        {reason !== null && (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label htmlFor="rj" className="required">Lý do từ chối (khách sẽ thấy)</label>
            <textarea id="rj" className="form-control" rows={2} value={reason} onChange={e => setReason(e.target.value)} />
            <button className="btn btn-danger" style={{ marginTop: 8 }} disabled={working || !reason.trim()} onClick={reject}>Xác nhận từ chối đơn</button>
          </div>
        )}
      </div>
    </>
  )
}

export default function FleetPlanPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const { data: b, reload } = useLoad(() => bookingsApi.get(id), [id])
  const { data: all } = useLoad(bookingsApi.list)
  const { data: vehicles } = useLoad(vehiclesApi.list)
  const { data: crew } = useLoad(crewApi.list)

  if (!b || !all || !vehicles || !crew) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  if (b.intake?.coordinator.name !== session!.name) return <div className="page"><div className="wrap"><div className="alert alert-danger"><i className="fa-solid fa-lock" /><div>Đơn {b.id} không được giao cho bạn. <Link to="/coordinator/fleet-plan" className="text-orange font-semibold">Về danh sách</Link></div></div></div></div>

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/coordinator/fleet-plan">Xe và lộ trình</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1>Đơn {b.id}</h1><BookingStatusBadge status={b.status} audience="staff" /><ReviewChips b={b} /></div>
        <div className={s.layout}>
          <div className={s.main}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3></div><TripSummary b={b} /></div>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-horse-head" /> Ngựa cần chở</h3></div><HorseConfigList b={b} /></div>
            {b.status === 'under_review' ? (
              <Plan b={b} vehicles={vehicles} crew={crew} all={all} onDone={reload} />
            ) : b.plan ? (
              <div className="alert alert-success"><i className="fa-solid fa-circle-check" /><div><b>Đã chốt</b> lúc {formatDateTime(b.plan.at)}: {(b.trips ?? []).map((t, i) => `xe ${vehicles.find(v => v.id === t.vehicleId)?.plate} (${crew.find(c => c.id === t.driverId)?.name}, hộ tống ${crew.find(c => c.id === t.escortId)?.name}, ${t.horseIds.length} ngựa)${i < (b.trips?.length ?? 0) - 1 ? '; ' : ''}`)}. {b.route && `Khởi hành ${formatDateTime(b.route.legs[0].departAt)}.`}</div></div>
            ) : <div className="alert alert-info"><i className="fa-solid fa-circle-info" /><div>Đơn chưa ở bước thẩm định.</div></div>}
          </div>
          <aside className={s.side}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" /> Nhật ký đơn</h3></div><History b={b} /></div>
          </aside>
        </div>
      </div>
    </div>
  )
}
