// Điều phối viên: lập phương án xử lý sự cố, trình Manager duyệt (Flow 5, PRD mục 6.5).
import { useState } from 'react'
import { INCIDENT_ACTION, INCIDENT_KIND, type IncidentAction } from '@shared/config/booking-rules'
import { incidentActionsFor } from '@shared/lib/booking'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useAuth } from '@shared/auth/AuthContext'
import { useLoad } from '@shared/services/useLoad'
import type { Booking, Incident } from '@shared/types/booking'
import { ImageThumb } from '@shared/ui/ImageThumb'
import { Modal } from '@shared/ui/Modal'
import { ReadMore } from '@shared/ui/ReadMore'
import { useToast } from '@shared/ui/toast'
import { ListPage, idCell, routeCell, type Column } from '../../../shared/ListPage'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'
import { FormSelect } from '@shared/ui/FormSelect'

type Tab = 'todo' | 'waiting' | 'active' | 'done'
type Item = { b: Booking; i: Incident }

function PlanModal({ item, onClose, onDone }: { item: Item; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { session } = useAuth()
  const { b, i } = item
  const actions = incidentActionsFor(i.kind)
  const [action, setAction] = useState<IncidentAction>(i.plan?.action ?? actions[0])
  const [note, setNote] = useState(i.plan?.note ?? '')
  const [eta, setEta] = useState(() => new Date(Date.now() + 3 * 3600_000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16))
  const [budget, setBudget] = useState(String(i.plan?.budget ?? 0))
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try { await bookingsApi.planIncident(b.id, i.id, session!.name, { action, note, newEta: new Date(eta).getTime(), budget: Number(budget) || 0 }); toast(`Đã trình phương án ${i.id} lên Quản lý`); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không gửi được', 'error'); setBusy(false) }
  }
  return (
    <Modal wide onClose={onClose} title={`Lập phương án ${i.id}`} subtitle={`${b.id} · ${INCIDENT_KIND[i.kind].label} · xe ${i.tripId}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-primary" disabled={busy} onClick={send}><i className="fa-solid fa-paper-plane" /> Trình Quản lý duyệt</button></>}>
      <p><b>Báo từ hiện trường:</b> {i.note || 'Không có ghi chú.'} <ImageThumb name={i.photo} size={40} /></p>
      {i.rejection && <div className="alert alert-danger"><i className="fa-solid fa-rotate-left" /><div><b>Quản lý trả về:</b> {i.rejection.reason}</div></div>}
      <div className="form-group"><label htmlFor="pa">Phương án</label>
        <FormSelect id="pa" className="form-control" value={action} onChange={e => setAction(e.target.value as IncidentAction)}>{actions.map(a => <option key={a} value={a}>{INCIDENT_ACTION[a]}</option>)}</FormSelect></div>
      <div className="form-group"><label htmlFor="pn">Ghi chú (cơ sở tiếp nhận, số điện thoại, tuyến ngắn nhất)</label><input id="pn" className="form-control" value={note} onChange={e => setNote(e.target.value)} /></div>
      <div className={s.form2}>
        <div className="form-group"><label htmlFor="pe">ETA mới đến đích</label><input id="pe" type="datetime-local" className="form-control" value={eta} onChange={e => setEta(e.target.value)} /></div>
        <div className="form-group"><label htmlFor="pb">Hạn mức chi khẩn cấp đề nghị (VNĐ)</label><input id="pb" inputMode="numeric" className="form-control" value={budget} onChange={e => setBudget(e.target.value.replace(/\D/g, ''))} /></div>
      </div>
      <ReadMore className={s.hint} text={'Xe chính giữ nguyên biển số theo hồ sơ hải quan và kiểm dịch. Xe cứu hộ chỉ đưa ngựa về chuồng đệm hoặc phòng khám, không chạy tiếp qua cửa khẩu. Tắc cửa khẩu thì đưa ngựa về chuồng đệm gần đó, tuyệt đối không đổi cửa khẩu.'} />
    </Modal>
  )
}

export default function CoordinatorIncidentsPage() {
  const { session } = useAuth()
  const { data: all, reload } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('todo')
  const [open, setOpen] = useState<Item | null>(null)
  const mine = (all ?? []).filter(b => b.intake?.coordinator.name === session!.name).flatMap(b => (b.incidents ?? []).map(i => ({ b, i })))
  const groups: Record<Tab, Item[]> = {
    todo: mine.filter(x => x.i.status === 'reported'),
    waiting: mine.filter(x => x.i.status === 'pending_approval'),
    active: mine.filter(x => x.i.status === 'active'),
    done: mine.filter(x => x.i.status === 'resolved'),
  }
  const shown = [...groups[tab]].sort((a, z) => z.i.reportedAt - a.i.reportedAt)
  const columns: Column<Item>[] = [
    { head: 'Mã đơn', cell: ({ b }) => idCell(b) },
    { head: 'Khách hàng', cell: ({ b }) => b.customer, minWidth: 120 },
    { head: 'Tuyến', cell: ({ b }) => routeCell(placeShort(b.origin.name), placeShort(b.dest.name)) },
    { head: 'Sự cố', minWidth: 130, cell: ({ i }) => <><b>{INCIDENT_KIND[i.kind].label}</b><div className="sub-text">xe {i.tripId}</div></> },
    { head: 'Báo lúc', cell: ({ i }) => formatDateTime(i.reportedAt), nowrap: true },
    { head: 'Hạn mức', cell: ({ i }) => (i.plan ? formatVND(i.plan.budget) : '-'), right: true },
    { head: 'Ghi chú', minWidth: 180, cell: ({ i }) => <span style={{ display: 'inline-block', maxWidth: 200, color: i.rejection ? 'var(--red)' : undefined }}>{i.rejection ? `Quản lý trả về: ${i.rejection.reason}` : i.note || '-'}</span> },
    { head: 'Thao tác', cell: ({ b, i }) => (i.status === 'reported' ? <button className="btn btn-primary btn-sm" onClick={() => setOpen({ b, i })}>{i.rejection ? 'Lập lại phương án' : 'Lập phương án'}</button> : null), right: true },
  ]
  return (
    <>
      <ListPage title="Xử lý sự cố" subtitle="Tài xế hoặc hộ tống bấm SOS thì sự cố hiện ở đây. Lập phương án và trình Quản lý duyệt."
        tabs={[['todo', 'Cần lập phương án', groups.todo.length], ['waiting', 'Chờ Quản lý duyệt', groups.waiting.length], ['active', 'Đang xử lý', groups.active.length], ['done', 'Đã xử lý xong', groups.done.length]]} tab={tab} onTab={setTab} hot={['todo']}
        rows={shown} rowKey={x => x.i.id} columns={columns} haystack={x => [x.b.id, x.b.customer, x.b.origin.name, x.b.dest.name, x.i.tripId]} dateOf={x => x.i.reportedAt} dateLabel="Báo lúc" loaded={!!all}
        emptyText="Không có sự cố nào ở mục này." hotRow={x => x.i.status === 'reported'} />
      {open && <PlanModal item={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />}
    </>
  )
}
