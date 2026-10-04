// Manager: duyệt báo giá cuối sau khi Kiểm dịch viên và Điều phối viên đều đạt (PRD mục 2.5).
// Báo giá do hệ thống tính; Manager chỉ điều chỉnh phụ phí và chiết khấu thương mại rồi gửi cho khách.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { QUOTE_VALID_HOURS, VEHICLE_CLASS } from '@shared/config/booking-rules'
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
import { HorseConfigList, TripSummary, EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
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
  const adjustments = rows.filter(r => r.label.trim() && digits(r.amount) > 0).map(r => ({ label: r.label.trim(), amount: r.kind === 'discount' ? -digits(r.amount) : digits(r.amount) }))
  const preview = draft && finalizeQuote(draft.lines, adjustments, Date.now(), session!.name)
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
        <div><dt>Y tế</dt><dd>Đạt · {b.medical?.by}</dd></div>
        <div><dt>Lộ trình</dt><dd>{b.route ? `${b.route.legs.length} chặng, ${b.route.rests.length} trạm trung chuyển` : '—'}<div className={s.sub}>{b.route && `Khởi hành ${formatDateTime(b.route.legs[0].departAt)} · đến ${formatDateTime(b.route.legs[b.route.legs.length - 1].arriveAt)}`}</div></dd></div>
      </dl>

      <h4 style={{ margin: '18px 0 10px' }}>{b.trips && b.trips.length > 1 ? `${b.trips.length} xe của đơn` : 'Xe của đơn'}</h4>
      <dl className={s.grid}>
        {(b.trips ?? []).map((t, i) => {
          const v = vehicles?.find(x => x.id === t.vehicleId)
          return <div key={t.tripId}><dt>Xe {i + 1} · {t.tripId}</dt><dd>{v ? `${v.plate} · ${VEHICLE_CLASS[vehicleClassOf(v.capacity)].label} (${v.capacity} ngăn)` : '—'}<div className={s.sub}>{nameOf(t.driverId)} · {nameOf(t.escortId)} · {t.horseIds.length} ngựa</div></dd></div>
        })}
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
          <p>Đơn đã có kết quả thẩm định y tế, phương án xe và lộ trình. Duyệt báo giá để gửi khách, khách có {QUOTE_VALID_HOURS} giờ đặt cọc 30%.</p>
        </div>
        <ListLayout<Tab> value={tab} onChange={setTab} tabs={[['todo', 'Chờ duyệt báo giá', todo.length], ['sent', 'Đã gửi báo giá', sent.length]]}>
          {shown.map(b => (
            <OrderCard key={b.id} id={b.id} customer={b.customer} route={`${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`} kind={b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'}
              badge={<BookingStatusBadge status={b.status} audience="staff" />}
              meta={[['fa-calendar-day', 'Khởi hành', formatDate(b.departAt)], ['fa-horse-head', 'Ngựa', `${b.horses.length} con`], ['fa-truck', 'Số xe', `${b.trips?.length ?? 0}`], ...(tab === 'sent' && b.quote ? [['fa-paper-plane', 'Gửi lúc', formatDateTime(b.quote.sentAt)] as [string, string, string]] : [])]}
              side={tab === 'sent' && b.quote ? <div style={{ textAlign: 'right' }}><b>{formatVND(b.quote.total)}</b><div className={s.sub}>Cọc {formatVND(b.quote.deposit)}</div></div> : undefined}
              action={tab === 'todo' ? <button className="btn btn-primary btn-sm" onClick={() => setOpen(b)}>Duyệt báo giá</button> : undefined} />
          ))}
          {all && !shown.length && <EmptyCard text={tab === 'todo' ? 'Không có đơn nào chờ duyệt báo giá.' : 'Chưa gửi báo giá nào.'} />}
        </ListLayout>
      </div>
      {open && <QuoteModal b={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />}
    </div>
  )
}
