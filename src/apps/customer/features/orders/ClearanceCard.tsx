// Khách nộp giấy tờ pháp lý sau khi đặt cọc (Flow 2, PRD mục 3.4): dùng dữ liệu Carrier Info Sheet để xin giấy, rồi tải lên trước 18:00 D-1.
import { useState } from 'react'
import { CLEARANCE_DOC, type ClearanceDocType, type ClearanceOption } from '@shared/config/booking-rules'
import { HOUR } from '@shared/config/business-rules'
import { blankClearance, docsDueAt, requiredClearanceDocs } from '@shared/lib/booking'
import { formatDate, formatDateTime, timeLeftText } from '@shared/lib/format'
import { customerBookingsApi, type CustomerBookingView, type TeamInfo } from '@shared/services/bookings'
import { FileField } from '@shared/ui/FileField'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { useNow } from '@shared/ui/useNow'
import s from './OrderDetail.module.css'

const EDITABLE: CustomerBookingView['status'][] = ['awaiting_clearance_docs', 'pending_resubmission', 'documentation_delayed']

function PoaTemplate({ b, team, onClose }: { b: CustomerBookingView; team: TeamInfo; onClose: () => void }) {
  return (
    <Modal wide onClose={onClose} title="Mẫu Giấy ủy quyền áp tải (PoA)" subtitle="Điền sẵn thông tin xe và nhân sự. In ra, ký tên, đóng mộc đỏ rồi tải lên."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-primary" onClick={() => window.print()}><i className="fa-solid fa-print" /> In mẫu</button></>}>
      <div className={s.poa}>
        <h3>GIẤY ỦY QUYỀN ÁP TẢI VÀ XUẤT TRÌNH CHỨNG TỪ<br /><small>LETTER OF AUTHORIZATION</small></h3>
        <p>Tôi / Chúng tôi, <b>{b.consignor.name}</b> (CCCD/MST/Hộ chiếu: {b.consignor.idNumber}), địa chỉ {b.consignor.address}, là chủ sở hữu số ngựa trong đơn <b>{b.id}</b>, ủy quyền cho:</p>
        <p className={s.poaEn}>I / We, <b>{b.consignor.name}</b> (ID/Tax/Passport: {b.consignor.idNumber}), address {b.consignor.address}, the owner of the horses under order <b>{b.id}</b>, hereby authorize:</p>
        <ul>
          <li>Tài xế / Driver: <b>{team.driver.name}</b>, CCCD/Hộ chiếu {team.driver.idNumber}, GPLX {team.driver.license}</li>
          <li>Người áp tải / Escort: <b>{team.escort.name}</b>, CCCD/Hộ chiếu {team.escort.idNumber}</li>
        </ul>
        <p>Điều khiển phương tiện biển số <b>{team.vehicle.plate}</b> (số khung {team.vehicle.vin}) vận chuyển ngựa ngày {formatDate(b.departAt)}{b.gate ? `, qua cửa khẩu ${b.gate}` : ''}, thay mặt chủ hàng giải trình và làm việc với cơ quan Hải quan, Thú y, Biên phòng.</p>
        <p className={s.poaEn}>To operate vehicle plate <b>{team.vehicle.plate}</b> (VIN {team.vehicle.vin}) transporting the horses on {formatDate(b.departAt)}{b.gate ? `, via border gate ${b.gate}` : ''}, and to represent the owner before Customs, Veterinary and Border authorities.</p>
        <div className={s.poaSign}><div>Chủ ngựa / Owner<br /><i>(ký, đóng mộc đỏ)</i></div><div>Người được ủy quyền / Authorized person</div></div>
      </div>
    </Modal>
  )
}

export function ClearanceCard({ b, team, owner, onDone }: { b: CustomerBookingView; team?: TeamInfo; owner: string; onDone: () => void }) {
  const toast = useToast()
  const now = useNow()
  const clearance = b.clearance ?? blankClearance()
  const editable = EDITABLE.includes(b.status)
  const [options, setOptions] = useState(clearance.options)
  const [files, setFiles] = useState<Partial<Record<ClearanceDocType, string>>>(() => Object.fromEntries(Object.entries(clearance.docs).map(([k, v]) => [k, v.fileName])))
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [poa, setPoa] = useState(false)

  const required = requiredClearanceDocs(b.type, options)
  const missing = required.filter(t => !files[t])
  const due = docsDueAt(b.departAt)
  const left = due - now
  const rejected = clearance.rejection?.docs ?? []
  const optionDocs = (Object.keys(CLEARANCE_DOC) as ClearanceDocType[]).filter(t => CLEARANCE_DOC[t].option && b.type === 'international')

  const send = async () => {
    setSubmitted(true)
    if (missing.length || busy) return
    setBusy(true)
    try { await customerBookingsApi.submitClearance(owner, b.id, { options, docs: Object.fromEntries(required.map(t => [t, files[t]])) }); toast('Đã gửi giấy tờ cho Kiểm dịch viên'); onDone() }
    catch (e) { toast(e instanceof Error ? e.message : 'Không gửi được', 'error'); setBusy(false) }
  }

  const banner = editable && b.status !== 'documentation_delayed'
    ? left < 2 * HOUR ? ['danger', `Chỉ còn ${timeLeftText(due, now)} đến hạn nộp (${formatDateTime(due)}).`]
      : left < 6 * HOUR ? ['warning', `Còn ${timeLeftText(due, now)} đến hạn nộp (${formatDateTime(due)}).`] : null
    : null

  return (
    <div className="card" id="giay-to">
      <div className="card-header"><h3><i className="fa-solid fa-file-circle-plus" /> Giấy tờ pháp lý</h3><span className="sub-text">Hạn nộp {formatDateTime(due)}{editable && left > 0 ? ` · còn ${timeLeftText(due, now)}` : ''}</span></div>

      {banner && <div className={`alert alert-${banner[0]}`} style={{ marginBottom: 14 }}><i className="fa-solid fa-bell" /><div>{banner[1]}</div></div>}
      {b.status === 'pending_resubmission' && clearance.rejection && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}><i className="fa-solid fa-file-circle-exclamation" /><div><b>Kiểm dịch viên yêu cầu nộp lại:</b> {clearance.rejection.reasons.join(', ')}. {clearance.rejection.note}<div className="sub-text">Các giấy cần nộp lại: {rejected.map(t => CLEARANCE_DOC[t].short).join(', ')}</div></div></div>
      )}
      {b.status === 'documentation_delayed' && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}><i className="fa-solid fa-triangle-exclamation" /><div><b>Đã quá hạn.</b> Bạn còn đến 06:00 ngày khởi hành để nộp đủ hồ sơ. Thời gian xe chờ do thiếu hồ sơ tính phí lưu xe.</div></div>
      )}
      {!editable && b.status === 'documents_submitted' && <div className="alert alert-info" style={{ marginBottom: 14 }}><i className="fa-solid fa-hourglass-half" /><div>Đã nộp {clearance.submittedAt && formatDateTime(clearance.submittedAt)}. Kiểm dịch viên đang đối chiếu.</div></div>}
      {!editable && ['legal_docs_approved', 'dispatch_approved'].includes(b.status) && <div className="alert alert-success" style={{ marginBottom: 14 }}><i className="fa-solid fa-stamp" /><div>Hồ sơ pháp lý đã được duyệt{clearance.approvedAt ? ` lúc ${formatDateTime(clearance.approvedAt)}` : ''}. Ngày khởi hành, hãy giao bản gốc cho tài xế tại điểm đón.</div></div>}

      {editable && b.type === 'international' && (
        <fieldset className={s.options}>
          <legend>Chuyến này có không?</legend>
          {optionDocs.map(t => {
            const opt = CLEARANCE_DOC[t].option as ClearanceOption
            return <label key={t}><input type="checkbox" checked={options[opt]} onChange={e => { const on = e.target.checked; setOptions(o => ({ ...o, [opt]: on })) }} /> {CLEARANCE_DOC[t].optionLabel}</label>
          })}
        </fieldset>
      )}

      <div className={s.docList}>
        {required.map(t => {
          const meta = CLEARANCE_DOC[t]
          const sent = clearance.docs[t]
          const needFix = rejected.includes(t)
          return (
            <div key={t} className={`${s.docRow} ${needFix ? s.docFix : ''}`}>
              {editable ? (
                <FileField label={meta.label} hint={meta.hint} required fileName={files[t]} invalid={submitted && !files[t]} onChange={f => setFiles(x => ({ ...x, [t]: f }))} />
              ) : (
                <div className={s.docRead}><i className={`fa-solid ${b.status === 'documents_submitted' ? 'fa-file-circle-check' : 'fa-circle-check'}`} aria-hidden="true" /><div><b>{meta.label}</b><div className="sub-text">{sent?.fileName ?? '—'}{sent && sent.version > 1 ? ` · lần nộp ${sent.version}` : ''}</div></div></div>
              )}
              {needFix && editable && <span className="badge badge-danger"><i className="fa-solid fa-rotate-left" /> Cần nộp lại</span>}
            </div>
          )
        })}
      </div>
      {submitted && missing.length > 0 && <div className="form-error" role="alert">Còn thiếu: {missing.map(t => CLEARANCE_DOC[t].short).join(', ')}.</div>}

      {editable && (
        <div className={s.docActions}>
          {team && <button type="button" className="btn btn-outline" onClick={() => setPoa(true)}><i className="fa-solid fa-file-signature" /> Xem mẫu PoA điền sẵn</button>}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={send}><i className="fa-solid fa-paper-plane" /> {busy ? 'Đang gửi…' : b.status === 'pending_resubmission' ? 'Nộp lại giấy tờ' : 'Gửi giấy tờ'}</button>
        </div>
      )}
      {poa && team && <PoaTemplate b={b} team={team} onClose={() => setPoa(false)} />}
    </div>
  )
}
