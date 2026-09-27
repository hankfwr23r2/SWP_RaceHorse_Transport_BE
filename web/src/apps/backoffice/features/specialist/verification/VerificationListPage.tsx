// Hồ sơ được giao (danh sách). Chuyển từ Specialist/CUS2_KiemDich.html + kiem_dich.js (renderList).
// Đơn Manager đã phân công cho kiểm dịch viên đang đăng nhập; xác minh toàn bộ giấy tờ trong hạn xử lý.
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { workingDaysBetween } from '@shared/lib/dates'
import { formatDate, formatDateTime, formatDeadline } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { ordersApi } from '@shared/services/orders'
import { staffApi } from '@shared/services/staff'
import { useLoad } from '@shared/services/useLoad'
import type { Order } from '@shared/types/order'
import { usePagination } from '@shared/ui/usePagination'
import { partStyles as p } from '../../../shared/parts'
import { closedAt, deadlineOf, progressOf, verifyState, type VerifyState } from './verification'

type Tab = 'verifying' | 'waiting' | 'done'
const TABS: [Tab, string][] = [['verifying', 'Cần xác minh'], ['waiting', 'Chờ khách bổ sung'], ['done', 'Đã xử lý']]
const tabOf = (st: VerifyState): Tab => (st === 'passed' || st === 'reported' ? 'done' : st)

export function DeadlineBadge({ o, st }: { o: Order; st: VerifyState }) {
  if (st === 'waiting') return <span className="badge badge-muted"><i className="fa-solid fa-pause" /> Tạm dừng từ {o.task?.pausedSince ? formatDate(o.task.pausedSince) : '—'}</span>
  if (st !== 'verifying') {
    const at = closedAt(o)
    return <span className="text-muted small">{at ? `Kết luận lúc ${formatDateTime(at)}` : 'Đã kết luận'}</span>
  }
  const deadline = deadlineOf(o).time
  if (Date.now() > deadline) return <span className="badge badge-danger">Quá hạn</span>
  const left = workingDaysBetween(Date.now(), deadline)
  if (left === 0) return <span className="badge badge-danger">Hạn hôm nay 17:00</span>
  return <span className={`badge ${left === 1 ? 'badge-warning' : 'badge-success'}`}>Còn {left} ngày · {formatDeadline(deadline)}</span>
}

export function StateBadge({ o, st }: { o: Order; st: VerifyState }) {
  switch (st) {
    case 'verifying': {
      const pr = progressOf(o, st)
      return <>{o.status === 'rechecking' && <span className="badge badge-warning"><i className="fa-solid fa-magnifying-glass" /> Kiểm tra lại</span>} <span className="badge badge-info">Đang xác minh {pr.decided}/{pr.total}</span></>
    }
    case 'waiting': return <span className="badge badge-warning">Chờ khách bổ sung</span>
    case 'reported': return <span className="badge badge-orange">Đã báo cáo Manager</span>
    case 'passed': return <span className="badge badge-success">Hợp lệ · đã chuyển Điều phối</span>
  }
}

export default function VerificationListPage() {
  const { session } = useAuth()
  const me = session!.name
  const { data: orders = [] } = useLoad(ordersApi.list)
  const { data: staff = [] } = useLoad(staffApi.list)
  const [tab, setTab] = useState<Tab>('verifying')
  const mine = orders.flatMap(o => { const st = verifyState(o, me); return st ? [{ o, st }] : [] })
  const list = mine.filter(x => tabOf(x.st) === tab).sort((a, b) =>
    tab === 'verifying' ? deadlineOf(a.o).time - deadlineOf(b.o).time : (closedAt(b.o) ?? 0) - (closedAt(a.o) ?? 0))
  const { rows, bar, reset } = usePagination(list)
  const tableRef = useStaggerIn('tbody tr', [tab, list.length])
  const verifying = mine.filter(x => x.st === 'verifying')
  const stats: [string, number, string][] = [
    ['Cần xác minh', verifying.length, 'fa-regular fa-clock'],
    ['Sắp đến hạn (≤ 1 ngày)', verifying.filter(x => workingDaysBetween(Date.now(), deadlineOf(x.o).time) <= 1).length, 'fa-solid fa-triangle-exclamation'],
    ['Chờ khách bổ sung', mine.filter(x => x.st === 'waiting').length, 'fa-solid fa-pause'],
    ['Đã xử lý', mine.filter(x => tabOf(x.st) === 'done').length, 'fa-regular fa-circle-check'],
  ]
  const myId = staff.find(s => s.name === me)?.id

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Kiểm dịch / <span className="text-orange font-semibold">Hồ sơ được giao</span></div>
        <div className="page-header">
          <h1>Hồ sơ được giao</h1>
          <p>Đơn Quản lý đã phân công cho bạn (<b>{me}{myId && ` · ${myId}`}</b>). Xác minh toàn bộ giấy tờ của từng đơn trong hạn xử lý.</p>
        </div>
        <div className="stat-grid">
          {stats.map(([label, value, icon]) => <div key={label} className="stat-card"><div className="stat-label"><i className={icon} /> {label}</div><div className="stat-value">{value} <span className="small text-muted">đơn</span></div></div>)}
        </div>
        <div className="card">
          <div className="tabs">
            {TABS.map(([key, label]) => <button key={key} className={`tab ${key === tab ? 'active' : ''}`} onClick={() => { setTab(key); reset() }}>{label}<span className="count">{mine.filter(x => tabOf(x.st) === key).length}</span></button>)}
          </div>
          <div ref={tableRef} className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến đường</th><th>Số ngựa</th><th>Khởi hành</th><th>Hạn xử lý</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {rows.length ? rows.map(({ o, st }) => (
                  <tr key={o.id}>
                    <td className={p.idCell}>{o.id}</td>
                    <td className="font-semibold">{o.customer}</td>
                    <td>{o.routeShort}{o.border && <div className="sub-text"><i className="fa-solid fa-flag" /> {o.border}</div>}</td>
                    <td><b>{o.horses.length}</b> ngựa</td>
                    <td className="text-muted">{formatDate(o.departAt)}</td>
                    <td><DeadlineBadge o={o} st={st} /></td>
                    <td><StateBadge o={o} st={st} /></td>
                    <td className="text-right nowrap"><Link className={`btn btn-sm ${st === 'verifying' ? 'btn-primary' : 'btn-ghost'}`} to={`/specialist/verification/${o.id}`}>{st === 'verifying' ? 'Xác minh' : 'Xem'}</Link></td>
                  </tr>
                )) : <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 24 }}>Không có đơn nào</td></tr>}
              </tbody>
            </table>
          </div>
          {bar}
        </div>
      </div>
    </div>
  )
}
