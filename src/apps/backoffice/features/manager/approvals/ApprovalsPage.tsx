// Manager: duyệt báo giá cuối sau khi Kiểm dịch viên và Điều phối viên đều đạt (PRD mục 2.5).
// Báo giá do hệ thống tính; Manager chỉ điều chỉnh phụ phí và chiết khấu thương mại rồi gửi cho khách.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { DEMURRAGE_PER_HOUR, QUOTE_VALID_HOURS, VEHICLE_CLASS } from '@shared/config/booking-rules'
import { finalizeQuote, vehicleClassOf } from '@shared/lib/booking'
import { formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi, vehiclesApi } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { Modal } from '@shared/ui/Modal'
import { QuoteSheet } from '@shared/ui/QuoteSheet'
import { useToast } from '@shared/ui/toast'
import { HorseConfigList, Tabs, TripSummary } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

type Tab = 'todo' | 'sent'
interface AdjRow { kind: 'surcharge' | 'discount'; label: string; amount: string }
const digits = (v: string) => Number(v.replace(/\D/g, '')) || 0

function QuoteModal({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { session } = useAuth()
  const { data: draft } = useLoad(() => bookingsApi.quoteDraft(b.id), [b.id])
  const { data: vehicles } = useLoad(vehiclesApi.list)
  const { data: crew } = useLoad(crewApi.list)
  const [rows, setRows] = useState<AdjRow[]>([])
  const [busy, setBusy] = useState(false)
  const vehicle = vehicles?.find(v => v.id === b.fleet?.vehicleId)
  const adjustments = rows.filter(r => r.label.trim() && digits(r.amount) > 0).map(r => ({ label: r.label.trim(), amount: r.kind === 'discount' ? -digits(r.amount) : digits(r.amount) }))
  const preview = draft && finalizeQuote(draft.lines, adjustments, Date.now(), session!.name, DEMURRAGE_PER_HOUR)
  const nameOf = (id?: string) => crew?.find(c => c.id === id)?.name ?? '—'
  const set = (i: number, patch: Partial<AdjRow>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const send = async () => {
    setBusy(true)
    try { await bookingsApi.sendQuote(b.id, session!.name, adjustments); toast(`Đã gửi báo giá ${b.id} cho khách, hiệu lực ${QUOTE_VALID_HOURS} giờ`); onDone() }
    catch (e) { toast(e instanceof Error ? e.message : 'Không gửi được', 'error'); setBusy(false) }
  }

  return (
    <Modal
      wide onClose={onClose} title={`Duyệt báo giá ${b.id}`} subtitle={`${b.customer} · khởi hành ${formatDate(b.departAt)}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-primary" disabled={busy || !preview} onClick={send}><i className="fa-solid fa-paper-plane" /> Duyệt và gửi báo giá</button></>}
    >
      <h4 style={{ marginBottom: 10 }}>Kết quả thẩm định</h4>
      <dl className={s.grid}>
        <div><dt>Y tế</dt><dd>Đạt · {b.medical?.by}<div className={s.sub}>Nhiệt độ {b.medical?.temp}°C{b.medical?.restPlan ? ` · ${b.medical.restPlan}` : ''}</div></dd></div>
        <div><dt>Xe</dt><dd>{vehicle ? `${vehicle.plate} · ${VEHICLE_CLASS[vehicleClassOf(vehicle.capacity)].label} (${vehicle.capacity} ngăn)` : '—'}</dd></div>
        <div><dt>Tài xế · Hộ tống</dt><dd>{nameOf(b.fleet?.driverId)} · {nameOf(b.fleet?.escortId)}</dd></div>
        <div><dt>ETD · ETA</dt><dd>{b.fleet && formatDateTime(b.fleet.etd)}<div className={s.sub}>Đến {b.fleet && formatDateTime(b.fleet.etaDest)}</div></dd></div>
      </dl>

      <h4 style={{ margin: '18px 0 10px' }}>Chuyến đi</h4>
      <TripSummary b={b} />
      <h4 style={{ margin: '18px 0 10px' }}>Ngựa và dịch vụ</h4>
      <HorseConfigList b={b} />

      <h4 style={{ margin: '18px 0 10px' }}>Điều chỉnh báo giá (không bắt buộc)</h4>
      {rows.map((r, i) => (
        <div key={i} className={s.adj}>
          <input className="form-control" aria-label="Nội dung điều chỉnh" placeholder={r.kind === 'discount' ? 'VD: Khách hàng thân thiết' : 'VD: Phụ phí chuyến gấp'} value={r.label} onChange={e => set(i, { label: e.target.value })} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="form-control" aria-label="Loại điều chỉnh" value={r.kind} onChange={e => set(i, { kind: e.target.value as AdjRow['kind'] })} style={{ width: 110 }}><option value="surcharge">Phụ phí</option><option value="discount">Chiết khấu</option></select>
            <input className="form-control" aria-label="Số tiền" inputMode="numeric" placeholder="Số tiền" value={r.amount ? digits(r.amount).toLocaleString('en-US') : ''} onChange={e => set(i, { amount: String(digits(e.target.value) || '') })} />
          </div>
          <button className={s.iconBtn} aria-label="Xóa dòng" onClick={() => setRows(x => x.filter((_, j) => j !== i))}><i className="fa-solid fa-trash" /></button>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => setRows(r => [...r, { kind: 'surcharge', label: '', amount: '' }])}><i className="fa-solid fa-plus" /> Thêm dòng điều chỉnh</button>

      <h4 style={{ margin: '18px 0 10px' }}>Báo giá gửi khách</h4>
      {preview ? <QuoteSheet {...preview} /> : <p className="text-muted">Đang tính…</p>}
    </Modal>
  )
}

export default function ApprovalsPage() {
  const { data: all, reload } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const [open, setOpen] = useState<Booking | null>(null)
  const list = all ?? []
  const todo = list.filter(b => b.status === 'pending_commercial')
  const sent = list.filter(b => b.quote)
  const shown = tab === 'todo' ? todo : sent

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Duyệt báo giá</h1>
          <p>Đơn đã có kết quả thẩm định y tế và phương án xe. Duyệt báo giá để gửi khách, khách có {QUOTE_VALID_HOURS} giờ đặt cọc 50%.</p>
        </div>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Chờ duyệt báo giá', todo.length], ['sent', 'Đã gửi báo giá', sent.length]]} />
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tuyến</th><th>Khởi hành</th><th>Ngựa</th>{tab === 'sent' && <th className="text-right">Tổng / Cọc</th>}<th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {shown.map(b => (
                <tr key={b.id}>
                  <td className={s.id}>{b.id}</td>
                  <td>{b.customer}</td>
                  <td>{placeShort(b.origin.name)} → {placeShort(b.dest.name)}<div className={s.sub}>{b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}</div></td>
                  <td className="nowrap">{formatDate(b.departAt)}</td>
                  <td>{b.horses.length}</td>
                  {tab === 'sent' && <td className="text-right nowrap">{b.quote && <>{formatVND(b.quote.total)}<div className={s.sub}>Cọc {formatVND(b.quote.deposit)}</div></>}</td>}
                  <td><BookingStatusBadge status={b.status} audience="staff" /></td>
                  <td className="text-right">{tab === 'todo' ? <button className="btn btn-primary btn-sm" onClick={() => setOpen(b)}>Duyệt báo giá</button> : <span className={s.sub}>{b.quote && `Gửi ${formatDateTime(b.quote.sentAt)}`}</span>}</td>
                </tr>
              ))}
              {all && !shown.length && <tr><td colSpan={8}><div className={s.empty}><i className="fa-solid fa-circle-check" />{tab === 'todo' ? 'Không có đơn nào chờ duyệt báo giá.' : 'Chưa gửi báo giá nào.'}</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {open && <QuoteModal b={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />}
    </div>
  )
}
