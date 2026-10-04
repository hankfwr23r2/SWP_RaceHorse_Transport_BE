// Tra cứu cước và Bảng giá: dùng chung cho trang chủ công khai và trang khách đã đăng nhập. Dùng đúng công thức báo giá thật (PRD mục 11).
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { CLASS_FACTOR, CLEARANCE_FEE, CREW_FEE_PER_DAY, DEPOSIT_RATE, FUEL_BOT_PER_KM, FUEL_BUFFER_RATE, HORSE_BREEDS, MARGIN_RATE, SINGLE_STALL_FEE, VEHICLE_CLASS, type VehicleClass } from '@shared/config/booking-rules'
import { MAX_HORSES, MIN_LEAD_DAYS } from '@shared/config/business-rules'
import { COUNTRIES, PLACES, type CountryCode } from '@shared/config/network'
import { DRIVE_HOURS_PER_DAY } from '@shared/config/public-pricing'
import { estimateQuote, insuranceFee } from '@shared/lib/booking'
import { formatVND } from '@shared/lib/format'
import { truckCost } from '@shared/lib/pricing'
import { Flag } from '@shared/ui/Flag'
import { Select } from '@shared/ui/Select'
import s from '../home/HomePage.module.css'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')
const roundK = (n: number) => Math.round(n / 1000) * 1000
const place = (id: string) => { const p = PLACES.find(x => x.id === id)!; return { id, name: p.name, country: p.country } }

// ===== Tra cứu cước =====
export function FeeLookup({ bookHref }: { bookHref: string }) {
  const navigate = useNavigate()
  const [fromId, setFromId] = useState('dni')
  const [toId, setToId] = useState('pnh')
  const [horses, setHorses] = useState('1')
  const [singles, setSingles] = useState('0')
  const [insured, setInsured] = useState('0')
  const [breed, setBreed] = useState(HORSE_BREEDS[0])
  const [error, setError] = useState<{ field: 'to' | 'horses'; message: string } | null>(null)
  const [query, setQuery] = useState<{ from: string; to: string; n: number; singles: number; insured: number; breed: string } | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const from = place(fromId), to = place(toId)
    const n = Number(horses)
    if (from.id === to.id) return setError({ field: 'to', message: 'Điểm đến phải khác điểm đi.' })
    if (from.country !== 'VN' && to.country !== 'VN') return setError({ field: 'to', message: 'Hiện chỉ nhận tuyến có điểm đi hoặc điểm đến tại Việt Nam.' })
    if (!Number.isInteger(n) || n < 1 || n > MAX_HORSES) return setError({ field: 'horses', message: `Số ngựa từ 1 đến ${MAX_HORSES}. Trên ${MAX_HORSES} con, vui lòng gọi hotline 1900 6868.` })
    setError(null)
    setQuery({ from: fromId, to: toId, n, singles: Math.min(n, Math.max(0, Number(singles) || 0)), insured: Math.min(n, Math.max(0, Number(insured) || 0)), breed })
  }

  const result = useMemo(() => query && estimateQuote({
    origin: place(query.from), dest: place(query.to),
    horses: Array.from({ length: query.n }, (_, i) => ({ breed: query.breed, single: i < query.singles, insured: i < query.insured })),
  }), [query])

  const groups = (Object.keys(COUNTRIES) as CountryCode[]).map(code => ({
    label: COUNTRIES[code].name,
    icon: <Flag code={code} size={16} />,
    options: PLACES.filter(p => p.country === code).map(p => ({ value: p.id, label: p.name })),
  }))
  const num = (set: (x: string) => void) => (e: { target: { value: string } }) => { set(e.target.value); setError(null) }

  return (
    <>
      <form className={s.feeForm} noValidate onSubmit={submit}>
        <Select label="Điểm đi" value={fromId} groups={groups} onChange={v => { setFromId(v); setError(null) }} />
        <Select label="Điểm đến" value={toId} groups={groups} invalid={error?.field === 'to'} onChange={v => { setToId(v); setError(null) }} />
        <label className={s.horseField}>
          <span>Số ngựa <small>(tối đa {MAX_HORSES}/đơn)</small></span>
          <input className={cx(error?.field === 'horses' && s.inputError)} type="number" inputMode="numeric" min={1} max={MAX_HORSES} value={horses} onChange={num(setHorses)} />
        </label>
        <label className={s.horseField}>
          <span>Ngựa dùng khoang đơn <small>(+{formatVND(SINGLE_STALL_FEE)}/ngựa)</small></span>
          <input type="number" inputMode="numeric" min={0} max={MAX_HORSES} value={singles} onChange={num(setSingles)} />
        </label>
        <label className={s.horseField}>
          <span>Ngựa mua bảo hiểm <small>(không bắt buộc)</small></span>
          <input type="number" inputMode="numeric" min={0} max={MAX_HORSES} value={insured} onChange={num(setInsured)} />
        </label>
        <label className={s.horseField}>
          <span>Giống ngựa <small>(tính phí bảo hiểm)</small></span>
          <select value={breed} onChange={e => setBreed(e.target.value)}>{HORSE_BREEDS.map(b => <option key={b}>{b}</option>)}</select>
        </label>
        <button className="btn btn-solid" type="submit">Tính cước</button>
      </form>
      {error && <p className={s.formError}><i className="fa-solid fa-circle-exclamation" /> {error.message}</p>}
      {!error && result && query && (
        <div className={s.feeResult}>
          <div>
            <div className={s.feeRoute}>
              <span><i className="fa-solid fa-route" /> <b>{place(query.from).name} → {place(query.to).name}</b></span>
              <span>{result.gate ? <>Cửa khẩu <b>{result.gate}</b></> : 'Nội địa'}</span>
              <span>Khoảng <b>{result.km} km</b> · {result.hours < DRIVE_HOURS_PER_DAY ? `~${Math.ceil(result.hours)} giờ` : `${result.days} ngày`}</span>
            </div>
            <table className={s.feeTable}>
              <tbody>
                {result.lines.map(l => <tr key={l.label}><td>{l.label}<span className={s.sub}>{l.detail}</span></td><td>{l.amount ? formatVND(l.amount) : 'Đã gồm'}</td></tr>)}
                <tr><td>Đặt cọc để nhận vận đơn ({DEPOSIT_RATE * 100}%)</td><td>{formatVND(result.deposit)}</td></tr>
                <tr><td>Thanh toán còn lại vào ngày bốc ngựa ({100 - DEPOSIT_RATE * 100}%)</td><td>{formatVND(result.balance)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className={s.feeTotal}>
            <span>Tổng chi phí tham khảo</span>
            <strong>{formatVND(result.total)}</strong>
            <small>Xe ước tính: {result.vehicles.map(c => `${c} ngăn`).join(' + ')}. Giá cố định, đã gồm nhiên liệu và phí cầu đường; báo giá chính thức do nhà xe duyệt. Đặt trước tối thiểu {MIN_LEAD_DAYS} ngày.</small>
            <button className="btn btn-solid" onClick={() => navigate(bookHref)}>Đặt chuyến tuyến này</button>
          </div>
        </div>
      )}
    </>
  )
}

// ===== Bảng giá (cùng công thức với báo giá) =====
const CLASSES = Object.keys(VEHICLE_CLASS) as VehicleClass[]
const SAMPLE_KM = [50, 150, 300, 600, 1000, 1500]
export function PriceTable() {
  return (
    <>
      <div className={s.priceGrid}>
        <div>
          <h3><i className="fa-solid fa-truck" /> Cước vận chuyển, mỗi xe</h3>
          <table className={s.priceTable}>
            <thead><tr><th>Quãng đường</th>{CLASSES.map(c => <th key={c}>{VEHICLE_CLASS[c].label} ({VEHICLE_CLASS[c].stalls})</th>)}</tr></thead>
            <tbody>{SAMPLE_KM.map(km => <tr key={km}><td>{km} km</td>{CLASSES.map(c => <td key={c}>{formatVND(roundK(truckCost(km, false) * CLASS_FACTOR[c] * (1 + MARGIN_RATE)))}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div>
          <h3><i className="fa-solid fa-horse-head" /> Các khoản cố định khác</h3>
          <table className={s.priceTable}>
            <thead><tr><th>Hạng mục</th><th>Đơn giá</th></tr></thead>
            <tbody>
              <tr><td>Nhân sự (01 tài xế + 01 hộ tống), mỗi xe</td><td>{formatVND(roundK(CREW_FEE_PER_DAY * (1 + MARGIN_RATE)))}/ngày</td></tr>
              <tr><td>Nhiên liệu và phí cầu đường, mỗi xe</td><td>{formatVND(roundK(100 * FUEL_BOT_PER_KM * (1 + FUEL_BUFFER_RATE) * (1 + MARGIN_RATE)))}/100 km</td></tr>
              <tr><td>Khoang đơn mở rộng</td><td>{formatVND(SINGLE_STALL_FEE)}/ngựa</td></tr>
              <tr><td>Thủ tục kiểm dịch (nội địa)</td><td>{CLEARANCE_FEE.domestic ? formatVND(CLEARANCE_FEE.domestic) : 'Đã gồm trong cước'}</td></tr>
              <tr><td>Thủ tục kiểm dịch và hải quan (quốc tế)</td><td>{formatVND(CLEARANCE_FEE.international)}/chuyến</td></tr>
              {HORSE_BREEDS.map(b => <tr key={b}><td>Bảo hiểm Động vật Sống · {b}</td><td>{formatVND(insuranceFee(b))}/ngựa</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className={s.priceNotes}>
        <div><i className="fa-solid fa-wallet" />Đặt cọc {DEPOSIT_RATE * 100}% để nhận vận đơn, {100 - DEPOSIT_RATE * 100}% còn lại trả vào ngày bốc ngựa.</div>
        <div><i className="fa-solid fa-calendar-check" />Đặt trước tối thiểu {MIN_LEAD_DAYS} ngày so với ngày khởi hành.</div>
        <div><i className="fa-solid fa-receipt" />Giá cố định, chưa gồm VAT. Giá chính thức ghi trên báo giá và không đổi sau khi duyệt.</div>
      </div>
    </>
  )
}

// Hai thẻ "Tra cứu cước" và "Bảng giá" như trang chủ công khai (không có tra cứu đơn: khách đã đăng nhập xem ở Đơn của tôi)
type Tab = 'fee' | 'price'
export function PriceLookup({ bookHref }: { bookHref: string }) {
  const [tab, setTab] = useState<Tab>('fee')
  const tabs: [Tab, string][] = [['fee', 'Tra cứu cước'], ['price', 'Bảng giá']]
  return (
    <section className={cx('wrap', s.lookup)} style={{ padding: 0 }}>
      <div className={s.lookupTabs} role="tablist">
        {tabs.map(([key, label]) => <button key={key} className={cx(s.lookupTab, tab === key && s.active)} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      <div className={s.lookupCard}>
        <div className={cx(s.lookupPanel, s.active)} key={tab}>
          {tab === 'fee' ? <FeeLookup bookHref={bookHref} /> : <PriceTable />}
        </div>
      </div>
    </section>
  )
}
