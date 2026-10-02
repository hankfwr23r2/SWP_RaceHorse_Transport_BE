// Coordinator: giám sát các chuyến đang chạy. Mốc đổi xám, cam, xanh; quá giờ 30 phút thì cờ vàng Delayed Check-in (Flow 4, PRD mục 5.7).
import { useEffect, useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { currentCheckpoint, delayedCheckpoint, lastWelfare, needsAttention } from '@shared/lib/booking'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { TripTimeline } from '@shared/ui/TripTimeline'
import { useNow } from '@shared/ui/useNow'
import { Tabs } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

type Tab = 'mine' | 'all'
const ACTIVE: Booking['status'][] = ['en_route_to_pickup', 'in_transit']

export default function MonitoringPage() {
  const { session } = useAuth()
  const now = useNow(15_000)
  const { data: all, reload } = useLoad(bookingsApi.list)
  const { data: crew } = useLoad(crewApi.list)
  const [tab, setTab] = useState<Tab>('mine')
  const [selected, setSelected] = useState('')
  useEffect(() => { reload() }, [now, reload]) // cập nhật định kỳ để thấy check-in mới

  const active = (all ?? []).filter(b => ACTIVE.includes(b.status))
  const mine = active.filter(b => b.intake?.coordinator.name === session!.name)
  const shown = (tab === 'mine' ? mine : active).sort((a, z) => a.departAt - z.departAt)
  const late = active.filter(b => delayedCheckpoint(b, now))
  const trip = shown.find(b => b.id === selected) ?? shown[0]
  const nameOf = (id?: string) => crew?.find(c => c.id === id)

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Giám sát vận chuyển</h1>
          <p>Theo dõi tiến độ từng chuyến theo ảnh check-in thật. Liên hệ tài xế hoặc hộ tống khi có cờ cảnh báo.</p>
        </div>
        {late.length > 0 && <div className="alert alert-warning" style={{ marginBottom: 16 }}><i className="fa-solid fa-triangle-exclamation" /><div><b>{late.length} chuyến trễ mốc từ 30 phút:</b> {late.map(b => `${b.manifest?.tripId} (${currentCheckpoint(b)?.label.toLowerCase()})`).join(', ')}. Gọi tài xế kiểm tra kẹt xe hoặc sự cố đường bộ.</div></div>}
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['mine', 'Chuyến của tôi', mine.length], ['all', 'Tất cả chuyến', active.length]]} />

        {all && !shown.length ? (
          <div className={s.empty}><i className="fa-solid fa-truck" />Không có chuyến nào đang chạy.</div>
        ) : (
          <div className={s.layout}>
            <div className={s.main}>
              {trip && (
                <div className="card">
                  <div className="card-header"><h3><i className="fa-solid fa-route" /> {trip.manifest?.tripId} · {placeShort(trip.origin.name)} → {placeShort(trip.dest.name)}</h3><BookingStatusBadge status={trip.status} audience="staff" /></div>
                  {trip.status === 'en_route_to_pickup' && !trip.trip && <p className={s.hint} style={{ marginBottom: 12 }}>Xe đang đến điểm đón (xuất phát {trip.manifest?.departedAt && formatDateTime(trip.manifest.departedAt)}). Mốc hành trình hiện khi tài xế check-in tại điểm đón.</p>}
                  <TripTimeline b={trip} now={now} staff />
                </div>
              )}
            </div>
            <aside className={s.side}>
              {shown.map(b => {
                const cps = b.trip?.checkpoints ?? []
                const done = cps.filter(c => c.doneAt).length
                const w = lastWelfare(b)
                const isLate = !!delayedCheckpoint(b, now)
                const driver = nameOf(b.fleet?.driverId), escort = nameOf(b.fleet?.escortId)
                return (
                  <button key={b.id} onClick={() => setSelected(b.id)} className="card" style={{ textAlign: 'left', cursor: 'pointer', borderColor: trip?.id === b.id ? 'var(--orange)' : undefined, font: 'inherit', width: '100%' }} aria-pressed={trip?.id === b.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><b>{b.manifest?.tripId}</b>{isLate && <span className="badge badge-warning">Trễ mốc</span>}{needsAttention(w) && <span className="badge badge-danger">Ngựa cần chú ý</span>}</div>
                    <div className={s.sub}>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}</div>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-soft)', margin: '10px 0 6px', overflow: 'hidden' }}><div style={{ width: `${cps.length ? (done / cps.length) * 100 : 0}%`, height: '100%', background: isLate ? 'var(--amber)' : 'var(--green)' }} /></div>
                    <div className={s.sub}>{cps.length ? `${done}/${cps.length} mốc` : 'Chưa nhận ngựa'}{currentCheckpoint(b) ? ` · tiếp: ${currentCheckpoint(b)!.label.toLowerCase()}` : ''}</div>
                    <div className={s.sub}>Tài xế {driver?.name} {driver?.phone} · Hộ tống {escort?.name} {escort?.phone}</div>
                  </button>
                )
              })}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
