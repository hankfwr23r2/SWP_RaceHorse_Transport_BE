// Quản lý đội xe. Chuyển từ Fleet And Route/OPS-07.html + ops-07.js.
// Thêm / sửa / xóa xe, trạng thái, bảo trì; mỗi xe một tài xế cố định (chọn xe là gán tài xế theo).
// Ô số liệu tính từ danh sách xe (bản cũ ghi cứng 24 / 18 / 4 / 2).
import { useState } from 'react'
import { HOLDING } from '@shared/lib/booking'
import { bookingsApi } from '@shared/services/bookings'
import { vehiclesApi, type Vehicle, type VehicleStatus } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { cx, partStyles as p } from '../../../shared/parts'
import c from '../Coordinator.module.css'
import { useOps } from '../../../shared/useOps'

const STATUS: Record<VehicleStatus, [string, string]> = { available: ['Khả dụng', 'badge-success'], in_use: ['Đang sử dụng', 'badge-info'], maintenance: ['Đang bảo dưỡng', 'badge-warning'] }
const TYPES = ['Xe tải chuyên dụng', 'Container đặc biệt']
const formatIso = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—')
const EMPTY: Omit<Vehicle, 'id'> = { name: '', type: TYPES[0], capacity: 2, plate: '', status: 'available', maintenance: '', driverId: '', inspectionNo: '', transitPermit: '' }

export default function FleetPage() {
  const toast = useToast()
  const { trips, vehicles, crew, name, reload } = useOps()
  const { data: orders } = useLoad(bookingsApi.list)
  const [editing, setEditing] = useState<string | null>(null) // null = thêm mới
  const [form, setForm] = useState(EMPTY)
  const [invalid, setInvalid] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null)
  const drivers = crew.filter(x => x.role === 'driver')
  const stats: [string, number, string][] = [
    ['Tổng số phương tiện', vehicles.length, ''],
    ['Khả dụng', vehicles.filter(v => v.status === 'available').length, 'text-green'],
    ['Đang sử dụng', vehicles.filter(v => v.status === 'in_use').length, 'text-orange'],
    ['Đang bảo dưỡng', vehicles.filter(v => v.status === 'maintenance').length, ''],
  ]
  // Xe này đang chở những ngựa nào (đơn mới, một xe có thể chở một phần số ngựa của đơn)
  const carrying = (id: string) => (orders ?? []).filter(o => HOLDING.includes(o.status)).flatMap(o => (o.trips ?? []).filter(t => t.vehicleId === id).map(t => ({ order: o.id, trip: t.tripId, horses: o.horses.filter(h => t.horseIds.includes(h.horseId)).map(h => h.name) })))
  const usedBy = (id: string) => trips.filter(t => t.status !== 'done' && t.legs.some(l => l.vehicleId === id)).map(t => t.id)

  const edit = (v: Vehicle | null) => { setEditing(v?.id ?? null); setForm(v ? { ...v } : EMPTY); setInvalid('') }
  const save = async () => {
    if (!form.name.trim()) return setInvalid('name')
    if (!form.plate.trim()) return setInvalid('plate')
    const data = { ...form, name: form.name.trim(), plate: form.plate.trim(), capacity: Math.max(1, form.capacity || 2) }
    if (editing) await vehiclesApi.update(editing, data)
    else await vehiclesApi.create(data)
    toast(editing ? `Đã lưu xe ${editing}` : `Đã thêm xe ${data.plate}`)
    edit(null)
    reload()
  }
  const remove = async (v: Vehicle) => {
    await vehiclesApi.remove(v.id)
    setConfirmDelete(null)
    if (editing === v.id) edit(null)
    toast(`Đã xóa xe ${v.id}`, 'info')
    reload()
  }
  const set = <K extends keyof typeof form>(key: K) => (value: (typeof form)[K]) => { setInvalid(''); setForm({ ...form, [key]: value }) }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Điều phối / <span className="text-orange font-semibold">Quản lý đội xe</span></div>
        <div className="page-header">
          <h1>Quản lý đội xe</h1>
          <p>Quản lý toàn bộ phương tiện vận chuyển: thêm/sửa/xóa, theo dõi trạng thái bảo trì và tài xế cố định của từng xe.</p>
        </div>
        <div className="stat-grid">
          {stats.map(([label, value, color]) => <div key={label} className="stat-card"><div className="stat-label">{label}</div><div className={cx('stat-value', color)}>{value}</div></div>)}
        </div>
        <div className="card">
          <div className="card-header"><h3>Danh sách phương tiện</h3><button className="btn btn-primary btn-sm" onClick={() => edit(null)}><i className="fa-solid fa-plus" /> Thêm phương tiện</button></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã xe</th><th>Tên phương tiện</th><th>Loại</th><th>Sức chứa</th><th>Biển số</th><th>Tài xế cố định</th><th>Trạng thái</th><th>Đang chở</th><th>Bảo trì gần nhất</th><th /></tr></thead>
              <tbody>{vehicles.map(v => (
                <tr key={v.id} className={cx(editing === v.id && c.selected)}>
                  <td className={p.idCell}>{v.id}</td>
                  <td>{v.name}</td>
                  <td className="text-muted">{v.type}</td>
                  <td>{v.capacity} ngăn</td>
                  <td className="nowrap">{v.plate}</td>
                  <td>{v.driverId ? name(v.driverId) : <span className="text-muted">Chưa gán</span>}</td>
                  <td><span className={`badge ${STATUS[v.status][1]}`}>{STATUS[v.status][0]}</span></td>
                  <td>{carrying(v.id).map(x => <div key={x.trip}><b>{x.horses.join(', ')}</b> <span className="text-muted">({x.order})</span></div>)}{!carrying(v.id).length && <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{formatIso(v.maintenance)}</td>
                  <td className="text-right nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => edit(v)}>Sửa</button>
                    <button className="btn btn-ghost btn-sm text-red" onClick={() => (usedBy(v.id).length ? setConfirmDelete(v) : remove(v))}>Xóa</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>{editing ? `Chi tiết phương tiện — ${editing}` : 'Thêm phương tiện mới'}</h3></div>
          <div className={c.formRow}>
            <div className="form-group"><label className="required">Tên phương tiện</label><input className={cx('form-control', invalid === 'name' && 'invalid')} value={form.name} onChange={e => set('name')(e.target.value)} /></div>
            <div className="form-group"><label>Loại phương tiện</label><select className="form-control" value={form.type} onChange={e => set('type')(e.target.value)}>{TYPES.map(x => <option key={x}>{x}</option>)}</select></div>
            <div className="form-group"><label>Sức chứa (ngăn)</label><input type="number" min={1} className="form-control" value={form.capacity} onChange={e => set('capacity')(parseInt(e.target.value, 10))} /></div>
            <div className="form-group"><label className="required">Biển số</label><input className={cx('form-control', invalid === 'plate' && 'invalid')} value={form.plate} onChange={e => set('plate')(e.target.value)} /></div>
            <div className="form-group"><label>Trạng thái</label><select className="form-control" value={form.status} onChange={e => set('status')(e.target.value as VehicleStatus)}>{(Object.keys(STATUS) as VehicleStatus[]).map(k => <option key={k} value={k}>{STATUS[k][0]}</option>)}</select></div>
            <div className="form-group"><label>Số giấy đăng kiểm</label><input className="form-control" value={form.inspectionNo ?? ''} onChange={e => set('inspectionNo')(e.target.value)} /><div className="form-hint">Thiếu thì hệ thống không gán xe cho đơn.</div></div>
            <div className="form-group"><label>Giấy phép liên vận</label><input className="form-control" value={form.transitPermit ?? ''} onChange={e => set('transitPermit')(e.target.value)} /><div className="form-hint">Cần cho tuyến quốc tế.</div></div>
            <div className="form-group"><label>Ngày bảo trì gần nhất</label><input type="date" className="form-control" value={form.maintenance} onChange={e => set('maintenance')(e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label>Tài xế cố định của xe (chọn xe là gán tài xế theo)</label>
            <select className="form-control" value={form.driverId} onChange={e => set('driverId')(e.target.value)}>
              <option value="">— Chưa gán —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
            </select>
          </div>
          <div className={c.actions}>
            <button className="btn btn-ghost" onClick={() => edit(null)}>Hủy</button>
            <button className="btn btn-primary" onClick={save}><i className="fa-solid fa-floppy-disk" /> Lưu thông tin</button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <Modal title={`Xóa xe ${confirmDelete.id}?`} onClose={() => setConfirmDelete(null)} footer={<><button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Hủy</button><button className="btn btn-danger" onClick={() => remove(confirmDelete)}>Vẫn xóa</button></>}>
          <p>Xe {confirmDelete.plate} đang gán cho chuyến chưa xong: <b>{usedBy(confirmDelete.id).join(', ')}</b>. Các chặng đó sẽ không còn xe.</p>
        </Modal>
      )}
    </div>
  )
}
