// Phê duyệt sự cố & chi phí. Chuyển từ Manager/manager_duyet_su_co.html + manager_duyet_su_co.js.
// Bản cũ là bảng viết cứng; nay lấy từ kho sự cố chung: điều phối viên đề xuất (OPS-04) → Manager duyệt/từ chối tại đây.
import { useState } from 'react'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { incidentsApi, type Incident } from '@shared/services/incidents'
import { ordersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { usePagination } from '@shared/ui/usePagination'
import { SearchBox, cx, partStyles as m } from '../../../shared/parts'

type Tab = 'proposed' | 'approved' | 'rejected'
const TABS: [Tab, string][] = [['proposed', 'Chờ xử lý'], ['approved', 'Đã phê duyệt'], ['rejected', 'Từ chối']]
const SEVERITY: Record<Incident['severity'], [string, string]> = { emergency: ['Khẩn cấp', 'badge-danger'], medium: ['Cảnh báo', 'badge-warning'], low: ['Thấp', 'badge-muted'] }
const STATUS: Record<Tab, [string, string]> = { proposed: ['Chờ xử lý', 'badge-warning'], approved: ['Đã phê duyệt', 'badge-success'], rejected: ['Từ chối', 'badge-danger'] }
const Bearer = ({ b }: { b?: Incident['bearer'] }) => b === 'customer' ? <><i className="fa-solid fa-user" /> Khách hàng</> : <><i className="fa-solid fa-building" /> Công ty</>

function IncidentModal({ inc, route, onClose, onSave }: { inc: Incident; route: string; onClose: () => void; onSave: (patch: Partial<Incident>, msg: string, type?: 'success' | 'error') => void }) {
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null)
  const [text, setText] = useState('')
  const [shake, setShake] = useState(0)
  const pending = inc.status === 'proposed'

  const confirm = () => {
    if (!text.trim()) return setShake(shake + 1)
    if (mode === 'approve') onSave({ status: 'approved', directive: text.trim() }, `Đã phê duyệt giải pháp sự cố ${inc.tripId}`)
    else onSave({ status: 'rejected', rejectReason: text.trim() }, `Đã từ chối giải pháp sự cố ${inc.tripId}`, 'error')
  }

  return (
    <Modal wide title={<>Chi tiết Sự cố <span className="text-orange">#{inc.tripId}</span></>} subtitle={`${route} · ${formatDateTime(inc.time)} · Chặng ${inc.leg}`} onClose={onClose}
      footer={pending && !mode ? <>
        <button className="btn btn-ghost" onClick={() => setMode('reject')}><i className="fa-solid fa-xmark" /> Từ chối</button>
        <button className="btn btn-success" onClick={() => setMode('approve')}><i className="fa-solid fa-check" /> Phê duyệt &amp; Lưu Chi phí</button>
      </> : undefined}>
      <div className={m.sectionTitle}><span className={m.sectionNum}><i className="fa-solid fa-comment-dots" /></span>Báo cáo từ Điều phối viên</div>
      <div className={m.note}>"{inc.report || inc.desc}"</div>
      <div className={m.infoGrid} style={{ marginTop: 14 }}>
        <div className={m.infoItem}><span className={m.infoLabel}>Chi phí phát sinh dự kiến</span><span className={m.infoValue}>{formatVND(inc.cost ?? 0)}</span></div>
        <div className={m.infoItem}><span className={m.infoLabel}>Tài liệu đính kèm</span><span className={m.infoValue}>{inc.attachments?.length ? inc.attachments.map(a => <span key={a} className="badge badge-info" style={{ marginRight: 6 }}><i className="fa-solid fa-image" /> {a}</span>) : '—'}</span></div>
      </div>
      <div className={m.section}>
        <div className={m.sectionTitle}><span className={m.sectionNum}><i className="fa-solid fa-lightbulb" /></span>Giải pháp đề xuất</div>
        <div className={m.actionBox} style={{ marginTop: 0 }}>
          <p style={{ marginBottom: 10 }}>{inc.proposal}</p>
          <div className={m.infoGrid}>
            <div className={m.infoItem}><span className={m.infoLabel}>Loại phát sinh</span><span className={m.infoValue}>{inc.type}</span></div>
            <div className={m.infoItem}><span className={m.infoLabel}>Đối tượng chịu trách nhiệm</span><span className={m.infoValue}><Bearer b={inc.bearer} /> chịu phí</span></div>
            <div className={m.infoItem}><span className={m.infoLabel}>Chi phí phát sinh</span><span className={m.infoValue}>{formatVND(inc.cost ?? 0)}</span></div>
            <div className={m.infoItem}><span className={m.infoLabel}>Claim Bảo hiểm</span><span className={m.infoValue}>{inc.claim ?? '—'}</span></div>
          </div>
        </div>
      </div>
      {inc.status === 'approved' && <div className="alert alert-success" style={{ marginTop: 12 }}><i className="fa-solid fa-circle-check" /><div><b>Chỉ đạo xử lý:</b> {inc.directive}</div></div>}
      {inc.status === 'rejected' && <div className="alert alert-danger" style={{ marginTop: 12 }}><i className="fa-solid fa-circle-xmark" /><div><b>Lý do từ chối:</b> {inc.rejectReason}</div></div>}
      {mode && (
        <div key={shake} className={cx(mode === 'approve' ? m.actionBox : m.rejectBox, shake > 0 && m.shake)}>
          <div className="form-group"><label className="required">{mode === 'approve' ? 'Chỉ đạo xử lý của Manager' : 'Lý do từ chối'}</label>
            <textarea rows={3} autoFocus className={cx('form-control', shake > 0 && !text.trim() && 'invalid')} placeholder={mode === 'approve' ? 'Nhập chỉ đạo cụ thể cho điều phối viên...' : 'Nhập lý do từ chối giải pháp...'} value={text} onChange={e => setText(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setMode(null); setText(''); setShake(0) }}>Hủy</button>
            <button className={`btn ${mode === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={confirm}>{mode === 'approve' ? 'Xác nhận Phê duyệt' : 'Xác nhận Từ chối'}</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function IncidentsPage() {
  const toast = useToast()
  const { data: incidents = [], reload } = useLoad(incidentsApi.list)
  const { data: orders = [] } = useLoad(ordersApi.list)
  const [tab, setTab] = useState<Tab>('proposed')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const routeOf = (inc: Incident) => orders.find(o => o.id === inc.orderId)?.routeShort ?? ''
  const rows = incidents.filter(i => i.status !== 'open').sort((a, b) => b.time - a.time) // chưa có đề xuất thì chưa tới Manager
  const list = rows.filter(i => i.status === tab && (!query || [i.tripId, routeOf(i), i.desc].join(' ').toLowerCase().includes(query.toLowerCase())))
  const { rows: page, bar } = usePagination(list)
  const tableRef = useStaggerIn('tbody tr', [tab, query, list.length])
  const open = incidents.find(i => i.id === openId)

  const save = async (patch: Partial<Incident>, msg: string, type: 'success' | 'error' = 'success') => {
    await incidentsApi.update(openId!, patch)
    setOpenId(null)
    toast(msg, type)
    reload()
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Hệ thống Vận hành / <span className="text-orange font-semibold">Phê duyệt Sự cố &amp; Chi Phí</span></div>
        <div className="page-header"><h1>Phê duyệt Sự cố &amp; Chi Phí</h1><p>Giải pháp và chi phí phát sinh do điều phối viên đề xuất khi có sự cố trên đường.</p></div>
        <div className="card">
          <div className={m.toolbar}><h3 className="font-bold">Quản lý Sự cố &amp; Chi phí</h3><SearchBox value={query} onChange={setQuery} placeholder="Tìm mã chuyến, tuyến, mô tả..." /></div>
          <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={`tab ${k === tab ? 'active' : ''}`} onClick={() => setTab(k)}>{l}<span className="count">{rows.filter(i => i.status === k).length}</span></button>)}</div>
          <div ref={tableRef} className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã chuyến</th><th>Tuyến đường</th><th>Thời gian</th><th>Mức độ</th><th>Người chịu phí</th><th>Mô tả sự cố</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
              <tbody>{page.length ? page.map(i => (
                <tr key={i.id}>
                  <td className={m.idCell}>#{i.tripId}</td><td>{routeOf(i)}</td><td className="nowrap text-muted">{formatDateTime(i.time)}</td>
                  <td><span className={`badge ${SEVERITY[i.severity][1]}`}>{SEVERITY[i.severity][0]}</span></td>
                  <td className="nowrap"><Bearer b={i.bearer} /></td><td>{i.desc}</td>
                  <td><span className={`badge ${STATUS[i.status as Tab][1]}`}>{STATUS[i.status as Tab][0]}</span></td>
                  <td className="text-right"><button className={`btn btn-sm ${i.status === 'proposed' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setOpenId(i.id)}>{i.status === 'proposed' ? 'Xử lý' : <><i className="fa-solid fa-eye" /> Xem</>}</button></td>
                </tr>
              )) : <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 24 }}>Không có sự cố nào</td></tr>}</tbody>
            </table>
          </div>
          {bar}
        </div>
      </div>
      {open && <IncidentModal inc={open} route={routeOf(open)} onClose={() => setOpenId(null)} onSave={save} />}
    </div>
  )
}
