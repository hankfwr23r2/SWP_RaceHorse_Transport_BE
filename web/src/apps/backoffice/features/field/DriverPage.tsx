// Chuyến của tôi (tài xế). Chuyển từ Driver/index.html + script.js.
// Tài xế check-in lần lượt từng mốc; khách thấy ngay ở trang Theo dõi. Mốc cuối (giao ngựa) → đơn Đã giao, khách có 24 giờ nghiệm thu.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { ACCEPTANCE_HOURS } from '@shared/config/business-rules'
import { formatClock, formatDate, formatDateTime } from '@shared/lib/format'
import { splitStop } from '@shared/lib/trip'
import { TRIP_STATUS_LABEL, tripsApi } from '@shared/services/trips'
import { useToast } from '@shared/ui/toast'
import { cx } from '../../shared/parts'
import { useOps } from '../../shared/useOps'
import s from './Field.module.css'

export default function DriverPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { ready, trips, crew, vehicle, name, reload } = useOps()
  const [tab, setTab] = useState<'progress' | 'trip'>('progress')
  const [selected, setSelected] = useState<string | null>(null)
  const me = crew.find(c => c.role === 'driver' && c.name === session!.name)
  const mine = trips
    .filter(t => (t.status === 'in_transit' || t.status === 'assigned') && t.legs.some(l => l.driverId === me?.id))
    .sort((a, b) => Number(b.status === 'in_transit') - Number(a.status === 'in_transit') || a.order.departAt - b.order.departAt)
  const t = mine.find(x => x.id === selected) ?? mine[0]

  if (!ready) return <p className="text-muted">Đang tải…</p>
  if (!t) return <div className={s.empty}><i className="fa-solid fa-truck" /><p>Bạn chưa được phân công chuyến nào.</p></div>

  const o = t.order
  const running = t.status === 'in_transit'
  // Chưa khởi hành: xem trước các mốc theo điểm dừng
  const checkpoints = o.trip?.checkpoints ?? (o.stops ?? []).map(x => { const p = splitStop(x); return { label: p.act, place: p.place, time: o.departAt, state: 'next' as const } })
  const escort = t.legs[0]?.escortId

  const checkIn = async (last: boolean) => {
    await tripsApi.checkIn(o.id)
    toast(last ? `Đã giao ngựa đơn ${o.id}. Khách có ${ACCEPTANCE_HOURS} giờ để nghiệm thu.` : 'Đã check-in mốc, khách thấy cập nhật ngay')
    reload()
  }

  return (
    <>
      <div className={s.segmented}>
        <button className={cx(tab === 'progress' && s.active)} onClick={() => setTab('progress')}><i className="fa-solid fa-route" /> Tiến độ</button>
        <button className={cx(tab === 'trip' && s.active)} onClick={() => setTab('trip')}><i className="fa-solid fa-clipboard-list" /> Xem chuyến</button>
      </div>
      {mine.length > 1 && (
        <select className="form-control" style={{ marginBottom: 14 }} value={t.id} onChange={e => setSelected(e.target.value)}>
          {mine.map(x => <option key={x.id} value={x.id}>{x.id} · {x.order.routeShort} ({TRIP_STATUS_LABEL[x.status]})</option>)}
        </select>
      )}

      {tab === 'progress' ? <>
        <div className={s.header}><h1>Tiến độ vận chuyển</h1><p>{running ? 'Check-in tại mỗi mốc để cập nhật hệ thống.' : `Chuyến chưa khởi hành (dự kiến ${formatDate(o.departAt)}). Điều phối xác nhận khởi hành thì mở check-in.`}</p></div>
        <div className={s.milestones}>
          {checkpoints.map((c, i) => {
            const last = i === checkpoints.length - 1
            const state = running ? c.state : 'next'
            return (
              <div key={i} className={cx(s.milestone, state === 'done' && s.done, state === 'current' && s.current, state === 'next' && s.next)}>
                <div className={s.icon}>{state === 'done' ? <i className="fa-solid fa-check" /> : i + 1}</div>
                <div className={s.body}>
                  <div className={s.bodyHead}><span>{c.label.charAt(0).toUpperCase() + c.label.slice(1)}</span>
                    {state === 'done' ? <span className="badge badge-success">Đã hoàn thành</span> : state === 'current' ? <span className="badge badge-warning">Chờ xử lý</span> : <span className="badge badge-muted">Đã khóa</span>}</div>
                  <div className={s.meta}><i className="fa-solid fa-location-dot" /> {c.place}{running && ` · ${state === 'done' ? `Đã check-in lúc ${formatClock(c.time)}` : `Dự kiến ${formatDateTime(c.time)}`}`}</div>
                  {state === 'current' && <button className={cx('btn btn-primary', s.checkIn)} onClick={() => checkIn(last)}><i className={`fa-solid ${last ? 'fa-flag-checkered' : 'fa-location-dot'}`} /> {last ? 'Giao ngựa · Kết thúc chuyến' : 'Check In'}</button>}
                </div>
              </div>
            )
          })}
        </div>
      </> : (
        <div className="card">
          <div className="card-header"><h3>Mã đơn: {o.id}</h3><span className={`badge ${running ? 'badge-warning' : 'badge-info'}`}>{TRIP_STATUS_LABEL[t.status]}</span></div>
          <p><i className="fa-solid fa-truck text-orange" /> {o.from} → <i className="fa-solid fa-flag-checkered text-orange" /> {o.to}</p>
          <div className={s.infoGrid}>
            <div><span>Khách hàng</span>{o.customer}</div>
            <div><span>Ngựa</span>{o.horses.map(h => h.name).join(', ')}</div>
            <div><span>Khởi hành</span>{formatDate(o.departAt)}</div>
            <div><span>NV chăm sóc đi kèm</span>{escort ? `${name(escort)} · ${crew.find(c => c.id === escort)?.phone}` : '—'}</div>
          </div>
          <div className={s.instructions}><b><i className="fa-solid fa-triangle-exclamation" /> Yêu cầu đặc biệt</b><p>{o.customerNote || 'Không có yêu cầu đặc biệt từ khách.'}</p></div>
          <h4 style={{ margin: '16px 0 6px' }}>Lộ trình chi tiết (Bộ phận Điều phối)</h4>
          {t.legs.map(l => (
            <div key={l.no} className={s.leg}>
              <i className="fa-solid fa-truck" />
              <div><b>Chặng {l.no}</b><div>Từ: {l.from}</div><div>Đến: {l.to}</div><div className="text-muted">Xe: {vehicle(l.vehicleId)?.name} (Biển số: {vehicle(l.vehicleId)?.plate}){l.driverId !== me?.id && ` · Tài xế ${name(l.driverId)}`}</div></div>
            </div>
          ))}
          {o.papers?.handedAt && <p className="small text-muted" style={{ marginTop: 8 }}><i className="fa-solid fa-folder-open" /> Nhận giấy tờ của ngựa trên xe từ Điều phối viên {o.coordinator} trước khi khởi hành.</p>}
        </div>
      )}
    </>
  )
}
