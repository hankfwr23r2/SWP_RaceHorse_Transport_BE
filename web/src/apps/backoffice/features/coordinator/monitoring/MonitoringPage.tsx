// Giám sát vận chuyển. Chuyển từ Fleet And Route/OPS-06.html + ops-06.js.
// Chuyến đang chạy, tiến trình theo mốc tài xế check-in, cảnh báo sự cố và nhật ký hiện trường.
import { useState } from 'react'
import { Link } from 'react-router'
import { formatDateTime } from '@shared/lib/format'
import { incidentsApi } from '@shared/services/incidents'
import { tripsApi } from '@shared/services/trips'
import { useLoad } from '@shared/services/useLoad'
import { useToast } from '@shared/ui/toast'
import { cx, partStyles as p } from '../../../shared/parts'
import c from '../Coordinator.module.css'
import { useOps } from '../../../shared/useOps'

export default function MonitoringPage() {
  const toast = useToast()
  const { trips, vehicle, name, reload } = useOps()
  const { data: incidents = [] } = useLoad(incidentsApi.list)
  const [filter, setFilter] = useState<string | null>(null) // lọc cảnh báo theo chuyến (bấm vào dòng chuyến)
  const [showAll, setShowAll] = useState(false) // gồm cả sự cố đã trình / đã xử lý
  const [legKey, setLegKey] = useState('')
  const running = trips.filter(t => t.status === 'in_transit')
  const open = incidents.filter(i => i.status === 'open')
  const emergency = new Set(open.filter(i => i.severity === 'emergency').map(i => i.tripId))
  const warning = new Set(open.filter(i => i.severity !== 'emergency').map(i => i.tripId))
  const alerts = (showAll ? incidents : open).filter(i => !filter || i.tripId === filter).sort((a, b) => b.time - a.time)
  const activity = running.flatMap(t => t.activity).filter(a => !filter || a.text.startsWith(filter)).sort((a, b) => b.time - a.time)
  const legs = running.flatMap(t => t.legs.map(l => ({ key: `${t.id}|${l.no}`, label: `${t.id} — Chặng ${l.no}: ${l.from} → ${l.to}` })))
  const stats: [string, number, string][] = [
    ['Chuyến đang chạy', running.length, ''],
    ['Bình thường', running.filter(t => !emergency.has(t.id) && !warning.has(t.id)).length, 'text-green'],
    ['Chậm trễ / Cảnh báo', running.filter(t => warning.has(t.id) && !emergency.has(t.id)).length, 'text-orange'],
    ['Sự cố khẩn cấp', running.filter(t => emergency.has(t.id)).length, 'text-red'],
  ]

  const upload = () => {
    const chosen = legs.find(l => l.key === (legKey || legs[0]?.key))
    if (!chosen) return
    tripsApi.logActivity(chosen.key.split('|')[0], `${chosen.label.split(' — ')[0]} — Đã tải ảnh chặng: ${chosen.label.split(' — ')[1]}`)
    toast('Đã ghi nhận ảnh chặng (bản mẫu, chưa tải tệp thật)')
    reload()
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Điều phối / <span className="text-orange font-semibold">Giám sát vận chuyển</span></div>
        <div className="page-header">
          <h1>Giám sát vận chuyển</h1>
          <p>Theo dõi chuyến đang chạy theo các mốc tài xế check-in, nhận cảnh báo sự cố và nhật ký hiện trường.</p>
        </div>
        <div className="stat-grid">
          {stats.map(([label, value, color]) => <div key={label} className="stat-card"><div className="stat-label">{label}</div><div className={cx('stat-value', color)}>{value}</div></div>)}
        </div>
        <div className="card">
          <div className={c.map}><i className="fa-solid fa-map-location-dot" /><b>Bản đồ GPS đội xe</b><span>Chưa kết nối thiết bị định vị. Vị trí hiện theo mốc check-in gần nhất của tài xế.</span></div>
        </div>
        <div className={c.gridWide}>
          <div className="card">
            <div className="card-header"><h3>Chuyến đang vận hành</h3><span className="sub-text">Bấm dòng để lọc cảnh báo</span></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Mã chuyến</th><th>Tuyến</th><th>Xe (Tài xế)</th><th>Tiến trình</th><th>Giao dự kiến</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {running.length ? running.map(t => {
                    const first = t.legs[0]
                    const v = vehicle(first?.vehicleId ?? '')
                    const cps = t.order.trip?.checkpoints ?? []
                    const done = cps.filter(x => x.state === 'done').length
                    const current = cps.find(x => x.state === 'current')
                    return (
                      <tr key={t.id} className={cx(c.clickable, filter === t.id && c.selected)} onClick={() => setFilter(filter === t.id ? null : t.id)}>
                        <td className={p.idCell}>{t.id}<div className="sub-text">{t.orderId}</div></td>
                        <td>{t.order.routeShort}</td>
                        <td>{v ? `${v.plate} (${name(first.driverId)})` : 'chưa gán xe'}</td>
                        <td className="small">{done}/{cps.length} mốc{current && <div className="sub-text">{current.label} · {current.place}</div>}<div className={c.progress}><div style={{ width: `${cps.length ? done / cps.length * 100 : 0}%` }} /></div></td>
                        <td className="nowrap">{t.order.trip ? formatDateTime(t.order.trip.eta) : '—'}</td>
                        <td>{emergency.has(t.id) ? <span className="badge badge-danger">Sự cố</span> : warning.has(t.id) ? <span className="badge badge-warning">Cảnh báo</span> : <span className="badge badge-success">Bình thường</span>}</td>
                      </tr>
                    )
                  }) : <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 24 }}>Chưa có chuyến đang chạy. Khởi hành ở trang Phân công.</td></tr>}
                </tbody>
              </table>
            </div>
            {legs.length > 0 && (
              <div className={c.upload}>
                <select className="form-control" value={legKey || legs[0].key} onChange={e => setLegKey(e.target.value)}>{legs.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}</select>
                <button className="btn btn-primary btn-sm nowrap" onClick={upload}><i className="fa-solid fa-camera" /> Tải ảnh chặng</button>
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-header"><h3>Cảnh báo & thông báo</h3>{filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter(null)}>Đang lọc {filter} ✕</button>}</div>
            <div className={c.feed}>
              {alerts.map(i => (
                <div key={i.id} className={cx(c.feedItem, i.severity === 'emergency' ? c.feedEmergency : c.feedWarn)}>
                  <div><i className="fa-solid fa-triangle-exclamation" /> <b>{formatDateTime(i.time)}</b> — Chuyến {i.tripId}: {i.type} {i.status !== 'open' && <span className="badge badge-muted">{i.status === 'proposed' ? 'Đã trình Manager' : i.status === 'approved' ? 'Manager đã duyệt' : 'Manager từ chối'}</span>}</div>
                  <div className="small" style={{ marginTop: 4 }}>{i.desc}</div>
                  <div style={{ marginTop: 6 }}><Link to={`/coordinator/incidents?incident=${i.id}`}>→ Chuyển sang Xử lý sự cố</Link></div>
                </div>
              ))}
              {activity.map(a => <div key={a.time + a.text} className={cx(c.feedItem, c.feedInfo)}><i className="fa-solid fa-camera" /> <b>{formatDateTime(a.time)}</b> — {a.text}</div>)}
              {!alerts.length && !activity.length && <p className="text-center text-muted small">Không có cảnh báo nào.</p>}
            </div>
            <div className="text-center" style={{ marginTop: 12 }}><button className="btn btn-ghost btn-sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Chỉ hiện sự cố chờ xử lý ▴' : 'Xem tất cả cảnh báo ▸'}</button></div>
          </div>
        </div>
      </div>
    </div>
  )
}
