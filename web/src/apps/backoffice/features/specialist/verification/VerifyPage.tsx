// Xác minh hồ sơ một đơn. Chuyển từ Specialist/kiem_dich.js (renderDetail, docRow, sidePanel, các hộp thoại).
// Thay trang tĩnh Specialist/chi-tiet-kiem-dich.html (mẫu viết cứng, không có luồng xử lý).
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { DOC_LABEL, INSPECTION_ISSUE_TYPES, ISSUE_POSITIVE, requiredDocs, type DocKey } from '@shared/config/documents'
import { workingDaysBetween } from '@shared/lib/dates'
import { formatDate, formatDateTime, formatDeadline } from '@shared/lib/format'
import { ordersApi } from '@shared/services/orders'
import { staffApi } from '@shared/services/staff'
import { useLoad } from '@shared/services/useLoad'
import type { DocDecision, Horse, Order, Verification } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { cx } from '../../../shared/parts'
import s from '../Specialist.module.css'
import { FilePreview, InfoRow } from '../parts'
import { DeadlineBadge, StateBadge } from './VerificationListPage'
import { assignedAt, closedAt, deadlineOf, docItems, docLabel, fileOf, progressOf, verifyState, type VerifyState } from './verification'

// Điểm cần đối chiếu khi xác minh bằng tay (kèm thông tin khách đã khai)
function checklistFor(key: DocKey, o: Order, h: Horse): ReactNode[] {
  const depart = <b>{formatDate(o.departAt)}</b>
  switch (key) {
    case 'passport': return [<>Microchip trên hộ chiếu trùng microchip khách khai: <b>{h.chip}</b></>, <>Tên, giống, giới tính khớp: <b>{h.name} · {h.breed} · {h.sex}</b></>, 'Mục đích sử dụng: ngựa đua']
    case 'vaccine': return ['Đủ các mũi bắt buộc (cúm ngựa, uốn ván), có dấu và chữ ký thú y', <>Còn hiệu lực đến sau ngày khởi hành {depart}</>, <>Microchip trên giấy trùng <b>{h.chip}</b></>]
    case 'lab': return ['Kết quả âm tính EIA và cúm ngựa, có dấu phòng xét nghiệm', <>Còn hiệu lực đến sau ngày khởi hành {depart}</>]
    case 'import_permit': return [<>Cấp cho đúng nước đến của tuyến <b>{o.routeShort}</b></>, <>Ghi đúng ngựa (microchip <b>{h.chip}</b>)</>, <>Còn hiệu lực đến sau ngày khởi hành {depart}</>]
    case 'ownership': return [<>Chủ sở hữu trùng khách hàng <b>{o.customer}</b>, hoặc có giấy ủy quyền kèm theo</>, <>Ghi đúng ngựa (microchip <b>{h.chip}</b>)</>]
  }
}

function Banners({ o, st }: { o: Order; st: VerifyState }) {
  const out: ReactNode[] = []
  const rq = o.recheckRequest
  if (o.status === 'rechecking' && st === 'verifying' && o.report) out.push(
    <div key="recheck" className="alert alert-warning"><i className="fa-solid fa-magnifying-glass" /><div>
      <b>Kiểm tra lại theo yêu cầu của khách.</b> Kết luận của kiểm dịch viên <b>{o.report.inspector}</b>: {o.report.type}{o.report.disease && ` (${o.report.disease}, ${o.report.curable ? 'chữa được' : 'không chữa được'})`}: {o.report.note}<br />
      {rq && <>Ý kiến của khách: "{rq.customerReason}" {rq.customerFiles.map(f => <span key={f} className="badge badge-muted"><i className="fa-solid fa-file-pdf" /> {f}</span>)}<br /></>}
      Hãy xác minh lại <b>độc lập, từ đầu</b>. Nếu vấn đề vẫn còn, dùng "Báo cáo vấn đề không khắc phục được" để chuyển Manager.
    </div></div>,
  )
  const d = deadlineOf(o)
  const v = o.verification
  const at = closedAt(o)
  const r = o.pending?.report ?? o.report
  if (st === 'verifying') out.push(Date.now() > d.time
    ? <div key="st" className="alert alert-danger"><i className="fa-solid fa-triangle-exclamation" /><div>Đơn đã quá hạn xử lý ({formatDeadline(d.time)}). Hệ thống sẽ tự động chuyển đơn cho kiểm dịch viên khác.</div></div>
    : <div key="st" className="alert alert-info"><i className="fa-solid fa-circle-info" /><div>Hạn xử lý: <b>{formatDeadline(d.time)}</b> ({d.source}). Quá hạn, hệ thống sẽ tự động chuyển đơn cho kiểm dịch viên khác.</div></div>)
  if (st === 'waiting') out.push(<div key="st" className="alert alert-warning"><i className="fa-solid fa-pause" /><div>Đã gửi yêu cầu bổ sung lúc <b>{formatDateTime(v?.requestedAt ?? o.task?.pausedSince ?? Date.now())}</b>{v?.requestOriginal && <>, kèm yêu cầu <b>nộp bản gốc để đối chiếu</b></>}. Đồng hồ xử lý tạm dừng cho tới khi khách nộp lại.{v?.customerMessage && <> Lời nhắn đã gửi: "{v.customerMessage}"</>}</div></div>)
  if (st === 'passed') out.push(<div key="st" className="alert alert-success"><i className="fa-solid fa-circle-check" /><div>Đã xác nhận hồ sơ hợp lệ{at && <> lúc <b>{formatDateTime(at)}</b></>}. Đơn đã chuyển cho Điều phối viên <b>{o.coordinator}</b> lập lộ trình.</div></div>)
  if (st === 'reported' && r) out.push(
    <div key="st" className="alert alert-warning"><i className="fa-solid fa-user-tie" /><div>
      Đã báo cáo Manager{at && <> lúc <b>{formatDateTime(at)}</b></>} — {r.type}{r.disease && ` (${r.disease}, ${r.curable ? 'chữa được' : 'không chữa được'})`}. Ngựa: {r.horses.join(', ')}.<br />
      Kết luận: {r.note}{r.evidence && <><br />Căn cứ: {r.evidence.join('; ')}.</>}<br />
      Manager sẽ đưa phương án cho khách chọn (bỏ ngựa, thay ngựa, dời ngày, kiểm tra lại, hủy đơn). Bạn chỉ xử lý tiếp nếu được giao ngựa mới hoặc giao kiểm tra lại.
    </div></div>,
  )
  return <div className={s.banners}>{out}</div>
}

function DocRow({ o, horse, docKey, doc, editable, onDecide, onReason, reasonInvalid, onPreview }: {
  o: Order; horse: Horse; docKey: DocKey; doc?: DocDecision; editable: boolean; reasonInvalid: boolean
  onDecide: (d: DocDecision['decision']) => void; onReason: (text: string) => void; onPreview: () => void
}) {
  return (
    <div className={cx(s.doc, doc?.decision === 'valid' && s.docValid, doc?.decision === 'invalid' && s.docInvalid)}>
      <div className={s.docHead}>
        <div className={s.docName}>{DOC_LABEL[docKey]}</div>
        <button className="btn btn-ghost btn-sm" onClick={onPreview}><i className="fa-solid fa-file-pdf" /> Mở {fileOf(horse, docKey)}</button>
      </div>
      <div className={s.checklist}>
        <div className={s.checklistTitle}><i className="fa-solid fa-list-check" /> Cần đối chiếu</div>
        <ul>{checklistFor(docKey, o, horse).map((item, i) => <li key={i}>{item}</li>)}</ul>
      </div>
      {editable ? <>
        <div className={s.decision}>
          <button className={cx(s.choice, doc?.decision === 'valid' && s.choiceValid)} onClick={() => onDecide('valid')}><i className="fa-solid fa-check" /> Hợp lệ</button>
          <button className={cx(s.choice, doc?.decision === 'invalid' && s.choiceInvalid)} onClick={() => onDecide('invalid')}><i className="fa-solid fa-xmark" /> Không hợp lệ</button>
        </div>
        {doc?.decision === 'invalid' && <input autoFocus className={cx('form-control', s.reason, reasonInvalid && !doc.reason.trim() && 'invalid')} value={doc.reason} placeholder="Lý do (khách sẽ thấy nội dung này) *" onChange={e => onReason(e.target.value)} />}
      </> : <div>{doc?.decision === 'valid' ? <span className="badge badge-success">Hợp lệ</span> : doc?.decision === 'invalid' ? <><span className="badge badge-danger">Không hợp lệ</span> <span className="text-muted small">{doc.reason}</span></> : <span className="text-muted small">Chưa xác minh</span>}</div>}
    </div>
  )
}

type ModalKind = 'pass' | 'request' | 'report' | { file: string } | null

export default function VerifyPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const me = session!.name
  const toast = useToast()
  const { data: order, reload } = useLoad(() => ordersApi.get(id!), [id])
  const { data: staff = [] } = useLoad(staffApi.list)
  const [horseIndex, setHorseIndex] = useState(0)
  const [modal, setModal] = useState<ModalKind>(null)
  const [reasonInvalid, setReasonInvalid] = useState(false)
  // Hộp thoại
  const [original, setOriginal] = useState(false)
  const [message, setMessage] = useState('')
  const [report, setReport] = useState({ horses: [] as string[], type: INSPECTION_ISSUE_TYPES[0], disease: '', curable: '' as '' | 'yes' | 'no', note: '' })
  const [invalid, setInvalid] = useState('')

  if (!order) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  const o = order
  const st = verifyState(o, me)
  if (!st) return <div className="page"><div className="wrap"><div className="alert alert-warning"><i className="fa-solid fa-lock" /><div>Đơn {o.id} không thuộc danh sách hồ sơ được giao cho bạn. <Link to="/specialist/verification" className="text-orange">Về danh sách</Link></div></div></div></div>
  const editable = st === 'verifying'
  const pr = progressOf(o, st)
  const items = docItems(o, st)
  const invalidItems = items.filter(i => i.doc?.decision === 'invalid')
  const horse = o.horses[horseIndex]
  const docs = requiredDocs(!!o.border)
  const deadline = deadlineOf(o)
  const verification: Verification = o.verification ?? { docs: {} }

  const saveDocs = async (horseName: string, key: DocKey, doc?: DocDecision) => {
    const forHorse = { ...verification.docs[horseName] }
    if (doc) forHorse[key] = doc
    else delete forHorse[key]
    await ordersApi.update(o.id, { verification: { ...verification, docs: { ...verification.docs, [horseName]: forHorse } } })
    reload()
  }
  const decide = (key: DocKey, decision: DocDecision['decision']) => {
    const current = verification.docs[horse.name]?.[key]
    saveDocs(horse.name, key, current?.decision === decision ? undefined : { decision, reason: decision === 'invalid' ? current?.reason ?? '' : '' })
  }

  // Mọi giấy Không hợp lệ phải có lý do (khách và Manager đọc lý do này); thiếu thì nhảy tới ngựa đầu tiên còn thiếu
  const reasonsComplete = () => {
    const missing = invalidItems.filter(i => !i.doc!.reason.trim())
    if (!missing.length) return true
    setHorseIndex(o.horses.indexOf(missing[0].horse))
    setReasonInvalid(true)
    toast(`Còn ${missing.length} giấy tờ Không hợp lệ chưa ghi lý do`, 'error')
    return false
  }
  const done = async (patch: Partial<Order>, msg: string) => {
    await ordersApi.update(o.id, patch)
    setModal(null)
    toast(msg)
    reload()
  }

  const confirmPass = () => {
    const coordinatorId = staff.find(x => x.name === o.coordinator)?.id ?? ''
    done({
      status: 'processing', stage: 'routing', waitingCustomer: false,
      verification: { ...verification, result: 'passed', closedAt: Date.now() },
      task: { step: 'coordinator', assigneeId: coordinatorId, assignedAt: Date.now(), pausedWorkingDays: 0, history: [] },
    }, `Đã chuyển ${o.id} cho Điều phối viên ${o.coordinator}`)
  }
  const confirmRequest = () => done({
    waitingCustomer: true,
    verification: { ...verification, requestedAt: Date.now(), requestOriginal: original, customerMessage: message.trim() },
    task: o.task && { ...o.task, pausedSince: Date.now() },
  }, `Đã gửi yêu cầu bổ sung ${invalidItems.length} giấy tờ cho khách`)
  const openReport = () => {
    if (!reasonsComplete()) return
    setReport({ horses: o.horses.filter(h => invalidItems.some(i => i.horse === h)).map(h => h.name), type: INSPECTION_ISSUE_TYPES[0], disease: '', curable: '', note: '' })
    setInvalid('')
    setModal('report')
  }
  const confirmReport = () => {
    const positive = report.type === ISSUE_POSITIVE
    if (!report.horses.length) return setInvalid('horses')
    if (positive && !report.disease.trim()) return setInvalid('disease')
    if (positive && !report.curable) return setInvalid('curable')
    if (!report.note.trim()) return setInvalid('note')
    done({
      pending: { kind: 'issue', at: Date.now(), report: {
        inspector: me, horses: report.horses, type: report.type,
        disease: positive ? report.disease.trim() : '', curable: positive ? report.curable === 'yes' : null,
        note: report.note.trim(), evidence: invalidItems.map(i => docLabel(i.horse.name, i.key)),
      } },
      verification: { ...verification, result: 'reported', closedAt: Date.now() },
    }, `Đã gửi báo cáo ${o.id} cho Manager`)
  }

  const requestHint = !pr.allDecided ? `Xác minh hết giấy tờ trước (còn ${pr.total - pr.decided})` : pr.invalid === 0 ? 'Không có giấy tờ Không hợp lệ' : ''
  const urgent = Date.now() > deadline.time || workingDaysBetween(Date.now(), deadline.time) === 0

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Kiểm dịch / <Link to="/specialist/verification">Hồ sơ được giao</Link> / <span className="text-orange font-semibold">{o.id}</span></div>
        <div className={`page-header ${s.titleRow}`}><h1>Xác minh hồ sơ {o.id}</h1><StateBadge o={o} st={st} /></div>
        <Banners o={o} st={st} />

        <div className={s.layout}>
          <div className="card">
            <div className="card-header"><h3><i className="fa-solid fa-folder-open" /> Giấy tờ khách đã nộp</h3><span className="sub-text">Đã xác minh {pr.decided}/{pr.total} giấy tờ</span></div>
            <div className={s.horseTabs}>
              {o.horses.map((h, i) => {
                const hd = items.filter(x => x.horse === h)
                const icon = hd.some(x => x.doc?.decision === 'invalid') ? <i className="fa-solid fa-circle-xmark text-red" />
                  : hd.every(x => x.doc?.decision === 'valid') ? <i className="fa-solid fa-circle-check text-green" />
                  : <i className="fa-regular fa-circle text-muted" />
                return <button key={h.name} className={cx(s.horseTab, i === horseIndex && s.active)} onClick={() => setHorseIndex(i)}>{icon} {h.name}<span>{h.chip}</span></button>
              })}
            </div>
            <div className={s.horseInfo}>{horse.name} · {horse.breed} · {horse.sex} · Microchip khai báo <b>{horse.chip}</b></div>
            {docs.map(key => (
              <DocRow key={horse.name + key} o={o} horse={horse} docKey={key} doc={items.find(x => x.horse === horse && x.key === key)?.doc} editable={editable} reasonInvalid={reasonInvalid}
                onDecide={d => decide(key, d)} onReason={text => saveDocs(horse.name, key, { decision: 'invalid', reason: text })} onPreview={() => setModal({ file: fileOf(horse, key) })} />
            ))}
          </div>

          <aside className={s.side}>
            {editable && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-gavel" /> Kết luận</h3></div>
                <div className={cx(s.deadline, urgent && s.urgent)}><i className="fa-regular fa-clock" /> Hạn: <b>{formatDeadline(deadline.time)}</b><div className="small">{deadline.source}</div></div>
                <div className={s.progress}><div style={{ width: `${Math.round(pr.decided / pr.total * 100)}%` }} /></div>
                <p className={s.hint}>Đã xác minh {pr.decided}/{pr.total} · Không hợp lệ {pr.invalid}</p>
                <div className={s.actions}>
                  <button className="btn btn-primary" disabled={!pr.allValid} onClick={() => setModal('pass')}><i className="fa-solid fa-check" /> Hồ sơ hợp lệ → chuyển Điều phối</button>
                  {!pr.allValid && <p className={s.hint}>Cần tất cả {pr.total} giấy tờ ở trạng thái Hợp lệ</p>}
                  <button className="btn btn-outline" disabled={!!requestHint} onClick={() => { if (reasonsComplete()) { setOriginal(false); setMessage(''); setModal('request') } }}><i className="fa-solid fa-rotate-left" /> Yêu cầu khách bổ sung</button>
                  {requestHint && <p className={s.hint}>{requestHint}</p>}
                  <button className="btn btn-danger" disabled={!pr.invalid} onClick={openReport}><i className="fa-solid fa-flag" /> Báo cáo vấn đề không khắc phục được</button>
                  <p className={s.hint}>{pr.invalid ? 'Chuyển Manager đưa phương án cho khách. Kiểm dịch viên không từ chối đơn.' : 'Cần ít nhất 1 giấy tờ Không hợp lệ làm căn cứ'}</p>
                </div>
              </div>
            )}
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-file-lines" /> Thông tin đơn</h3></div>
              <InfoRow label="Khách hàng">{o.customer}</InfoRow>
              <InfoRow label="Điểm đi">{o.from}</InfoRow>
              <InfoRow label="Điểm đến">{o.to}</InfoRow>
              <InfoRow label="Loại tuyến">{o.border ? `Xuyên quốc gia · ${o.border}` : 'Nội địa'}</InfoRow>
              <InfoRow label="Khởi hành">{formatDate(o.departAt)}</InfoRow>
              <InfoRow label="Số ngựa">{o.horses.length}</InfoRow>
              <InfoRow label="Được giao lúc">{formatDateTime(assignedAt(o))}</InfoRow>
              <InfoRow label="Hạn xử lý"><DeadlineBadge o={o} st={st} /></InfoRow>
              {o.customerNote && <div className={s.note}><i className="fa-solid fa-comment-dots" /> Khách ghi chú: {o.customerNote}</div>}
            </div>
          </aside>
        </div>
      </div>

      {modal && typeof modal === 'object' && <FilePreview file={modal.file} onClose={() => setModal(null)} />}

      {modal === 'pass' && (
        <Modal title={`Xác nhận hồ sơ ${o.id} hợp lệ?`} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={confirmPass}><i className="fa-solid fa-check" /> Xác nhận hợp lệ</button></>}>
          <ul className={s.list}>
            <li><i className="fa-solid fa-circle-check text-green" />{o.horses.length} ngựa · {pr.total} giấy tờ đều Hợp lệ.</li>
            <li><i className="fa-solid fa-arrow-right text-orange" />Đơn chuyển cho Điều phối viên <b>{o.coordinator}</b> lập lộ trình.</li>
            <li><i className="fa-solid fa-lock text-muted" />Sau khi xác nhận, bạn không sửa kết quả xác minh được nữa.</li>
          </ul>
        </Modal>
      )}

      {modal === 'request' && (
        <Modal wide title={`Yêu cầu khách bổ sung · ${o.id}`} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={confirmRequest}><i className="fa-solid fa-paper-plane" /> Gửi yêu cầu</button></>}>
          <p style={{ marginBottom: 8 }}>Khách sẽ nhận danh sách sau và nộp lại đúng các giấy tờ này:</p>
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Ngựa</th><th>Giấy tờ</th><th>Lý do</th></tr></thead>
            <tbody>{invalidItems.map(i => <tr key={i.horse.name + i.key}><td>{i.horse.name}</td><td>{DOC_LABEL[i.key]}</td><td>{i.doc!.reason}</td></tr>)}</tbody>
          </table></div>
          <label className={s.checkLine}><input type="checkbox" checked={original} onChange={e => setOriginal(e.target.checked)} /> Yêu cầu nộp <b>bản gốc</b> để đối chiếu (khi nghi giấy tờ không thật)</label>
          <div className="form-group"><label>Lời nhắn thêm cho khách (không bắt buộc)</label><textarea rows={2} className="form-control" value={message} onChange={e => setMessage(e.target.value)} placeholder="Ví dụ: chụp rõ trang có dấu..." /></div>
          <p className={s.hint}><i className="fa-solid fa-pause" /> Đồng hồ xử lý tạm dừng cho tới khi khách nộp lại.</p>
        </Modal>
      )}

      {modal === 'report' && (
        <Modal wide title={`Báo cáo vấn đề không khắc phục được · ${o.id}`} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-danger" onClick={confirmReport}><i className="fa-solid fa-flag" /> Gửi báo cáo cho Manager</button></>}>
          <div className="alert alert-info" style={{ marginBottom: 12 }}><i className="fa-solid fa-circle-info" /><div>Dùng khi <b>không thể khắc phục bằng bổ sung giấy tờ</b>. Báo cáo chuyển tới Manager; Manager đưa phương án cho khách chọn (bỏ ngựa, thay ngựa, dời ngày, kiểm tra lại, hủy đơn). Bạn không từ chối đơn.</div></div>
          <div className="form-group">
            <label className="required">Ngựa bị ảnh hưởng</label>
            <div className={cx(s.checkBox, invalid === 'horses' && s.invalid)}>
              {o.horses.map(h => <label key={h.name} className={s.checkLine}><input type="checkbox" checked={report.horses.includes(h.name)} onChange={e => { setInvalid(''); setReport({ ...report, horses: e.target.checked ? [...report.horses, h.name] : report.horses.filter(x => x !== h.name) }) }} /> {h.name} · {h.chip}</label>)}
            </div>
          </div>
          <div className="form-group"><label className="required">Loại vấn đề</label><select className="form-control" value={report.type} onChange={e => setReport({ ...report, type: e.target.value })}>{INSPECTION_ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          {report.type === ISSUE_POSITIVE && <>
            <div className="form-group"><label className="required">Tên bệnh</label><input className={cx('form-control', invalid === 'disease' && 'invalid')} value={report.disease} onChange={e => { setInvalid(''); setReport({ ...report, disease: e.target.value }) }} placeholder="Ví dụ: EIA, cúm ngựa" /></div>
            <div className="form-group">
              <label className="required">Bệnh có chữa được không?</label>
              <div className={cx(s.checkBox, invalid === 'curable' && s.invalid)}>
                <label className={s.checkLine}><input type="radio" name="curable" checked={report.curable === 'yes'} onChange={() => { setInvalid(''); setReport({ ...report, curable: 'yes' }) }} /> Chữa được: điều trị rồi xét nghiệm lại (cho phép phương án dời ngày)</label>
                <label className={s.checkLine}><input type="radio" name="curable" checked={report.curable === 'no'} onChange={() => { setInvalid(''); setReport({ ...report, curable: 'no' }) }} /> Không chữa được</label>
              </div>
            </div>
          </>}
          <div className="form-group"><label className="required">Kết luận chuyên môn</label><textarea rows={3} className={cx('form-control', invalid === 'note' && 'invalid')} value={report.note} onChange={e => { setInvalid(''); setReport({ ...report, note: e.target.value }) }} placeholder="Mô tả cụ thể điều bạn thấy trên giấy tờ..." /></div>
          <label className="small font-semibold">Căn cứ (giấy tờ đã đánh dấu Không hợp lệ)</label>
          <ul className={s.list} style={{ marginTop: 6 }}>{invalidItems.map(i => <li key={i.horse.name + i.key}><i className="fa-solid fa-circle-xmark text-red" />{docLabel(i.horse.name, i.key)}: {i.doc!.reason}</li>)}</ul>
        </Modal>
      )}
    </div>
  )
}
