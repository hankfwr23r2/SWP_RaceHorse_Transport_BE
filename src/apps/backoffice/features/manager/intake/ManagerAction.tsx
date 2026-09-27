// Việc chuyển lên Manager: chọn phương án gửi khách · giao kiểm tra lại · từ chối khi khách quá hạn.
// Chuyển từ renderManagerAction(), sendOffer(), assignRecheck(), rejectExpired() (manager_tiep_nhan.js).
import { useState } from 'react'
import { CHOICE_HOURS, HOUR } from '@shared/config/business-rules'
import { OPTIONS, type OptionKey } from '@shared/config/documents'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { requoteWithout } from '@shared/lib/pricing'
import type { StaffMember } from '@shared/services/mock/staff'
import { suggestStaff } from '@shared/services/staff'
import { orderTotal, type InspectionReport, type Order } from '@shared/types/order'
import { cx, partStyles as s } from '../../../shared/parts'

type Custom = { code: string; label: string; detail: string }
const customCode = (i: number) => String.fromCharCode('F'.charCodeAt(0) + i) // phương án tự thêm đánh mã sau E

export const optionText = (keys: OptionKey[], custom: Custom[] = []) =>
  [...keys.map(k => `${OPTIONS[k].code}. ${OPTIONS[k].label}`), ...custom.map(c => `${c.code}. ${c.label}`)].join(' · ')

// Lý do phương án KHÔNG áp dụng được (rỗng = áp dụng được)
function whyNot(key: OptionKey, o: Order): string {
  const r = o.pending!.report
  if (key === 'remove_horse') return o.horses.length > r.horses.length ? '' : 'Đơn không còn ngựa nào khác ngoài ngựa có vấn đề'
  if (key === 'postpone') return r.curable ? '' : 'Chỉ áp dụng khi bệnh chữa được'
  if (key === 'recheck') return o.rechecked ? 'Đơn đã được kiểm tra lại 1 lần' : ''
  return ''
}

export function ReportBanner({ r }: { r: InspectionReport }) {
  return (
    <div className={`alert alert-warning ${s.banner}`}><i className="fa-solid fa-user-doctor" /><div>
      <b>Báo cáo của kiểm dịch viên {r.inspector}</b> — {r.type}{r.disease && <> (<b>{r.disease}</b>, {r.curable ? 'chữa được' : 'không chữa được'})</>}<br />
      Ngựa bị ảnh hưởng: <b>{r.horses.join(', ')}</b>. {r.note}<br />
      {r.evidence && <>Căn cứ: {r.evidence.join('; ')}</>}
    </div></div>
  )
}

export function ManagerAction({ order: o, staff, orders, onSave }: { order: Order; staff: StaffMember[]; orders: Order[]; onSave: (patch: Partial<Order>, message: string, type?: 'success' | 'error') => void }) {
  const p = o.pending!
  const r = p.report
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries((Object.keys(OPTIONS) as OptionKey[]).map(k => [k, !whyNot(k, o)])))
  const [custom, setCustom] = useState<Custom[]>([])
  const [message, setMessage] = useState(p.kind === 'issue'
    ? `Hồ sơ của ngựa ${r.horses.join(', ')} có vấn đề không thể khắc phục bằng bổ sung giấy tờ: ${r.type.toLowerCase()}${r.disease ? ` (${r.disease})` : ''}. Vui lòng chọn một trong các phương án dưới đây trong ${CHOICE_HOURS} giờ.`
    : '')
  const [invalid, setInvalid] = useState<string>('')
  const requote = requoteWithout(o.services, o.horses.length, o.horses.length - r.horses.length)
  const candidates = suggestStaff(staff, 'inspector', orders, [r.inspector])
  const [reviewer, setReviewer] = useState(candidates[0]?.name ?? '')

  const sendOffer = () => {
    const bad = custom.findIndex(c => !c.label.trim() || !c.detail.trim())
    if (bad >= 0) return setInvalid(`custom-${bad}`)
    if (!message.trim()) return setInvalid('message')
    const options = (Object.keys(OPTIONS) as OptionKey[]).filter(k => checked[k] || k === 'cancel')
    const customs = custom.map((c, i) => ({ code: customCode(i), label: c.label.trim(), detail: c.detail.trim() }))
    onSave({
      status: 'choose_option',
      offer: { issue: message.trim(), affected: r.horses, options, custom: customs, sentAt: Date.now(), requoteServices: requote },
      report: r, pending: undefined,
    }, `Đã gửi ${options.length + customs.length} phương án cho khách của đơn ${o.id}`)
  }

  // Người kiểm tra lại xác minh từ đầu: bỏ kết quả xác minh cũ, giữ kết luận cũ và ý kiến của khách để đối chiếu
  const assignRecheck = () => onSave({
    status: 'rechecking', stage: 'inspecting', inspector: reviewer, rechecked: true, waitingCustomer: false, pending: undefined,
    report: r, recheckRequest: { customerReason: p.customerReason ?? '', customerFiles: p.customerFiles ?? [] }, verification: undefined,
    task: { step: 'inspector', assigneeId: candidates.find(c => c.name === reviewer)!.id, assignedAt: Date.now(), pausedWorkingDays: 0, history: [] },
  },
    `Đã giao ${o.id} cho ${reviewer} kiểm tra lại`)

  const rejectExpired = () => {
    if (!message.trim()) return setInvalid('message')
    onSave({ status: 'rejected', rejectedStep: 1, rejectedAt: Date.now(), rejectType: `Khách không chọn phương án trong ${CHOICE_HOURS} giờ`, reason: message.trim(), report: r, pending: undefined, offer: undefined },
      `Đã từ chối đơn ${o.id}`, 'error')
  }

  return (
    <>
      <ReportBanner r={r} />
      {p.kind === 'issue' && (
        <div className={s.actionBox}>
          <div className="font-semibold required">Phương án gửi khách chọn</div>
          {(Object.keys(OPTIONS) as OptionKey[]).map(k => {
            const why = whyNot(k, o)
            const mandatory = k === 'cancel'
            return (
              <label key={k} className={cx(s.optionLine, !!why && s.optionOff)}>
                <input type="checkbox" disabled={!!why || mandatory} checked={mandatory || (!why && checked[k])} onChange={e => setChecked({ ...checked, [k]: e.target.checked })} />
                <span><b>{OPTIONS[k].code}.</b> {OPTIONS[k].label}{mandatory && <span className="text-muted"> (luôn có)</span>}{why && <div className={s.optionWhy}><i className="fa-solid fa-lock" /> {why}</div>}
                  {k === 'remove_horse' && !why && <div className="sub-text">Giá mới gửi khách: {formatVND(orderTotal({ services: requote }))} (cũ {formatVND(orderTotal(o))}). Giữ nguyên cước xe, phí tính theo ngựa chia theo số ngựa còn lại.</div>}</span>
              </label>
            )
          })}
          {custom.map((c, i) => (
            <div key={i} className={s.custom}>
              <div className={s.customHead}><span>{customCode(i)}. Phương án khác</span><button type="button" className={s.iconBtn} aria-label="Xóa phương án" onClick={() => setCustom(custom.filter((_, k) => k !== i))}><i className="fa-solid fa-xmark" /></button></div>
              <input className={cx('form-control', invalid === `custom-${i}` && !c.label.trim() && 'invalid')} placeholder="Tên phương án *" value={c.label} onChange={e => { setInvalid(''); setCustom(custom.map((x, k) => k === i ? { ...x, label: e.target.value } : x)) }} />
              <textarea rows={2} className={cx('form-control', invalid === `custom-${i}` && !c.detail.trim() && 'invalid')} placeholder="Mô tả cho khách: điều gì xảy ra với đơn, ngày khởi hành, chi phí, khách cần cung cấp gì *" value={c.detail} onChange={e => { setInvalid(''); setCustom(custom.map((x, k) => k === i ? { ...x, detail: e.target.value } : x)) }} />
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCustom([...custom, { code: '', label: '', detail: '' }])}><i className="fa-solid fa-plus" /> Thêm phương án khác</button>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="required">Nội dung gửi khách</label>
            <textarea rows={3} className={cx('form-control', invalid === 'message' && 'invalid')} value={message} onChange={e => { setInvalid(''); setMessage(e.target.value) }} />
          </div>
          <p className={s.hint}><i className="fa-solid fa-circle-info" /> Khách có {CHOICE_HOURS} giờ để chọn. Quá hạn không chọn, đơn chuyển lại đây để Manager quyết định từ chối.</p>
          <div className="text-right"><button className="btn btn-primary" onClick={sendOffer}><i className="fa-solid fa-paper-plane" /> Gửi phương án cho khách</button></div>
        </div>
      )}

      {p.kind === 'recheck' && (
        <>
          <div className={`alert alert-info ${s.banner}`}><i className="fa-solid fa-comment-dots" /><div>
            <b>Khách chọn phương án D – Kiểm tra lại</b> lúc {formatDateTime(p.at)}: "{p.customerReason}"<br />
            {p.customerFiles?.map(f => <span key={f}><i className="fa-solid fa-file-pdf" /> {f} </span>)}
          </div></div>
          <div className={s.actionBox}>
            {candidates.length ? <>
              <div className="form-group">
                <label className="required">Giao kiểm tra lại cho</label>
                <select className="form-control" value={reviewer} onChange={e => setReviewer(e.target.value)}>
                  {candidates.map((c, i) => <option key={c.id} value={c.name}>{c.name} — {c.load} đơn đang xử lý{i === 0 ? ' (gợi ý)' : ''}</option>)}
                </select>
              </div>
              <p className={s.hint}><i className="fa-solid fa-circle-info" /> Chỉ hiện kiểm dịch viên đang làm việc, khác người đã báo cáo ({r.inspector}). Người kiểm tra lại xác minh từ đầu. Mỗi đơn chỉ được kiểm tra lại 1 lần.</p>
              <div className="text-right"><button className="btn btn-primary" onClick={assignRecheck}><i className="fa-solid fa-magnifying-glass" /> Giao kiểm tra lại</button></div>
            </> : <div className="alert alert-danger"><i className="fa-solid fa-user-slash" /><div>Không còn kiểm dịch viên nào khác {r.inspector} đang làm việc. Xem trang Nhân sự.</div></div>}
          </div>
        </>
      )}

      {p.kind === 'expired' && o.offer && (
        <>
          <div className={`alert alert-danger ${s.banner}`}><i className="fa-solid fa-clock" /><div>
            Đã gửi phương án lúc {formatDateTime(o.offer.sentAt)}: {optionText(o.offer.options, o.offer.custom)}.<br />
            <b>Khách không chọn phương án</b> trước hạn {formatDateTime(o.offer.sentAt + CHOICE_HOURS * HOUR)}.
          </div></div>
          <div className={cx(s.actionBox, s.actionDanger)}>
            <div className="font-semibold">Quyết định từ chối đơn</div>
            <p className={s.hint} style={{ marginTop: 0 }}>Lý do: <b>Khách không chọn phương án trong {CHOICE_HOURS} giờ</b>. Khách chưa thanh toán nên không phát sinh hoàn tiền.</p>
            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="required">Ghi chú gửi khách</label>
              <textarea rows={2} className={cx('form-control', invalid === 'message' && 'invalid')} placeholder="Nhập nội dung gửi khách..." value={message} onChange={e => { setInvalid(''); setMessage(e.target.value) }} />
            </div>
            <div className="text-right"><button className="btn btn-danger" onClick={rejectExpired}><i className="fa-solid fa-ban" /> Từ chối đơn</button></div>
          </div>
        </>
      )}
    </>
  )
}
