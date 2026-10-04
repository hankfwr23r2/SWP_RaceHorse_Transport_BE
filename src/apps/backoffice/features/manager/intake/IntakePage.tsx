// Manager: tiếp nhận đơn mới và kích hoạt thẩm định song song (PRD mục 2.3).
// Hệ thống gợi ý Kiểm dịch viên và Điều phối viên ít việc nhất; Manager có thể đổi người.
import { ReadMore } from '@shared/ui/ReadMore'
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate, formatDateTime } from '@shared/lib/format'
import { suggestStaff } from '@shared/lib/booking'
import { bookingsApi } from '@shared/services/bookings'
import { staffApi } from '@shared/services/staff'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { HorseConfigList, ReviewChips, TripSummary } from '../../../shared/BookingParts'
import { ListPage, idCell, routeCell, statusCell, type Column } from '../../../shared/ListPage'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'
import { FormSelect } from '@shared/ui/FormSelect'

type Tab = 'new' | 'running'

function IntakeModal({ b, all, onClose, onDone }: { b: Booking; all: Booking[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { session } = useAuth()
  const { data: staff } = useLoad(staffApi.list)
  const specialists = staff ? suggestStaff(staff, 'specialist', all) : []
  const coordinators = staff ? suggestStaff(staff, 'coordinator', all) : []
  const [sp, setSp] = useState('')
  const [co, setCo] = useState('')
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState<string | null>(null) // không null = đang nhập lý do từ chối
  const spId = sp || specialists[0]?.id
  const coId = co || coordinators[0]?.id

  const activate = async () => {
    const a = specialists.find(x => x.id === spId)
    const c = coordinators.find(x => x.id === coId)
    if (!a || !c) return
    setBusy(true)
    try {
      await bookingsApi.activate(b.id, session!.name, { id: a.id, name: a.name }, { id: c.id, name: c.name })
      toast(`Đã tiếp nhận ${b.id}, hệ thống đã tự gán xe và đẩy sang thẩm định`)
      onDone()
    } catch (e) { toast(e instanceof Error ? e.message : 'Không tiếp nhận được', 'error'); setBusy(false) }
  }

  const reject = async () => {
    setBusy(true)
    try {
      await bookingsApi.rejectOrder(b.id, session!.name, 'manager', reason ?? '')
      toast(`Đã từ chối ${b.id}, khách nhận được lý do`)
      onDone()
    } catch (e) { toast(e instanceof Error ? e.message : 'Không từ chối được', 'error'); setBusy(false) }
  }

  const option = (x: { id: string; name: string; load: number }, i: number) => <option key={x.id} value={x.id}>{x.name} · {x.load} đơn đang làm{i === 0 ? ' (gợi ý)' : ''}</option>

  return (
    <Modal
      wide onClose={onClose} title={`Tiếp nhận ${b.id}`} subtitle={`${b.customer} · gửi lúc ${formatDateTime(b.createdAt)}`}
      footer={reason === null
        ? <><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-ghost" onClick={() => setReason('')}><i className="fa-solid fa-ban" /> Từ chối đơn</button><button className="btn btn-primary" disabled={busy || !spId || !coId} onClick={activate}><i className="fa-solid fa-play" /> Tiếp nhận và kích hoạt thẩm định</button></>
        : <><button className="btn btn-ghost" onClick={() => setReason(null)}>Quay lại</button><button className="btn btn-danger" disabled={busy || !reason.trim()} onClick={reject}><i className="fa-solid fa-ban" /> Xác nhận từ chối</button></>}
    >
      {reason !== null && (
        <div className="form-group">
          <label htmlFor="rj" className="required">Lý do từ chối (khách sẽ thấy)</label>
          <textarea id="rj" className="form-control" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
        </div>
      )}
      <TripSummary b={b} />
      <h4 style={{ margin: '18px 0 10px' }}>Ngựa và dịch vụ</h4>
      <HorseConfigList b={b} />
      <h4 style={{ margin: '18px 0 10px' }}>Giao việc</h4>
      <div className={s.form2}>
        <div className="form-group">
          <label htmlFor="sp">Kiểm dịch viên (thẩm định y tế)</label>
          <FormSelect id="sp" className="form-control" value={spId ?? ''} onChange={e => setSp(e.target.value)}>{specialists.map(option)}</FormSelect>
        </div>
        <div className="form-group">
          <label htmlFor="co">Điều phối viên (xe và lộ trình)</label>
          <FormSelect id="co" className="form-control" value={coId ?? ''} onChange={e => setCo(e.target.value)}>{coordinators.map(option)}</FormSelect>
        </div>
      </div>
      <ReadMore className={s.hint} text={'Hệ thống gợi ý người ít việc nhất và bỏ qua người đang nghỉ. Khi tiếp nhận, hệ thống tự gán xe, tài xế và hộ tống cho đơn (chia ngựa lên nhiều xe nếu cần). Nếu không đủ xe hoặc nhân sự rảnh, đơn ở lại hàng chờ và báo lỗi.'} />
    </Modal>
  )
}

export default function IntakePage() {
  const { data: all, reload } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('new')
  const [open, setOpen] = useState<Booking | null>(null)
  const list = all ?? []
  const fresh = list.filter(b => b.status === 'pending_intake')
  const running = list.filter(b => b.status === 'under_review')
  const columns: Column<Booking>[] = [
    { head: 'Mã đơn', cell: b => idCell(b) },
    { head: 'Khách hàng', cell: b => b.customer, nowrap: true },
    { head: 'Tuyến', cell: b => routeCell(placeShort(b.origin.name), placeShort(b.dest.name)) },
    { head: 'Khởi hành', cell: b => formatDate(b.departAt), nowrap: true },
    { head: 'Ngựa', cell: b => `${b.horses.length} con`, nowrap: true },
    tab === 'new' ? { head: 'Gửi lúc', cell: b => formatDateTime(b.createdAt), nowrap: true } : { head: 'Thẩm định', cell: b => <ReviewChips b={b} /> },
    { head: 'Trạng thái', cell: b => statusCell(b.status) },
    { head: 'Thao tác', cell: b => (tab === 'new' ? <button className="btn btn-primary btn-sm" onClick={() => setOpen(b)}>Tiếp nhận</button> : null), right: true },
  ]
  return (
    <>
      <ListPage title="Tiếp nhận đơn hàng" subtitle="Giao Kiểm dịch viên và Điều phối viên thẩm định song song." tabs={[['new', 'Chờ tiếp nhận', fresh.length], ['running', 'Đang thẩm định', running.length]]} tab={tab} onTab={setTab} hot={['new']}
        rows={tab === 'new' ? fresh : running} rowKey={b => b.id} columns={columns} haystack={b => [b.id, b.customer, b.origin.name, b.dest.name]} dateOf={b => b.departAt} loaded={!!all}
        emptyText={tab === 'new' ? 'Không có đơn nào chờ tiếp nhận.' : 'Không có đơn nào đang thẩm định.'} />
      {open && <IntakeModal b={open} all={list} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />}
    </>
  )
}
