import { DEPOSIT_RATE } from '../config/booking-rules'
import { formatDateTime, formatVND } from '../lib/format'
import type { Adjustment, QuoteLine } from '../types/booking'
import s from './QuoteSheet.module.css'

interface QuoteSheetProps {
  lines: QuoteLine[]
  adjustments?: Adjustment[]
  subtotal: number
  total: number
  deposit: number
  demurragePerHour: number
  expiresAt?: number
}

// Phiếu báo giá (PRD mục 2.5): cố định, chi phí thực tế trả sau, phí phát sinh dự phòng, tiền cọc
export function QuoteSheet({ lines, adjustments = [], subtotal, total, deposit, demurragePerHour, expiresAt }: QuoteSheetProps) {
  return (
    <div className={s.sheet}>
      <table className={s.table}>
        <caption className={s.caption}>Chi phí cố định trọn gói</caption>
        <tbody>
          {lines.map(l => (
            <tr key={l.label}>
              <td><div className={s.label}>{l.label}</div>{l.detail && <div className={s.detail}>{l.detail}</div>}</td>
              <td className={s.amount}>{l.amount ? formatVND(l.amount) : 'Đã gồm'}</td>
            </tr>
          ))}
          {adjustments.map(a => (
            <tr key={a.label} className={a.amount < 0 ? s.discount : ''}>
              <td><div className={s.label}>{a.label}</div><div className={s.detail}>{a.amount < 0 ? 'Chiết khấu thương mại' : 'Phụ phí'}</div></td>
              <td className={s.amount}>{a.amount < 0 ? '−' : '+'}{formatVND(Math.abs(a.amount))}</td>
            </tr>
          ))}
        </tbody>
        {adjustments.length > 0 && <tfoot><tr><td>Cộng trước điều chỉnh</td><td className={s.amount}>{formatVND(subtotal)}</td></tr></tfoot>}
      </table>

      <div className={s.totals}>
        <div className={s.total}><span>Tổng giá trị tạm tính</span><b>{formatVND(total)}</b></div>
        <div className={s.note}>Chưa gồm VAT, nhiên liệu và phí cầu đường BOT.</div>
        <div className={s.deposit}><span>Tiền đặt cọc giữ xe ({DEPOSIT_RATE * 100}%)</span><b>{formatVND(deposit)}</b></div>
      </div>

      <div className={s.after}>
        <div><i className="fa-solid fa-gas-pump" aria-hidden="true" /> <b>Chi phí thực tế trả sau:</b> nhiên liệu và phí cầu đường BOT. Tài xế chi trả dọc đường, quyết toán theo hóa đơn sau chuyến đi.</div>
        <div><i className="fa-solid fa-clock" aria-hidden="true" /> <b>Phí lưu xe chờ thông quan quá giờ:</b> {formatVND(demurragePerHour)} mỗi giờ, chỉ tính khi chậm do giấy tờ của khách.</div>
        {expiresAt && <div><i className="fa-solid fa-hourglass-half" aria-hidden="true" /> <b>Báo giá có hiệu lực đến</b> {formatDateTime(expiresAt)}.</div>}
      </div>
    </div>
  )
}
