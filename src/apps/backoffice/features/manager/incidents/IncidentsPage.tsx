// Manager: duyệt phương án sự cố, đối soát chi phí, phát hành bảng quyết toán, theo dõi thanh toán (Flow 5–6, PRD mục 6.6, 7.4).
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { EXPENSE_CATEGORY, INCIDENT_ACTION, INCIDENT_KIND, type Payer } from '@shared/config/booking-rules'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { useLoad } from '@shared/services/useLoad'
import type { Booking, Incident } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { ImageThumb } from '@shared/ui/ImageThumb'
import { Modal } from '@shared/ui/Modal'
import { ReadMore } from '@shared/ui/ReadMore'
import { useToast } from '@shared/ui/toast'
import { EmptyCard, ListLayout, OrderCard } from '../../../shared/BookingParts'
import { placeShort } from '../../../shared/place'
import s from '../../../shared/booking.module.css'

type Tab = 'approve' | 'active' | 'audit' | 'settle' | 'done'
type Item = { b: Booking; i: Incident }
const route = (b: Booking) => `${placeShort(b.origin.name)} → ${placeShort(b.dest.name)}`

function ApproveModal({ item, onClose, onDone }: { item: Item; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { session } = useAuth()
  const { b, i } = item
  const [budget, setBudget] = useState(String(i.plan?.budget ?? 0))
  const [called, setCalled] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast(msg); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không thực hiện được', 'error'); setBusy(false) }
  }
  return (
    <Modal wide onClose={onClose} title={`Duyệt phương án ${i.id}`} subtitle={`${b.id} · ${b.customer} · ${INCIDENT_KIND[i.kind].label} · xe ${i.tripId}`}
      footer={<>
        <button className="btn btn-ghost" disabled={busy || !reason.trim()} onClick={() => act(() => bookingsApi.rejectIncident(b.id, i.id, session!.name, reason), 'Đã trả phương án về Điều phối viên')}><i className="fa-solid fa-rotate-left" /> Trả về</button>
        <button className="btn btn-primary" disabled={busy || !called} onClick={() => act(() => bookingsApi.approveIncident(b.id, i.id, session!.name, { budget: Number(budget) || 0, calledCustomer: called }), 'Đã duyệt phương án khẩn cấp')}><i className="fa-solid fa-check" /> Duyệt phương án</button>
      </>}>
      <p><b>Báo từ hiện trường ({formatDateTime(i.reportedAt)}):</b> {i.note || 'Không có ghi chú.'} <ImageThumb name={i.photo} size={40} /></p>
      {i.plan && <div className="alert alert-info"><i className="fa-solid fa-route" /><div><b>{INCIDENT_ACTION[i.plan.action]}.</b> ETA mới {formatDateTime(i.plan.newEta)}. Đề nghị hạn mức {formatVND(i.plan.budget)}.{i.plan.note ? ` Ghi chú: ${i.plan.note}` : ''}</div></div>}
      <div className="form-group"><label htmlFor="bg">Hạn mức chi khẩn cấp được duyệt (VNĐ)</label><input id="bg" inputMode="numeric" className="form-control" value={budget} onChange={e => setBudget(e.target.value.replace(/\D/g, ''))} /></div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '8px 0 16px' }}><input type="checkbox" checked={called} onChange={e => setCalled(e.target.checked)} /> Tôi đã trực tiếp gọi điện cho khách {b.customer} thông báo tình hình và phương án</label>
      <div className="form-group"><label htmlFor="rs">Lý do trả về (chỉ cần khi trả về)</label><input id="rs" className="form-control" value={reason} onChange={e => setReason(e.target.value)} /></div>
      <ReadMore className={s.hint} text={'Chỉ Quản lý được duyệt thay đổi phương án di chuyển, hạn mức chi khẩn cấp và trực tiếp làm việc với khách khi có sự cố. Duyệt xong, khách và tài xế, hộ tống nhận thông báo.'} />
    </Modal>
  )
}

// Đối soát chi phí: chọn bên chịu từng khoản (mặc định theo chính sách 11.5), phát hành bảng quyết toán
function AuditModal({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { session } = useAuth()
  const expenses = (b.incidents ?? []).flatMap(i => i.expenses.map(e => ({ ...e, kind: i.kind, budget: i.approval?.budget ?? 0 })))
  const [payers, setPayers] = useState<Record<string, Payer>>(() => Object.fromEntries(expenses.map(e => [e.id, e.payer])))
  const [busy, setBusy] = useState(false)
  const customerTotal = expenses.filter(e => payers[e.id] === 'customer').reduce((n, e) => n + e.amount, 0)
  const carrierTotal = expenses.filter(e => payers[e.id] === 'carrier').reduce((n, e) => n + e.amount, 0)
  const issue = async () => {
    setBusy(true)
    try { await bookingsApi.issueSettlement(b.id, session!.name, payers); toast(`Đã phát hành bảng quyết toán ${b.id}`); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không phát hành được', 'error'); setBusy(false) }
  }
  return (
    <Modal wide onClose={onClose} title={`Đối soát chi phí ${b.id}`} subtitle={`${b.customer} · ${route(b)}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-primary" disabled={busy} onClick={issue}><i className="fa-solid fa-file-invoice-dollar" /> Phát hành bảng quyết toán</button></>}>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Chứng từ</th><th>Khoản chi</th><th>Số tiền</th><th>Bên chịu</th></tr></thead>
        <tbody>{expenses.map(e => (
          <tr key={e.id}>
            <td><ImageThumb name={e.photo} size={40} /></td>
            <td>{EXPENSE_CATEGORY[e.category]}: {e.label}<div className={s.sub}>{INCIDENT_KIND[e.kind].label} · hạn mức duyệt {formatVND(e.budget)}</div></td>
            <td className="nowrap">{formatVND(e.amount)}</td>
            <td><select aria-label={`Bên chịu ${e.label}`} className="form-control" value={payers[e.id]} onChange={ev => setPayers({ ...payers, [e.id]: ev.target.value as Payer })}><option value="customer">Khách chịu</option><option value="carrier">Nhà xe chịu</option></select></td>
          </tr>
        ))}</tbody>
      </table></div>
      <p style={{ marginTop: 14 }}>Khách phải trả thêm: <b>{formatVND(customerTotal)}</b> · Nhà xe chịu: <b>{formatVND(carrierTotal)}</b></p>
      <ReadMore className={s.hint} text={'Chính sách: chi phí về ngựa (thú y, thuốc, chuồng đệm) khách chịu; chi phí về vận chuyển (cứu hộ, sửa xe) nhà xe chịu; tắc cửa khẩu nhà xe chịu. Giá chuyến đã cố định nên nhiên liệu và cầu đường không tính thêm. Bảng quyết toán chỉ gồm khoản khách chịu, khách có 24 giờ để thanh toán.'} />
    </Modal>
  )
}

export default function IncidentsPage() {
  const { data: all, reload } = useLoad(bookingsApi.list)
  const [tab, setTab] = useState<Tab>('approve')
  const [approve, setApprove] = useState<Item | null>(null)
  const [audit, setAudit] = useState<Booking | null>(null)
  const list = all ?? []
  const incidents = list.flatMap(b => (b.incidents ?? []).map(i => ({ b, i })))
  const groups = {
    approve: incidents.filter(x => x.i.status === 'pending_approval'),
    active: incidents.filter(x => x.i.status === 'active' || x.i.status === 'reported'),
    audit: list.filter(b => b.status === 'expenses_submitted'),
    settle: list.filter(b => b.status === 'settlement_issued' || b.status === 'payment_overdue'),
    done: list.filter(b => b.status === 'completed'),
  }
  const done = () => { setApprove(null); setAudit(null); reload() }
  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Sự cố và quyết toán</h1>
          <p>Duyệt phương án khi xe gặp sự cố, đối soát chi phí sau chuyến và theo dõi khách thanh toán.</p>
        </div>
        <ListLayout<Tab> value={tab} onChange={setTab} tabs={[['approve', 'Chờ duyệt phương án', groups.approve.length], ['active', 'Sự cố đang xử lý', groups.active.length], ['audit', 'Chờ đối soát chi phí', groups.audit.length], ['settle', 'Chờ khách thanh toán', groups.settle.length], ['done', 'Đã hoàn tất', groups.done.length]]}>
          {(tab === 'approve' || tab === 'active') && groups[tab].map(({ b, i }) => (
            <OrderCard key={i.id} id={b.id} customer={b.customer} route={route(b)} kind={INCIDENT_KIND[i.kind].label} alert={tab === 'approve'}
              badge={<BookingStatusBadge status={b.status} audience="staff" />}
              meta={[['fa-truck', 'Xe', i.tripId], ['fa-clock', 'Báo lúc', formatDateTime(i.reportedAt)], ...(i.approval ? [['fa-wallet', 'Hạn mức', formatVND(i.approval.budget)] as [string, string, string]] : i.plan ? [['fa-wallet', 'Đề nghị', formatVND(i.plan.budget)] as [string, string, string]] : [])]}
              note={i.plan ? `${INCIDENT_ACTION[i.plan.action]}. ETA mới ${formatDateTime(i.plan.newEta)}.` : i.note || undefined}
              action={tab === 'approve' ? <button className="btn btn-primary btn-sm" onClick={() => setApprove({ b, i })}>Xem và duyệt</button> : undefined} />
          ))}
          {(tab === 'audit' || tab === 'settle' || tab === 'done') && groups[tab].map(b => (
            <OrderCard key={b.id} id={b.id} customer={b.customer} route={route(b)} kind={b.type === 'international' ? `Quốc tế · ${b.gate}` : 'Trong nước'} alert={b.status === 'payment_overdue'}
              badge={<BookingStatusBadge status={b.status} audience="staff" />}
              meta={[['fa-receipt', 'Chi phí sự cố', formatVND((b.incidents ?? []).flatMap(i => i.expenses).reduce((n, e) => n + e.amount, 0))], ...(b.settlement ? [['fa-hourglass-half', b.settlement.paid ? 'Đã trả lúc' : 'Hạn trả', formatDateTime(b.settlement.paid?.paidAt ?? b.settlement.dueAt)] as [string, string, string]] : []), ...(b.rating ? [['fa-star', 'Khách chấm', `${b.rating.trip}/5`] as [string, string, string]] : [])]}
              side={b.settlement ? <b>{formatVND(b.settlement.total)}</b> : undefined}
              action={tab === 'audit' ? <button className="btn btn-primary btn-sm" onClick={() => setAudit(b)}>Đối soát</button> : undefined} />
          ))}
          {all && !groups[tab].length && <EmptyCard text="Không có đơn nào ở mục này." />}
        </ListLayout>
      </div>
      {approve && <ApproveModal item={approve} onClose={() => setApprove(null)} onDone={done} />}
      {audit && <AuditModal b={audit} onClose={() => setAudit(null)} onDone={done} />}
    </div>
  )
}
