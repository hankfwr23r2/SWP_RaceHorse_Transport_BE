// Doanh thu, chi phí (cột) và lợi nhuận (đường) theo tháng, CÙNG MỘT trục "tỷ VND".
// Màu: 3 ô đầu của bảng màu phân loại đã kiểm định (dataviz validate_palette: PASS; xanh ngọc tương phản thấp
// nên luôn có nhãn trực tiếp ở điểm cuối và chế độ xem bảng).
import { useState } from 'react'
import s from './Dashboard.module.css'

export interface MonthPoint { month: string; revenue: number; cost: number; profit: number }
const SERIES = [
  { key: 'revenue', label: 'Doanh thu', color: '#2a78d6' },
  { key: 'cost', label: 'Chi phí', color: '#eb6834' },
  { key: 'profit', label: 'Lợi nhuận', color: '#1baf7a' },
] as const

const W = 760, H = 300, PAD = { l: 44, r: 70, t: 16, b: 32 }
const fmt = (v: number) => `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`

export function FinanceChart({ data }: { data: MonthPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = Math.ceil(Math.max(...data.map(d => Math.max(d.revenue, d.cost))) + 1)
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b
  const step = plotW / data.length
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH
  const bw = Math.min(14, step / 3.2)
  const cx = (i: number) => PAD.l + step * i + step / 2
  const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter(t => t % Math.ceil(max / 5) === 0)
  const line = data.map((d, i) => `${i ? 'L' : 'M'} ${cx(i)} ${y(d.profit)}`).join(' ')
  const last = data[data.length - 1]

  return (
    <div>
      <div className={s.chartHead}>
        <div className={s.legend}>{SERIES.map(x => <span key={x.key}><i style={{ background: x.color, borderRadius: x.key === 'profit' ? 999 : 3 }} />{x.label}</span>)}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setTable(!table)}><i className={`fa-solid ${table ? 'fa-chart-column' : 'fa-table'}`} /> {table ? 'Xem biểu đồ' : 'Xem bảng'}</button>
      </div>
      {table ? (
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Tháng</th>{SERIES.map(x => <th key={x.key} className="text-right">{x.label}</th>)}</tr></thead>
          <tbody>{data.map(d => <tr key={d.month}><td>{d.month}</td>{SERIES.map(x => <td key={x.key} className="text-right">{fmt(d[x.key])}</td>)}</tr>)}</tbody>
        </table></div>
      ) : (
        <div className={s.chartBox}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Doanh thu, chi phí và lợi nhuận theo tháng (tỷ VND)" onMouseLeave={() => setHover(null)}>
            {ticks.map(t => <g key={t}><line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} /><text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className={s.axis}>{t}</text></g>)}
            {hover !== null && <rect x={PAD.l + step * hover} y={PAD.t} width={step} height={plotH} className={s.band} />}
            {data.map((d, i) => (
              <g key={d.month}>
                <path d={`M ${cx(i) - bw - 1} ${y(0)} V ${y(d.revenue) + 4} q 0 -4 4 -4 h ${bw - 8} q 4 0 4 4 V ${y(0)} Z`} fill={SERIES[0].color} />
                <path d={`M ${cx(i) + 1} ${y(0)} V ${y(d.cost) + 4} q 0 -4 4 -4 h ${bw - 8} q 4 0 4 4 V ${y(0)} Z`} fill={SERIES[1].color} />
                <text x={cx(i)} y={H - 10} textAnchor="middle" className={s.axis}>{d.month}</text>
                <rect x={PAD.l + step * i} y={PAD.t} width={step} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            ))}
            <path d={line} fill="none" stroke={SERIES[2].color} strokeWidth={2} pointerEvents="none" />
            {data.map((d, i) => <circle key={d.month} cx={cx(i)} cy={y(d.profit)} r={hover === i ? 5 : 3.5} fill={SERIES[2].color} stroke="white" strokeWidth={2} pointerEvents="none" />)}
            {/* Nhãn trực tiếp ở điểm cuối */}
            <text x={W - PAD.r + 8} y={y(last.revenue) + 4} className={s.direct}>{fmt(last.revenue)}</text>
            <text x={W - PAD.r + 8} y={y(last.cost) + 4} className={s.direct}>{fmt(last.cost)}</text>
            <text x={W - PAD.r + 8} y={y(last.profit) + 4} className={s.direct}>{fmt(last.profit)}</text>
          </svg>
          {hover !== null && (
            <div className={s.tooltip} style={{ left: `${((cx(hover)) / W) * 100}%` }}>
              <b>{data[hover].month}</b>
              {SERIES.map(x => <div key={x.key}><i style={{ background: x.color }} />{x.label}<span>{fmt(data[hover][x.key])}</span></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
