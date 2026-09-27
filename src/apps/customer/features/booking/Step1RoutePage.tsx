// Bước 1: Tuyến đường. Chuyển từ CUS/create_request.html + initStep1().
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { COUNTRIES, COUNTRY_LOCATIONS, type CountryCode } from '@shared/config/network'
import { Flag } from '@shared/ui/Flag'
import { BookingShell } from './BookingShell'
import { useBookingDraft } from './draft'
import s from './Booking.module.css'

const COUNTRY_ORDER: CountryCode[] = ['VN', 'KH', 'LA']

function LocationSelect({ id, country, value, onChange }: { id: string; country: CountryCode | ''; value: string; onChange: (v: string) => void }) {
  return (
    <select id={id} className="form-control" required disabled={!country} value={country ? value : ''} onChange={e => onChange(e.target.value)}>
      {!country && <option value="" disabled>Vui lòng chọn quốc gia trước</option>}
      {country && <option value="" disabled>— Chọn địa điểm —</option>}
      {country && COUNTRY_LOCATIONS[country].map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  )
}

// Ô chọn quốc gia có cờ SVG bên trái (không dùng emoji cờ trong <option>)
function CountrySelect({ id, value, onChange }: { id: string; value: CountryCode | ''; onChange: (v: CountryCode) => void }) {
  return (
    <div className={s.countrySelect}>
      {value && <span className={s.countryFlag}><Flag code={value} size={20} /></span>}
      <select id={id} className="form-control" required value={value} style={value ? { paddingLeft: 42 } : undefined} onChange={e => onChange(e.target.value as CountryCode)}>
        <option value="">— Chọn quốc gia —</option>
        {COUNTRY_ORDER.map(c => <option key={c} value={c}>{COUNTRIES[c].name}</option>)}
      </select>
    </div>
  )
}

export default function Step1RoutePage() {
  const navigate = useNavigate()
  const { draft, save } = useBookingDraft()
  const [originCountry, setOriginCountry] = useState<CountryCode | ''>(draft.originCountry)
  const [destCountry, setDestCountry] = useState<CountryCode | ''>(draft.destCountry)
  const [originLocation, setOriginLocation] = useState(draft.originLocation)
  const [destLocation, setDestLocation] = useState(draft.destLocation)
  const [date, setDate] = useState(draft.departureDate || '2026-11-15')
  const [quantity, setQuantity] = useState(String(draft.quantity || ''))

  const nameOf = (c: CountryCode | '', id: string) => (c ? COUNTRY_LOCATIONS[c].find(l => l.id === id)?.name ?? '' : '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save({
      originCountry, originLocation, originLocationName: nameOf(originCountry, originLocation),
      destCountry, destLocation, destLocationName: nameOf(destCountry, destLocation),
      isInternational: originCountry !== destCountry,
      departureDate: date || '2026-11-15',
      quantity: parseInt(quantity, 10) || 0,
      urgency: draft.urgency || 'standard',
    })
    navigate('/booking/horses')
  }

  const both = originCountry && destCountry
  const domestic = originCountry === 'VN' && destCountry === 'VN'

  return (
    <BookingShell step={1} crumb="Bước 1: Tuyến đường" title="Tạo Yêu cầu Vận chuyển mới" subtitle="Hoàn thành 4 bước để hệ thống phân tích phương án logistics và lập báo giá tự động nhanh chóng.">
      <form className="card" onSubmit={submit}>
        <div className="card-header"><h2><i className="fa-solid fa-route" /> Chi tiết Tuyến đường & Lịch trình</h2><span className="badge badge-orange">Bước 1/4</span></div>
        <div className={s.grid2}>
          <div className="form-group">
            <label htmlFor="origin_country" className="required">Quốc gia Xuất phát</label>
            <CountrySelect id="origin_country" value={originCountry} onChange={c => { setOriginCountry(c); setOriginLocation('') }} />
          </div>
          <div className="form-group">
            <label htmlFor="origin_location" className="required">Điểm đón</label>
            <LocationSelect id="origin_location" country={originCountry} value={originLocation} onChange={setOriginLocation} />
          </div>
          <div className="form-group">
            <label htmlFor="dest_country" className="required">Quốc gia Đến</label>
            <CountrySelect id="dest_country" value={destCountry} onChange={c => { setDestCountry(c); setDestLocation('') }} />
          </div>
          <div className="form-group">
            <label htmlFor="dest_location" className="required">Điểm đến</label>
            <LocationSelect id="dest_location" country={destCountry} value={destLocation} onChange={setDestLocation} />
          </div>
        </div>

        {both && (
          domestic ? (
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <i className="fa-solid fa-truck" />
              <div><strong>Vận chuyển Nội địa:</strong> Tuyến đường bộ nội địa sử dụng đội xe tải chuyên dụng có điều hòa ổn nhiệt, đệm sàn chống sốc khí nén, hệ thống camera giám sát trực tiếp 24/7 và bác sĩ thú y theo dõi suốt hành trình.</div>
            </div>
          ) : (
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              <i className="fa-solid fa-truck" />
              <div><strong>Vận chuyển Quốc tế ({COUNTRIES[originCountry].name} → {COUNTRIES[destCountry].name}):</strong> Tuyến đường yêu cầu kiểm dịch xuất/nhập cảnh thú y chuẩn OIE và thông quan tại cửa khẩu đường bộ, vận chuyển bằng xe tải chuyên dụng xuyên biên giới.</div>
            </div>
          )
        )}

        <div className={s.grid2}>
          <div className="form-group">
            <label htmlFor="date" className="required">Ngày khởi hành (Phải sau 10 ngày từ lúc đặt đơn)</label>
            <input id="date" type="date" className="form-control" required value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="quantity" className="required">Số lượng ngựa (Tối đa 10 con ngựa mỗi chuyến)</label>
            <input id="quantity" className="form-control" required placeholder="Nhập số lượng ngựa cần vận chuyển" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
        </div>

        <div className={s.actions}>
          <Link to="/portal" className="btn btn-ghost">Hủy đơn</Link>
          <button type="submit" className="btn btn-primary">Tiếp tục: Thông tin ngựa <i className="fa-solid fa-arrow-right" /></button>
        </div>
      </form>
    </BookingShell>
  )
}
