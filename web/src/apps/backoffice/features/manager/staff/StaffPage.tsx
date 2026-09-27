// Nhân sự & Điều chuyển. Chuyển từ Manager/manager_phan_cong.html + manager_phan_cong.js.
// Theo dõi hạn xử lý của kiểm dịch viên, điều phối viên; tự chuyển đơn trễ hạn / người nghỉ; manager xử lý khi không chuyển được.
import { useCallback, useEffect, useState } from 'react'
import { CAP_DAYS, MIN_LEAD_DAYS, SLA_WORKING_DAYS } from '@shared/config/business-rules'
import { dayKey, daysFromToday, today } from '@shared/lib/dates'
import { formatDate, formatDateTime, formatDeadline } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import type { StaffMember } from '@shared/services/mock/staff'
import { ordersApi } from '@shared/services/orders'
import { staffApi } from '@shared/services/staff'
import type { Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { cx, partStyles as m } from '../../../shared/parts'
import { ROLE_LABEL, STEP_LABEL, autoTransfer, deadlineOf, specialExtensionOption, stateOf, tasksOf, type Task } from './assignment'
import s from './Staff.module.css'

// Đưa dữ liệu về trạng thái đúng: hết thời gian nghỉ thì đi làm lại; tự chuyển đơn. Trả về số đơn đã chuyển.
async function syncAssignments() {
  let staff = await staffApi.list()
  for (const x of staff.filter(x => x.status === 'off' && Date.now() > (x.offTo ?? 0))) {
    await staffApi.update(x.id, { status: 'working', offTo: undefined, offReason: undefined })
  }
  staff = await staffApi.list()
  const orders = await ordersApi.list()
  const moved = autoTransfer(tasksOf(orders), staff)
  for (const t of moved) {
    const to = staff.find(x => x.id === t.toId)!
    await ordersApi.update(t.orderId, { task: t.task, ...(t.task.step === 'inspector' ? { inspector: to.name } : { coordinator: to.name }) })
    const from = staff.find(x => x.id === t.fromId)!
    await staffApi.update(from.id, { kpi: { transferredOut: from.kpi.transferredOut + 1, late: from.kpi.late + (t.reason === 'Trễ hạn' ? 1 : 0) } })
    from.kpi = { transferredOut: from.kpi.transferredOut + 1, late: from.kpi.late + (t.reason === 'Trễ hạn' ? 1 : 0) }
  }
  return moved.length
}

function StateBadge({ t, staff }: { t: Task; staff: StaffMember[] }) {
  const st = stateOf(t, staff)
  switch (st.code) {
    case 'paused': return <span className="badge badge-muted"><i className="fa-solid fa-pause" /> Tạm dừng - chờ khách bổ sung từ {formatDate(t.pausedSince!)}</span>
    case 'on_track': return <span className="badge badge-success">Còn {st.remaining} ngày làm việc</span>
    case 'due_soon': return <span className="badge badge-warning">{st.remaining === 0 ? 'Hạn hôm nay' : 'Sắp đến hạn - còn 1 ngày'}</span>
    case 'manager': return <><span className="badge badge-danger"><i className="fa-solid fa-user-tie" /> Cần manager xử lý</span><div className="sub-text">{st.cause}</div></>
  }
}

const DeadlineCell = ({ t }: { t: Task }) => t.pausedSince
  ? <span className="text-muted">Tạm dừng</span>
  : <>{formatDeadline(deadlineOf(t).time)}<div className="sub-text">{deadlineOf(t).source}</div></>

function Rules() {
  return (
    <details className={`card ${s.rules}`}>
      <summary><i className="fa-solid fa-book" /> Quy tắc hạn xử lý &amp; tự động chuyển</summary>
      <div className={s.rulesGrid}>
        <div>
          <h4>Lịch làm việc</h4>
          <ul><li>Thứ Hai – thứ Sáu, 08:00 – 17:00</li><li>Không tính thứ Bảy, Chủ nhật, ngày lễ</li></ul>
          <h4>Hạn xử lý = mốc sớm hơn của</h4>
          <ul>
            <li>Kiểm dịch: {SLA_WORKING_DAYS.inspector} ngày làm việc · Lập lộ trình: {SLA_WORKING_DAYS.coordinator} ngày làm việc (đếm từ ngày làm việc kế tiếp, hạn 17:00)</li>
            <li>Kiểm dịch: khởi hành − {CAP_DAYS.inspector} ngày · Lập lộ trình: khởi hành − {CAP_DAYS.coordinator} ngày</li>
            <li>Đang chờ khách bổ sung giấy tờ: đồng hồ tạm dừng</li>
          </ul>
          <h4>Phòng ngừa thiếu người</h4>
          <ul><li>Báo nghỉ khiến một vai trò không còn ai đang làm việc: cảnh báo, phải xác nhận</li><li>Trang Tiếp nhận: khóa nút tiếp nhận khi một vai trò không còn ai đang làm việc</li></ul>
        </div>
        <div>
          <h4>Tự động chuyển người</h4>
          <ul>
            <li><b>Khi nào:</b> đơn quá hạn xử lý, hoặc người phụ trách đang nghỉ</li>
            <li><b>Chuyển cho:</b> người cùng vai trò, đang làm việc, chưa từng phụ trách đơn này</li>
            <li><b>Ưu tiên:</b> ít đơn đang xử lý nhất; bằng nhau thì theo mã nhân viên</li>
            <li><b>Thứ tự:</b> đơn khởi hành sớm hơn được chuyển trước</li>
            <li>Người mới nhận việc từ lúc chuyển, hạn xử lý tính lại</li>
          </ul>
          <h4>Manager xử lý khi hệ thống không tự chuyển được</h4>
          <ol>
            <li>Gia hạn đặc biệt (chờ người phụ trách) nếu vẫn kịp mốc chót</li>
            <li>Đề nghị khách dời ngày khởi hành (ngày mới ≥ hôm nay + {MIN_LEAD_DAYS} ngày)</li>
            <li>Từ chối đơn: "Không đủ nhân sự xử lý kịp" (khách chưa thanh toán, không phát sinh hoàn tiền)</li>
          </ol>
        </div>
      </div>
    </details>
  )
}

function TaskSummary({ t, staff }: { t: Task; staff: StaffMember[] }) {
  const a = staff.find(x => x.id === t.assigneeId)!
  const name = (id: string) => staff.find(x => x.id === id)?.name ?? id
  return (
    <>
      <div className={m.infoGrid}>
        <div className={m.infoItem}><span className={m.infoLabel}>Bước đang xử lý</span><span className={m.infoValue}>{STEP_LABEL[t.step]}</span></div>
        <div className={m.infoItem}><span className={m.infoLabel}>Người phụ trách</span><span className={m.infoValue}>{a.name} ({a.id})</span></div>
        <div className={m.infoItem}><span className={m.infoLabel}>Nhận việc lúc</span><span className={m.infoValue}>{formatDeadline(t.assignedAt)}</span></div>
        <div className={m.infoItem}><span className={m.infoLabel}>Ngày khởi hành</span><span className={m.infoValue}>{formatDate(t.departure)}</span></div>
        <div className={m.infoItem}><span className={m.infoLabel}>Hạn xử lý hiện tại</span><span className={m.infoValue}><DeadlineCell t={t} /></span></div>
        <div className={m.infoItem}><span className={m.infoLabel}>Tình trạng</span><span className={m.infoValue}><StateBadge t={t} staff={staff} /></span></div>
      </div>
      {t.history.length > 0 && (
        <div className={s.history}>
          <div className="font-semibold small">Lịch sử chuyển người</div>
          {t.history.map(h => <div key={h.time + h.toId} className="sub-text">{formatDateTime(h.time)} · {name(h.fromId)} → {name(h.toId)} · {h.reason}{h.auto ? ' (tự động)' : ''}</div>)}
        </div>
      )}
    </>
  )
}

type Fallback = 'extend' | 'reschedule' | 'reject'

function ManagerActionModal({ t, staff, onClose, onDone }: { t: Task; staff: StaffMember[]; onClose: () => void; onDone: (msg: string, type?: 'success' | 'error') => void }) {
  const opt1 = specialExtensionOption(t, staff)
  const pending = t.reschedule
  const [choice, setChoice] = useState<Fallback>(opt1.ok ? 'extend' : pending ? 'reject' : 'reschedule')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [invalid, setInvalid] = useState('')
  const minDate = dayKey(new Date(daysFromToday(MIN_LEAD_DAYS)))

  const confirm = async () => {
    if (choice === 'reschedule' && !date) return setInvalid('date')
    if (!note.trim()) return setInvalid('note')
    const order = await ordersApi.get(t.orderId)
    if (choice === 'extend') {
      await ordersApi.update(t.orderId, { task: { ...order!.task!, specialDeadline: opt1.newDeadline } })
      onDone(`Đã gia hạn đặc biệt ${t.orderId} đến ${formatDeadline(opt1.newDeadline)}`)
    } else if (choice === 'reschedule') {
      const [y, mo, d] = date.split('-').map(Number)
      const newDate = new Date(y, mo - 1, d).getTime()
      await ordersApi.update(t.orderId, { task: { ...order!.task!, reschedule: { newDate, sentAt: Date.now(), note: note.trim() } } })
      onDone(`Đã gửi đề nghị dời ngày khởi hành ${t.orderId} đến ${formatDate(newDate)} cho khách`)
    } else {
      await ordersApi.update(t.orderId, { status: 'rejected', rejectedStep: 1, rejectedAt: Date.now(), rejectType: 'Không đủ nhân sự xử lý kịp', reason: note.trim(), stage: undefined, task: undefined })
      onDone(`Đã từ chối đơn ${t.orderId}: Không đủ nhân sự xử lý kịp. Đã thông báo khách hàng`, 'error')
    }
  }

  return (
    <Modal wide title="Manager xử lý đơn" subtitle={`${t.orderId} · ${t.customer} · ${t.route}`} onClose={onClose}
      footer={<button className="btn btn-primary" onClick={confirm}><i className="fa-solid fa-check" /> Xác nhận</button>}>
      <TaskSummary t={t} staff={staff} />
      <div className="alert alert-danger" style={{ margin: '16px 0' }}><i className="fa-solid fa-circle-xmark" /><div>Hệ thống không tự chuyển được: {stateOf(t, staff).cause}. Xét lần lượt các phương án dưới đây.</div></div>
      <label className={cx(s.option, !opt1.ok && s.optionOff)}>
        <input type="radio" name="fallback" disabled={!opt1.ok} checked={choice === 'extend'} onChange={() => setChoice('extend')} />
        <div><b>1. Gia hạn đặc biệt</b><div className="sub-text">{opt1.label}</div>{!opt1.ok && <div className="sub-text"><i className="fa-solid fa-lock" /> {opt1.why}</div>}</div>
      </label>
      <label className={cx(s.option, !!pending && s.optionOff)}>
        <input type="radio" name="fallback" disabled={!!pending} checked={choice === 'reschedule'} onChange={() => setChoice('reschedule')} />
        <div><b>2. Đề nghị khách dời ngày khởi hành</b><div className="sub-text">Gửi đề nghị cho khách; khách xác nhận trên cổng khách hàng. Ngày mới ≥ {formatDate(daysFromToday(MIN_LEAD_DAYS))}.</div>
          {pending && <div className="sub-text"><i className="fa-solid fa-lock" /> Đã gửi đề nghị dời đến {formatDate(pending.newDate)} lúc {formatDateTime(pending.sentAt)}, đang chờ khách phản hồi</div>}</div>
      </label>
      <label className={s.option}>
        <input type="radio" name="fallback" checked={choice === 'reject'} onChange={() => setChoice('reject')} />
        <div><b>3. Từ chối đơn</b><div className="sub-text">Lý do: "Không đủ nhân sự xử lý kịp". Khách chưa thanh toán nên không phát sinh hoàn tiền; chỗ xe giữ tạm được nhả.</div></div>
      </label>
      <div className={m.actionBox}>
        {choice === 'reschedule' && <div className="form-group"><label className="required">Ngày khởi hành đề nghị</label><input type="date" min={minDate} className={cx('form-control', invalid === 'date' && 'invalid')} value={date} onChange={e => { setInvalid(''); setDate(e.target.value) }} /></div>}
        <div className="form-group" style={{ marginBottom: 0 }}><label className="required">Ghi chú</label><textarea rows={2} className={cx('form-control', invalid === 'note' && 'invalid')} placeholder="Nhập ghi chú..." value={note} onChange={e => { setInvalid(''); setNote(e.target.value) }} /></div>
      </div>
    </Modal>
  )
}

function LeaveModal({ member, staff, tasks, onClose, onDone }: { member: StaffMember; staff: StaffMember[]; tasks: Task[]; onClose: () => void; onDone: (to: number) => void }) {
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('Ốm')
  const [confirmed, setConfirmed] = useState(false)
  const [invalid, setInvalid] = useState('')
  const own = tasks.filter(t => t.assigneeId === member.id)
  const othersWorking = staff.filter(x => x.role === member.role && x.status === 'working' && x.id !== member.id)
  const roleTasks = tasks.filter(t => t.step === member.role)

  const submit = async () => {
    if (!to) return setInvalid('to')
    if (!othersWorking.length && !confirmed) return setInvalid('confirm')
    const [y, mo, d] = to.split('-').map(Number)
    const offTo = new Date(y, mo - 1, d, 23, 59).getTime()
    await staffApi.update(member.id, { status: 'off', offTo, offReason: reason })
    onDone(offTo)
  }

  return (
    <Modal title="Báo nghỉ" subtitle={`${member.name} · ${ROLE_LABEL[member.role]} · ${member.id}`} onClose={onClose}
      footer={<button className="btn btn-primary" onClick={submit}><i className="fa-solid fa-user-clock" /> Xác nhận báo nghỉ</button>}>
      {!othersWorking.length && <>
        <div className="alert alert-danger"><i className="fa-solid fa-triangle-exclamation" /><div>
          Sau khi báo nghỉ sẽ <b>không còn {ROLE_LABEL[member.role].toLowerCase()} nào đang làm việc</b>. {roleTasks.length} đơn ở bước {STEP_LABEL[member.role]} sẽ không tự chuyển được và cần manager xử lý ({roleTasks.map(t => t.orderId).join(', ')}), và trang Tiếp nhận sẽ khóa nút tiếp nhận đơn mới.
        </div></div>
        <label className={cx(s.confirm, invalid === 'confirm' && s.confirmBad)}><input type="checkbox" checked={confirmed} onChange={e => { setInvalid(''); setConfirmed(e.target.checked) }} /> Tôi đã hiểu và vẫn ghi nhận nghỉ</label>
      </>}
      <div className={m.actionBox}>
        <div className="form-group"><label className="required">Nghỉ đến hết ngày</label><input type="date" min={dayKey(today())} className={cx('form-control', invalid === 'to' && 'invalid')} value={to} onChange={e => { setInvalid(''); setTo(e.target.value) }} /></div>
        <div className="form-group"><label className="required">Lý do</label><select className="form-control" value={reason} onChange={e => setReason(e.target.value)}><option>Ốm</option><option>Việc gia đình</option><option>Khác</option></select></div>
        <p className={m.hint}><i className="fa-solid fa-circle-info" /> Trong thời gian nghỉ, nhân viên không được gợi ý nhận đơn mới. {own.length} đơn đang xử lý sẽ được hệ thống tự chuyển cho người khác.</p>
      </div>
    </Modal>
  )
}

export default function StaffPage() {
  const toast = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [issueTab, setIssueTab] = useState<'manager' | 'log'>('manager')
  const [roleTab, setRoleTab] = useState<StaffMember['role']>('inspector')
  const [modal, setModal] = useState<{ kind: 'tasks' | 'leave'; id: string } | { kind: 'manager'; id: string } | null>(null)

  const refresh = useCallback(async () => {
    const moved = await syncAssignments()
    setStaff(await staffApi.list())
    setOrders(await ordersApi.list())
    return moved
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const tasks = tasksOf(orders)
  const name = (id: string) => staff.find(x => x.id === id)?.name ?? id
  const managerTasks = staff.length ? tasks.filter(t => stateOf(t, staff).code === 'manager').sort((a, b) => a.departure - b.departure) : []
  const log = tasks.flatMap(t => t.history.map(h => ({ ...h, t }))).sort((a, b) => b.time - a.time)
  const issuesRef = useStaggerIn('tbody tr', [issueTab, managerTasks.length, log.length])

  const done = async (msg: string, type: 'success' | 'error' = 'success') => { setModal(null); await refresh(); toast(msg, type) }
  const markBack = async (x: StaffMember) => {
    await staffApi.update(x.id, { status: 'working', offTo: undefined, offReason: undefined })
    const moved = await refresh()
    toast(`${x.name} đã đi làm lại${moved ? `. Tự động chuyển ${moved} đơn` : ''}`)
  }

  const stats: [string, number, string][] = [
    ['Nhân sự đang nghỉ', staff.filter(x => x.status === 'off').length, 'fa-user-clock'],
    ['Đơn đang xử lý', tasks.length, 'fa-list-check'],
    ['Đã tự động chuyển', log.filter(h => h.auto).length, 'fa-shuffle'],
    ['Cần manager xử lý', managerTasks.length, 'fa-user-tie'],
  ]
  const openTask = modal?.kind === 'manager' ? tasks.find(t => t.orderId === modal.id) : undefined
  const openMember = modal && modal.kind !== 'manager' ? staff.find(x => x.id === modal.id) : undefined

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Hệ thống Vận hành / <span className="text-orange font-semibold">Nhân sự &amp; Điều chuyển</span></div>
        <div className="page-header">
          <h1>Nhân sự &amp; Điều chuyển</h1>
          <p>Theo dõi hạn xử lý của Kiểm dịch viên và Điều phối viên. Đơn trễ hạn hoặc có người phụ trách nghỉ được hệ thống tự động chuyển cho người ít đơn nhất; manager chỉ xử lý khi không còn ai để chuyển.</p>
        </div>
        <Rules />
        <div className="stat-grid">
          {stats.map(([label, value, icon]) => <div key={label} className="stat-card"><div className="stat-label"><i className={`fa-solid ${icon}`} /> {label}</div><div className="stat-value">{value}</div></div>)}
        </div>

        <div className="card">
          <div className="tabs">
            <button className={`tab ${issueTab === 'manager' ? 'active' : ''}`} onClick={() => setIssueTab('manager')}><i className={`fa-solid fa-triangle-exclamation ${m.amber}`} /> Cần manager xử lý<span className="count">{managerTasks.length}</span></button>
            <button className={`tab ${issueTab === 'log' ? 'active' : ''}`} onClick={() => setIssueTab('log')}>Nhật ký tự động chuyển<span className="count">{log.length}</span></button>
          </div>
          <div ref={issuesRef} className="table-wrap">
            {issueTab === 'manager' ? (
              <table className="data-table">
                <thead><tr><th>Mã Đơn hàng</th><th>Khách hàng</th><th>Khởi hành</th><th>Bước</th><th>Người phụ trách</th><th>Hạn xử lý</th><th>Tình trạng</th><th className="text-right">Thao tác</th></tr></thead>
                <tbody>{managerTasks.length ? managerTasks.map(t => (
                  <tr key={t.orderId}>
                    <td className={m.idCell}>{t.orderId}</td><td className="text-muted">{t.customer}</td><td className="nowrap">{formatDate(t.departure)}</td>
                    <td>{STEP_LABEL[t.step]}</td><td>{name(t.assigneeId)}</td><td className="nowrap"><DeadlineCell t={t} /></td><td><StateBadge t={t} staff={staff} /></td>
                    <td className="text-right nowrap"><button className="btn btn-primary btn-sm" onClick={() => setModal({ kind: 'manager', id: t.orderId })}><i className="fa-solid fa-user-tie" /> Xử lý</button></td>
                  </tr>
                )) : <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 24 }}><i className="fa-solid fa-circle-check text-green" /> Hệ thống đã tự xử lý hết, không có đơn nào cần manager</td></tr>}</tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead><tr><th>Thời điểm</th><th>Mã Đơn hàng</th><th>Bước</th><th>Từ</th><th>Sang</th><th>Lý do</th></tr></thead>
                <tbody>{log.length ? log.map(h => (
                  <tr key={h.t.orderId + h.time}>
                    <td className="nowrap">{formatDeadline(h.time)}</td><td className={m.idCell}>{h.t.orderId}</td><td>{STEP_LABEL[h.t.step]}</td>
                    <td>{name(h.fromId)}</td><td className="font-semibold">{name(h.toId)}</td>
                    <td><span className={`badge ${h.reason === 'Trễ hạn' ? 'badge-danger' : 'badge-warning'}`}>{h.reason}</span></td>
                  </tr>
                )) : <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 24 }}>Chưa có lần chuyển nào</td></tr>}</tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className={m.toolbar}><h3 className="font-bold">Danh sách Nhân sự</h3></div>
          <div className="tabs">
            {(['inspector', 'coordinator'] as const).map(r => <button key={r} className={`tab ${roleTab === r ? 'active' : ''}`} onClick={() => setRoleTab(r)}>{ROLE_LABEL[r]}<span className="count">{staff.filter(x => x.role === r).length}</span></button>)}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã NV</th><th>Họ tên</th><th>Số điện thoại</th><th>Trạng thái</th><th>Đơn đang xử lý</th><th>Trễ hạn (tháng)</th><th>Bị chuyển đơn (tháng)</th><th className="text-right">Thao tác</th></tr></thead>
              <tbody>{staff.filter(x => x.role === roleTab).map(x => (
                <tr key={x.id}>
                  <td className="text-muted nowrap">{x.id}</td><td className="font-semibold nowrap">{x.name}</td><td className="text-muted nowrap">{x.phone}</td>
                  <td>{x.status === 'working' ? <span className="badge badge-success">Đang làm việc</span> : <><span className="badge badge-warning">Nghỉ đến {formatDate(x.offTo!)}</span><div className="sub-text">Lý do: {x.offReason}</div></>}</td>
                  <td>{tasks.filter(t => t.assigneeId === x.id).length}</td>
                  <td>{x.kpi.late ? <span className="text-red">{x.kpi.late}</span> : 0}</td>
                  <td>{x.kpi.transferredOut}</td>
                  <td className="text-right nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'tasks', id: x.id })}><i className="fa-solid fa-list" /> Xem đơn</button>{' '}
                    {x.status === 'working'
                      ? <button className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'leave', id: x.id })}><i className="fa-solid fa-user-clock" /> Báo nghỉ</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => markBack(x)}><i className="fa-solid fa-user-check" /> Đi làm lại</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      {openTask && <ManagerActionModal t={openTask} staff={staff} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'tasks' && openMember && (
        <Modal wide title={openMember.name} subtitle={`${ROLE_LABEL[openMember.role]} · ${openMember.id} · ${tasks.filter(t => t.assigneeId === openMember.id).length} đơn đang xử lý`} onClose={() => setModal(null)}>
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng / Tuyến</th><th>Hạn xử lý</th><th>Tình trạng</th></tr></thead>
            <tbody>{tasks.filter(t => t.assigneeId === openMember.id).sort((a, b) => a.departure - b.departure).map(t => (
              <tr key={t.orderId}><td className={m.idCell}>{t.orderId}</td><td>{t.customer}<div className="sub-text">{t.route} · KH {formatDate(t.departure)}</div></td><td className="nowrap"><DeadlineCell t={t} /></td><td><StateBadge t={t} staff={staff} /></td></tr>
            ))}</tbody>
          </table></div>
        </Modal>
      )}
      {modal?.kind === 'leave' && openMember && (
        <LeaveModal member={openMember} staff={staff} tasks={tasks} onClose={() => setModal(null)}
          onDone={async offTo => { setModal(null); const moved = await refresh(); toast(`Đã ghi nhận ${openMember.name} nghỉ đến ${formatDate(offTo)}. Tự động chuyển ${moved} đơn`) }} />
      )}
    </div>
  )
}
