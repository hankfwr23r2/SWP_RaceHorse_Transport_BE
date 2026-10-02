// Thành phần dùng chung cho các trang nội bộ của Flow 1: tóm tắt đơn, tiến độ hai nhánh, nhật ký.
import { COUNTRIES } from '@shared/config/network'
import { insuranceFee } from '@shared/lib/booking'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { SEX_LABEL, type Booking } from '@shared/types/booking'
import { formatVND } from '@shared/lib/format'
import { placeShort } from './place'
import s from './booking.module.css'

// Hai việc thẩm định chạy song song: y tế (Specialist) và phương án xe (Coordinator)
export function ReviewChips({ b }: { b: Booking }) {
  const med = b.medical?.status
  return (
    <div className={s.chips}>
      <span className={`${s.chip} ${med === 'approved' ? s.chipOk : med === 'resubmit' ? s.chipWarn : s.chipWait}`}>
        <i className={`fa-solid ${med === 'approved' ? 'fa-circle-check' : med === 'resubmit' ? 'fa-file-circle-exclamation' : 'fa-hourglass-half'}`} aria-hidden="true" />
        Y tế: {med === 'approved' ? 'đạt' : med === 'resubmit' ? 'chờ khách bổ sung' : 'chờ thẩm định'}
      </span>
      <span className={`${s.chip} ${b.fleet ? s.chipOk : s.chipWait}`}>
        <i className={`fa-solid ${b.fleet ? 'fa-circle-check' : 'fa-hourglass-half'}`} aria-hidden="true" />
        Xe & lộ trình: {b.fleet ? 'đã chốt' : 'chờ lập'}
      </span>
    </div>
  )
}

export function TripSummary({ b }: { b: Booking }) {
  return (
    <dl className={s.grid}>
      <div><dt>Khách hàng</dt><dd>{b.customer}</dd></div>
      <div><dt>Loại chuyến</dt><dd>{b.type === 'international' ? `Quốc tế (${COUNTRIES[b.origin.country].name} → ${COUNTRIES[b.dest.country].name})` : 'Trong nước'}</dd></div>
      <div><dt>Ngày khởi hành</dt><dd>{formatDate(b.departAt)}</dd></div>
      <div><dt>Điểm đón</dt><dd>{placeShort(b.origin.name)}</dd></div>
      <div><dt>Điểm giao</dt><dd>{placeShort(b.dest.name)}</dd></div>
      {b.gate && <div><dt>Cửa khẩu (đã khóa)</dt><dd>{b.gate}</dd></div>}
      <div><dt>Người gửi</dt><dd>{b.consignor.name}<div className={s.sub}>{b.consignor.phone}</div></dd></div>
      <div><dt>Người nhận</dt><dd>{b.consignee.name}<div className={s.sub}>{b.consignee.phone}</div></dd></div>
      <div><dt>Số ngựa</dt><dd>{b.horses.length} con</dd></div>
    </dl>
  )
}

// Cấu hình dịch vụ từng ngựa khách đã chọn (chỉ đọc)
export function HorseConfigList({ b }: { b: Booking }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {b.horses.map(h => (
        <div key={h.horseId} className={s.horse}>
          <div className={s.horseTop}>
            <div><div className={s.horseName}>{h.name}</div><div className={s.horseMeta}>Chip {h.microchip} · {h.breed} · {SEX_LABEL[h.sex]}</div></div>
          </div>
          <div className={s.config}>
            <span>Khoang: <b>{h.stall === 'single' ? 'đơn mở rộng' : 'tiêu chuẩn'}</b></span>
            <span>Nhiệt độ yêu cầu: <b>{h.targetTemp}°C</b></span>
            {h.feeding && <span>Dinh dưỡng: <b>{h.feeding}</b></span>}
            {h.water && <span>Nước: <b>{h.water}</b></span>}
            <span>Bảo hiểm: <b>{h.insurance.opted ? `mua, phí ${formatVND(insuranceFee(h.breed))}` : 'từ chối'}</b></span>
          </div>
          {h.careNote && <div className={s.hint}>Ghi chú của khách: {h.careNote}</div>}
        </div>
      ))}
    </div>
  )
}

export function History({ b }: { b: Booking }) {
  return (
    <ol className={s.timeline}>
      {[...b.history].sort((x, y) => y.time - x.time).map(e => (
        <li key={e.time + e.text} className={s.tl}>
          <span className={s.tlDot}><i className="fa-solid fa-check" aria-hidden="true" /></span>
          <div>{e.text}<div className={s.tlTime}>{e.actor} · {formatDateTime(e.time)}</div></div>
        </li>
      ))}
    </ol>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string, number][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={s.tabs} role="group" aria-label="Lọc đơn">
      {tabs.map(([k, label, n]) => (
        <button key={k} className={`${s.tab} ${value === k ? s.tabOn : ''}`} aria-pressed={value === k} onClick={() => onChange(k)}>{label}<span className={s.count}>{n}</span></button>
      ))}
    </div>
  )
}
