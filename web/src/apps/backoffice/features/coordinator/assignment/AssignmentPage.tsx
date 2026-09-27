// Phân công nhân sự & khởi hành. Chuyển từ Fleet And Route/OPS-08.html + ops-08.js.
// Xe (điều phối chọn) → tài xế theo xe; hộ tống tự gán, điều phối đổi tay được. Khác trang Nhân sự của Manager (điều chuyển người xử lý đơn).
// Khởi hành khi: đủ xe + người mọi chặng và khách đã thanh toán (docs/PRD.md mục 3, bước 6–8).
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { handoverDue } from '@shared/lib/deadlines'
import { formatDateTime } from '@shared/lib/format'
import { TRIP_STATUS_LABEL, assignmentComplete, tripsApi, type TripView } from '@shared/services/trips'
import { useToast } from '@shared/ui/toast'
import { partStyles as p } from '../../../shared/parts'
import c from '../Coordinator.module.css'
import { useOps, vehicleWarning } from '../../../shared/useOps'

const ASSIGNABLE: TripView['status'][] = ['assigned', 'awaiting_routing', 'in_transit']

// Việc còn chờ trước khi khởi hành
function departState(t: TripView): { ready: boolean; badge: ReactNode } {
  if (t.status === 'in_transit' || t.status === 'done') return { ready: false, badge: <span className="badge badge-success">{TRIP_STATUS_LABEL[t.status]} — theo dõi ở Giám sát</span> }
  if (t.status !== 'assigned') return { ready: false, badge: <span className="badge badge-info">{TRIP_STATUS_LABEL[t.status]} — chốt lộ trình ở trang Lập lộ trình trước khi khởi hành</span> }
  if (!assignmentComplete(t)) return { ready: false, badge: <span className="badge badge-warning">Còn chặng chưa chọn xe</span> }
  if (t.order.stage === 'approval') return { ready: false, badge: <span className="badge badge-info">Đã đủ xe các chặng — chờ Manager duyệt đơn</span> }
  if (t.order.status === 'awaiting_payment') return { ready: false, badge: <span className="badge badge-info">Đã đủ xe các chặng — chờ khách thanh toán</span> }
  return { ready: true, badge: <span className="badge badge-success">Đã đủ xe các chặng, khách đã thanh toán — sẵn sàng khởi hành</span> }
}

export default function AssignmentPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { trips, vehicles, crew, vehicle, name, reload } = useOps()
  const list = trips.filter(t => ASSIGNABLE.includes(t.status)).sort((a, b) => a.order.departAt - b.order.departAt)
  const t = list.find(x => x.id === params.get('trip')) ?? list[0]
  const escorts = crew.filter(x => x.role === 'escort')
  if (!t) return <div className="page"><div className="wrap"><p className="text-muted">Chưa có chuyến nào để phân công.</p></div></div>
  const editable = t.status !== 'in_transit'
  const dep = departState(t)
  const papers = t.order.papers

  const run = async (fn: () => Promise<unknown>) => { await fn(); reload() }
  const depart = async () => {
    await tripsApi.depart(t.id)
    toast(`Chuyến ${t.id} đã khởi hành. Khách theo dõi được hành trình của đơn ${t.orderId}`)
    navigate('/coordinator/monitoring')
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Điều phối / <span className="text-orange font-semibold">Phân công & khởi hành</span></div>
        <div className="page-header">
          <h1>Phân công nhân sự</h1>
          <p>Gán tài xế, nhân viên hộ tống và xe cho từng chặng. Đủ người + xe và khách đã thanh toán mới được khởi hành sang Giám sát. (Khác với trang Nhân sự của Manager — nơi đó điều chuyển người xử lý đơn.)</p>
        </div>
        <div className="card">
          <div className="form-group" style={{ maxWidth: 520, marginBottom: 0 }}>
            <label>Chuyến vận chuyển</label>
            <select className="form-control" value={t.id} onChange={e => setParams({ trip: e.target.value })}>
              {list.map(x => <option key={x.id} value={x.id}>{x.id} — {x.order.routeShort} · {x.orderId} ({TRIP_STATUS_LABEL[x.status]})</option>)}
            </select>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Phân công từng chặng — {t.id} ({t.order.routeShort})</h3><span className="sub-text">{t.order.horses.length} ngựa · {t.order.customer}</span></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Chặng</th><th>Từ → Đến</th><th>Xe (điều phối chọn)</th><th>Tài xế (theo xe)</th><th>Hộ tống (tự gán)</th></tr></thead>
              <tbody>{t.legs.map(l => {
                const v = vehicle(l.vehicleId)
                const warn = vehicleWarning(v, t.order.horses.length)
                return (
                  <tr key={l.no}>
                    <td className={p.idCell}>Chặng {l.no}</td>
                    <td>{l.from} → {l.to}</td>
                    <td>
                      <select className="form-control" disabled={!editable} value={l.vehicleId} onChange={e => run(() => tripsApi.setVehicle(t.id, l.no, e.target.value))}>
                        <option value="">— Chọn xe —</option>
                        {vehicles.map(x => <option key={x.id} value={x.id}>{x.id} — {x.name} ({x.plate})</option>)}
                      </select>
                      {warn && <div className={c.warn}><i className="fa-solid fa-triangle-exclamation" /> {warn}</div>}
                    </td>
                    <td>{l.driverId ? <><span className="badge badge-info">{name(l.driverId)}</span><div><Link className="small text-orange" to={`/coordinator/staff/${l.driverId}`}>Chi tiết</Link></div></> : <span className="text-muted">Tự gán theo xe</span>}</td>
                    <td>
                      <select className="form-control" disabled={!editable || !l.vehicleId} value={l.escortId} title="Hệ thống tự gán người rảnh nhất, điều phối được đổi tay" onChange={e => run(() => tripsApi.setEscort(t.id, l.no, e.target.value))}>
                        <option value="">— Tự động —</option>
                        {escorts.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                      {l.escortId && <Link className="small text-orange" to={`/coordinator/staff/${l.escortId}`}>Chi tiết</Link>}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
            <div>{dep.badge}</div>
            {t.status === 'assigned' && (papers?.handedAt
              ? <div className="small text-green"><i className="fa-solid fa-handshake" /> Đã nhận bộ giấy tờ từ kiểm dịch viên {t.order.inspector} lúc {formatDateTime(papers.handedAt)}. Chia giấy theo xe cho tài xế.</div>
              : t.order.status === 'paid' && <div className="small text-muted"><i className="fa-solid fa-folder-open" /> Chưa nhận giấy tờ từ kiểm dịch viên {t.order.inspector} (hạn bàn giao {formatDateTime(handoverDue(t.order.departAt))}).</div>)}
          </div>
          <div className={c.actions}>
            <button className="btn btn-ghost" onClick={() => navigate('/coordinator/routing')}>Về Lộ trình</button>
            {dep.ready && <button className="btn btn-primary" onClick={depart}><i className="fa-solid fa-truck-fast" /> Xác nhận khởi hành</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
