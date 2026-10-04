// Bảng điều khiển Quản lý. Chuyển từ Manager/manager_dashboard.html (Chart.js → SVG).
// Số tổng tính từ số liệu tháng (bản cũ ghi cứng 46,5 / 31,2 / 15,3 tỷ, không khớp tổng 12 tháng).
import { Link } from 'react-router'
import { useState } from 'react'
import { useStaggerIn } from '@shared/motion/motion'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { OrderBoard } from './OrderBoard'
import { OrderDetailModal } from './OrderDetailModal'
import { CalendarModal } from './CalendarModal'
import { ScheduleStrip } from './ScheduleStrip'
import bd from './Board.module.css'
import { FinanceChart, type MonthPoint } from './FinanceChart'
import s from './Dashboard.module.css'

// Doanh thu / chi phí năm 2026 theo tháng (tỷ VND), gốc: manager_dashboard.html
const REVENUE = [1.2, 1.9, 1.5, 2.8, 3.2, 3.8, 4.1, 4.8, 4.2, 5.1, 5.4, 6.0]
const COST = [0.9, 1.4, 1.1, 2.0, 2.2, 2.6, 2.8, 3.2, 3.0, 3.3, 3.2, 3.0]
const MONTHS: MonthPoint[] = REVENUE.map((r, i) => ({ month: `T${i + 1}`, revenue: r, cost: COST[i], profit: Math.round((r - COST[i]) * 10) / 10 }))
// Chỉ số giao đúng giờ cả năm (số chuyến), gốc: biểu đồ OTD
const OTD: [key: 'on_time' | 'early' | 'late', label: string, count: number, color: string, icon: string][] = [
  ['on_time', 'Đúng giờ', 210, '#0ca30c', 'fa-circle-check'],
  ['early', 'Sớm', 18, '#2a78d6', 'fa-bolt'],
  ['late', 'Trễ', 12, '#d03b3b', 'fa-clock'],
]

const sum = (a: number[]) => a.reduce((t, x) => t + x, 0)
const ty = (v: number) => `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Tỷ`

export default function DashboardPage() {
  const { data: all } = useLoad(bookingsApi.list)
  const [open, setOpenId] = useState<string | null>(null)
  const [calendar, setCalendar] = useState(false)
  const [text, setText] = useState('')
  const keyword = text.trim().toLowerCase()
  const orders = (all ?? []).filter(b => !keyword || [b.id, b.customer, b.origin.name, b.dest.name].some(v => v.toLowerCase().includes(keyword)))
  const setOpen = (b: Booking) => setOpenId(b.id)
  const opened = (all ?? []).find(b => b.id === open)
  const revenue = sum(REVENUE), cost = sum(COST), profit = revenue - cost
  const trips = sum(OTD.map(o => o[2]))
  const otdRate = ((OTD[0][2] + OTD[1][2]) / trips) * 100
  const ref = useStaggerIn('.stat-card, .card', [])

  const stats: [string, string, string, string][] = [
    ['Doanh thu', ty(revenue), 'Tăng 12% so với năm trước', 'fa-sack-dollar'],
    ['Chi phí vận hành', ty(cost), 'Tăng 5% (do sự cố)', 'fa-receipt'],
    ['Lợi nhuận', ty(profit), `Biên lợi nhuận đạt ${Math.round((profit / revenue) * 100)}%`, 'fa-chart-line'],
    ['Giao đúng giờ', `${otdRate.toFixed(1)}%`, `${OTD[0][2] + OTD[1][2]}/${trips} chuyến không trễ`, 'fa-stopwatch'],
  ]

  return (
    <div className="page">
      <div ref={ref} className={`wrap ${s.wrap}`}>
        <div className="page-header"><h1>Tổng quan</h1></div>
        <ScheduleStrip orders={orders} onOpen={setOpen} onCalendar={() => setCalendar(true)} />
        <div className={bd.boardHead}>
          <h2 className={s.sectionTitle} style={{ margin: 0 }}>Tất cả đơn</h2>
          <div className={bd.boardTools}>
            <label className={bd.search}><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input className="form-control" placeholder="Tìm theo mã đơn, khách hàng, tuyến…" value={text} onChange={e => setText(e.target.value)} /></label>
            <span className={bd.seg}><span className={bd.segOn}><i className="fa-solid fa-table-columns" /> Kanban</span><Link to="/manager/progress"><i className="fa-solid fa-table-list" /> Bảng</Link></span>
          </div>
        </div>
        <OrderBoard orders={orders} onOpen={setOpen} />
        <h2 className={s.sectionTitle}>Số liệu năm 2026</h2>
        <div className="stat-grid">
          {stats.map(([label, value, note, icon]) => (
            <div key={label} className="stat-card"><div className="stat-label"><i className={`fa-solid ${icon}`} /> {label}</div><div className="stat-value">{value}</div><div className="sub-text">{note}</div></div>
          ))}
        </div>
        <div className={s.grid}>
          <div className="card"><div className="card-header"><h3><i className="fa-solid fa-chart-column" /> Doanh thu và chi phí (tỷ VND)</h3></div><FinanceChart data={MONTHS} /></div>
          <div className="card">
            <div className="card-header"><h3><i className="fa-solid fa-stopwatch" /> Giao đúng giờ</h3></div>
            <div className={s.otdBar} role="img" aria-label={OTD.map(o => `${o[1]} ${o[2]} chuyến`).join(', ')}>
              {OTD.map(([k, label, n, color]) => <div key={k} title={`${label}: ${n} chuyến`} style={{ flexGrow: n, background: color }} />)}
            </div>
            <ul className={s.otdList}>
              {OTD.map(([k, label, n, color, icon]) => (
                <li key={k}><span><i className={`fa-solid ${icon}`} style={{ color }} /> {label}</span><b>{n} chuyến</b><span className="text-muted">{((n / trips) * 100).toFixed(1)}%</span></li>
              ))}
            </ul>
          </div>
        </div>
        <Link to="/manager/trip-reports" className="text-orange small">Xem báo cáo chuyến đi →</Link>
      </div>
      {calendar && <CalendarModal orders={all ?? []} onClose={() => setCalendar(false)} onOpen={b => { setCalendar(false); setOpen(b) }} />}
      {opened && <OrderDetailModal b={opened} onClose={() => setOpenId(null)} />}
    </div>
  )
}
