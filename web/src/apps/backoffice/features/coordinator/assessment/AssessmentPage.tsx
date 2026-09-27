// Đánh giá khả thi. Chuyển từ Fleet And Route/OPS-03.html + ops-03.js.
// Cửa vào của Điều phối: đơn kiểm dịch đã xác nhận hợp lệ. Đạt → Lập lộ trình; không đạt → trả Manager kèm lý do.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatDeadline } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { tripsApi } from '@shared/services/trips'
import { useToast } from '@shared/ui/toast'
import { InfoItem, cx, partStyles as p } from '../../../shared/parts'
import c from '../Coordinator.module.css'
import { routingDeadline, useOps } from '../../../shared/useOps'

export default function AssessmentPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { trips, reload } = useOps()
  const queue = trips.filter(t => t.status === 'pending_assessment').sort((a, b) => routingDeadline(a).time - routingDeadline(b).time)
  const [selected, setSelected] = useState<string | null>(null)
  const [pass, setPass] = useState(true)
  const [note, setNote] = useState('')
  const [invalid, setInvalid] = useState(false)
  const tableRef = useStaggerIn('tbody tr', [queue.length])
  const t = queue.find(x => x.id === selected)

  const confirm = async () => {
    if (!pass && !note.trim()) return setInvalid(true)
    await tripsApi.assess(t!.id, pass, note.trim(), session!.name)
    toast(pass ? `Đã chuyển ${t!.id} sang Lập lộ trình` : `Đã trả đơn ${t!.orderId} về Manager`, pass ? 'success' : 'info')
    setSelected(null)
    setNote('')
    reload()
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Điều phối / <span className="text-orange font-semibold">Đánh giá khả thi</span></div>
        <div className="page-header">
          <h1>Đánh giá khả thi</h1>
          <p>Cửa vào của Điều phối: nhận đơn Kiểm dịch đã xác nhận hồ sơ hợp lệ, đánh giá tuyến đường &amp; cửa khẩu. Đạt → chuyển sang Lập lộ trình; không đạt → trả về Manager kèm lý do.</p>
        </div>
        <div className="card">
          <div className="card-header"><h3>Đơn chờ đánh giá khả thi</h3><span className="sub-text">{queue.length} chuyến</span></div>
          <div ref={tableRef} className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã chuyến</th><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến đường</th><th>Số ngựa</th><th>Khởi hành</th><th>Hạn lập lộ trình</th><th>Phụ trách</th><th /></tr></thead>
              <tbody>
                {queue.length ? queue.map(x => (
                  <tr key={x.id} className={cx(x.id === selected && c.selected)}>
                    <td className={p.idCell}>{x.id}</td>
                    <td>{x.orderId}</td>
                    <td className="font-semibold">{x.order.customer}</td>
                    <td>{x.order.routeShort}{x.order.border && <div className="sub-text"><i className="fa-solid fa-flag" /> {x.order.border}</div>}</td>
                    <td>{x.order.horses.length}</td>
                    <td className="text-muted">{formatDate(x.order.departAt)}</td>
                    <td className={cx(Date.now() > routingDeadline(x).time && 'text-red', 'nowrap')}>{formatDeadline(routingDeadline(x).time)}</td>
                    <td className="text-muted">{x.order.coordinator}</td>
                    <td className="text-right"><button className="btn btn-primary btn-sm" onClick={() => { setSelected(x.id); setPass(true); setNote(''); setInvalid(false) }}>Đánh giá</button></td>
                  </tr>
                )) : <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 24 }}>Không còn đơn chờ khảo sát.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {t && (
          <div className="card">
            <div className="card-header"><h3>Đánh giá — {t.id} ({t.order.routeShort})</h3></div>
            <div className={p.infoGrid}>
              <InfoItem label="Mã đơn">{t.orderId}</InfoItem>
              <InfoItem label="Khách hàng">{t.order.customer}</InfoItem>
              <InfoItem label="Số ngựa / Khởi hành">{t.order.horses.length} con — {formatDate(t.order.departAt)}</InfoItem>
              <InfoItem label="Cửa khẩu">{t.order.border ?? 'Nội địa'}</InfoItem>
              <InfoItem label="Quãng đường / Thời gian">{t.order.distance} · {t.order.duration}</InfoItem>
              <InfoItem label="Số chặng dự kiến">{t.legs.length} chặng</InfoItem>
            </div>
            {t.order.customerNote && <div className={p.note}><i className="fa-solid fa-comment-dots" /> Yêu cầu của khách: {t.order.customerNote}</div>}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label>Kết luận khảo sát</label>
              <select className="form-control" style={{ maxWidth: 360 }} value={pass ? 'pass' : 'fail'} onChange={e => { setInvalid(false); setPass(e.target.value === 'pass') }}>
                <option value="pass">Đạt — chuyển sang Lập lộ trình</option>
                <option value="fail">Không khả thi — trả về Manager</option>
              </select>
            </div>
            <div className="form-group">
              <label className={cx(!pass && 'required')}>Ghi chú / lý do</label>
              <textarea rows={2} className={cx('form-control', invalid && 'invalid')} value={note} onChange={e => { setInvalid(false); setNote(e.target.value) }} placeholder="VD: Tuyến Cầu Treo – Nam Phao, đi 2 ngày. / VD: Cửa khẩu đóng, dời sau 30 ngày..." />
            </div>
            <div className={c.actions}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Hủy</button>
              <button className={`btn ${pass ? 'btn-primary' : 'btn-danger'}`} onClick={confirm}>Xác nhận đánh giá</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
