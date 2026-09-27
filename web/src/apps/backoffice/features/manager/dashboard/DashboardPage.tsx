// Bảng điều khiển Quản lý. Chuyển từ Manager/manager_dashboard.html (Chart.js → SVG).
// Số tổng tính từ số liệu tháng (bản cũ ghi cứng 46,5 / 31,2 / 15,3 tỷ, không khớp tổng 12 tháng).
import { Link } from 'react-router'
import { formatClock, formatDate, formatVND } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { reportsApi, type TripReport } from '@shared/services/reports'
import { useLoad } from '@shared/services/useLoad'
import { partStyles as m } from '../../../shared/parts'
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

function OtdBadge({ r }: { r: TripReport }) {
  if (r.otd === 'on_time') return <span className="badge badge-success">Đúng giờ</span>
  const d = r.otdMinutes >= 60 ? `${r.otdMinutes / 60}h` : `${r.otdMinutes}p`
  return r.otd === 'early' ? <span className="badge badge-info">Sớm ({d})</span> : <span className="badge badge-danger">Trễ ({d})</span>
}

export default function DashboardPage() {
  const { data: reports = [] } = useLoad(reportsApi.list)
  const revenue = sum(REVENUE), cost = sum(COST), profit = revenue - cost
  const trips = sum(OTD.map(o => o[2]))
  const otdRate = ((OTD[0][2] + OTD[1][2]) / trips) * 100
  const ref = useStaggerIn('.stat-card, .card', [])

  const stats: [string, string, string, string][] = [
    ['Tổng Doanh Thu (2026)', ty(revenue), 'Tăng 12% so với năm trước', 'fa-sack-dollar'],
    ['Tổng Chi Phí Vận Hành', ty(cost), 'Tăng 5% (do sự cố)', 'fa-receipt'],
    ['Lợi Nhuận Ròng', ty(profit), `Biên lợi nhuận đạt ${Math.round((profit / revenue) * 100)}%`, 'fa-chart-line'],
    ['On-Time Delivery (OTD)', `${otdRate.toFixed(1)}%`, `${OTD[0][2] + OTD[1][2]}/${trips} chuyến không trễ`, 'fa-stopwatch'],
  ]

  return (
    <div className="page">
      <div ref={ref} className={`wrap ${s.wrap}`}>
        <div className="page-header"><h1>Bảng điều khiển Quản lý</h1><p>Tổng quan về Doanh thu và Trạng thái Nhân sự của toàn bộ hệ thống.</p></div>
        <div className="stat-grid">
          {stats.map(([label, value, note, icon]) => (
            <div key={label} className="stat-card"><div className="stat-label"><i className={`fa-solid ${icon}`} /> {label}</div><div className="stat-value">{value}</div><div className="sub-text">{note}</div></div>
          ))}
        </div>
        <div className={s.grid}>
          <div className="card"><div className="card-header"><h3><i className="fa-solid fa-chart-column" /> Doanh Thu &amp; Chi Phí Vận Hành (2026, tỷ VND)</h3></div><FinanceChart data={MONTHS} /></div>
          <div className="card">
            <div className="card-header"><h3><i className="fa-solid fa-stopwatch" /> Chỉ số Hiệu suất Hoàn thành (OTD)</h3></div>
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
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-truck-fast" /> Hiệu suất Chuyến đi Gần đây</h3><Link to="/manager/trip-reports" className="text-orange small">Xem tất cả báo cáo →</Link></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã chuyến</th><th>Tuyến đường</th><th>Thời gian hoàn thành</th><th>Trạng thái (OTD)</th><th>Chi phí sự cố (nếu có)</th></tr></thead>
              <tbody>{reports.slice(0, 4).map(r => (
                <tr key={r.id}>
                  <td className={m.idCell}>#{r.tripId}</td><td>{r.route}</td>
                  <td className="nowrap">{formatClock(r.completedAt)} {formatDate(r.completedAt).slice(0, 5)}<div className="sub-text">Dự kiến: {formatClock(r.plannedAt)}</div></td>
                  <td><OtdBadge r={r} /></td>
                  <td>{r.incidentCost ? `${formatVND(r.incidentCost)} (${r.incidentNote})` : '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
