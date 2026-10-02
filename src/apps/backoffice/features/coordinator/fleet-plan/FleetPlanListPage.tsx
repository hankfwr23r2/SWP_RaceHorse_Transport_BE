// Coordinator: đơn được giao lập phương án xe, tài xế, hộ tống và lộ trình (PRD mục 2.4, nhánh B).
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { VEHICLE_CLASS } from '@shared/config/booking-rules'
import { classForHorses } from '@shared/lib/booking'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import { Tabs } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

type Tab = 'todo' | 'done'

export default function FleetPlanListPage() {
  const { session } = useAuth()
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const mine = (all ?? []).filter(b => b.intake?.coordinator.name === session!.name)
  const todo = mine.filter(b => !b.fleet)
  const done = mine.filter(b => b.fleet)
  const shown = tab === 'todo' ? todo : done

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Phương án xe và lộ trình</h1>
          <p>Đơn được giao cho bạn. Chọn xe nguyên chuyến, tài xế đi theo xe, nhân viên hộ tống và lập lộ trình sơ bộ.</p>
        </div>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Cần lập phương án', todo.length], ['done', 'Đã chốt', done.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>Ngựa · xe cần</th><th>{tab === 'done' ? 'Chốt lúc' : 'Giao lúc'}</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {shown.map(b => (
                <tr key={b.id}>
                  <td className={s.id}>{b.id}</td>
                  <td>{b.customer}</td>
                  <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                  <td className="nowrap">{formatDate(b.departAt)}</td>
                  <td>{b.horses.length} ngựa<div className={s.sub}>Hạng {VEHICLE_CLASS[classForHorses(b.horses.length)].label}</div></td>
                  <td className="nowrap">{tab === 'done' ? formatDateTime(b.fleet!.confirmedAt) : formatDateTime(b.intake!.at)}</td>
                  <td className="text-right"><Link to={`/coordinator/fleet-plan/${b.id}`} className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'todo' ? 'Lập phương án' : 'Xem'}</Link></td>
                </tr>
              ))}
              {all && !shown.length && <tr><td colSpan={7}><div className={s.empty}><i className="fa-solid fa-circle-check" />Không có đơn nào ở mục này.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
