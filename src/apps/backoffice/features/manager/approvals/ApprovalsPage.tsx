// Manager: duyệt báo giá cuối sau khi Kiểm dịch viên và Điều phối viên đều đạt (PRD mục 2.5).
// Báo giá do hệ thống tính; Manager chỉ điều chỉnh phụ phí và chiết khấu thương mại rồi gửi cho khách.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { QUOTE_VALID_HOURS } from '@shared/config/booking-rules'
import { finalizeQuote } from '@shared/lib/booking'
import { formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { Modal } from '@shared/ui/Modal'
import { QuoteSheet } from '@shared/ui/QuoteSheet'
import { useToast } from '@shared/ui/toast'
import { ClearanceSection, FleetRouteSection, HorseDocsSection } from '../../../shared/BookingEvidence'
import { HorseConfigList, TripSummary } from '../../../shared/BookingParts'
import { ListPage, idCell, routeCell, statusCell, type Column } from '../../../shared/ListPage'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'
import { FormSelect } from '@shared/ui/FormSelect'

type Tab = 'todo' | 'sent'
interface AdjRow { kind: 'surcharge' | 'discount'; label: string; amount: string }
const digits = (v: string) => Number(v.replace(/\D/g, '')) || 0

function QuoteModal({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { session } = useAuth()
  const { data: draft } = useLoad(() => bookingsApi.quoteDraft(b.id), [b.id])
  const [rows, setRows] = useState<AdjRow[]>([])
  const [busy, setBusy] = useState(false)
  const adjustments = rows.filter(r => r.label.trim() && digits(r.amount) > 0).map(r => ({ label: r.label.trim(), amount: r.kind === 'discount' ? -digits(r.amount) : digits(r.amount) }))
  const preview = draft && finalizeQuote(draft.lines, adjustments, Date.now(), session!.name)
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
      <div className="alert alert-info"><i className="fa-solid fa-eye" /><div><b>Giấy tờ bên dưới chỉ để Quản lý xem.</b> Khi bấm “Duyệt và gửi báo giá”, khách chỉ nhận chi tiết đơn và bảng giá, không kèm giấy tờ nào.</div></div>
      <ClearanceSection b={b} quiet />
      <HorseDocsSection b={b} />
      <FleetRouteSection b={b} />

      <h4 style={{ margin: '18px 0 10px' }}>Chuyến đi</h4>
      <TripSummary b={b} />
      <h4 style={{ margin: '18px 0 10px' }}>Ngựa và dịch vụ</h4>
      <HorseConfigList b={b} />

      <h4 style={{ margin: '18px 0 10px' }}>Điều chỉnh báo giá (không bắt buộc)</h4>
      {rows.map((r, i) => (
        <div key={i} className={s.adj}>
          <input className="form-control" aria-label="Nội dung điều chỉnh" placeholder={r.kind === 'discount' ? 'VD: Khách hàng thân thiết' : 'VD: Phụ phí chuyến gấp'} value={r.label} onChange={e => set(i, { label: e.target.value })} />
          <div style={{ display: 'flex', gap: 6 }}>
            <FormSelect className="form-control" aria-label="Loại điều chỉnh" value={r.kind} onChange={e => set(i, { kind: e.target.value as AdjRow['kind'] })} style={{ width: 110 }}><option value="surcharge">Phụ phí</option><option value="discount">Chiết khấu</option></FormSelect>
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
  const columns: Column<Booking>[] = [
    { head: 'Mã đơn', cell: b => idCell(b) },
    { head: 'Khách hàng', cell: b => b.customer, nowrap: true },
    { head: 'Tuyến', cell: b => routeCell(placeShort(b.origin.name), placeShort(b.dest.name)) },
    { head: 'Khởi hành', cell: b => formatDate(b.departAt), nowrap: true },
    { head: 'Ngựa / xe', cell: b => `${b.horses.length} con · ${b.trips?.length ?? 0} xe`, nowrap: true },
    { head: 'Trạng thái', cell: b => statusCell(b.status) },
    ...(tab === 'sent' ? [{ head: 'Gửi lúc', cell: (b: Booking) => (b.quote ? formatDateTime(b.quote.sentAt) : '-'), nowrap: true }, { head: 'Báo giá', cell: (b: Booking) => (b.quote ? <>{formatVND(b.quote.total)}<div className="sub-text">Cọc {formatVND(b.quote.deposit)}</div></> : '-'), right: true }] : []),
    { head: 'Thao tác', cell: b => (tab === 'todo' ? <button className="btn btn-primary btn-sm" onClick={() => setOpen(b)}>Duyệt báo giá</button> : null), right: true },
  ]
  return (
    <>
      <ListPage title="Duyệt báo giá" subtitle={`Duyệt để gửi khách; khách có ${QUOTE_VALID_HOURS} giờ đặt cọc 30%.`} tabs={[['todo', 'Chờ duyệt báo giá', todo.length], ['sent', 'Đã gửi báo giá', sent.length]]} tab={tab} onTab={setTab} hot={['todo']}
        rows={tab === 'todo' ? todo : sent} rowKey={b => b.id} columns={columns} haystack={b => [b.id, b.customer, b.origin.name, b.dest.name]} dateOf={b => b.departAt} loaded={!!all}
        emptyText={tab === 'todo' ? 'Không có đơn nào chờ duyệt báo giá.' : 'Chưa gửi báo giá nào.'}
        summary={r => (tab === 'sent' ? <>Tổng báo giá: <b>{formatVND(r.reduce((n, b) => n + (b.quote?.total ?? 0), 0))}</b></> : null)} />
      {open && <QuoteModal b={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />}
    </>
  )
}
