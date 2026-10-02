// Manager: duyệt Lệnh điều vận (Trip Manifest). Duyệt thì đẩy xuống app Driver và Escort, báo khách (PRD mục 4.3, 4.4).
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { borderOutsideWindow, validateRoutePlan } from '@shared/lib/booking'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi, vehiclesApi } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { Tabs } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import { ManifestView } from '../../../shared/ManifestView'
import s from '../../../shared/booking.module.css'

type Tab = 'todo' | 'done'

function ManifestModal({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { session } = useAuth()
  const { data: vehicles } = useLoad(vehiclesApi.list)
  const { data: crew } = useLoad(crewApi.list)
  const [returning, setReturning] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const warnings = b.route ? validateRoutePlan(b.route, b.type === 'international').warnings : []
  const outside = b.route?.borderEta && borderOutsideWindow(b.route.borderEta)

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast(msg); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không thực hiện được', 'error'); setBusy(false) }
  }

  return (
    <Modal
      wide onClose={onClose} title={`Duyệt Trip Manifest ${b.id}`} subtitle={`${b.customer} · khởi hành ${formatDate(b.departAt)}`}
      footer={returning
        ? <><button className="btn btn-ghost" onClick={() => setReturning(false)}>Quay lại</button><button className="btn btn-danger" disabled={busy || !note.trim()} onClick={() => run(() => bookingsApi.returnRoutePlan(b.id, session!.name, note), 'Đã trả lộ trình về Coordinator')}>Trả về Coordinator</button></>
        : <><button className="btn btn-ghost" onClick={() => setReturning(true)}><i className="fa-solid fa-rotate-left" /> Trả về chỉnh sửa</button><button className="btn btn-primary" disabled={busy} onClick={() => run(() => bookingsApi.approveManifest(b.id, session!.name), `Đã duyệt Manifest ${b.id}, đẩy xuống Driver và Escort`)}><i className="fa-solid fa-stamp" /> Duyệt Trip Manifest</button></>}
    >
      {warnings.length > 0 && <div className="alert alert-warning" style={{ marginBottom: 14 }}><i className="fa-solid fa-triangle-exclamation" /><div><b>Cần quyết định ngoại lệ:</b> {warnings.join(' ')}{outside && b.route?.borderEta ? ` (ETA ${formatDateTime(b.route.borderEta)}). Duyệt nghĩa là bạn chấp nhận ngoại lệ này.` : ''}</div></div>}
      <ManifestView b={b} vehicle={vehicles?.find(v => v.id === b.fleet?.vehicleId)} driver={crew?.find(c => c.id === b.fleet?.driverId)} escort={crew?.find(c => c.id === b.fleet?.escortId)} />
      {returning && (
        <div className="form-group" style={{ marginTop: 14 }}>
          <label htmlFor="rn" className="required">Lý do trả về (Coordinator sẽ thấy)</label>
          <textarea id="rn" className="form-control" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Đổi ETA cửa khẩu sang sau 07:30, thêm một trạm nghỉ ở chặng 2." />
        </div>
      )}
    </Modal>
  )
}

export default function ManifestsPage() {
  const { data: all, reload } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const [open, setOpen] = useState<Booking | null>(null)
  const list = all ?? []
  const todo = list.filter(b => b.status === 'route_plan_completed')
  const done = list.filter(b => b.manifest)
  const shown = tab === 'todo' ? todo : done

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Duyệt Trip Manifest</h1>
          <p>Lệnh điều vận chi tiết do Điều phối lập. Duyệt thì Driver và Escort nhận lệnh trên app, khách nhận lộ trình.</p>
        </div>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Chờ duyệt', todo.length], ['done', 'Đã duyệt', done.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>Lộ trình</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {shown.map(b => {
                const warn = b.route ? validateRoutePlan(b.route, b.type === 'international').warnings.length : 0
                return (
                  <tr key={b.id}>
                    <td className={s.id}>{b.id}{b.manifest && <div className={s.sub}>{b.manifest.tripId}</div>}</td>
                    <td>{b.customer}</td>
                    <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                    <td className="nowrap">{formatDate(b.departAt)}</td>
                    <td>{b.route ? `${b.route.legs.length} chặng` : '—'}{warn > 0 && <div className={s.sub} style={{ color: 'var(--amber)' }}>Có đề nghị ngoại lệ</div>}</td>
                    <td><BookingStatusBadge status={b.status} audience="staff" />{b.manifest && <div className={s.sub}>Nhận lệnh: tài xế {b.manifest.acks.driver ? '✓' : '—'} · hộ tống {b.manifest.acks.escort ? '✓' : '—'}</div>}</td>
                    <td className="text-right"><button className={`btn btn-sm ${tab === 'todo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setOpen(b)}>{tab === 'todo' ? 'Duyệt Manifest' : 'Xem'}</button></td>
                  </tr>
                )
              })}
              {all && !shown.length && <tr><td colSpan={7}><div className={s.empty}><i className="fa-solid fa-circle-check" />Không có Manifest nào ở mục này.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {open && (tab === 'todo'
        ? <ManifestModal b={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />
        : <ManifestReadModal b={open} onClose={() => setOpen(null)} />)}
    </div>
  )
}

function ManifestReadModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  const { data: vehicles } = useLoad(vehiclesApi.list)
  const { data: crew } = useLoad(crewApi.list)
  return (
    <Modal wide onClose={onClose} title={`Trip Manifest ${b.manifest?.tripId} · ${b.id}`} subtitle={b.manifest && `Duyệt bởi ${b.manifest.approvedBy} lúc ${formatDateTime(b.manifest.approvedAt)}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-primary" onClick={() => window.print()}><i className="fa-solid fa-print" /> In Manifest</button></>}>
      <ManifestView b={b} vehicle={vehicles?.find(v => v.id === b.fleet?.vehicleId)} driver={crew?.find(c => c.id === b.fleet?.driverId)} escort={crew?.find(c => c.id === b.fleet?.escortId)} />
    </Modal>
  )
}
