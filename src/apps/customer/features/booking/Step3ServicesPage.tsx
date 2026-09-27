// Bước 3: Dịch vụ & Y tế. Chuyển từ CUS/create_request_step3.html + initStep3(), calculateInsurance().
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { BookingShell } from './BookingShell'
import { useBookingDraft } from './draft'
import s from './Booking.module.css'

type Opts = [string, string][]
const FEEDING: Opts = [['yes', 'Đội ngũ hậu cần chuẩn bị (Đã bao gồm trong giá)'], ['custom', 'Thực đơn đặc biệt theo yêu cầu (Phụ phí thức ăn)'], ['self', 'Chủ trang trại tự chuẩn bị khẩu phần đóng gói']]
const FOOD: Opts = [['hay', 'Cỏ khô Timothy Hay nhập khẩu — Tiêu chuẩn thi đấu'], ['alfalfa', 'Cỏ Alfalfa — Giàu đạm & khoáng chất'], ['mixed', 'Thức ăn hỗn hợp cao cấp (Pellets + Timothy)'], ['fresh', 'Cỏ tươi tự nhiên + Táo/Cà rốt bổ sung']]
const STALL: Opts = [['standard', 'Khoang Tiêu chuẩn (1.2m × 2.4m) — Khuyên dùng'], ['vip', 'Khoang VIP Royal (1.5m × 3.0m) — Rộng hơn 25%, sàn đệm cao su'], ['isolation', 'Khoang Cách ly Độc lập — Có vách ngăn kín và lọc khí HEPA']]
const WATER: Opts = [['normal', 'Nước khoáng tinh khiết tiêu chuẩn — Uống tự do'], ['electrolyte', 'Bổ sung dung dịch điện giải chống mất nước & giảm stress']]
const INSURANCE: Opts = [['none', 'Không đăng ký bảo hiểm bổ sung (Trách nhiệm dân sự tối thiểu)'], ['basic', 'Gói Cơ bản — Bồi thường tối đa 500 triệu VND (2% giá trị khai báo)'], ['premium', 'Gói Nâng cao — Bồi thường tối đa 2 tỷ VND (3.5% giá trị khai báo)'], ['full', 'Gói Toàn diện — Bồi thường 100% giá trị khai báo (5.0% giá trị)']]
const RATE: Record<string, number> = { basic: 0.02, premium: 0.035, full: 0.05 }

const label = (opts: Opts, v: string) => opts.find(o => o[0] === v)?.[1] ?? ''

function Select({ id, title, opts, value, onChange }: { id: string; title: string; opts: Opts; value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="required">{title}</label>
      <select id={id} className="form-control" value={value} onChange={e => onChange(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div>
  )
}

export default function Step3ServicesPage() {
  const navigate = useNavigate()
  const { draft, save } = useBookingDraft()
  const [f, setF] = useState({
    feeding: draft.feeding || 'yes', foodType: draft.foodType || 'hay', stallType: draft.stallType || 'standard',
    waterSupplement: draft.waterSupplement || 'normal', insurance: draft.insurance || 'basic',
    horseValue: draft.horseValue ? Number(draft.horseValue).toLocaleString('en-US') : '2,000,000,000', specialCare: draft.specialCare,
  })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })

  const value = parseFloat(f.horseValue.replace(/\D/g, '')) || 0
  const rate = RATE[f.insurance] ?? 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save({
      hasDisease: draft.hasDisease || 'no', hasMedication: draft.hasMedication || 'no', diseaseDetail: draft.diseaseDetail, needIsolation: draft.needIsolation || 'no',
      feeding: f.feeding,
      foodType: f.foodType, foodTypeName: label(FOOD, f.foodType),
      stallType: f.stallType, stallTypeName: label(STALL, f.stallType),
      waterSupplement: f.waterSupplement, waterSupplementName: label(WATER, f.waterSupplement),
      insurance: f.insurance, insuranceName: label(INSURANCE, f.insurance),
      horseValue: parseInt(f.horseValue.replace(/\D/g, '') || '2000000000', 10),
      specialCare: f.specialCare,
    })
    navigate('/booking/review')
  }

  return (
    <BookingShell step={3} crumb="Bước 3: Dịch vụ & Y tế" title="Hồ sơ Y tế & Tùy chọn Dịch vụ Chăm sóc" subtitle="Đính kèm giấy tờ kiểm dịch và lựa chọn tiêu chuẩn chăm sóc tối ưu sức khỏe của ngựa đua trong suốt chuyến đi.">
      <form onSubmit={submit}>
        <div className="card">
          <div className="card-header"><h2><i className="fa-solid fa-wheat-awn" /> 1. Chăm sóc Dinh dưỡng & Khoang Vận chuyển (Stalls)</h2></div>
          <div className={s.grid2}>
            <Select id="feeding" title="Chế độ dinh dưỡng trên đường" opts={FEEDING} value={f.feeding} onChange={set('feeding')} />
            <Select id="food_type" title="Loại thức ăn chính" opts={FOOD} value={f.foodType} onChange={set('foodType')} />
            <Select id="stall_type" title="Quy cách khoang vận chuyển (Stalls)" opts={STALL} value={f.stallType} onChange={set('stallType')} />
            <Select id="water_supplement" title="Chế độ nước uống & Điện giải" opts={WATER} value={f.waterSupplement} onChange={set('waterSupplement')} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2><i className="fa-solid fa-shield-halved" /> 2. Gói Bảo hiểm Vận chuyển Chuyên biệt</h2><span className="badge badge-success">Bảo lãnh bồi thường</span></div>
          <div className={s.grid2}>
            <Select id="insurance" title="Lựa chọn gói bảo hiểm rủi ro" opts={INSURANCE} value={f.insurance} onChange={set('insurance')} />
            <div className="form-group">
              <label htmlFor="horse_value" className="required">Giá trị cá thể ngựa khai báo (VND)</label>
              <input id="horse_value" className="form-control" placeholder="VD: 2,000,000,000" value={f.horseValue} onChange={e => set('horseValue')(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Phí bảo hiểm dự toán</label>
            {rate === 0
              ? <div className={`${s.insurance} ${s.insuranceOff}`}><i className="fa-solid fa-info-circle" /> 0 VND (Không đăng ký gói bảo hiểm)</div>
              : <div className={`${s.insurance} ${s.insuranceOn}`}><i className="fa-solid fa-calculator" /> {(value * rate).toLocaleString('vi-VN')} VND ({(rate * 100).toFixed(1)}% × {value.toLocaleString('vi-VN')} VND)</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2><i className="fa-solid fa-user-nurse" /> 3. Ghi chú Hướng dẫn cho Đội ngũ Hộ tống (Escort / Groom)</h2></div>
          <div className="form-group">
            <label htmlFor="special_care">Yêu cầu tâm lý, thói quen sinh hoạt hoặc dặn dò đặc biệt</label>
            <textarea id="special_care" className="form-control" rows={4} placeholder="VD: Ngựa nhạy cảm với tiếng còi xe lớn, thích được chải lông trước khi ngủ, cho uống nước ấm khi trời lạnh..." value={f.specialCare} onChange={e => set('specialCare')(e.target.value)} />
          </div>
        </div>

        <div className={s.actions}>
          <Link to="/booking/horses" className="btn btn-ghost"><i className="fa-solid fa-arrow-left" /> Bước 2: Thông tin ngựa</Link>
          <button type="submit" className="btn btn-primary">Tiếp tục: Xác nhận & Dự toán <i className="fa-solid fa-arrow-right" /></button>
        </div>
      </form>
    </BookingShell>
  )
}
