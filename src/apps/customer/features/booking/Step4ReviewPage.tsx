// Bước 4: Rà soát & dự toán. Chuyển từ CUS/create_request_step4.html + initStep4().
// Khác bản cũ: mục 3 hiện đúng lựa chọn ở bước 3 (bản cũ là chữ viết cứng); gửi xong về "Đơn của tôi" (bản cũ sang trang Nghiệm thu).
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { COUNTRIES } from '@shared/config/network'
import { Flag } from '@shared/ui/Flag'
import { useToast } from '@shared/ui/toast'
import { BookingShell } from './BookingShell'
import { useBookingDraft } from './draft'
import { legacyQuote } from './legacy-quote'
import s from './Booking.module.css'

const formatDateVN = (d: string) => { const p = (d || '2026-11-15').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d }

function Item({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return <div><div className={s.reviewLabel}>{label}</div><div className={`${s.reviewValue} ${strong ? 'font-semibold' : ''}`}>{children}</div></div>
}

export default function Step4ReviewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { draft: d } = useBookingDraft()
  const [agreed, setAgreed] = useState(false)
  const { isDomestic, rows, totalCost } = legacyQuote(d)
  const country = (c: string) => c ? <span className={s.inlineFlag}><Flag code={c as keyof typeof COUNTRIES} /> {COUNTRIES[c as keyof typeof COUNTRIES].name}</span> : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    toast('Đã gửi yêu cầu vận chuyển. Quản lý sẽ tiếp nhận và thẩm định.')
    navigate('/orders')
  }

  return (
    <BookingShell step={4} crumb="Bước 4: Xác nhận & Dự toán" title="Rà soát Thông tin & Dự toán Chi phí" subtitle="Kiểm tra toàn bộ dữ liệu lộ trình, hồ sơ y tế và bảng chi phí dự kiến trước khi gửi yêu cầu lên hệ thống quản trị.">
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <i className="fa-solid fa-circle-info" />
        <div><strong>Quy trình xử lý:</strong> Sau khi bạn bấm xác nhận gửi, yêu cầu sẽ được chuyển đến Quản lý để tiếp nhận và thẩm định (xác minh hồ sơ thú y, lập kế hoạch vận chuyển đường bộ). Giá bên dưới là giá chính thức. Khi đơn được duyệt, bạn thanh toán trong 48 giờ tại mục Đơn của tôi.</div>
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-route" /> 1. Tuyến đường & Thời gian</h2><Link to="/booking/route" className="text-orange small">Chỉnh sửa</Link></div>
        <div className={s.reviewGrid}>
          <Item label="Quốc gia Xuất phát">{country(d.originCountry)}</Item>
          <Item label="Kho / Điểm xuất phát" strong>{d.originLocationName || d.originLocation}</Item>
          <Item label="Quốc gia Đích đến">{country(d.destCountry)}</Item>
          <Item label="Điểm đến nhận ngựa" strong>{d.destLocationName || d.destLocation}</Item>
          <Item label="Phương thức vận chuyển">{isDomestic ? 'Nội địa — Đội xe tải chuyên dụng kiểm soát nhiệt độ & chống sốc' : 'Xuyên quốc gia — Xe tải chuyên dụng đường bộ qua cửa khẩu'}</Item>
          <Item label="Ngày khởi hành dự kiến">{formatDateVN(d.departureDate)} ({d.urgency === 'urgent' ? 'Hỏa tốc' : d.urgency === 'priority' ? 'Ưu tiên' : 'Tiêu chuẩn'})</Item>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-horse-head" /> 2. Thông tin Cá thể Ngựa Đua</h2><Link to="/booking/horses" className="text-orange small">Chỉnh sửa</Link></div>
        {d.horses.map(h => (
          <div key={h.id} className={`${s.reviewGrid} ${s.horseBlock}`}>
            <Item label={`Tên cá thể ngựa #${h.id}`} strong>{h.name}</Item>
            <Item label="Mã Vi chip Microchip ID"><span className="font-bold text-orange">{h.microchip}</span></Item>
            <Item label="Giống ngựa / Giới tính">{h.breed} | {h.gender}</Item>
            <Item label="Độ tuổi / Thể trọng">{h.age} tuổi | {h.weight} kg</Item>
            <Item label="Màu lông & Đặc điểm">{h.color}{h.marks ? ` — ${h.marks}` : ''}</Item>
            <Item label="Hình ảnh nhận dạng"><span className="badge badge-success"><i className="fa-solid fa-circle-check" /> Đã đính kèm ảnh</span></Item>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-notes-medical" /> 3. Hồ sơ Pháp lý, Sức khỏe & Chăm sóc</h2><Link to="/booking/services" className="text-orange small">Chỉnh sửa</Link></div>
        <div className={s.reviewGrid}>
          <Item label="Giấy tờ đã tải lên"><span className="badge badge-muted">passport_storm_runner.pdf</span> <span className="badge badge-muted">vaccination_card_2026.pdf</span></Item>
          <Item label="Tiền sử bệnh / Dùng thuốc">Thể trạng bình thường — Không dùng thuốc đặc trị</Item>
          <Item label="Yêu cầu cách ly">{d.needIsolation === 'yes' ? 'Có cách ly' : 'Vận chuyển chung tiêu chuẩn (Không cách ly)'}</Item>
          <Item label="Dinh dưỡng trên đường">{d.foodTypeName}</Item>
          <Item label="Khoang vận chuyển (Stall)">{d.stallTypeName}</Item>
          <Item label="Nước uống & Bổ sung">{d.waterSupplementName}</Item>
          <Item label="Gói bảo hiểm đã chọn">{d.insuranceName}</Item>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-calculator" /> 4. Bảng Dự toán Chi phí Tự động (Estimated Quotation)</h2><span className="badge badge-warning">Ước tính ban đầu</span></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Hạng mục dịch vụ</th><th className="text-right">Đơn giá</th><th className="text-center">Số lượng</th><th className="text-right">Thành tiền</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.title}>
                  <td><div className="font-semibold">{r.title}</div><div className="sub-text">{r.detail}</div></td>
                  <td className="text-right font-semibold nowrap">{r.unit}</td>
                  <td className="text-center nowrap">{r.qty}</td>
                  <td className="text-right font-bold nowrap" style={r.amount === null ? { color: 'var(--green)' } : undefined}>{r.amount === null ? r.includedLabel : `${r.amount.toLocaleString('vi-VN')} ₫`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3}>TỔNG CHI PHÍ DỰ TOÁN TỰ ĐỘNG</td><td className="text-right nowrap">{totalCost.toLocaleString('vi-VN')} VND</td></tr></tfoot>
          </table>
        </div>
      </div>

      <form onSubmit={submit}>
        <label className={s.commit}>
          <input type="checkbox" required checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>Tôi cam kết các thông tin khai báo về tình trạng sức khỏe, mã vi chip định danh và giá trị cá thể ngựa nêu trên là hoàn toàn trung thực, tuân thủ đúng Quy chế Vận chuyển Động vật Thuần chủng Quốc tế của FEI.</span>
        </label>
        <div className={s.actions}>
          <Link to="/booking/services" className="btn btn-ghost"><i className="fa-solid fa-arrow-left" /> Bước 3: Dịch vụ và Y tế</Link>
          <button type="submit" className="btn btn-primary"><i className="fa-solid fa-paper-plane" /> Xác nhận & Gửi Yêu cầu Vận chuyển</button>
        </div>
      </form>
    </BookingShell>
  )
}
