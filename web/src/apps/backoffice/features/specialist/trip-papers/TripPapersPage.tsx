// Giấy tờ chuyến đi của một đơn. Chuyển từ Specialist/thu_tuc.js (renderDetail, procedureRow, originalRow, các hộp thoại).
// Thay trang tĩnh Specialist/CUS2_Policy.html (mẫu viết cứng, không có luồng xử lý).
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { HOUR } from '@shared/config/business-rules'
import { DOC_LABEL, PAPERS_REPORT_TYPES, PROCEDURES, proceduresFor, requiredDocs, type DocKey, type ProcedureKey } from '@shared/config/documents'
import { dayKey } from '@shared/lib/dates'
import { handoverDue, originalsDue } from '@shared/lib/deadlines'
import { formatDate, formatDateTime, formatDeadline } from '@shared/lib/format'
import { deliveryDate } from '@shared/lib/trip'
import { ordersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import type { Order, Papers } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { cx } from '../../../shared/parts'
import s from '../Specialist.module.css'
import { FilePreview, InfoRow } from '../parts'
import { DueBadge, PapersBadge } from './TripPapersListPage'
import { fileOf } from '../verification/verification'
import { itemsOf, papersState, procedureExpiresEarly, progressOf, type PapersState } from './papers'

type ModalKind = { original: [horse: string, key: DocKey] } | { procedure: ProcedureKey } | { file: string } | 'handover' | 'report' | null

function Banner({ o, st }: { o: Order; st: PapersState }) {
  const missing = itemsOf(o).filter(i => i.kind === 'original' && !i.done).length
  let box: [string, string, ReactNode]
  if (st === 'handed') box = ['alert-success', 'fa-handshake', <>Đã bàn giao bộ bản gốc cho Điều phối viên <b>{o.coordinator}</b> lúc <b>{formatDateTime(o.papers!.handedAt!)}</b>. Điều phối viên chia giấy tờ theo xe cho tài xế.</>]
  else if (st === 'reported') {
    const r = o.papersReport!
    box = ['alert-warning', 'fa-user-tie', <>Đã báo cáo Manager lúc <b>{formatDateTime(r.at)}</b> — {r.type}.<br />Giấy liên quan: {r.items.join('; ')}.<br />Ghi chú: {r.note}<br />Manager sẽ quyết định cách xử lý. Bạn tiếp tục khi Manager giao lại.</>]
  } else if (Date.now() > handoverDue(o.departAt)) box = ['alert-danger', 'fa-triangle-exclamation', <>Đã quá hạn bàn giao (<b>{formatDeadline(handoverDue(o.departAt))}</b>). Nếu không kịp hoàn tất trước ngày khởi hành, hãy <b>Báo cáo Manager</b> ngay.</>]
  else if (Date.now() > originalsDue(o.departAt) && missing) box = ['alert-warning', 'fa-clock', <>Khách đã quá hạn gửi bản gốc (<b>{formatDeadline(originalsDue(o.departAt))}</b>), còn thiếu {missing} giấy. Liên hệ khách; nếu không kịp, hãy <b>Báo cáo Manager</b>.</>]
  else box = ['alert-info', 'fa-circle-info', <>Khách gửi bản gốc trước <b>{formatDeadline(originalsDue(o.departAt))}</b>. Bàn giao bộ giấy tờ cho Điều phối viên trước <b>{formatDeadline(handoverDue(o.departAt))}</b>.</>]
  return <div className={s.banners}><div className={`alert ${box[0]}`}><i className={`fa-solid ${box[1]}`} /><div>{box[2]}</div></div></div>
}

function ProcedureForm({ o, k, onCancel, onSave }: { o: Order; k: ProcedureKey; onCancel: () => void; onSave: (p: Papers['procedures'][ProcedureKey], early: boolean) => void }) {
  const def = PROCEDURES[k]
  const old = o.papers!.procedures[k]
  const toInput = (t?: number) => (t ? dayKey(new Date(t)) : '')
  const [f, setF] = useState({ number: old?.number ?? '', agency: old?.agency ?? '', issued: toInput(old?.issuedAt), valid: toInput(old?.validUntil), file: '' })
  const [invalid, setInvalid] = useState('')
  const toast = useToast()
  const today = dayKey(new Date())
  const set = (key: keyof typeof f) => (v: string) => { setInvalid(''); setF({ ...f, [key]: v }) }
  const save = () => {
    if (!f.number.trim()) return setInvalid('number')
    if (!f.agency.trim()) return setInvalid('agency')
    if (!f.issued || f.issued > today) return setInvalid('issued')
    if (def.hasValidity && (!f.valid || f.valid < f.issued)) { toast('Hiệu lực đến phải từ ngày cấp trở đi', 'error'); return setInvalid('valid') }
    if (!f.file && !old) return setInvalid('file')
    const toTime = (v: string) => new Date(`${v}T00:00:00`).getTime()
    const p = { number: f.number.trim(), agency: f.agency.trim(), issuedAt: toTime(f.issued), validUntil: def.hasValidity ? toTime(f.valid) : undefined, file: f.file || old!.file }
    onSave(p, !!p.validUntil && procedureExpiresEarly({ ...o, papers: { ...o.papers!, procedures: { ...o.papers!.procedures, [k]: p } } }, k))
  }
  return (
    <Modal title={def.label} onClose={onCancel} footer={<><button className="btn btn-ghost" onClick={onCancel}>Hủy</button><button className="btn btn-primary" onClick={save}><i className="fa-solid fa-floppy-disk" /> Lưu</button></>}>
      <div className="form-group"><label className="required">{def.numberLabel}</label><input className={cx('form-control', invalid === 'number' && 'invalid')} value={f.number} onChange={e => set('number')(e.target.value)} /></div>
      <div className="form-group"><label className="required">Cơ quan cấp</label><input className={cx('form-control', invalid === 'agency' && 'invalid')} value={f.agency} placeholder={def.agencyHint} onChange={e => set('agency')(e.target.value)} /></div>
      <div className={s.formRow}>
        <div className="form-group"><label className="required">Ngày cấp</label><input type="date" max={today} className={cx('form-control', invalid === 'issued' && 'invalid')} value={f.issued} onChange={e => set('issued')(e.target.value)} /></div>
        {def.hasValidity && <div className="form-group"><label className="required">Hiệu lực đến</label><input type="date" className={cx('form-control', invalid === 'valid' && 'invalid')} value={f.valid} onChange={e => set('valid')(e.target.value)} /></div>}
      </div>
      {def.hasValidity && <p className={s.hint}>Phải còn hiệu lực đến hết ngày giao dự kiến <b>{formatDate(deliveryDate(o.departAt, o.duration))}</b>.</p>}
      <div className="form-group">
        <label className="required">Bản scan giấy đã cấp</label>
        {old && <p className={s.hint}>Đang có: {old.file}. Chọn tệp mới nếu muốn thay.</p>}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className={cx('form-control', invalid === 'file' && 'invalid')} onChange={e => set('file')(e.target.files?.[0]?.name ?? '')} />
      </div>
      <p className={s.hint}><i className="fa-solid fa-eye" /> Manager và khách hàng xem được bản scan này.</p>
    </Modal>
  )
}

export default function TripPapersPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const toast = useToast()
  const { data: order, reload } = useLoad(() => ordersApi.get(id!), [id])
  const [modal, setModal] = useState<ModalKind>(null)
  const [checked, setChecked] = useState(false)
  const [invalid, setInvalid] = useState('')
  const [rep, setRep] = useState({ type: PAPERS_REPORT_TYPES[0], items: [] as string[], note: '' })

  if (!order) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  const o = order
  const st = papersState(o, session!.name)
  if (!st) return <div className="page"><div className="wrap"><div className="alert alert-warning"><i className="fa-solid fa-lock" /><div>Đơn {o.id} không thuộc danh sách giấy tờ bạn phụ trách. <Link to="/specialist/trip-papers" className="text-orange">Về danh sách</Link></div></div></div></div>
  const papers = o.papers!
  const editable = st === 'preparing' || st === 'ready'
  const pr = progressOf(o)
  const originals = itemsOf(o).filter(i => i.kind === 'original')
  const pending = itemsOf(o).filter(i => !i.done)
  const due = handoverDue(o.departAt)

  const save = async (patch: Partial<Papers>, msg: string, type: 'success' | 'error' = 'success', extra: Partial<Order> = {}) => {
    await ordersApi.update(o.id, { papers: { ...papers, ...patch }, ...extra })
    setModal(null)
    toast(msg, type)
    reload()
  }
  const setOriginal = (horse: string, key: DocKey, at: number | null) => ({ originals: { ...papers.originals, [horse]: { ...papers.originals[horse], [key]: at } } })
  const undo = async (horse: string, key: DocKey) => { await ordersApi.update(o.id, { papers: { ...papers, ...setOriginal(horse, key, null) } }); reload() }
  const open = (m: ModalKind) => { setChecked(false); setInvalid(''); setModal(m) }

  const confirmReport = () => {
    if (!rep.items.length) return setInvalid('items')
    if (!rep.note.trim()) return setInvalid('note')
    save({}, `Đã gửi báo cáo ${o.id} cho Manager`, 'success', { papersReport: { at: Date.now(), type: rep.type, items: rep.items, note: rep.note.trim() } })
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Kiểm dịch / <Link to="/specialist/trip-papers">Chuẩn bị giấy tờ chuyến đi</Link> / <span className="text-orange font-semibold">{o.id}</span></div>
        <div className={`page-header ${s.titleRow}`}><h1>Giấy tờ chuyến đi {o.id}</h1><PapersBadge o={o} st={st} /></div>
        <Banner o={o} st={st} />

        <div className={s.layout}>
          <div>
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-landmark" /> Giấy do cơ quan chức năng cấp</h3></div>
              {proceduresFor(!!o.border).map(k => {
                const def = PROCEDURES[k]
                const p = papers.procedures[k]
                const early = procedureExpiresEarly(o, k)
                return (
                  <div key={k} className={cx(s.doc, p && !early && s.docValid, early && s.docInvalid)}>
                    <div className={s.docHead}>
                      <div className={s.docName}>{def.label}</div>
                      <div className={s.docActions}>
                        {!p ? <span className="badge badge-muted">Chưa có</span> : early ? <span className="badge badge-danger">Hết hiệu lực trước ngày giao</span> : <span className="badge badge-success">Đã có bản gốc</span>}
                        {p && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ file: p.file })}><i className="fa-solid fa-file-pdf" /> Bản scan</button>}
                        {editable && <button className={`btn btn-sm ${p ? 'btn-ghost' : 'btn-primary'}`} onClick={() => open({ procedure: k })}>{p ? 'Cập nhật lại' : 'Cập nhật giấy đã cấp'}</button>}
                      </div>
                    </div>
                    {p && <div className={s.fields}>
                      <div><span>{def.numberLabel}</span><b>{p.number}</b></div>
                      <div><span>Cơ quan cấp</span>{p.agency}</div>
                      <div><span>Ngày cấp</span>{formatDate(p.issuedAt)}</div>
                      {def.hasValidity && p.validUntil && <div><span>Hiệu lực đến</span><span className={early ? 'text-red' : ''}>{formatDate(p.validUntil)}</span></div>}
                    </div>}
                    {early && <p className={cx(s.hint, 'text-red')} style={{ marginTop: 8, marginBottom: 0 }}><i className="fa-solid fa-triangle-exclamation" /> Ngày giao dự kiến là {formatDate(deliveryDate(o.departAt, o.duration))}. Xin cấp lại giấy còn hiệu lực đến hết ngày này, hoặc báo cáo Manager.</p>}
                  </div>
                )
              })}
            </div>

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-folder-open" /> Bản gốc giấy tờ của khách</h3><span className="sub-text">Đã nhận {originals.filter(i => i.done).length}/{originals.length} bản gốc</span></div>
              {o.horses.map(h => (
                <div key={h.name} style={{ marginBottom: 12 }}>
                  <div className={s.horseInfo}>{h.name} · {h.breed} · {h.sex} · Microchip <b>{h.chip}</b></div>
                  <div className="table-wrap"><table className="data-table"><tbody>
                    {requiredDocs(!!o.border).map(k => {
                      const at = papers.originals[h.name]?.[k]
                      return (
                        <tr key={k}>
                          <td>{DOC_LABEL[k]}</td>
                          <td><button className="btn btn-ghost btn-sm" onClick={() => setModal({ file: fileOf(h, k) })}><i className="fa-solid fa-file-pdf" /> Bản scan</button></td>
                          <td>{at ? <><span className="badge badge-success">Đã nhận bản gốc</span><div className="sub-text">{formatDateTime(at)}</div></> : <span className="badge badge-muted">Chưa nhận</span>}</td>
                          <td className="text-right nowrap">{editable && (at
                            ? <button className="btn btn-ghost btn-sm" onClick={() => undo(h.name, k)}>Hoàn tác</button>
                            : <button className="btn btn-primary btn-sm" onClick={() => open({ original: [h.name, k] })}>Xác nhận đã nhận</button>)}</td>
                        </tr>
                      )
                    })}
                  </tbody></table></div>
                </div>
              ))}
            </div>
          </div>

          <aside className={s.side}>
            {editable && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-box-archive" /> Bàn giao</h3></div>
                <div className={cx(s.deadline, (Date.now() > due || due - Date.now() <= 24 * HOUR) && s.urgent)}><i className="fa-regular fa-clock" /> Hạn bàn giao: <b>{formatDeadline(due)}</b><div className="small">Khách gửi bản gốc trước {formatDeadline(originalsDue(o.departAt))}</div></div>
                <div className={s.progress}><div style={{ width: `${Math.round(pr.done / pr.total * 100)}%` }} /></div>
                <p className={s.hint}>Đủ {pr.done}/{pr.total} giấy</p>
                <div className={s.actions}>
                  <button className="btn btn-primary" disabled={!pr.ready} onClick={() => open('handover')}><i className="fa-solid fa-handshake" /> Bàn giao cho Điều phối viên</button>
                  <p className={s.hint}>{pr.ready ? `Giao bộ bản gốc cho ${o.coordinator}.` : `Cần đủ ${pr.total} giấy và không giấy nào hết hiệu lực trước ngày giao.`}</p>
                  <button className="btn btn-danger" disabled={pr.ready} onClick={() => { setRep({ type: PAPERS_REPORT_TYPES[0], items: pending.map(i => i.label), note: '' }); open('report') }}><i className="fa-solid fa-flag" /> Báo cáo Manager</button>
                  <p className={s.hint}>{pr.ready ? 'Đã đủ giấy tờ, không cần báo cáo.' : 'Khi khách không gửi bản gốc, bản gốc không khớp, hoặc cơ quan không cấp giấy. Bạn không từ chối đơn.'}</p>
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
              <InfoRow label="Giao dự kiến">{formatDate(deliveryDate(o.departAt, o.duration))}</InfoRow>
              <InfoRow label="Điều phối viên">{o.coordinator}</InfoRow>
              {o.paidAt && <InfoRow label="Thanh toán lúc">{formatDateTime(o.paidAt)}</InfoRow>}
              <InfoRow label="Hạn bàn giao"><DueBadge o={o} st={st} /></InfoRow>
            </div>
          </aside>
        </div>
      </div>

      {modal && typeof modal === 'object' && 'file' in modal && <FilePreview file={modal.file} note="Bản xem trước tài liệu" onClose={() => setModal(null)} />}

      {modal && typeof modal === 'object' && 'original' in modal && (() => {
        const [horseName, k] = modal.original
        const h = o.horses.find(x => x.name === horseName)!
        const confirm = () => checked ? save(setOriginal(horseName, k, Date.now()), `Đã nhận bản gốc ${DOC_LABEL[k]} của ${horseName}`) : setInvalid('match')
        return (
          <Modal title={`Nhận bản gốc · ${horseName}`} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={confirm}><i className="fa-solid fa-check" /> Xác nhận đã nhận</button></>}>
            <p style={{ marginBottom: 8 }}><b>{DOC_LABEL[k]}</b> của ngựa {horseName} (microchip {h.chip}).</p>
            <div className={cx(s.checkBox, invalid === 'match' && s.invalid)}><label className={s.checkLine}><input type="checkbox" checked={checked} onChange={e => { setInvalid(''); setChecked(e.target.checked) }} /> Tôi đã đối chiếu: bản gốc khớp với bản scan đã xác minh (cùng microchip, dấu, chữ ký, ngày cấp)</label></div>
            <p className={s.hint} style={{ marginTop: 8 }}><i className="fa-solid fa-circle-info" /> Nếu bản gốc không khớp bản scan, không xác nhận. Hãy dùng "Báo cáo Manager".</p>
          </Modal>
        )
      })()}

      {modal && typeof modal === 'object' && 'procedure' in modal && (
        <ProcedureForm o={o} k={modal.procedure} onCancel={() => setModal(null)} onSave={(p, early) => save(
          { procedures: { ...papers.procedures, [modal.procedure]: p } },
          early ? 'Đã lưu, nhưng giấy hết hiệu lực trước ngày giao dự kiến' : `Đã cập nhật ${PROCEDURES[modal.procedure].label}`, early ? 'error' : 'success',
        )} />
      )}

      {modal === 'handover' && (
        <Modal wide title={`Bàn giao giấy tờ ${o.id}`} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={() => checked ? save({ handedAt: Date.now() }, `Đã bàn giao giấy tờ ${o.id} cho ${o.coordinator}`) : setInvalid('handover')}><i className="fa-solid fa-handshake" /> Xác nhận bàn giao</button></>}>
          <p style={{ marginBottom: 8 }}>Bộ bản gốc gồm {pr.total} giấy:</p>
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Giấy tờ</th><th>Ghi chú</th></tr></thead>
            <tbody>
              {proceduresFor(!!o.border).map(k => <tr key={k}><td>{PROCEDURES[k].label}</td><td>{PROCEDURES[k].numberLabel} {papers.procedures[k]?.number}</td></tr>)}
              {o.horses.map(h => <tr key={h.name}><td>Giấy tờ của {h.name}</td><td>{requiredDocs(!!o.border).length} giấy · microchip {h.chip}</td></tr>)}
            </tbody>
          </table></div>
          <div className={cx(s.checkBox, invalid === 'handover' && s.invalid)} style={{ marginTop: 10 }}><label className={s.checkLine}><input type="checkbox" checked={checked} onChange={e => { setInvalid(''); setChecked(e.target.checked) }} /> Tôi đã giao đủ {pr.total} bản gốc cho Điều phối viên <b>{o.coordinator}</b>, hai bên đã kiểm đếm</label></div>
          <p className={s.hint} style={{ marginTop: 8 }}><i className="fa-solid fa-circle-info" /> Điều phối viên sẽ chia giấy tờ theo xe: mỗi tài xế nhận giấy của các con ngựa trên xe mình{o.border ? ' và bản in tờ khai hải quan' : ''}.</p>
        </Modal>
      )}

      {modal === 'report' && (
        <Modal wide title={`Báo cáo Manager · ${o.id}`} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-danger" onClick={confirmReport}><i className="fa-solid fa-flag" /> Gửi báo cáo</button></>}>
          <div className="form-group"><label className="required">Vấn đề</label><select className="form-control" value={rep.type} onChange={e => setRep({ ...rep, type: e.target.value })}>{PAPERS_REPORT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group">
            <label className="required">Giấy liên quan</label>
            <div className={cx(s.checkBox, invalid === 'items' && s.invalid)}>
              {pending.map(i => <label key={i.label} className={s.checkLine}><input type="checkbox" checked={rep.items.includes(i.label)} onChange={e => { setInvalid(''); setRep({ ...rep, items: e.target.checked ? [...rep.items, i.label] : rep.items.filter(x => x !== i.label) }) }} /> {i.label}</label>)}
            </div>
          </div>
          <div className="form-group"><label className="required">Ghi chú cho Manager</label><textarea rows={3} className={cx('form-control', invalid === 'note' && 'invalid')} value={rep.note} onChange={e => { setInvalid(''); setRep({ ...rep, note: e.target.value }) }} placeholder="Đã làm gì, còn vướng gì, dự kiến khi nào xong..." /></div>
        </Modal>
      )}
    </div>
  )
}
