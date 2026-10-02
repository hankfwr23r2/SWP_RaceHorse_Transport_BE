// Coordinator: lập phương án một đơn. Xe nguyên chuyến, tài xế đi theo xe, một hộ tống, trạm nghỉ, ETD và ETA.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { VEHICLE_CLASS } from '@shared/config/booking-rules'
import { STATIONS } from '@shared/config/network'
import { HOLDING, classForHorses, reservedVehicleIds, routeKm, travelHours, vehicleClassOf } from '@shared/lib/booking'
import { atHour } from '@shared/lib/dates'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi, vehiclesApi, type Vehicle } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useToast } from '@shared/ui/toast'
import { HorseConfigList, History, ReviewChips, TripSummary } from '../../../shared/BookingParts'
import s from '../../../shared/booking.module.css'

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const fromLocal = (v: string) => (v ? new Date(v).getTime() : NaN)
const minutesOfDay = (t: number) => new Date(t).getHours() * 60 + new Date(t).getMinutes()
const BORDER_OPEN = 7 * 60 + 30
const BORDER_CLOSE = 16 * 60 + 30

function Plan({ b, vehicles, crew, all, onDone }: { b: Booking; vehicles: Vehicle[]; crew: { id: string; name: string; role: string; phone: string }[]; all: Booking[]; onDone: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { session } = useAuth()
  const international = b.type === 'international'
  const hours = travelHours(routeKm(b.origin, b.dest, b.gate), international)
  const etdDefault = atHour(new Date(b.departAt), 5)
  const reserved = reservedVehicleIds(all, b.departAt, b.id)
  const need = classForHorses(b.horses.length)

  const escorts = crew.filter(c => c.role === 'escort').map(c => ({ ...c, load: all.filter(o => o.id !== b.id && o.fleet?.escortId === c.id && HOLDING.includes(o.status)).length })).sort((x, y) => x.load - y.load || x.id.localeCompare(y.id))
  const [vehicleId, setVehicleId] = useState('')
  const [escortId, setEscortId] = useState(escorts[0]?.id ?? '')
  const [etd, setEtd] = useState(toLocal(etdDefault))
  const [etaBorder, setEtaBorder] = useState(international ? toLocal(etdDefault + Math.round(hours / 2) * 3_600_000) : '')
  const [etaDest, setEtaDest] = useState(toLocal(etdDefault + Math.ceil(hours + 1) * 3_600_000))
  const [stops, setStops] = useState<{ name: string; minutes: string }[]>(hours > 4 ? [{ name: '', minutes: '45' }] : [])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const rank = (v: Vehicle) => (v.status === 'maintenance' ? 3 : reserved.has(v.id) ? 2 : v.capacity < b.horses.length ? 2 : vehicleClassOf(v.capacity) === need ? 0 : 1)
  const sorted = [...vehicles].sort((x, y) => rank(x) - rank(y) || x.capacity - y.capacity)
  const vehicle = vehicles.find(v => v.id === vehicleId)
  const driver = crew.find(c => c.id === vehicle?.driverId)
  const etdT = fromLocal(etd), borderT = fromLocal(etaBorder), destT = fromLocal(etaDest)
  const borderOutside = international && !Number.isNaN(borderT) && (minutesOfDay(borderT) < BORDER_OPEN || minutesOfDay(borderT) > BORDER_CLOSE)
  const timeError = Number.isNaN(etdT) || Number.isNaN(destT) || destT <= etdT || (international && (Number.isNaN(borderT) || borderT <= etdT || borderT >= destT))
  const stopsOk = stops.every(x => x.name.trim() && Number(x.minutes) > 0)
  const can = !!vehicle && !!escortId && !timeError && stopsOk

  const confirm = async () => {
    if (!vehicle) return
    setBusy(true)
    try {
      await bookingsApi.confirmFleet(b.id, session!.name, {
        vehicleId: vehicle.id, driverId: vehicle.driverId, escortId, etd: etdT, etaBorder: international ? borderT : undefined, etaDest: destT,
        stops: stops.map(x => `${x.name.trim()} — nghỉ ${x.minutes} phút`), note: note.trim(),
      })
      toast(`Đã xác nhận phương án xe và lộ trình ${b.id}`)
      onDone()
      navigate('/coordinator/fleet-plan')
    } catch (e) { toast(e instanceof Error ? e.message : 'Không xác nhận được', 'error'); setBusy(false) }
  }

  return (
    <>
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-truck" /> Chọn xe nguyên chuyến</h3><span className="badge badge-info">Hạng cần: {VEHICLE_CLASS[need].label} · {b.horses.length} ngựa</span></div>
        <p className={s.hint} style={{ marginBottom: 10 }}>Mỗi đơn đi riêng một xe, không ghép đơn. Tài xế cố định theo xe. Xe đang bảo dưỡng, đã giữ cho đơn khác hoặc không đủ ngăn thì không chọn được.</p>
        <div className={s.pickGrid} role="radiogroup" aria-label="Danh sách xe">
          {sorted.map(v => {
            const why = v.status === 'maintenance' ? 'Đang bảo dưỡng' : reserved.has(v.id) ? 'Đã giữ cho đơn khác' : v.capacity < b.horses.length ? `Chỉ ${v.capacity} ngăn` : ''
            const cls = vehicleClassOf(v.capacity)
            const over = !why && cls !== need
            const d = crew.find(c => c.id === v.driverId)
            return (
              <label key={v.id} className={`${s.pick} ${vehicleId === v.id ? s.pickOn : ''} ${why ? s.pickOff : ''}`}>
                <input type="radio" name="vehicle" checked={vehicleId === v.id} disabled={!!why} onChange={() => setVehicleId(v.id)} />
                <div><div className={s.pickName}>{v.plate} · {v.name}</div><div className={s.pickSub}>{VEHICLE_CLASS[cls].label} · {v.capacity} ngăn · tài xế {d?.name ?? '—'}</div></div>
                <span className={`${s.fit} ${why ? s.fitBad : over ? s.fitHint : s.fitOk}`}>{why || (over ? 'Lớn hơn cần' : cls === need ? 'Phù hợp' : '')}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-users" /> Nhân sự đi theo chuyến</h3></div>
        <div className={s.form2}>
          <div className="form-group"><label>Tài xế (theo xe)</label><input className="form-control" readOnly value={driver ? `${driver.name} · ${driver.phone}` : 'Chọn xe để xem'} /></div>
          <div className="form-group">
            <label htmlFor="escort" className="required">Nhân viên hộ tống (Escort)</label>
            <select id="escort" className="form-control" value={escortId} onChange={e => setEscortId(e.target.value)}>
              {escorts.map((c, i) => <option key={c.id} value={c.id}>{c.name} · {c.load} chuyến đang giữ{i === 0 ? ' (gợi ý)' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-route" /> Lộ trình sơ bộ</h3><span className="sub-text">Dự kiến đi khoảng {hours.toFixed(1)} giờ</span></div>
        <div className={s.form2}>
          <div className="form-group"><label htmlFor="etd" className="required">Giờ đón ngựa (ETD)</label><input id="etd" type="datetime-local" className="form-control" value={etd} onChange={e => setEtd(e.target.value)} /></div>
          <div className="form-group"><label htmlFor="etad" className="required">Giờ dự kiến tới điểm giao</label><input id="etad" type="datetime-local" className={`form-control ${timeError ? 'invalid' : ''}`} value={etaDest} onChange={e => setEtaDest(e.target.value)} /></div>
          {international && (
            <div className="form-group">
              <label htmlFor="etab" className="required">ETA cửa khẩu {b.gate}</label>
              <input id="etab" type="datetime-local" className={`form-control ${timeError ? 'invalid' : ''}`} value={etaBorder} onChange={e => setEtaBorder(e.target.value)} />
              {borderOutside && <div className="form-hint" style={{ color: 'var(--amber)' }}>Ngoài khung 07:30–16:30. Nên xếp ETA trong giờ làm việc của cửa khẩu để thông quan trong ngày.</div>}
            </div>
          )}
        </div>
        {timeError && <div className="form-error">Thời gian chưa hợp lý: ETD phải trước ETA cửa khẩu, ETA cửa khẩu phải trước giờ tới điểm giao.</div>}

        <h4 style={{ margin: '14px 0 8px' }}>Trạm dừng nghỉ xả cơ</h4>
        <div className={s.stops}>
          {stops.map((x, i) => (
            <div key={i} className={s.stopRow}>
              <input className="form-control" list="stations" aria-label="Tên trạm" placeholder="Tên trạm nghỉ" value={x.name} onChange={e => setStops(st => st.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
              <input className="form-control" aria-label="Số phút nghỉ" inputMode="numeric" placeholder="Phút" value={x.minutes} onChange={e => setStops(st => st.map((y, j) => (j === i ? { ...y, minutes: e.target.value.replace(/\D/g, '') } : y)))} />
              <button className={s.iconBtn} aria-label="Xóa trạm" onClick={() => setStops(st => st.filter((_, j) => j !== i))}><i className="fa-solid fa-trash" /></button>
            </div>
          ))}
          <datalist id="stations">{STATIONS.map(x => <option key={x} value={x} />)}</datalist>
          <div><button className="btn btn-outline btn-sm" onClick={() => setStops(st => [...st, { name: '', minutes: '30' }])}><i className="fa-solid fa-plus" /> Thêm trạm dừng</button></div>
        </div>
        <p className={s.hint} style={{ marginTop: 8 }}>Ngựa không đi liên tục quá 3–4 giờ, nghỉ tối thiểu 30–45 phút mỗi trạm. Lộ trình chi tiết từng chặng lập ở bước sau khi hồ sơ pháp lý được duyệt.</p>
        <div className="form-group" style={{ marginTop: 12 }}><label htmlFor="pn">Ghi chú</label><input id="pn" className="form-control" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>

      <div className="card">
        <div className={s.actionBar}>
          <div><b>{can ? 'Sẵn sàng xác nhận' : 'Chưa đủ thông tin'}</b><div className={s.hint}>{!vehicle ? 'Chọn xe. ' : ''}{!escortId ? 'Chọn hộ tống. ' : ''}{timeError ? 'Sửa thời gian. ' : ''}{!stopsOk ? 'Điền đủ tên trạm và số phút nghỉ.' : ''}</div></div>
          <button className="btn btn-primary" disabled={!can || busy} onClick={confirm}><i className="fa-solid fa-circle-check" /> Xác nhận phương án xe và lộ trình</button>
        </div>
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

  const plate = b.fleet && vehicles.find(v => v.id === b.fleet!.vehicleId)
  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/coordinator/fleet-plan">Phương án xe</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1>Đơn {b.id}</h1><BookingStatusBadge status={b.status} audience="staff" /><ReviewChips b={b} /></div>
        <div className={s.layout}>
          <div className={s.main}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3></div><TripSummary b={b} /></div>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-horse-head" /> Ngựa cần chở</h3></div><HorseConfigList b={b} /></div>
            {b.fleet ? (
              <div className="alert alert-success"><i className="fa-solid fa-circle-check" /><div><b>Đã chốt phương án</b> lúc {formatDateTime(b.fleet.confirmedAt)}: xe {plate?.plate}, tài xế {crew.find(c => c.id === b.fleet!.driverId)?.name}, hộ tống {crew.find(c => c.id === b.fleet!.escortId)?.name}. ETD {formatDateTime(b.fleet.etd)}, giao dự kiến {formatDateTime(b.fleet.etaDest)}.</div></div>
            ) : b.status === 'under_review' ? (
              <Plan b={b} vehicles={vehicles} crew={crew} all={all} onDone={reload} />
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
