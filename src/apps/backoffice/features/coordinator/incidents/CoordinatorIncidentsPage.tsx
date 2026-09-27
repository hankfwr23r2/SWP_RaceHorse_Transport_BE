// Xử lý sự cố. Chuyển từ Fleet And Route/OPS-04.html + ops-04.js.
// Điều phối ghi nhận sự cố và đề xuất cách xử lý; Manager duyệt ở trang Sự cố & Chi phí (docs/PRD.md mục 3, bước 8).
// Các trường báo cáo chi tiết, chi phí, bên chịu phí, bảo hiểm là dữ liệu trang Manager hiển thị (gốc: manager_duyet_su_co.html).
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { incidentsApi, type Incident } from '@shared/services/incidents'
import { useLoad } from '@shared/services/useLoad'
import { useToast } from '@shared/ui/toast'
import { InfoItem, cx, partStyles as p } from '../../../shared/parts'
import c from '../Coordinator.module.css'
import { useOps } from '../../../shared/useOps'

const SEVERITY: Record<Incident['severity'], [string, string]> = { emergency: ['Khẩn cấp', 'badge-danger'], medium: ['Trung bình', 'badge-warning'], low: ['Thấp', 'badge-success'] }
const STATUS: Record<Incident['status'], [string, string]> = { open: ['Chờ xử lý', 'badge-warning'], proposed: ['Đã trình Manager', 'badge-info'], approved: ['Manager đã duyệt', 'badge-success'], rejected: ['Manager từ chối', 'badge-danger'] }
const CLAIMS = ['Không áp dụng', 'Có thể Claim (BH phương tiện)', 'Có thể Claim (BH vận chuyển ngựa)']

export default function CoordinatorIncidentsPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const { data: incidents = [], reload } = useLoad(incidentsApi.list)
  const { trips } = useOps()
  const list = [...incidents].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || b.time - a.time)
  const inc = list.find(i => i.id === params.get('incident')) ?? list.find(i => i.status === 'open') ?? list[0]
  const trip = trips.find(t => t.id === inc?.tripId)
  const [form, setForm] = useState({ proposal: '', report: '', cost: '', bearer: 'company' as Incident['bearer'], claim: CLAIMS[0] })
  const [invalid, setInvalid] = useState(false)

  const select = (id: string) => { setParams({ incident: id }); setForm({ proposal: '', report: '', cost: '', bearer: 'company', claim: CLAIMS[0] }); setInvalid(false) }
  const propose = async () => {
    if (!form.proposal.trim()) return setInvalid(true)
    await incidentsApi.update(inc!.id, {
      status: 'proposed', proposal: form.proposal.trim(), report: form.report.trim() || undefined,
      cost: Number(form.cost.replace(/\D/g, '')) || 0, bearer: form.bearer, claim: form.claim,
    })
    toast(`Đã trình phương án xử lý ${inc!.id} lên Manager`)
    reload()
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Điều phối / <span className="text-orange font-semibold">Xử lý sự cố</span></div>
        <div className="page-header">
          <h1>Xử lý sự cố</h1>
          <p>Sự cố tài xế, hộ tống báo về (hộ tống báo ngựa bệnh nặng thì hệ thống tự tạo sự cố). Điều phối đề xuất phương án, Manager phê duyệt.</p>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã sự cố</th><th>Chuyến</th><th>Chặng</th><th>Thời gian</th><th>Mức độ</th><th>Loại</th><th>Mô tả</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>{list.map(i => (
                <tr key={i.id} className={cx(i.id === inc?.id && c.selected)}>
                  <td className={p.idCell}>{i.id}</td>
                  <td>{i.tripId}<div className="sub-text">{i.orderId}</div></td>
                  <td><span className="badge badge-info">{i.leg}</span></td>
                  <td className="nowrap">{formatDateTime(i.time)}</td>
                  <td><span className={`badge ${SEVERITY[i.severity][1]}`}>{SEVERITY[i.severity][0]}</span></td>
                  <td>{i.type}</td>
                  <td>{i.desc}</td>
                  <td><span className={`badge ${STATUS[i.status][1]}`}>{STATUS[i.status][0]}</span></td>
                  <td className="text-right"><button className="btn btn-ghost btn-sm nowrap" onClick={() => select(i.id)}>{i.status === 'open' ? 'Xem & Đề xuất' : 'Xem'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {inc && (
          <div className="card">
            <div className={`alert ${inc.severity === 'emergency' ? 'alert-danger' : 'alert-warning'}`} style={{ marginBottom: 16 }}><i className="fa-solid fa-triangle-exclamation" /><div><b>{SEVERITY[inc.severity][0].toUpperCase()} — {inc.id}</b> | Chuyến {inc.tripId}{trip && ` (${trip.order.routeShort})`} | Chặng {inc.leg}</div></div>
            <div className={c.grid2}>
              <div>
                <h4 style={{ marginBottom: 10 }}>Báo cáo từ tài xế / hộ tống</h4>
                <div className={p.infoGrid}>
                  <InfoItem label="Loại sự cố">{inc.type}</InfoItem>
                  <InfoItem label="Thời gian">{formatDateTime(inc.time)}</InfoItem>
                  <InfoItem label="Đơn hàng">{inc.orderId}{trip && ` · ${trip.order.customer}`}</InfoItem>
                  <InfoItem label="Trạng thái">{STATUS[inc.status][0]}</InfoItem>
                </div>
                <div className={p.note}>{inc.desc}</div>
              </div>
              <div>
                <h4 style={{ marginBottom: 10 }}>Đề xuất phương án xử lý</h4>
                {inc.status !== 'open' ? <>
                  <div className={p.infoGrid}>
                    <InfoItem label="Phương án đã trình">{inc.proposal}</InfoItem>
                    <InfoItem label="Chi phí dự kiến">{formatVND(inc.cost ?? 0)} · {inc.bearer === 'customer' ? 'Khách hàng' : 'Công ty'} chịu</InfoItem>
                  </div>
                  {inc.directive && <div className={p.note}><i className="fa-solid fa-user-tie" /> Chỉ đạo của Manager: {inc.directive}</div>}
                  {inc.rejectReason && <div className="alert alert-danger" style={{ marginTop: 8 }}><i className="fa-solid fa-ban" /><div>Manager từ chối: {inc.rejectReason}</div></div>}
                  {inc.status === 'proposed' && <p className={p.hint}>Manager phê duyệt ở trang Sự cố &amp; Chi phí.</p>}
                </> : <>
                  <div className="form-group"><label className="required">Mô tả chi tiết phương án</label><textarea rows={3} className={cx('form-control', invalid && 'invalid')} value={form.proposal} onChange={e => { setInvalid(false); setForm({ ...form, proposal: e.target.value }) }} placeholder="VD: Điều xe thay thế, dự kiến tới trong 45 phút..." /></div>
                  <div className="form-group"><label>Báo cáo hiện trường (không bắt buộc)</label><textarea rows={2} className="form-control" value={form.report} onChange={e => setForm({ ...form, report: e.target.value })} placeholder="Tình trạng ngựa, xe, người tại hiện trường..." /></div>
                  <div className={c.formRow}>
                    <div className="form-group"><label>Chi phí dự kiến (VND)</label><input className="form-control" inputMode="numeric" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0" /></div>
                    <div className="form-group"><label>Bên chịu phí</label><select className="form-control" value={form.bearer} onChange={e => setForm({ ...form, bearer: e.target.value as Incident['bearer'] })}><option value="company">Công ty</option><option value="customer">Khách hàng</option></select></div>
                    <div className="form-group"><label>Bảo hiểm</label><select className="form-control" value={form.claim} onChange={e => setForm({ ...form, claim: e.target.value })}>{CLAIMS.map(x => <option key={x}>{x}</option>)}</select></div>
                  </div>
                  <div className={c.actions}><button className="btn btn-primary" onClick={propose}><i className="fa-solid fa-paper-plane" /> Trình đề xuất lên Manager</button></div>
                </>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
