// Tra cứu lộ trình theo mã đơn hoặc vi chip. Chuyển từ CUS/tracking.html.
// Bản cũ dùng 2 mã giả #EQ-8910/#EQ-8911; nay tra trên bộ đơn chuẩn (đơn đang chạy và đơn đã giao).
import { useState, type FormEvent } from 'react'
import { formatDateTime } from '@shared/lib/format'
import { useAuth } from '@shared/auth/AuthContext'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { useStaggerIn } from '@shared/motion/motion'
import type { Order } from '@shared/types/order'
import s from './Tracking.module.css'

type Point = { title: string; time: string; place: string; state: 'done' | 'current' | 'next' }

function pointsOf(o: Order): Point[] {
  if (o.trip) return o.trip.checkpoints.map(c => ({ title: c.label, time: `${c.state === 'next' ? 'Dự kiến ' : ''}${formatDateTime(c.time)}`, place: c.place, state: c.state }))
  const h = o.handover!
  return [
    { title: 'Tiếp nhận ngựa', time: formatDateTime(h.pickup.time), place: o.from, state: 'done' },
    { title: 'Giao ngựa & Bàn giao', time: formatDateTime(h.delivery.time), place: o.to, state: 'done' },
  ]
}

function vitalsOf(o: Order) {
  if (o.trip) {
    // Số đo mới nhất có giá trị (hộ tống không đo nhịp tim; nhật ký có thể trống)
    const latest = (k: 'temp' | 'heart') => o.trip!.health.find(h => !Number.isNaN(parseFloat(h[k])))?.[k]
    return { heart: latest('heart')?.replace(' bpm', '') ?? '—', temp: latest('temp')?.replace('°C', '') ?? '—', carer: o.trip.contacts.find(c => c[0] === 'NV chăm sóc')?.[1] }
  }
  const d = o.handover!.delivery
  const shown = (v: number | null) => (v == null || Number.isNaN(v) ? '—' : String(v))
  return { heart: shown(d.heart), temp: shown(d.temp), carer: o.handover!.groom }
}

export default function TrackingPage() {
  const { session } = useAuth()
  const { data: orders = [] } = useLoad(() => customerOrdersApi.list(session!.name), [session?.name])
  const trackable = orders.filter(o => o.trip || o.handover)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Order | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const resultRef = useStaggerIn('[data-anim]', [result?.id])

  const search = (q: string) => {
    const key = q.trim().replace(/^#/, '').toUpperCase()
    setLoading(true)
    setTimeout(() => { // giả lập gọi API như bản cũ
      setResult(trackable.find(o => o.id === key || o.horses.some(h => h.chip?.toUpperCase() === key.replace(/^VN-?/, 'VN-'))) ?? null)
      setLoading(false)
    }, 500)
  }
  const submit = (e: FormEvent) => { e.preventDefault(); search(query) }

  return (
    <div className="page">
      <div className="wrap">
        <div className={s.hero}>
          <h1>Tra Cứu Lộ Trình</h1>
          <p>Nhập mã chuyến đi (Booking ID) hoặc số vi chip của ngựa để theo dõi lộ trình và sức khỏe trực tiếp.</p>
          <form className={s.search} onSubmit={submit}>
            <i className="fa-solid fa-magnifying-glass" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="VD: EQ-2026-1028 hoặc VN-985213" />
            <button className="btn btn-primary" type="submit">{loading ? <i className="fa-solid fa-spinner fa-spin" /> : 'Tìm kiếm'}</button>
          </form>
          <div className={s.quick}>Tra cứu nhanh:
            {trackable.map(o => (
              <button key={o.id} className={`${s.chip} ${o.status === 'in_transit' ? s.chipLive : s.chipDone}`} onClick={() => { setQuery(o.id); search(o.id) }}>
                #{o.id} ({o.status === 'in_transit' ? 'Đang vận chuyển' : 'Hoàn tất'})
              </button>
            ))}
          </div>
        </div>

        {result === null && <div className="alert alert-warning"><i className="fa-solid fa-circle-exclamation" /><div>Không tìm thấy chuyến đi phù hợp. Kiểm tra lại mã đơn hoặc số vi chip.</div></div>}
        {result && (() => {
          const live = result.status === 'in_transit'
          const v = vitalsOf(result)
          return (
            <div ref={resultRef} className={s.result}>
              <div className={s.resultHead}>
                <div><div className={s.label}>Mã chuyến đi</div><div className={s.code}>#{result.id}</div></div>
                <span className={`badge ${live ? 'badge-orange' : 'badge-success'}`}><i className={`fa-solid ${live ? 'fa-truck' : 'fa-check-circle'}`} /> {live ? 'Đang vận chuyển' : 'Đã giao ngựa'}</span>
              </div>
              <div className={s.body}>
                <div className="card">
                  <div className="card-header"><h3><i className="fa-solid fa-route" /> Lộ trình Vận chuyển</h3></div>
                  <div className={s.timeline}>
                    {pointsOf(result).map(p => (
                      <div key={p.title + p.time} data-anim className={`${s.point} ${s[p.state]}`}>
                        <span className={s.dot} />
                        <h4>{p.title}</h4>
                        <p className="sub-text"><i className="fa-regular fa-clock" /> {p.time}</p>
                        <p>{p.place}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={s.sideCol}>
                  <div data-anim className="card">
                    <div className={s.horse}><span className={s.horseIcon}><i className="fa-solid fa-horse-head" /></span><div><div className={s.label}>Chiến mã</div><div className="font-bold">{result.horses.map(h => h.name).join(', ')}</div></div></div>
                    <div className="info-row"><span className="label">Vi chip:</span><span className="value">{result.horses.map(h => h.chip).join(', ')}</span></div>
                  </div>
                  <div data-anim className={`card ${s.vitals}`}>
                    <div className={s.vitalsHead}><span>Chỉ số sinh tồn</span>{live && <span className={s.live}>LIVE</span>}</div>
                    <div className={s.vitalsGrid}>
                      <div><strong>{v.heart}</strong> bpm<div className="sub-text">Ổn định</div></div>
                      <div><strong>{v.temp}</strong> °C<div className="sub-text">Bình thường</div></div>
                    </div>
                    <p className="sub-text"><i className="fa-solid fa-user-nurse" /> {v.carer} {live ? 'đang túc trực' : '(NV chăm sóc)'}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
