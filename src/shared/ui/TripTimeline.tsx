import { WELFARE_CONDITION } from '../config/booking-rules'
import { checkpointState, currentCheckpoint, delayedCheckpoint } from '../lib/booking'
import { formatClock, formatDateTime } from '../lib/format'
import type { Booking, Checkpoint } from '../types/booking'
import s from './TripTimeline.module.css'

const ICON: Record<Checkpoint['type'], string> = { pickup: 'fa-horse-head', rest: 'fa-mug-hot', border: 'fa-flag', customs: 'fa-stamp', delivery: 'fa-flag-checkered' }

interface Props { b: Pick<Booking, 'trip' | 'status'>; now: number; staff?: boolean }

// Các mốc hành trình: xám (chưa tới), cam (đang chờ), xanh (xong, có ảnh và giờ thực). Quá giờ 30 phút thì cờ vàng Delayed Check-in.
export function TripTimeline({ b, now, staff }: Props) {
  const cps = b.trip?.checkpoints
  if (!cps?.length) return <p className={s.none}>Chưa có hành trình. Mốc sẽ hiện khi xe nhận ngựa.</p>
  const current = currentCheckpoint(b)
  const late = delayedCheckpoint(b, now)
  return (
    <ol className={s.list}>
      {cps.map(cp => {
        const state = checkpointState(cp, current)
        const welfare = b.trip!.welfare.filter(w => w.checkpointId === cp.id)
        return (
          <li key={cp.id} className={`${s.item} ${s[state]}`}>
            <span className={s.dot} aria-hidden="true">{state === 'done' ? <i className="fa-solid fa-check" /> : <i className={`fa-solid ${ICON[cp.type]}`} />}</span>
            <div className={s.body}>
              <div className={s.top}><b>{cp.label}</b>{late?.id === cp.id && <span className="badge badge-warning"><i className="fa-solid fa-triangle-exclamation" /> Trễ mốc</span>}</div>
              <div className={s.place}>{cp.place}</div>
              <div className={s.time}>
                {cp.arrivedAt ? <>Đã tới {formatClock(cp.arrivedAt)}{cp.doneAt && cp.type !== 'border' ? ` · xong ${formatClock(cp.doneAt)}` : ''}</> : <>Dự kiến {formatDateTime(cp.plannedAt)}</>}
              </div>
              {welfare.map(w => (
                <div key={w.id} className={`${s.welfare} ${w.condition !== 'normal' ? s.welfareWarn : ''}`}>
                  <i className="fa-solid fa-heart-pulse" aria-hidden="true" /> {WELFARE_CONDITION[w.condition].label} · khoang {w.temp}°C · nước {w.waterLiters} lít{w.hay ? ' · đã cho ăn' : ''}{staff && w.note ? ` · ${w.note}` : ''}
                </div>
              ))}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
