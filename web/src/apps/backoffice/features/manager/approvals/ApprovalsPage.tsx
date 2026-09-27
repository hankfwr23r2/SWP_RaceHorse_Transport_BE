// Phê duyệt đơn hàng. Chuyển từ Manager/manager_phe_duyet.html + manager_phe_duyet.js.
// Bước cuối trước khi khách thanh toán: duyệt đơn đã được tiếp nhận, kiểm dịch xác nhận hồ sơ và điều phối lập lộ trình.
import { useState } from 'react'
import { DOC_LABEL, PROCEDURES, proceduresFor, requiredDocs, type DocKey } from '@shared/config/documents'
import { handoverDue, originalsDue, paymentDeadline } from '@shared/lib/deadlines'
import { formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { ordersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { orderTotal, type Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { usePagination } from '@shared/ui/usePagination'
import { InfoItem, SearchBox, Section, Stepper, TripInfo, cx, matches, partStyles as s } from '../../../shared/parts'

type ApprovalStatus = 'pending' | 'approved' | 'paid' | 'rejected'
const TABS: [ApprovalStatus, string][] = [['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt - Chờ thanh toán'], ['paid', 'Đã thanh toán - Giấy tờ'], ['rejected', 'Từ chối']]
const REJECT_TYPES = ['Không đủ năng lực vận hành (xe / nhân sự)', 'Tuyến đường hoặc cửa khẩu không khả thi', 'Khác']

function approvalStatus(o: Order): ApprovalStatus | null {
  if (o.status === 'processing' && o.stage === 'approval') return 'pending'
  if (o.status === 'awaiting_payment') return 'approved'
  if (o.status === 'paid' && o.papers) return 'paid'
  if (o.status === 'rejected' && o.rejectedStep === 2) return 'rejected'
  return null
}

function papersProgress(o: Order) {
  const docs = Object.values(o.papers!.originals).flatMap(d => Object.values(d))
  const procs = proceduresFor(!!o.border)
  return { done: docs.filter(Boolean).length + procs.filter(k => o.papers!.procedures[k]).length, total: docs.length + procs.length }
}

function PapersBadge({ o }: { o: Order }) {
  if (o.papers!.handedAt) return <span className="badge badge-success"><i className="fa-solid fa-handshake" /> Đã bàn giao Điều phối</span>
  if (o.papersReport) return <span className="badge badge-danger"><i className="fa-solid fa-flag" /> Kiểm dịch báo cáo</span>
  const p = papersProgress(o)
  return <span className="badge badge-info">Đủ {p.done}/{p.total} giấy</span>
}

function Banner({ o, st }: { o: Order; st: ApprovalStatus }) {
  if (st === 'pending' && o.infeasible) return <div className={`alert alert-danger ${s.banner}`}><i className="fa-solid fa-route" /><div><b>Điều phối viên {o.infeasible.by} đánh giá tuyến không khả thi</b> lúc {formatDateTime(o.infeasible.at)}: {o.infeasible.note}<br />Đơn trả về Manager. Chỉ Manager được từ chối đơn.</div></div>
  if (st === 'approved') return <div className={`alert alert-success ${s.banner}`}><i className="fa-solid fa-circle-check" /><div>Đã phê duyệt. Chờ khách hàng thanh toán 100% trước <b>{formatDateTime(paymentDeadline(o.approvedAt!, o.departAt))}</b>.</div></div>
  if (st === 'rejected') return <div className={`alert alert-danger ${s.banner}`}><i className="fa-solid fa-circle-xmark" /><div>Từ chối — <b>{o.rejectType}</b>: {o.reason}</div></div>
  if (st === 'paid') return o.papersReport
    ? <div className={`alert alert-danger ${s.banner}`}><i className="fa-solid fa-flag" /><div><b>Kiểm dịch viên {o.inspector} báo cáo lúc {formatDateTime(o.papersReport.at)}</b> — {o.papersReport.type}.<br />Giấy liên quan: {o.papersReport.items.join('; ')}.<br />Ghi chú: {o.papersReport.note}</div></div>
    : <div className={`alert alert-success ${s.banner}`}><i className="fa-solid fa-circle-check" /><div>Khách đã thanh toán 100% lúc <b>{formatDateTime(o.paidAt!)}</b>. {o.papers?.handedAt ? <>Giấy tờ đã bàn giao cho Điều phối viên lúc <b>{formatDateTime(o.papers.handedAt)}</b>.</> : <>Kiểm dịch viên đang chuẩn bị giấy tờ, hạn bàn giao <b>{formatDateTime(handoverDue(o.departAt))}</b>.</>}</div></div>
  return null
}

function Papers({ o }: { o: Order }) {
  const { originals, procedures } = o.papers!
  const scan = <button className="btn btn-ghost btn-sm"><i className="fa-solid fa-eye" /> Bản scan</button>
  return (
    <>
      <p className={s.hint} style={{ marginTop: 0, marginBottom: 8 }}><i className="fa-solid fa-user-doctor" /> Kiểm dịch viên: <b>{o.inspector}</b> · Khách gửi bản gốc trước <b>{formatDateTime(originalsDue(o.departAt))}</b> · Bàn giao Điều phối trước <b>{formatDateTime(handoverDue(o.departAt))}</b></p>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Giấy do cơ quan chức năng cấp</th><th>Thông tin</th><th /></tr></thead>
          <tbody>{proceduresFor(!!o.border).map(k => {
            const p = procedures[k]
            return <tr key={k}><td className="font-semibold">{PROCEDURES[k].label}</td><td>{p ? <>Số <b>{p.number}</b><div className="sub-text">{p.agency} · cấp {formatDate(p.issuedAt)}{p.validUntil ? ` · hiệu lực đến ${formatDate(p.validUntil)}` : ''}</div></> : <span className="badge badge-muted">Chưa có</span>}</td><td className="text-right">{p && scan}</td></tr>
          })}</tbody>
          <thead><tr><th>Bản gốc giấy tờ của khách</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{Object.entries(originals).flatMap(([horse, docs]) => Object.entries(docs).map(([k, at]) => (
            <tr key={horse + k}><td>{horse} · {DOC_LABEL[k as DocKey]}</td><td>{at ? <span className="text-green"><i className="fa-solid fa-circle-check" /> Đã nhận {formatDateTime(at)}</span> : <span className="badge badge-warning">Chưa nhận</span>}</td><td className="text-right">{scan}</td></tr>
          )))}</tbody>
        </table>
      </div>
    </>
  )
}

function ApprovalModal({ order: o, onClose, onSave }: { order: Order; onClose: () => void; onSave: (patch: Partial<Order>, msg: string, type?: 'success' | 'error') => void }) {
  const st = approvalStatus(o)!
  const docs = requiredDocs(!!o.border)
  // Điều phối đánh giá không khả thi → mở sẵn khung từ chối với lý do tuyến đường
  const [rejecting, setRejecting] = useState(!!o.infeasible)
  const [rejectType, setRejectType] = useState(o.infeasible ? REJECT_TYPES[1] : REJECT_TYPES[0])
  const [note, setNote] = useState('')
  const [shake, setShake] = useState(0)
  const r = o.review

  const approve = () => onSave({ status: 'awaiting_payment', approvedAt: Date.now(), stage: undefined }, `Đã phê duyệt ${o.id}. Đã gửi yêu cầu thanh toán 100% cho khách hàng (hạn 48 giờ)`)
  const reject = () => {
    if (!note.trim()) return setShake(shake + 1)
    onSave({ status: 'rejected', rejectedStep: 2, rejectedAt: Date.now(), rejectType, reason: note.trim(), stage: undefined }, `Đã từ chối đơn hàng ${o.id}`, 'error')
  }

  const footer = st === 'pending' && !rejecting && !o.infeasible ? <>
    <button className="btn btn-ghost" onClick={() => setRejecting(true)}><i className="fa-solid fa-ban" /> Từ chối</button>
    <button className="btn btn-primary" onClick={approve}><i className="fa-solid fa-check" /> Phê duyệt đơn</button>
  </> : undefined

  return (
    <Modal wide title={o.id} subtitle={`${o.customer} · Gửi ngày ${formatDate(o.submittedAt)}`} onClose={onClose} footer={footer}>
      <Stepper current={st === 'pending' ? 3 : 4} rejectedAt={st === 'rejected' ? 3 : undefined} />
      <Banner o={o} st={st} />
      <Section num={1} title="Thông tin chuyến"><TripInfo order={o} /></Section>
      <Section num={2} title="Kết quả kiểm dịch">
        <p className={s.hint} style={{ marginTop: 0, marginBottom: 8 }}><span className="badge badge-success"><i className="fa-solid fa-check" /> Hợp lệ</span> <i className="fa-solid fa-user-doctor" /> Kiểm dịch viên: <b>{o.inspector}</b></p>
        {o.horses.map((h, i) => (
          <details key={h.name} className={s.horse} open={i === 0}>
            <summary><span><b>{h.name}</b> · {h.breed} · {h.sex}</span><span className="text-muted">Chip {h.chip} · <span className="text-green">{docs.length}/{docs.length} giấy tờ</span></span></summary>
            <ul className={s.docs}>{docs.map(d => <li key={d}><i className="fa-solid fa-circle-check" />{DOC_LABEL[d]}</li>)}</ul>
          </details>
        ))}
        {r && <div className={s.note}><i className="fa-solid fa-comment-dots" /> {r.inspectNote}</div>}
      </Section>
      <Section num={3} title="Lộ trình & phương tiện">
        <p className={s.hint} style={{ marginTop: 0, marginBottom: 8 }}><i className="fa-solid fa-route" /> Điều phối viên: <b>{o.coordinator}</b></p>
        {r && <div className={s.infoGrid}><InfoItem label="Xe">{r.vehicle}</InfoItem><InfoItem label="Tài xế (gán theo xe)">{r.driver}</InfoItem><InfoItem label="NV chăm sóc">{r.grooms}</InfoItem></div>}
        <ol style={{ paddingLeft: 20, marginTop: 10, display: 'grid', gap: 4, fontSize: '0.86rem', listStyle: 'decimal' }}>{o.stops?.map(x => <li key={x}>{x}</li>)}</ol>
      </Section>
      <Section num={4} title="Dịch vụ khách chọn">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Dịch vụ</th><th>Lựa chọn của khách</th><th className="text-right">Thành tiền</th></tr></thead>
            <tbody>{o.services.map(sv => <tr key={sv[0]}><td className="font-semibold">{sv[0]}</td><td className="text-muted">{sv[1]}</td><td className="text-right nowrap">{formatVND(sv[2])}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={2}>Tổng giá trị đơn</td><td className="text-right nowrap">{formatVND(orderTotal(o))}</td></tr></tfoot>
          </table>
        </div>
        {st === 'pending' && <p className={s.hint}><i className="fa-solid fa-credit-card" /> Sau khi duyệt: khách hàng thanh toán 100% tổng giá trị đơn trong 48 giờ, quá hạn đơn tự hủy.</p>}
      </Section>
      {o.papers && <Section num={5} title="Giấy tờ chuyến đi"><div style={{ marginBottom: 8 }}><PapersBadge o={o} /></div><Papers o={o} /></Section>}

      {rejecting && (
        <div key={shake} className={cx(s.rejectBox, shake > 0 && s.shake)}>
          <div className="form-group"><label className="required">Lý do từ chối</label><select className="form-control" value={rejectType} onChange={e => setRejectType(e.target.value)}>{REJECT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="required">Ghi chú gửi khách</label><textarea rows={3} autoFocus className={cx('form-control', shake > 0 && !note.trim() && 'invalid')} value={note} onChange={e => setNote(e.target.value)} placeholder="Giải thích cho khách vì sao đơn bị từ chối..." /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setRejecting(false); setNote(''); setShake(0) }}>Hủy</button>
            <button className="btn btn-danger" onClick={reject}><i className="fa-solid fa-ban" /> Xác nhận từ chối</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function ApprovalsPage() {
  const toast = useToast()
  const { data: all = [], reload } = useLoad(ordersApi.list)
  const [tab, setTab] = useState<ApprovalStatus>('pending')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = all.filter(o => approvalStatus(o)).sort((a, b) => a.departAt - b.departAt)
  const list = rows.filter(o => approvalStatus(o) === tab && matches(o, query))
  const { rows: page, bar } = usePagination(list)
  const tableRef = useStaggerIn('tbody tr', [tab, query, list.length])
  const open = all.find(o => o.id === openId)

  const save = async (patch: Partial<Order>, message: string, type: 'success' | 'error' = 'success') => {
    await ordersApi.update(openId!, patch)
    setOpenId(null)
    toast(message, type)
    reload()
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Hệ thống Vận hành / <span className="text-orange font-semibold">Phê duyệt Đơn hàng</span></div>
        <div className="page-header">
          <h1>Phê duyệt Đơn hàng</h1>
          <p>Bước cuối trước khi khách thanh toán: duyệt các đơn đã được tiếp nhận, kiểm dịch xác nhận hồ sơ và điều phối lập lộ trình.</p>
        </div>
        <div className="card">
          <div className={s.toolbar}>
            <h3 className="font-bold">Quản lý Phê duyệt Đơn hàng</h3>
            <SearchBox value={query} onChange={setQuery} placeholder="Tìm Mã đơn, Khách hàng, Tuyến..." />
          </div>
          <div className="tabs">
            {TABS.map(([key, label]) => <button key={key} className={`tab ${key === tab ? 'active' : ''}`} onClick={() => setTab(key)}>{label}<span className="count">{rows.filter(o => approvalStatus(o) === key).length}</span></button>)}
          </div>
          <div ref={tableRef} className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã Đơn hàng</th><th>Khách hàng</th><th>Tuyến đường</th><th>Số ngựa</th><th>Khởi hành</th><th className="text-right">Tổng giá trị đơn</th><th className="text-right">Thao tác</th></tr></thead>
              <tbody>
                {page.length ? page.map(o => (
                  <tr key={o.id}>
                    <td className={s.idCell}>{o.id}{tab === 'paid' && <div style={{ marginTop: 4 }}><PapersBadge o={o} /></div>}{tab === 'pending' && o.infeasible && <div style={{ marginTop: 4 }}><span className="badge badge-danger"><i className="fa-solid fa-route" /> Tuyến không khả thi</span></div>}</td>
                    <td className="text-muted">{o.customer}</td>
                    <td>{o.routeShort}{o.border && <div className="sub-text"><i className="fa-solid fa-flag" /> {o.border}</div>}</td>
                    <td className="text-muted">{o.horses.length}</td>
                    <td className="text-muted">{formatDate(o.departAt)}</td>
                    <td className="text-right font-semibold nowrap">{formatVND(orderTotal(o))}</td>
                    <td className="text-right nowrap">{tab === 'pending'
                      ? <button className="btn btn-primary btn-sm" onClick={() => setOpenId(o.id)}>Xem & Duyệt</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(o.id)}><i className="fa-solid fa-eye" /> Xem</button>}</td>
                  </tr>
                )) : <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 24 }}>Không có đơn hàng nào</td></tr>}
              </tbody>
            </table>
          </div>
          {bar}
        </div>
      </div>
      {open && <ApprovalModal order={open} onClose={() => setOpenId(null)} onSave={save} />}
    </div>
  )
}
