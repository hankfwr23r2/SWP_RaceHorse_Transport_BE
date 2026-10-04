// Manager: tiến độ mọi đơn (chỉ xem). Tab theo từng trạng thái, đúng thứ tự luồng.
import { useState } from 'react'
import { BOOKING_STATUS, BOOKING_STEPS, STATUS_SHORT, stepOf, statusRank, type BookingStatus } from '@shared/config/booking-rules'
import { transitProgress } from '@shared/lib/booking'
import { formatDate, formatVND } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { Modal } from '@shared/ui/Modal'
import { ClearanceSection, FleetRouteSection, HorseDocsSection } from '../../../shared/BookingEvidence'
import { ListPage, idCell, routeCell, statusCell, type Column, type TabDef } from '../../../shared/ListPage'
import { placeShort } from '../../../shared/place'
import s from './Progress.module.css'

type Tab = 'all' | BookingStatus
const STATUSES = (Object.keys(BOOKING_STATUS) as BookingStatus[]).sort((a, z) => statusRank(a) - statusRank(z))
function Stage({ b }: { b: Booking }) {
  const at = stepOf(b.status)
  const stopped = b.status === 'quote_expired' || b.status === 'rejected' || b.status === 'cancelled'
  const moving = at === 6 && (b.trips ?? []).some(t => t.run?.startedAt)
  const p = moving ? (b.trips ?? []).map(t => transitProgress(t)).find(Boolean) : undefined
  return (
    <div className={s.stage}>
      <b>{stopped ? 'Đã dừng' : at >= BOOKING_STEPS.length ? 'Đã hoàn tất' : `Bước ${at + 1}/${BOOKING_STEPS.length}: ${BOOKING_STEPS[at]}`}</b>
      <ol className={s.bar} aria-label="Các bước của đơn">{BOOKING_STEPS.map((label, i) => <li key={label} title={label} className={i < at ? s.segDone : i === at ? (stopped ? s.segStop : s.segNow) : ''} />)}</ol>
      {p && <small>Mốc {Math.min(p.done + 1, p.total)}/{p.total}{p.current ? ` · ${p.current}` : ''}</small>}
    </div>
  )
}

function DetailModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  return (
    <Modal wide onClose={onClose} title={`Chi tiết ${b.id}`} subtitle={`${b.customer} · ${placeShort(b.origin.name)} → ${placeShort(b.dest.name)} · khởi hành ${formatDate(b.departAt)}`}
      footer={<button className="btn btn-ghost" onClick={onClose}>Đóng</button>}>
      <ClearanceSection b={b} />
      <HorseDocsSection b={b} />
      <FleetRouteSection b={b} />
    </Modal>
  )
}

const COLUMNS = (open: (b: Booking) => void): Column<Booking>[] => [
  { head: 'Mã đơn', cell: b => idCell(b) },
  { head: 'Khách hàng', cell: b => b.customer, nowrap: true },
  { head: 'Tuyến', cell: b => routeCell(placeShort(b.origin.name), placeShort(b.dest.name)) },
  { head: 'Khởi hành', cell: b => formatDate(b.departAt), nowrap: true },
  { head: 'Ngựa / xe', cell: b => `${b.horses.length} ngựa · ${b.trips?.length ?? 0} xe`, nowrap: true },
  { head: 'Trạng thái', cell: b => statusCell(b.status) },
  { head: 'Tiến độ', cell: b => <Stage b={b} /> },
  { head: 'Giá trị', cell: b => (b.quote ? formatVND(b.quote.total) : '-'), right: true },
  { head: 'Chi tiết', cell: b => <button className="btn btn-ghost btn-sm" onClick={() => open(b)}><i className="fa-solid fa-folder-open" /> Xem giấy tờ, xe</button> },
]

export default function ProgressPage() {
  const { data: all } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('all')
  const [open, setOpen] = useState<Booking | null>(null)
  const list = all ?? []
  const count = (t: Tab) => (t === 'all' ? list.length : list.filter(b => b.status === t).length)
  const tabs: TabDef<Tab>[] = [['all', 'Tất cả', list.length], ...STATUSES.map((st): TabDef<Tab> => [st, STATUS_SHORT[st], count(st), BOOKING_STATUS[st].label])]
  const rows = (tab === 'all' ? [...list] : list.filter(b => b.status === tab)).sort((a, z) => a.departAt - z.departAt)
  return (
    <>
    <ListPage title="Tiến độ đơn" subtitle="Theo dõi trạng thái và tiến độ của mọi đơn, xem giấy tờ, lộ trình, xe và nhân sự. Trang chỉ để xem." tabs={tabs} tab={tab} onTab={setTab} rows={rows} rowKey={b => b.id} columns={COLUMNS(setOpen)}
      haystack={b => [b.id, b.customer, b.origin.name, b.dest.name]} dateOf={b => b.departAt} loaded={!!all} emptyText="Không có đơn nào ở trạng thái này."
      summary={r => <>Tổng giá trị: <b>{formatVND(r.reduce((n, b) => n + (b.quote?.total ?? 0), 0))}</b></>} />
      {open && <DetailModal b={open} onClose={() => setOpen(null)} />}
    </>
  )
}
