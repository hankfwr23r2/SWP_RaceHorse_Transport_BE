// Khách chọn phương án xử lý hồ sơ có vấn đề. Chuyển từ choicePanel/readChoice/reviewChoice/applyChoice (don_cua_toi.js).
import { useState } from 'react'
import { HOTLINE, MIN_LEAD_DAYS } from '@shared/config/business-rules'
import { CUSTOMER_OPTION_LABEL, type OptionKey } from '@shared/config/documents'
import { dayKey, today } from '@shared/lib/dates'
import { choiceDeadline } from '@shared/lib/deadlines'
import { formatDate, formatDateTime, formatVND, timeLeftText } from '@shared/lib/format'
import { DAY } from '@shared/config/business-rules'
import { horseLabel, orderTotal, type Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import s from './Orders.module.css'

type Picked = { key: string; data: { name?: string; chip?: string; files?: number; date?: string; reason?: string } }

const minDepartDate = () => dayKey(new Date(today().getTime() + MIN_LEAD_DAYS * DAY))

export function ChoicePanel({ order, onApply }: { order: Order; onApply: (patch: Partial<Order>, message: string) => void }) {
  const offer = order.offer!
  const [key, setKey] = useState('')
  const [fields, setFields] = useState({ name: '', chip: '', files: 0, date: '', reason: '', extraFiles: 0 })
  const [invalid, setInvalid] = useState('')
  const [pending, setPending] = useState<Picked | null>(null)

  const custom = (k: string) => (offer.custom ?? []).find(c => `custom-${c.code}` === k)
  const keys = [...offer.options.filter(k => k !== 'cancel'), ...(offer.custom ?? []).map(c => `custom-${c.code}`), 'cancel']
  const labelOf = (k: string) => CUSTOMER_OPTION_LABEL[k as OptionKey] ?? custom(k)!.label
  const remaining = order.horses.filter(h => !offer.affected.includes(h.name))
  const requoteTotal = orderTotal({ services: offer.requoteServices })
  const affected = offer.affected.join(', ')
  const depart = formatDate(order.departAt)
  const minDate = minDepartDate()

  const impact = (k: string): [React.ReactNode, React.ReactNode, string] => {
    switch (k) {
      case 'remove_horse': return [`Giữ nguyên ${depart}`, <>{formatVND(requoteTotal)}<div className="sub-text">giảm {formatVND(orderTotal(order) - requoteTotal)}</div></>, 'Không']
      case 'replace_horse': return [<>Giữ nguyên {depart}<div className="sub-text">nếu kịp xác minh ngựa mới</div></>, 'Không đổi', 'Tên, microchip, giấy tờ ngựa mới']
      case 'postpone': return [`Ngày mới, từ ${formatDate(new Date(minDate).getTime())}`, 'Không đổi', 'Ngày mới; kết quả xét nghiệm sau điều trị']
      case 'recheck': return [`Giữ nguyên ${depart}`, 'Không phát sinh', 'Lý do; tài liệu (nếu có)']
      case 'cancel': return ['Không thực hiện', 'Miễn phí', 'Không']
      default: return ['Xem mô tả', 'Xem mô tả', 'Xem mô tả']
    }
  }

  const set = (k: keyof typeof fields) => (v: string | number) => { setInvalid(''); setFields({ ...fields, [k]: v }) }
  const bad = (name: string) => (invalid === name ? 'invalid' : '')

  const detail = (k: string) => {
    switch (k) {
      case 'remove_horse': return (
        <>
          <p>Đơn tiếp tục thẩm định với: <strong>{remaining.map(horseLabel).join(', ')}</strong>. Bảng giá mới:</p>
          <table className={s.requote}><tbody>
            {offer.requoteServices.map(svc => <tr key={svc[0]}><td>{svc[0]}</td><td className="text-right nowrap">{formatVND(svc[2])}</td></tr>)}
            <tr className={s.requoteTotal}><td>Tổng mới</td><td className="text-right nowrap">{formatVND(requoteTotal)}</td></tr>
          </tbody></table>
        </>)
      case 'replace_horse': return (
        <>
          <p>Khai ngựa thay cho {affected}. Kiểm dịch viên sẽ xác minh giấy tờ của ngựa mới trước khi duyệt đơn.</p>
          <div className={s.optionFields}>
            <div><label className="small font-semibold">Tên ngựa mới *</label><input className={`form-control ${bad('name')}`} value={fields.name} onChange={e => set('name')(e.target.value)} /></div>
            <div><label className="small font-semibold">Số microchip *</label><input className={`form-control ${bad('chip')}`} value={fields.chip} onChange={e => set('chip')(e.target.value)} /></div>
            <div className={s.full}><label className="small font-semibold">Giấy tờ của ngựa mới *</label><input type="file" multiple className={`form-control ${bad('files')}`} onChange={e => set('files')(e.target.files?.length ?? 0)} /></div>
          </div>
        </>)
      case 'postpone': return (
        <>
          <p>Điều trị cho {affected}, sau đó nộp kết quả xét nghiệm lại để kiểm dịch viên xác minh.</p>
          <div className={s.optionFields}>
            <div><label className="small font-semibold">Ngày khởi hành mới * (từ {formatDate(new Date(minDate).getTime())})</label><input type="date" min={minDate} className={`form-control ${bad('date')}`} value={fields.date} onChange={e => set('date')(e.target.value)} /></div>
          </div>
        </>)
      case 'recheck': return (
        <>
          <p>Một kiểm dịch viên khác sẽ xem lại toàn bộ hồ sơ từ đầu. Mỗi đơn chỉ được kiểm tra lại một lần.</p>
          <div className={s.optionFields}>
            <div className={s.full}><label className="small font-semibold">Lý do bạn cho rằng kết luận chưa đúng *</label><textarea rows={2} className={`form-control ${bad('reason')}`} value={fields.reason} onChange={e => set('reason')(e.target.value)} /></div>
            <div className={s.full}><label className="small font-semibold">Tài liệu bổ sung (không bắt buộc)</label><input type="file" multiple className="form-control" onChange={e => set('extraFiles')(e.target.files?.length ?? 0)} /></div>
          </div>
        </>)
      case 'cancel': return <p>Đơn chuyển sang Đã hủy. Bạn chưa thanh toán nên không phát sinh chi phí.</p>
      default: return <><p>Phương án do Quản lý đề xuất riêng cho đơn này:</p><p className="font-semibold">{custom(k)!.detail}</p></>
    }
  }

  // Kiểm tra dữ liệu của phương án đã chọn
  const review = () => {
    if (!key) return setInvalid('table')
    if (key === 'replace_horse') {
      if (!fields.name.trim()) return setInvalid('name')
      if (!fields.chip.trim()) return setInvalid('chip')
      if (!fields.files) return setInvalid('files')
      return setPending({ key, data: { name: fields.name.trim(), chip: fields.chip.trim(), files: fields.files } })
    }
    if (key === 'postpone') {
      if (!fields.date || fields.date < minDate) return setInvalid('date')
      return setPending({ key, data: { date: fields.date } })
    }
    if (key === 'recheck') {
      if (!fields.reason.trim()) return setInvalid('reason')
      return setPending({ key, data: { reason: fields.reason.trim(), files: fields.extraFiles } })
    }
    setPending({ key, data: {} })
  }

  const effects = (p: Picked) => ({
    remove_horse: `Bỏ ${affected} khỏi đơn. Đơn tiếp tục thẩm định với ${remaining.map(horseLabel).join(', ')}, giá mới ${formatVND(requoteTotal)}.`,
    replace_horse: `Thay ${affected} bằng ${p.data.name} (microchip ${p.data.chip}), kèm ${p.data.files} tệp giấy tờ. Kiểm dịch viên sẽ xác minh ngựa mới.`,
    postpone: `Dời ngày khởi hành từ ${depart} sang ${p.data.date ? formatDate(new Date(p.data.date).getTime()) : ''}. Bạn cần nộp kết quả xét nghiệm lại sau khi điều trị.`,
    recheck: 'Một kiểm dịch viên khác sẽ xem lại hồ sơ từ đầu. Nếu vấn đề vẫn còn, bạn sẽ nhận lại các phương án còn lại (trừ kiểm tra lại).',
    cancel: 'Đơn chuyển sang Đã hủy, không phát sinh chi phí. Không thể khôi phục; muốn vận chuyển lại cần đặt đơn mới.',
  } as Record<string, string>)[p.key] ?? `${custom(p.key)!.detail} Quản lý sẽ thực hiện theo mô tả này và cập nhật đơn.`

  const apply = () => {
    const { key: k, data } = pending!
    let patch: Partial<Order>
    if (k === 'remove_horse') patch = { horses: remaining, services: offer.requoteServices, note: `Đã bỏ ${affected} khỏi đơn, giá đã cập nhật.`, status: 'processing' }
    else if (k === 'replace_horse') patch = { horses: [...remaining, { name: data.name!, breed: 'khai mới', sex: `microchip ${data.chip}` }], note: `Đã thay ${affected} bằng ${data.name}. Kiểm dịch viên đang xác minh giấy tờ ngựa mới.`, status: 'processing' }
    else if (k === 'postpone') patch = { departAt: new Date(data.date!).setHours(0, 0, 0, 0), note: `Đã dời ngày khởi hành. Vui lòng nộp kết quả xét nghiệm lại của ${affected} sau khi điều trị.`, status: 'processing' }
    else if (k === 'recheck') patch = { status: 'rechecking', recheckAt: Date.now() }
    else if (custom(k)) patch = { note: `Bạn đã chọn phương án "${custom(k)!.label}". Quản lý đang cập nhật đơn theo phương án này.`, status: 'processing' }
    else patch = { status: 'cancelled', reason: `Bạn đã hủy đơn lúc ${formatDateTime(Date.now())} theo phương án xử lý hồ sơ. Không phát sinh chi phí.` }
    setPending(null)
    onApply({ ...patch, offer: undefined }, `Đã ghi nhận phản hồi cho đơn ${order.id}`)
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3><i className="fa-solid fa-file-circle-exclamation" /> Phản hồi sự cố hồ sơ</h3>
        <span className="sub-text">Gửi lúc {formatDateTime(offer.sentAt)}</span>
      </div>
      <div className={s.issue}>
        <div><span className={s.issueLabel}>Ngựa bị ảnh hưởng</span><strong>{affected}</strong></div>
        <div><span className={s.issueLabel}>Hạn phản hồi</span><strong>{formatDateTime(choiceDeadline(offer.sentAt))}</strong><div className="sub-text">còn {timeLeftText(choiceDeadline(offer.sentAt))}</div></div>
        <div className={s.issueFull}><span className={s.issueLabel}>Kết luận kiểm dịch</span>{offer.issue}</div>
      </div>
      <h4 style={{ marginBottom: 8 }}>Phương án xử lý</h4>
      <div className={`table-wrap ${invalid === 'table' ? s.invalidTable : ''}`}>
        <table className="data-table">
          <thead><tr><th>Phương án</th><th>Ngày khởi hành</th><th>Chi phí</th><th>Bạn cần cung cấp</th></tr></thead>
          <tbody>
            {keys.map(k => {
              const [d, cost, need] = impact(k)
              return [
                <tr key={k} className={`${s.optionRow} ${k === key ? s.selected : ''}`} onClick={() => { setKey(k); setInvalid('') }}>
                  <td><label className={s.optionName}><input type="radio" name="opt" checked={k === key} onChange={() => setKey(k)} /> {labelOf(k)}</label></td>
                  <td>{d}</td><td className="nowrap">{cost}</td><td>{need}</td>
                </tr>,
                k === key && <tr key={`${k}-extra`} className={s.optionExtra}><td colSpan={4}>{detail(k)}</td></tr>,
              ]
            })}
          </tbody>
        </table>
      </div>
      {invalid === 'table' && <p className="form-error">Vui lòng chọn một phương án</p>}
      <div className={s.choiceActions}>
        <span className="sub-text">Sau khi gửi, bạn không thể đổi phương án. Cần tư vấn, gọi <strong>{HOTLINE}</strong>.</span>
        <button className="btn btn-primary" onClick={review}>Gửi phản hồi</button>
      </div>

      {pending && (
        <Modal title={`Xác nhận phản hồi · ${order.id}`} onClose={() => setPending(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setPending(null)}>Xem lại</button><button className={`btn ${pending.key === 'cancel' ? 'btn-danger' : 'btn-primary'}`} onClick={apply}>Xác nhận</button></>}>
          <p>Phương án: <strong>{labelOf(pending.key)}</strong></p>
          <ul className={s.effects}><li><i className="fa-solid fa-circle-info" style={{ color: 'var(--blue)' }} /> <span>{effects(pending)}</span></li></ul>
        </Modal>
      )}
    </div>
  )
}
