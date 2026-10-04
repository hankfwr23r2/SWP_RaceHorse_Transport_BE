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
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { HorseConfigList, ReviewChips, TripSummary, EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

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

  const option = (x: { id: string; name: string; load: number }, i: number) => <option key={x.id} value={x.id}>{x.name} · {x.load} đơn đang làm{i === 0 ? ' (gợi ý)' : ''}</option>

  return (
    <Modal
      wide onClose={onClose} title={`Tiếp nhận ${b.id}`} subtitle={`${b.customer} · gửi lúc ${formatDateTime(b.createdAt)}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-primary" disabled={busy || !spId || !coId} onClick={activate}><i className="fa-solid fa-play" /> Tiếp nhận và kích hoạt thẩm định</button></>}
    >
      <TripSummary b={b} />
      <h4 style={{ margin: '18px 0 10px' }}>Ngựa và dịch vụ</h4>
      <HorseConfigList b={b} />
      <h4 style={{ margin: '18px 0 10px' }}>Giao việc</h4>
      <div className={s.form2}>
        <div className="form-group">
          <label htmlFor="sp">Kiểm dịch viên (thẩm định y tế)</label>
          <select id="sp" className="form-control" value={spId ?? ''} onChange={e => setSp(e.target.value)}>{specialists.map(option)}</select>
        </div>
        <div className="form-group">
          <label htmlFor="co">Điều phối viên (xe và lộ trình)</label>
          <select id="co" className="form-control" value={coId ?? ''} onChange={e => setCo(e.target.value)}>{coordinators.map(option)}</select>
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
  const shown = tab === 'new' ? fresh : running

  return (
    <div className="page">
      <div className="wrap">
        <div className={s.head}>
          <div className="page-header" style={{ margin: 0 }}>
            <h1>Tiếp nhận đơn hàng</h1>
            <p>Đơn khách vừa gửi. Giao Kiểm dịch viên và Điều phối viên để họ thẩm định song song.</p>
          </div>
        </div>
        <ListLayout<Tab> value={tab} onChange={setTab} tabs={[['new', 'Chờ tiếp nhận', fresh.length], ['running', 'Đang thẩm định', running.length]]}>
          {shown.map(b => (
            <OrderCard key={b.id} id={b.id} customer={b.customer} route={`${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`} kind={b.type === 'international' ? 'Quốc tế' : 'Trong nước'}
              badge={tab === 'running' ? <BookingStatusBadge status={b.status} audience="staff" /> : undefined}
              meta={[['fa-calendar-day', 'Khởi hành', formatDate(b.departAt)], ['fa-horse-head', 'Ngựa', `${b.horses.length} con`], ...(tab === 'new' ? [['fa-clock', 'Gửi lúc', formatDateTime(b.createdAt)] as [string, string, string]] : [['fa-user-doctor', 'Giao cho', `${b.intake?.specialist.name} · ${b.intake?.coordinator.name}`] as [string, string, string]])]}
              note={tab === 'running' ? <ReviewChips b={b} /> : undefined}
              action={tab === 'new' ? <button className="btn btn-primary btn-sm" onClick={() => setOpen(b)}>Tiếp nhận</button> : undefined} />
          ))}
          {all && !shown.length && <EmptyCard text={tab === 'new' ? 'Không có đơn nào chờ tiếp nhận.' : 'Không có đơn nào đang thẩm định.'} />}
        </ListLayout>
      </div>
      {open && <IntakeModal b={open} all={list} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />}
    </div>
  )
}
