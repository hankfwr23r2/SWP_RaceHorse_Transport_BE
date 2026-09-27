// Chuẩn bị giấy tờ chuyến đi (danh sách). Chuyển từ Specialist/CUS2_Policy_List.html + thu_tuc.js (renderList).
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { HOUR } from '@shared/config/business-rules'
import { proceduresFor } from '@shared/config/documents'
import { handoverDue } from '@shared/lib/deadlines'
import { formatDate, formatDateTime, formatDeadline } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { ordersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import type { Order } from '@shared/types/order'
import { usePagination } from '@shared/ui/usePagination'
import { partStyles as p } from '../../../shared/parts'
import { papersState, procedureExpiresEarly, progressOf, type PapersState } from './papers'

const TABS: [PapersState, string][] = [['preparing', 'Đang chuẩn bị'], ['ready', 'Sẵn sàng bàn giao'], ['handed', 'Đã bàn giao Điều phối'], ['reported', 'Đã báo cáo Manager']]

export function DueBadge({ o, st }: { o: Order; st: PapersState }) {
  if (st === 'handed') return <span className="text-muted small">Bàn giao lúc {formatDateTime(o.papers!.handedAt!)}</span>
  if (st === 'reported') return <span className="text-muted small">Báo cáo lúc {formatDateTime(o.papersReport!.at)}</span>
  const due = handoverDue(o.departAt)
  if (Date.now() > due) return <span className="badge badge-danger">Quá hạn bàn giao</span>
  const hoursLeft = (due - Date.now()) / HOUR
  return <span className={`badge ${hoursLeft <= 24 ? 'badge-danger' : hoursLeft <= 48 ? 'badge-warning' : 'badge-success'}`}>{formatDeadline(due)}</span>
}

export function PapersBadge({ o, st }: { o: Order; st: PapersState }) {
  if (st === 'ready') return <span className="badge badge-success"><i className="fa-solid fa-circle-check" /> Sẵn sàng bàn giao</span>
  if (st === 'handed') return <span className="badge badge-muted"><i className="fa-solid fa-handshake" /> Đã bàn giao {o.coordinator}</span>
  if (st === 'reported') return <span className="badge badge-orange">Đã báo cáo Manager</span>
  const pr = progressOf(o)
  const warn = proceduresFor(!!o.border).some(k => procedureExpiresEarly(o, k))
  return <span className={`badge ${warn ? 'badge-danger' : 'badge-info'}`}>{warn && <i className="fa-solid fa-triangle-exclamation" />} Đủ {pr.done}/{pr.total} giấy</span>
}

export default function TripPapersListPage() {
  const { session } = useAuth()
  const me = session!.name
  const { data: orders = [] } = useLoad(ordersApi.list)
  const [tab, setTab] = useState<PapersState>('preparing')
  const mine = orders.flatMap(o => { const st = papersState(o, me); return st ? [{ o, st }] : [] })
  const list = mine.filter(x => x.st === tab).sort((a, b) => a.o.departAt - b.o.departAt)
  const { rows, bar, reset } = usePagination(list)
  const tableRef = useStaggerIn('tbody tr', [tab, list.length])
  const active = mine.filter(x => x.st === 'preparing' || x.st === 'ready')
  const stats: [string, number, string][] = [
    ['Đang chuẩn bị', mine.filter(x => x.st === 'preparing').length, 'fa-regular fa-clock'],
    ['Hạn bàn giao ≤ 24 giờ', active.filter(x => handoverDue(x.o.departAt) - Date.now() <= 24 * HOUR).length, 'fa-solid fa-triangle-exclamation'],
    ['Sẵn sàng bàn giao', mine.filter(x => x.st === 'ready').length, 'fa-solid fa-box-archive'],
    ['Đã bàn giao', mine.filter(x => x.st === 'handed').length, 'fa-regular fa-circle-check'],
  ]

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Kiểm dịch / <span className="text-orange font-semibold">Chuẩn bị giấy tờ chuyến đi</span></div>
        <div className="page-header">
          <h1>Chuẩn bị giấy tờ chuyến đi</h1>
          <p>Đơn đã thanh toán do bạn (<b>{me}</b>) phụ trách: nhận bản gốc của khách, cập nhật giấy cơ quan chức năng cấp, bàn giao bộ giấy cho Điều phối viên trước 12:00 ngày D−2.</p>
        </div>
        <div className="stat-grid">
          {stats.map(([label, value, icon]) => <div key={label} className="stat-card"><div className="stat-label"><i className={icon} /> {label}</div><div className="stat-value">{value} <span className="small text-muted">đơn</span></div></div>)}
        </div>
        <div className="card">
          <div className="tabs">
            {TABS.map(([key, label]) => <button key={key} className={`tab ${key === tab ? 'active' : ''}`} onClick={() => { setTab(key); reset() }}>{label}<span className="count">{mine.filter(x => x.st === key).length}</span></button>)}
          </div>
          <div ref={tableRef} className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến đường</th><th>Số ngựa</th><th>Khởi hành</th><th>Hạn bàn giao</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {rows.length ? rows.map(({ o, st }) => {
                  const working = st === 'preparing' || st === 'ready'
                  return (
                    <tr key={o.id}>
                      <td className={p.idCell}>{o.id}</td>
                      <td className="font-semibold">{o.customer}</td>
                      <td>{o.routeShort}{o.border && <div className="sub-text"><i className="fa-solid fa-flag" /> {o.border}</div>}</td>
                      <td><b>{o.horses.length}</b> ngựa</td>
                      <td className="text-muted">{formatDate(o.departAt)}</td>
                      <td><DueBadge o={o} st={st} /></td>
                      <td><PapersBadge o={o} st={st} /></td>
                      <td className="text-right nowrap"><Link className={`btn btn-sm ${working ? 'btn-primary' : 'btn-ghost'}`} to={`/specialist/trip-papers/${o.id}`}>{working ? 'Xử lý' : 'Xem'}</Link></td>
                    </tr>
                  )
                }) : <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 24 }}>Không có đơn nào</td></tr>}
              </tbody>
            </table>
          </div>
          {bar}
        </div>
      </div>
    </div>
  )
}
