// Lập lộ trình. Chuyển từ Fleet And Route/OPS-05.html + ops-05.js; chọn xe từng chặng gộp từ OPS-08 (docs/PRD.md mục 3, bước 4).
// Chia chặng (thêm điểm dừng: trạm nghỉ, cửa khẩu), chọn xe cho từng chặng: tài xế theo xe, hộ tống tự gán người rảnh nhất.
// Chốt lộ trình → đơn chuyển Manager duyệt.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { STATIONS } from '@shared/config/network'
import { formatDate, formatDeadline } from '@shared/lib/format'
import { assignmentComplete, tripsApi, type TripView } from '@shared/services/trips'
import { useToast } from '@shared/ui/toast'
import { InfoItem, cx, partStyles as p } from '../../../shared/parts'
import c from '../Coordinator.module.css'
import { routingDeadline, useOps, vehicleWarning } from '../../../shared/useOps'

// Điểm dừng gợi ý: trạm của công ty + 2 phía cửa khẩu của tuyến
const stopOptions = (t: TripView) => [...STATIONS, ...(t.order.border?.split(' – ').map(side => `Cửa khẩu ${side}`) ?? [])]

export default function RoutingPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { trips, vehicles, vehicle, name, reload } = useOps()
  const queue = trips.filter(t => t.status === 'awaiting_routing').sort((a, b) => routingDeadline(a).time - routingDeadline(b).time)
  const [selected, setSelected] = useState<string | null>(null)
  const [stop, setStop] = useState<Record<number, string>>({})
  const t = queue.find(x => x.id === selected) ?? queue[0]

  const run = async (fn: () => unknown) => { await fn(); reload() }
  const confirm = async () => {
    await tripsApi.confirmRoute(t.id)
    toast(`Đã chốt lộ trình ${t.id}. Đơn ${t.orderId} chuyển Manager duyệt`)
    navigate(`/coordinator/assignment?trip=${t.id}`)
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Điều phối / <span className="text-orange font-semibold">Lập lộ trình</span></div>
        <div className="page-header">
          <h1>Lập lộ trình</h1>
          <p>Chia chặng và chọn xe cho từng chặng. Tài xế đi theo xe (mỗi xe một tài xế cố định); hộ tống được tự gán cho người đang phụ trách ít chặng nhất, đổi tay ở trang Phân công.</p>
        </div>
        <div className="card">
          <div className="card-header"><h3>Chuyến chờ lập lộ trình</h3><span className="sub-text">{queue.length} chuyến</span></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã chuyến</th><th>Khách hàng</th><th>Tuyến đường</th><th>Số ngựa</th><th>Khởi hành</th><th>Hạn</th><th /></tr></thead>
              <tbody>
                {queue.length ? queue.map(x => (
                  <tr key={x.id} className={cx(x.id === t?.id && c.selected)}>
                    <td className={p.idCell}>{x.id}</td>
                    <td className="font-semibold">{x.order.customer}</td>
                    <td>{x.order.routeShort}</td>
                    <td>{x.order.horses.length}</td>
                    <td className="text-muted">{formatDate(x.order.departAt)}</td>
                    <td className={cx(Date.now() > routingDeadline(x).time && 'text-red', 'nowrap')}>{formatDeadline(routingDeadline(x).time)}</td>
                    <td className="text-right"><button className="btn btn-ghost btn-sm" onClick={() => setSelected(x.id)}>Lập lộ trình</button></td>
                  </tr>
                )) : <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 24 }}>Không còn chuyến chờ lập lộ trình. Nhận thêm ở Đánh giá khả thi.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {t && (
          <div className="card">
            <div className="card-header"><h3>Lập lộ trình — {t.id} ({t.order.routeShort})</h3></div>
            <div className={p.infoGrid}>
              <InfoItem label="Mã đơn">{t.orderId} · {t.order.customer}</InfoItem>
              <InfoItem label="Số ngựa / Khởi hành">{t.order.horses.length} con — {formatDate(t.order.departAt)}</InfoItem>
              <InfoItem label="Quãng đường / Thời gian">{t.order.distance} · {t.order.duration}</InfoItem>
              {t.assessNote && <InfoItem label="Ghi chú khảo sát">{t.assessNote}</InfoItem>}
            </div>
            <h4 style={{ margin: '18px 0 10px' }}>Các chặng lộ trình</h4>
            {t.legs.map((l, i) => {
              const v = vehicle(l.vehicleId)
              const warn = vehicleWarning(v, t.order.horses.length)
              return (
                <div key={l.no} className={c.leg}>
                  <div className={c.legHead}>
                    <span>Chặng {l.no}: {l.from} → {l.to}</span>
                    {i < t.legs.length - 1 && <button className="btn btn-ghost btn-sm" onClick={() => run(() => tripsApi.mergeLeg(t.id, l.no))}><i className="fa-solid fa-xmark" /> Bỏ điểm dừng {l.to}</button>}
                  </div>
                  <div className={c.legGrid}>
                    <div>
                      <label>Xe</label>
                      <select className="form-control" value={l.vehicleId} onChange={e => run(() => tripsApi.setVehicle(t.id, l.no, e.target.value))}>
                        <option value="">— Chọn xe —</option>
                        {vehicles.map(x => <option key={x.id} value={x.id}>{x.id} — {x.name} ({x.plate}) · {x.capacity} ngăn</option>)}
                      </select>
                      {warn && <div className={c.warn}><i className="fa-solid fa-triangle-exclamation" /> {warn}</div>}
                    </div>
                    <div><label>Tài xế (theo xe)</label>{name(l.driverId)}</div>
                    <div><label>Hộ tống (tự gán)</label>{name(l.escortId)}</div>
                  </div>
                  <div className={c.stopAdd}>
                    <select className="form-control" value={stop[l.no] ?? ''} onChange={e => setStop({ ...stop, [l.no]: e.target.value })}>
                      <option value="">— Thêm điểm dừng giữa chặng —</option>
                      {stopOptions(t).filter(x => x !== l.from && x !== l.to).map(x => <option key={x}>{x}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" disabled={!stop[l.no]} onClick={() => run(() => { tripsApi.splitLeg(t.id, l.no, stop[l.no]); setStop({}) })}><i className="fa-solid fa-plus" /> Thêm</button>
                  </div>
                </div>
              )
            })}
            {!assignmentComplete(t) && <p className={p.hint}><i className="fa-solid fa-circle-info" /> Chọn xe cho mọi chặng trước khi chốt lộ trình.</p>}
            <div className={c.actions}>
              <button className="btn btn-ghost" onClick={() => navigate('/coordinator/assessment')}>Về Khả thi</button>
              <button className="btn btn-primary" disabled={!assignmentComplete(t)} onClick={confirm}>Xác nhận lộ trình → Trình Manager duyệt</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
