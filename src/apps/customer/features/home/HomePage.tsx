// Trang chủ công khai. Chuyển từ index.html + home.js.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { CountUp, reducedMotion, useScrollReveal } from '@shared/motion/motion'
import { Link, useLocation, useNavigate } from 'react-router'
import { CUSTOMER_STEPS, MAX_HORSES, MIN_LEAD_DAYS } from '@shared/config/business-rules'
import { COUNTRIES, GATES, PLACES, type CountryCode } from '@shared/config/network'
import { BIG_TRUCK_FACTOR, CARE_FEE_PER_DAY, DRIVE_HOURS_PER_DAY, INSURANCE_RATE, KM_TIERS, QUARANTINE_FEE, TRIP_OPEN_FEE } from '@shared/config/public-pricing'
import { formatDate, formatVND } from '@shared/lib/format'
import { estimateFee, type FeeEstimate } from '@shared/lib/pricing'
import { trackOrder, type PublicTracking } from '@shared/services/tracking'
import { FLAG_SVG } from '@shared/ui/flags'
import s from './HomePage.module.css'

gsap.registerPlugin(MotionPathPlugin)

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')
const MAX_TRACK_CODES = 5
const STEPS = CUSTOMER_STEPS.map(x => (x === 'Chờ thẩm định' ? 'Thẩm định' : x))

// ===== Banner trượt =====
const SLIDES = [
  { bg: '/images/truck.jpg', tag: 'Xe chuyên dụng 2 – 4 ngăn', title: 'Vận chuyển ngựa đua', hl: 'Việt Nam · Lào · Campuchia', text: 'Xe chuyên dụng có vách ngăn và đệm chống trượt, nhân viên chăm sóc đi kèm suốt hành trình.', cta: ['Đặt chuyến ngay', '/login'] },
  { bg: '/images/vet.jpg', tag: 'Kiểm dịch & thủ tục trọn gói', title: 'Hồ sơ thú y được', hl: 'kiểm dịch viên xác minh', text: 'Chúng tôi làm thủ tục kiểm dịch và hải quan cửa khẩu. Bạn theo dõi từng giấy tờ ngay trên hệ thống.', cta: ['Xem quy trình', '/#quy-trinh'] },
  { bg: null, tag: 'Báo giá minh bạch', title: 'Biết trước chi phí', hl: 'trước khi đặt chuyến', text: 'Tra cước theo tuyến và số ngựa. Giá trên đơn là giá bạn trả, không phát sinh.', cta: ['Tra cứu cước', '/?tab=fee#tra-cuu'] },
]

const Words = ({ text }: { text: string }) => <>{text.split(' ').map((w, i) => <span key={i} className={s.word}>{w}&nbsp;</span>)}</>

function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const root = useRef<HTMLElement>(null)
  // Mỗi lần đổi banner: từng từ của tiêu đề trượt lên, rồi tới nhãn, mô tả và nút
  useGSAP(() => {
    const slide = root.current?.querySelectorAll(`.${s.heroSlide}`)[index]
    if (!slide || reducedMotion()) return
    const q = gsap.utils.selector(slide)
    gsap.timeline()
      .fromTo(q(`.${s.heroTag}`), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
      .fromTo(q(`.${s.word}`), { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.06, ease: 'power4.out' }, '-=0.25')
      .fromTo(q('p, a'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out' }, '-=0.5')
  }, { dependencies: [index], scope: root })
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [paused, index])
  return (
    <section ref={root} className={s.hero} aria-label="Giới thiệu" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {SLIDES.map((sl, i) => (
        <div key={i} className={cx(s.heroSlide, !sl.bg && s.heroSlidePlain, i === index && s.active)} style={sl.bg ? { '--bg': `url('${sl.bg}')` } as CSSProperties : undefined}>
          <div className={cx('wrap', s.heroContent)}>
            <span className={s.heroTag}>{sl.tag}</span>
            <h1><span className={s.line}><Words text={sl.title} /></span><span className={s.line}><span className={s.hl}><Words text={sl.hl} /></span></span></h1>
            <p>{sl.text}</p>
            <Link to={sl.cta[1]} className="btn btn-solid btn-lg">{sl.cta[0]}</Link>
          </div>
        </div>
      ))}
      <div className={s.heroDots}>
        {SLIDES.map((_, i) => <button key={i} className={cx(s.heroDot, i === index && s.active)} aria-label={`Chuyển tới banner ${i + 1}`} onClick={() => setIndex(i)} />)}
      </div>
    </section>
  )
}

// ===== Tra cứu đơn hàng =====
type TrackRow = { code: string; result: PublicTracking | null }

function OrderLookup() {
  const [codesText, setCodesText] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<{ field: 'codes' | 'phone'; message: string } | null>(null)
  const [rows, setRows] = useState<TrackRow[]>([])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const codes = [...new Set(codesText.split(',').map(c => c.trim().toUpperCase()).filter(Boolean))]
    if (!codes.length) return setError({ field: 'codes', message: 'Nhập ít nhất 1 mã đơn.' })
    if (codes.length > MAX_TRACK_CODES) return setError({ field: 'codes', message: `Tối đa ${MAX_TRACK_CODES} mã đơn mỗi lần tra cứu.` })
    if (!/^\d{4}$/.test(phone.trim())) return setError({ field: 'phone', message: 'Nhập đúng 4 số cuối số điện thoại người đặt.' })
    setError(null)
    setRows(await Promise.all(codes.map(async code => ({ code, result: await trackOrder(code, phone.trim()) }))))
  }

  return (
    <>
      <form className={s.lookupRow} noValidate onSubmit={submit}>
        <div className={cx(s.field, s.fieldGrow)}>
          <i className="fa-solid fa-magnifying-glass" />
          <input className={cx(error?.field === 'codes' && s.inputError)} value={codesText} onChange={e => { setCodesText(e.target.value); setError(null) }} placeholder="Nhập mã đơn (cách nhau bởi dấu phẩy), tối đa 5 đơn. VD: EQ-2026-1028" />
        </div>
        <div className={cx(s.field, s.fieldPhone)}>
          <i className="fa-solid fa-phone" />
          <input className={cx(error?.field === 'phone' && s.inputError)} value={phone} onChange={e => { setPhone(e.target.value); setError(null) }} inputMode="numeric" maxLength={4} placeholder="4 số cuối SĐT người đặt" />
        </div>
        <button className="btn btn-solid" type="submit">Tìm kiếm</button>
      </form>
      <p className={s.lookupHint}>Dữ liệu mẫu: EQ-2026-1028, EQ-2026-1030, EQ-2026-1074, EQ-2026-1021 · 4 số cuối <strong>3456</strong></p>
      {error && <p className={s.formError}><i className="fa-solid fa-circle-exclamation" /> {error.message}</p>}
      {!error && rows.length > 0 && (
        <div className={s.trackList}>
          {rows.map(({ code, result: o }, i) => o ? (
            <div key={code} className={s.trackItem} style={{ animationDelay: `${i * 80}ms` }}>
              <div className={s.trackHead}><span className={s.trackCode}>{code}</span><span className={cx(s.trackStatus, o.tone && s[o.tone])}>{o.status}</span></div>
              <div className={s.trackMeta}><i className="fa-solid fa-route" /> {o.route} · Khởi hành {formatDate(o.depart)}</div>
              <div className={s.trackSteps}>
                {STEPS.map((label, k) => {
                  const state = o.done || k < o.step ? 'done' : k === o.step ? 'current' : ''
                  return <div key={label} className={cx(s.trackStep, state && s[state])}><span className={s.dot}>{state === 'done' && <i className="fa-solid fa-check" />}</span><div>{label}</div></div>
                })}
              </div>
              {o.now && <div className={s.trackNow}><i className="fa-solid fa-location-dot" /> <b>{o.now.place}</b><br />Cập nhật lúc {formatClockDate(o.now.at)} · Dự kiến giao {formatClockDate(o.now.eta)}</div>}
              {o.note && <div className={s.trackNow}><i className="fa-solid fa-circle-info" /> {o.note}</div>}
            </div>
          ) : (
            <div key={code} className={cx(s.trackItem, s.trackMiss)} style={{ animationDelay: `${i * 80}ms` }}><b>{code}</b>: không tìm thấy đơn, hoặc 4 số cuối điện thoại không khớp.</div>
          ))}
        </div>
      )}
    </>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatClockDate = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())} ${formatDate(t)}` }

// ===== Tra cứu cước =====
function FeeLookup() {
  const navigate = useNavigate()
  const [fromId, setFromId] = useState('dni')
  const [toId, setToId] = useState('pnh')
  const [horses, setHorses] = useState('1')
  const [valueText, setValueText] = useState('')
  const [error, setError] = useState<{ field: 'to' | 'horses'; message: string } | null>(null)
  const [result, setResult] = useState<(FeeEstimate & { from: string; to: string; value: number }) | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const from = PLACES.find(p => p.id === fromId)!
    const to = PLACES.find(p => p.id === toId)!
    const n = Number(horses)
    const value = Number(valueText.replace(/\D/g, ''))
    if (from.id === to.id) return setError({ field: 'to', message: 'Điểm đến phải khác điểm đi.' })
    if (from.country !== 'VN' && to.country !== 'VN') return setError({ field: 'to', message: 'Hiện chỉ nhận tuyến có điểm đi hoặc điểm đến tại Việt Nam.' })
    if (!Number.isInteger(n) || n < 1 || n > MAX_HORSES) return setError({ field: 'horses', message: `Số ngựa từ 1 đến ${MAX_HORSES}. Trên ${MAX_HORSES} con, vui lòng gọi hotline 1900 6868.` })
    setError(null)
    setResult({ ...estimateFee(from, to, n, value), from: from.name, to: to.name, value })
  }

  const options = (Object.keys(COUNTRIES) as CountryCode[]).map(code => (
    <optgroup key={code} label={COUNTRIES[code].name}>
      {PLACES.filter(p => p.country === code).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </optgroup>
  ))

  return (
    <>
      <form className={s.feeForm} noValidate onSubmit={submit}>
        <label>Điểm đi<select value={fromId} onChange={e => { setFromId(e.target.value); setError(null) }}>{options}</select></label>
        <label>Điểm đến<select className={cx(error?.field === 'to' && s.inputError)} value={toId} onChange={e => { setToId(e.target.value); setError(null) }}>{options}</select></label>
        <label>Số ngựa<input className={cx(error?.field === 'horses' && s.inputError)} type="number" min={1} max={MAX_HORSES} value={horses} onChange={e => { setHorses(e.target.value); setError(null) }} /></label>
        <label>Giá trị ngựa khai báo (₫, không bắt buộc)<input inputMode="numeric" placeholder="VD: 2.000.000.000" value={valueText} onChange={e => setValueText(e.target.value)} /></label>
        <button className="btn btn-solid" type="submit">Tính cước</button>
      </form>
      {error && <p className={s.formError}><i className="fa-solid fa-circle-exclamation" /> {error.message}</p>}
      {!error && result && (
        <div className={s.feeResult}>
          <div>
            <div className={s.feeRoute}>
              <span><i className="fa-solid fa-route" /> <b>{result.from} → {result.to}</b></span>
              <span>{result.gate ? <>Cửa khẩu <b>{result.gate}</b></> : 'Nội địa'}</span>
              <span>Khoảng <b>{result.km} km</b> · {result.hours < DRIVE_HOURS_PER_DAY ? `~${Math.ceil(result.hours)} giờ` : `${result.days} ngày`}</span>
            </div>
            <table className={s.feeTable}>
              <tbody>
                {result.rows.map(([name, detail, amount]) => <tr key={name}><td>{name}<span className={s.sub}>{detail}</span></td><td>{formatVND(amount)}</td></tr>)}
                {!result.value && <tr><td>Bảo hiểm vận chuyển<span className={s.sub}>Nhập giá trị ngựa khai báo để tính (gói cơ bản 2%, toàn diện 5%)</span></td><td>—</td></tr>}
              </tbody>
            </table>
          </div>
          <div className={s.feeTotal}>
            <span>Tổng cước tham khảo</span>
            <strong>{formatVND(result.total)}</strong>
            <small>Giá chính thức hiển thị trên đơn sau khi bạn gửi. Đặt trước tối thiểu {MIN_LEAD_DAYS} ngày.</small>
            <button className="btn btn-solid" onClick={() => navigate('/login')}>Đặt chuyến tuyến này</button>
          </div>
        </div>
      )}
    </>
  )
}

// ===== Bảng giá =====
function PriceTable() {
  return (
    <>
      <div className={s.priceGrid}>
        <div>
          <h3><i className="fa-solid fa-truck" /> Cước xe (tính cho mỗi xe 2 ngăn)</h3>
          <table className={s.priceTable}>
            <thead><tr><th>Hạng mục</th><th>Đơn giá</th></tr></thead>
            <tbody>
              <tr><td>Phí mở chuyến</td><td>{formatVND(TRIP_OPEN_FEE)}</td></tr>
              {KM_TIERS.map(([to, rate], i) => {
                const from = i ? KM_TIERS[i - 1][0] + 1 : 0
                return <tr key={to}><td>{to === Infinity ? `Từ km ${from}` : `Km ${from} – ${to}`}</td><td>{formatVND(rate)}/km</td></tr>
              })}
              <tr><td>Xe 4 ngăn (3 – 4 ngựa)</td><td>× {BIG_TRUCK_FACTOR} giá xe 2 ngăn</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3><i className="fa-solid fa-horse-head" /> Phí theo ngựa</h3>
          <table className={s.priceTable}>
            <thead><tr><th>Hạng mục</th><th>Đơn giá</th></tr></thead>
            <tbody>
              <tr><td>Kiểm dịch vận chuyển nội địa</td><td>{formatVND(QUARANTINE_FEE.domestic)}/ngựa</td></tr>
              <tr><td>Kiểm dịch & thủ tục xuất nhập cảnh</td><td>{formatVND(QUARANTINE_FEE.border)}/ngựa</td></tr>
              <tr><td>Chăm sóc dọc đường</td><td>{formatVND(CARE_FEE_PER_DAY)}/ngựa/ngày</td></tr>
              <tr><td>Bảo hiểm gói cơ bản</td><td>{INSURANCE_RATE.basic * 100}% giá trị khai báo</td></tr>
              <tr><td>Bảo hiểm gói toàn diện</td><td>{INSURANCE_RATE.full * 100}% giá trị khai báo</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className={s.priceNotes}>
        <div><i className="fa-solid fa-calendar-check" />Đặt trước tối thiểu {MIN_LEAD_DAYS} ngày so với ngày khởi hành.</div>
        <div><i className="fa-solid fa-earth-asia" />Tuyến trong Việt Nam, hoặc giữa Việt Nam với Lào, Campuchia.</div>
        <div><i className="fa-solid fa-receipt" />Giá tham khảo. Giá chính thức ghi trên đơn và không thay đổi sau khi duyệt.</div>
      </div>
    </>
  )
}

type Tab = 'order' | 'fee' | 'price'
const TABS: [Tab, string][] = [['order', 'Tra cứu đơn hàng'], ['fee', 'Tra cứu cước'], ['price', 'Bảng giá']]

function Lookup() {
  const { search, hash } = useLocation()
  const fromUrl = new URLSearchParams(search).get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(fromUrl ?? 'order')
  useEffect(() => {
    if (fromUrl) setTab(fromUrl)
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [fromUrl, hash])
  return (
    <section className={cx('wrap', s.lookup)} id="tra-cuu">
      <div className={s.lookupTabs} role="tablist">
        {TABS.map(([key, label]) => <button key={key} className={cx(s.lookupTab, tab === key && s.active)} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      <div className={s.lookupCard}>
        <div className={cx(s.lookupPanel, s.active)} key={tab}>
          {tab === 'order' ? <OrderLookup /> : tab === 'fee' ? <FeeLookup /> : <PriceTable />}
        </div>
      </div>
    </section>
  )
}

// ===== Mạng lưới =====
// Tuyến mẫu theo từng nước (lấy từ dữ liệu đơn thật). Điểm giữa là cửa khẩu (thông quan) hoặc trạm trung chuyển (nghỉ đêm).
type Stop = { x: number; y: number; name: string; sub: string }
const JOURNEYS: Record<CountryCode, { stops: [Stop, Stop, Stop]; mid: 'gate' | 'station'; summary: string }> = {
  VN: { mid: 'station', summary: 'Tuyến nội địa · 930 km · 2 ngày', stops: [
    { x: 40, y: 70, name: 'Đồng Nai', sub: 'Nhận ngựa' },
    { x: 450, y: 140, name: 'Trạm Tuy Hòa', sub: 'Nghỉ đêm · chăm sóc ngựa' },
    { x: 860, y: 60, name: 'Đà Nẵng', sub: 'Giao ngựa' }] },
  LA: { mid: 'gate', summary: 'Tuyến Việt Nam – Lào · qua cửa khẩu Cầu Treo', stops: [
    { x: 40, y: 140, name: 'Hà Nội', sub: 'Nhận ngựa' },
    { x: 450, y: 60, name: 'Cầu Treo – Nam Phao', sub: 'Thông quan · kiểm dịch' },
    { x: 860, y: 130, name: 'Viêng Chăn', sub: 'Giao ngựa' }] },
  KH: { mid: 'gate', summary: 'Tuyến Việt Nam – Campuchia · qua cửa khẩu Mộc Bài', stops: [
    { x: 40, y: 120, name: 'Đồng Nai', sub: 'Nhận ngựa' },
    { x: 450, y: 90, name: 'Mộc Bài – Bavet', sub: 'Thông quan · kiểm dịch' },
    { x: 860, y: 70, name: 'Phnom Penh', sub: 'Giao ngựa' }] },
}
const pathOf = ([a, b, c]: Stop[]) =>
  `M ${a.x} ${a.y} C ${a.x + 170} ${a.y - 90}, ${b.x - 170} ${b.y - 60}, ${b.x} ${b.y} S ${c.x - 170} ${c.y + 90}, ${c.x} ${c.y}`

// Khi đổi nước: vẽ lại tuyến, xe chạy tới điểm giữa, dừng một nhịp rồi chạy tiếp tới đích.
// Lần đầu chỉ chạy khi cuộn tới khung tuyến đường.
function Journey({ country }: { country: CountryCode }) {
  const root = useRef<HTMLDivElement>(null)
  const seen = useRef(false)
  const { stops, mid, summary } = JOURNEYS[country]
  const d = pathOf(stops)

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    const path = root.current!.querySelector<SVGPathElement>(`.${s.journeyPath}`)!
    const len = path.getTotalLength()
    const truck = q(`.${s.truck}`)
    if (reducedMotion()) { gsap.set(path, { strokeDasharray: 'none' }); gsap.set(truck, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], end: 1 } }); return }

    const tl = gsap.timeline({ paused: true })
      .fromTo(q(`.${s.journeyLabels}`), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 })
      .fromTo(q(`.${s.journeyStop}`), { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(2)' }, '<')
      .fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: len / 2, duration: 1.1, ease: 'power1.inOut' }, '<0.1')
      .fromTo(truck, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: 0, end: 0 } },
        { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: 0, end: 0.5 }, duration: 1.1, ease: 'power1.inOut' }, '<')
      .to(q(`.${s.journeyMid}`), { scale: 1.35, transformOrigin: 'center', duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' })
      .to(path, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, '+=0.15')
      .fromTo(truck, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: 0.5, end: 0.5 } },
        { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: 0.5, end: 1 }, duration: 1.1, ease: 'power1.inOut', immediateRender: false }, '<')

    if (seen.current) tl.play()
    else ScrollTrigger.create({ trigger: root.current, start: 'top 80%', once: true, onEnter: () => { seen.current = true; tl.play() } })
  }, { dependencies: [country], scope: root, revertOnUpdate: true })

  const [a, b, c] = stops
  return (
    <div ref={root} className={s.journey} aria-label={`Tuyến mẫu ${a.name} – ${b.name} – ${c.name}`}>
      <p className={s.journeySummary}>{summary}</p>
      <svg viewBox="0 0 900 200">
        <path className={s.journeyTrack} d={d} />
        <path className={s.journeyPath} d={d} />
        <circle className={s.journeyStop} cx={a.x} cy={a.y} r="10" />
        {mid === 'gate'
          ? <rect className={`${s.journeyStop} ${s.journeyMid} ${s.journeyGate}`} x={b.x - 11} y={b.y - 11} width="22" height="22" rx="5" />
          : <circle className={`${s.journeyStop} ${s.journeyMid} ${s.journeyStation}`} cx={b.x} cy={b.y} r="11" />}
        <circle className={s.journeyStop} cx={c.x} cy={c.y} r="10" />
        <g className={s.journeyLabels}>
          {stops.map((p, i) => {
            const below = i === 1 || p.y < 100 // điểm giữa: nhãn luôn ở dưới; hai đầu: dưới nếu điểm nằm cao
            return (
              <g key={p.name}>
                <text className={s.journeyLabel} x={p.x} y={below ? p.y + 34 : p.y - 36} textAnchor="middle">{p.name}</text>
                <text className={s.journeySub} x={p.x} y={below ? p.y + 50 : p.y - 20} textAnchor="middle">{p.sub}</text>
              </g>
            )
          })}
        </g>
        <g className={s.truck}>
          <rect x="-16" y="-11" width="22" height="16" rx="3" />
          <path d="M6 -6 h6 l5 6 v5 h-11 z" />
          <circle cx="-9" cy="7" r="3.5" /><circle cx="10" cy="7" r="3.5" />
        </g>
      </svg>
      <div className={s.journeyLegend}>
        <span><i className={s.legendGate} /> Cửa khẩu</span>
        <span><i className={s.legendStation} /> Trạm trung chuyển</span>
      </div>
    </div>
  )
}

function Network() {
  const [active, setActive] = useState<CountryCode>('VN')
  const flagsRef = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (reducedMotion()) return
    gsap.fromTo(`.${s.flag}`, { y: 40, scale: 0.85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(1.6)', scrollTrigger: { trigger: flagsRef.current, start: 'top 85%', once: true } })
  }, { scope: flagsRef })
  const gates = active === 'VN' ? GATES : GATES.filter(g => g.country === active)
  return (
    <section className={s.network} id="mang-luoi">
      <div className="wrap">
        <h2 className={cx('section-title', s.reveal)}>Mạng lưới phủ sóng 3 nước</h2>
        <p className={cx('section-sub', s.reveal)}>Tuyến nội địa Việt Nam và tuyến xuyên biên giới Việt Nam – Lào, Việt Nam – Campuchia qua các cửa khẩu đường bộ quốc tế.</p>
        <div ref={flagsRef} className={s.flags}>
          {(Object.keys(COUNTRIES) as CountryCode[]).map(code => (
            <button key={code} className={cx(s.flag, code === active && s.active)} onClick={() => setActive(code)}>
              <span className={s.flagImg} dangerouslySetInnerHTML={{ __html: FLAG_SVG[code] }} />
              <span className={s.flagName}>{COUNTRIES[code].name}</span>
              <span className={s.flagMeta}>{COUNTRIES[code].meta}</span>
            </button>
          ))}
        </div>
        <Journey country={active} />
        <div className={cx(s.networkDetail, s.reveal)}>
          <h3>{COUNTRIES[active].name}</h3>
          <div className={s.networkCols} key={active}>
            <div><h4>Điểm nhận / giao ngựa</h4><ul>{PLACES.filter(p => p.country === active).map(p => <li key={p.id}><i className="fa-solid fa-location-dot" /> {p.name}</li>)}</ul></div>
            <div>
              <h4>{active === 'VN' ? 'Cửa khẩu đường bộ phục vụ' : 'Cửa khẩu với Việt Nam'}</h4>
              <ul>{gates.map(g => <li key={g.name}><i className="fa-solid fa-flag" /> {g.name}{active === 'VN' && <span style={{ color: 'var(--muted)' }}> ({COUNTRIES[g.country].name})</span>}</li>)}</ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const FEATURES: [string, React.ReactNode, string][] = [
  ['fa-earth-asia', <><CountUp to={3} /> quốc gia</>, 'Việt Nam, Lào, Campuchia'],
  ['fa-truck', 'Xe chuyên dụng', 'Xe 2 ngăn và 4 ngăn, có đệm và vách ngăn riêng từng con'],
  ['fa-user-doctor', 'Kiểm dịch viên riêng', 'Xác minh hồ sơ, làm thủ tục và bàn giao giấy tờ cho từng đơn'],
  ['fa-flag', <><CountUp to={GATES.length} /> cửa khẩu</>, 'Cửa khẩu đường bộ quốc tế với Lào và Campuchia'],
]

const SERVICES: [string, string, string, string, string][] = [
  ['/?tab=fee#tra-cuu', 'fa-road', 'NỘI ĐỊA', 'Vận chuyển nội địa', 'Giữa các tỉnh thành Việt Nam'],
  ['/#mang-luoi', 'fa-earth-asia', 'XUYÊN BIÊN GIỚI', 'Vận chuyển xuyên biên giới', 'Việt Nam – Lào, Việt Nam – Campuchia'],
  ['/#quy-trinh', 'fa-file-shield', 'KIỂM DỊCH', 'Kiểm dịch & thủ tục', 'Giấy chứng nhận kiểm dịch, tờ khai hải quan'],
  ['/?tab=price#tra-cuu', 'fa-heart-pulse', 'CHĂM SÓC', 'Chăm sóc & bảo hiểm', 'Nhân viên chăm sóc đi kèm, bảo hiểm theo giá trị khai báo'],
]

const PROCESS: [string, string, string, string][] = [
  ['fa-paper-plane', 'Gửi đơn', 'Khai thông tin ngựa, tải giấy tờ thú y, chọn dịch vụ.', `Trước ngày đi ≥ ${MIN_LEAD_DAYS} ngày`],
  ['fa-magnifying-glass', 'Thẩm định', 'Kiểm dịch viên xác minh hồ sơ, điều phối viên lập lộ trình.', 'Trong 5 ngày làm việc'],
  ['fa-credit-card', 'Duyệt & thanh toán', 'Quản lý duyệt đơn, bạn thanh toán 100% giá trên đơn.', 'Trong 48 giờ'],
  ['fa-folder-open', 'Chuẩn bị giấy tờ', 'Bạn gửi bản gốc giấy tờ, chúng tôi làm thủ tục kiểm dịch và hải quan.', 'Trước ngày đi 3 ngày'],
  ['fa-truck-moving', 'Vận chuyển', 'Kiểm tra sức khỏe trước khi lên xe, theo dõi hành trình trực tuyến.', 'Theo lộ trình'],
  ['fa-clipboard-check', 'Nghiệm thu', 'Kiểm tra tình trạng ngựa khi nhận và xác nhận hoàn thành.', 'Trong 24 giờ'],
]

function useStepsLine() {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (reducedMotion()) return
    gsap.fromTo(`.${s.stepsLine}`, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 75%', end: 'bottom 60%', scrub: 0.6 } })
  }, { scope: ref })
  return ref
}

export default function HomePage() {
  const scope = useScrollReveal(`.${s.reveal}`)
  const stepsRef = useStepsLine()
  return (
    <div ref={scope}>
      <Hero />
      <Lookup />
      <Network />

      <section className={s.about}>
        <div className={cx(s.aboutLeft, s.reveal)}>
          <div className={s.aboutLeftInner}>
            <h2>Về chúng tôi</h2>
            <p>Chúng tôi chuyên vận chuyển ngựa đua bằng đường bộ. Mỗi đơn đều được kiểm dịch viên xác minh hồ sơ thú y và điều phối viên lập lộ trình riêng. Quản lý duyệt đơn trước khi bạn thanh toán.</p>
            <Link to="/#quy-trinh" className={s.linkArrow}>Xem quy trình <i className="fa-solid fa-arrow-right-long" /></Link>
          </div>
        </div>
        <div className={s.aboutRight}>
          {FEATURES.map(([icon, title, text], i) => (
            <div key={text} className={cx(s.feature, s.reveal)} data-delay={i * 120}>
              <span className={s.featureIcon}><i className={`fa-solid ${icon}`} /></span><h3>{title}</h3><p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={s.services} id="dich-vu">
        <div className="wrap">
          <h2 className={cx('section-title', s.reveal)}>Dịch vụ</h2>
          <div className={s.serviceGrid}>
            {SERVICES.map(([to, icon, tile, title, text], i) => (
              <Link key={title} to={to} className={cx(s.service, s.reveal)} data-delay={i * 120}>
                <span className={s.serviceTile}><i className={`fa-solid ${icon}`} /><b>{tile}</b></span><h3>{title}</h3><p>{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={s.process} id="quy-trinh">
        <div className="wrap">
          <h2 className={cx('section-title', s.reveal)}>Quy trình vận chuyển</h2>
          <p className={cx('section-sub', s.reveal)}>Từ lúc gửi đơn đến khi bạn nghiệm thu ngựa tại điểm đến.</p>
          <div ref={stepsRef} className={s.stepsWrap}>
          <span className={s.stepsLine} />
          <ol className={s.steps}>
            {PROCESS.map(([icon, title, text, time], i) => (
              <li key={title} className={cx(s.step, s.reveal)} data-delay={i * 100}>
                <span className={s.stepNum}><i className={`fa-solid ${icon}`} /></span>
                <h3>{i + 1}. {title}</h3><p>{text}</p><small>{time}</small>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>

      <section className={s.cta} style={{ '--bg': "url('/images/truck.jpg')" } as CSSProperties}>
        <div className={cx('wrap', s.reveal)}>
          <h2>Đặt chuyến vận chuyển ngựa đua</h2>
          <p>Đặt trước tối thiểu 10 ngày · Có kết quả thẩm định trong 5 ngày làm việc · Thanh toán sau khi đơn được duyệt</p>
          <Link to="/login" className="btn btn-white btn-lg">Đặt chuyến ngay</Link>
        </div>
      </section>
    </div>
  )
}
