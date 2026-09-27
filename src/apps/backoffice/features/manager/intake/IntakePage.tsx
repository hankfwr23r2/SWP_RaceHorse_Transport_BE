// Tiếp nhận đơn hàng. Chuyển từ Manager/manager_tiep_nhan.html + manager_tiep_nhan.js.
// Manager là người đầu tiên thấy đơn khách gửi: tiếp nhận (phân công kiểm dịch viên & điều phối viên) hoặc từ chối sớm;
// xử lý việc kiểm dịch chuyển lên (báo vấn đề, khách chọn kiểm tra lại, khách quá hạn chọn phương án).
import { useState } from 'react'
import { Link } from 'react-router'
import { MIN_LEAD_DAYS } from '@shared/config/business-rules'
import { DAY } from '@shared/config/business-rules'
import { startOfDay } from '@shared/lib/dates'
import { formatClock, formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { useStaggerIn } from '@shared/motion/motion'
import { ordersApi } from '@shared/services/orders'
import { staffApi, suggestStaff } from '@shared/services/staff'
import { useLoad } from '@shared/services/useLoad'
import { orderTotal, type Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { usePagination } from '@shared/ui/usePagination'
import { HorsesDocs, QuoteList, SearchBox, Section, Stepper, TripInfo, cx, matches, partStyles as s } from '../../../shared/parts'
import { ManagerAction, optionText } from './ManagerAction'
import { choiceHoursLeft, intakeStatus, waitingChoice, type IntakeStatus } from './intake-status'

const TABS: [IntakeStatus, string][] = [['new', 'Đơn mới'], ['needs_manager', 'Cần Manager xử lý'], ['inspecting', 'Đang kiểm dịch'], ['routing', 'Đang lập lộ trình'], ['rejected', 'Từ chối']]
const REJECT_TYPES = ['Đơn trùng lặp', 'Thông tin khai báo không khớp hồ sơ', 'Ngựa không thuộc diện vận chuyển (không phải ngựa đua)', 'Khác']
const STEP_OF: Record<IntakeStatus, number> = { new: 0, needs_manager: 1, inspecting: 1, routing: 2, rejected: 0 }

function Assignee({ o, st }: { o: Order; st: IntakeStatus }) {
  if (st === 'new') return <span className="text-muted">Chưa phân công</span>
  if (st === 'needs_manager') return {
    issue: <span className="badge badge-warning">Chọn phương án gửi khách</span>,
    recheck: <span className="badge badge-warning">Giao kiểm tra lại</span>,
    expired: <span className="badge badge-danger">Khách quá hạn chọn</span>,
  }[o.pending!.kind]
  if (st === 'inspecting') {
    const sub = waitingChoice(o) ? `Chờ khách chọn phương án · còn ${choiceHoursLeft(o)} giờ` : o.status === 'rechecking' ? 'Kiểm tra lại' : o.waitingCustomer ? 'Chờ khách bổ sung' : ''
    return <><i className="fa-solid fa-user-doctor text-muted" /> {o.inspector}{sub && <div className="sub-text">{sub}</div>}</>
  }
  if (st === 'routing') return <><i className="fa-solid fa-route text-muted" /> {o.coordinator}</>
  return <span className="text-muted">Manager · bước {o.rejectedStep === 0 ? 'Tiếp nhận' : 'Kiểm dịch'}</span>
}

function StatusBanner({ o, st }: { o: Order; st: IntakeStatus }) {
  if (st === 'inspecting') {
    const text = waitingChoice(o)
      ? <>Đã gửi phương án cho khách lúc {formatDateTime(o.offer!.sentAt)}: {optionText(o.offer!.options, o.offer!.custom)}. Hạn khách chọn: <b>{formatDateTime(o.offer!.sentAt + 48 * 3600_000)}</b>.</>
      : o.status === 'rechecking'
        ? <>Đang kiểm tra lại theo yêu cầu của khách. Kiểm dịch viên <b>{o.inspector}</b> xác minh lại từ đầu.</>
        : o.waitingCustomer
          ? <>Kiểm dịch viên <b>{o.inspector}</b> đã yêu cầu khách bổ sung giấy tờ. Đơn đang chờ phía khách, đồng hồ xử lý của kiểm dịch tạm dừng.</>
          : <>Đã tiếp nhận lúc {o.intakeAt ? formatDateTime(o.intakeAt) : '—'}. Đang chờ Kiểm dịch viên <b>{o.inspector}</b> xác minh hồ sơ.</>
    return <div className={`alert alert-info ${s.banner}`}><i className="fa-solid fa-hourglass-half" /><div>{text}</div></div>
  }
  if (st === 'routing') return <div className={`alert alert-info ${s.banner}`}><i className="fa-solid fa-hourglass-half" /><div>Hồ sơ đã được kiểm dịch xác nhận hợp lệ. Đang chờ Điều phối viên <b>{o.coordinator}</b> lập lộ trình.</div></div>
  if (st === 'rejected') return (
    <div className={`alert alert-danger ${s.banner}`}><i className="fa-solid fa-circle-xmark" /><div>
      <b>Manager từ chối</b> ở bước {o.rejectedStep === 0 ? 'Tiếp nhận' : 'Kiểm dịch'} lúc {formatDateTime(o.rejectedAt!)} — <b>{o.rejectType}</b>: {o.reason}
      {o.report && <><br />Báo cáo kiểm dịch ({o.report.inspector}): {o.report.type} — {o.report.note}</>}
    </div></div>
  )
  return null
}

function IntakeModal({ order: o, orders, onClose, onSave }: { order: Order; orders: Order[]; onClose: () => void; onSave: (patch: Partial<Order>, message: string, type?: 'success' | 'error') => void }) {
  const st = intakeStatus(o)!
  const { data: staff = [] } = useLoad(staffApi.list)
  const inspectors = suggestStaff(staff, 'inspector', orders)
  const coordinators = suggestStaff(staff, 'coordinator', orders)
  const [inspector, setInspector] = useState<string>()
  const [coordinator, setCoordinator] = useState<string>()
  const [rejecting, setRejecting] = useState(false)
  const [rejectType, setRejectType] = useState(REJECT_TYPES[0])
  const [rejectNote, setRejectNote] = useState('')
  const [shake, setShake] = useState(0)
  const canAccept = inspectors.length > 0 && coordinators.length > 0

  const leadDays = Math.round((startOfDay(o.departAt).getTime() - startOfDay(o.submittedAt).getTime()) / DAY)
  const checks: [boolean, string][] = [
    [leadDays >= MIN_LEAD_DAYS, `Khởi hành sau ${leadDays} ngày kể từ ngày đặt (tối thiểu ${MIN_LEAD_DAYS} ngày)`],
    [true, 'Tuyến nằm trong vùng phục vụ (Việt Nam – Lào – Campuchia)'],
    [true, `Còn năng lực vận chuyển — đã giữ chỗ tạm ${o.hold ?? ''}`],
    [true, `Khách đã nộp đủ hồ sơ cho ${o.horses.length} ngựa`],
  ]

  const accept = () => {
    const ins = inspector ?? inspectors[0].name
    const coo = coordinator ?? coordinators[0].name
    onSave({
      stage: 'inspecting', inspector: ins, coordinator: coo, intakeAt: Date.now(),
      task: { step: 'inspector', assigneeId: inspectors.find(x => x.name === ins)!.id, assignedAt: Date.now(), pausedWorkingDays: 0, history: [] },
    }, `Đã tiếp nhận ${o.id}. Đã giao Kiểm dịch viên ${ins} xác minh hồ sơ`)
  }
  const reject = () => {
    if (!rejectNote.trim()) return setShake(shake + 1)
    onSave({ status: 'rejected', rejectedStep: 0, rejectedAt: Date.now(), rejectType, reason: rejectNote.trim(), stage: undefined }, `Đã từ chối sớm đơn ${o.id} và thông báo cho khách hàng`, 'error')
  }

  const staffSelect = (list: typeof inspectors, value: string | undefined, set: (v: string) => void, role: string) => list.length
    ? <select className="form-control" value={value ?? list[0].name} onChange={e => set(e.target.value)}>{list.map((x, i) => <option key={x.id} value={x.name}>{x.name} — {x.load} đơn đang xử lý{i === 0 ? ' (gợi ý)' : ''}</option>)}</select>
    : <div className="alert alert-danger"><i className="fa-solid fa-user-slash" /><div>Không còn {role} nào đang làm việc.</div></div>

  const footer = st === 'new' && (
    rejecting ? null : <>
      <button className="btn btn-ghost" onClick={() => setRejecting(true)}><i className="fa-solid fa-ban" /> Từ chối sớm</button>
      <button className="btn btn-primary" disabled={!canAccept} title={canAccept ? '' : 'Không đủ nhân sự để tiếp nhận. Xem trang Nhân sự.'} onClick={accept}><i className="fa-solid fa-check" /> Tiếp nhận & phân công</button>
    </>
  )

  return (
    <Modal wide title={o.id} subtitle={`${o.customer} · Gửi lúc ${formatDateTime(o.submittedAt)}`} onClose={onClose} footer={footer || undefined}>
      <Stepper current={STEP_OF[st]} rejectedAt={st === 'rejected' ? (o.rejectedStep ?? 0) : undefined} />
      <StatusBanner o={o} st={st} />
      <Section num={1} title="Thông tin chuyến"><TripInfo order={o} /></Section>
      <Section num={2} title="Ngựa & hồ sơ khách đã nộp"><HorsesDocs order={o} /></Section>
      <Section num={3} title="Báo giá đã gửi khách"><QuoteList order={o} /></Section>
      <Section num={4} title="Hệ thống kiểm tra tự động">
        <ul className={s.checks}>
          {checks.map(([ok, text]) => <li key={text} className={ok ? s.checkOk : s.checkWarn}><i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} /> {text}</li>)}
          {o.warning && <li className={s.checkWarn}><i className="fa-solid fa-triangle-exclamation" /> {o.warning}</li>}
        </ul>
      </Section>
      <Section num={5} title="Phân công xử lý">
        {st === 'new' ? <>
          <div className={s.assignGrid}>
            <div className="form-group"><label><i className="fa-solid fa-user-doctor" /> Kiểm dịch viên</label>{staffSelect(inspectors, inspector, setInspector, 'kiểm dịch viên')}</div>
            <div className="form-group"><label><i className="fa-solid fa-route" /> Điều phối viên</label>{staffSelect(coordinators, coordinator, setCoordinator, 'điều phối viên')}</div>
          </div>
          <p className={s.hint}><i className="fa-solid fa-circle-info" /> Hệ thống gợi ý người đang ít việc nhất. Điều phối viên bắt đầu lập lộ trình sau khi Kiểm dịch viên xác nhận hồ sơ hợp lệ.</p>
          {!canAccept && <p className={s.hint}><i className="fa-solid fa-lock" /> Nút tiếp nhận bị khóa cho đến khi có nhân sự đi làm lại (xem trang <Link to="/manager/staff">Nhân sự</Link>). Đơn giữ nguyên ở tab "Đơn mới".</p>}
        </> : st === 'rejected' && o.rejectedStep === 0
          ? <p className="text-muted small">Đơn bị từ chối ở bước Tiếp nhận, không phân công.</p>
          : <div className={s.infoGrid}><div><span className="text-muted small">Kiểm dịch viên</span><div className="font-semibold">{o.inspector}</div></div><div><span className="text-muted small">Điều phối viên</span><div className="font-semibold">{o.coordinator}</div></div></div>}
      </Section>

      {st === 'needs_manager' && <Section num={6} title="Manager xử lý"><ManagerAction order={o} staff={staff} orders={orders} onSave={onSave} /></Section>}

      {rejecting && (
        <div key={shake} className={cx(s.rejectBox, shake > 0 && s.shake)}>
          <div className="form-group"><label className="required">Lý do từ chối</label><select className="form-control" value={rejectType} onChange={e => setRejectType(e.target.value)}>{REJECT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="required">Ghi chú gửi khách</label><textarea rows={3} className={cx('form-control', shake > 0 && !rejectNote.trim() && 'invalid')} autoFocus value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Giải thích cho khách vì sao đơn bị từ chối..." /></div>
          <div className="text-right" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setRejecting(false); setRejectNote(''); setShake(0) }}>Hủy</button>
            <button className="btn btn-danger" onClick={reject}><i className="fa-solid fa-ban" /> Xác nhận từ chối</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function IntakePage() {
  const toast = useToast()
  const { data: all = [], reload } = useLoad(ordersApi.list)
  const [tab, setTab] = useState<IntakeStatus>('new')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = all.filter(o => intakeStatus(o) !== null).sort((a, b) => b.submittedAt - a.submittedAt)
  const list = rows.filter(o => intakeStatus(o) === tab && matches(o, query))
  const { rows: page, bar } = usePagination(list)
  const tableRef = useStaggerIn('tbody tr', [tab, query, list.length])
  const open = all.find(o => o.id === openId)

  const save = async (patch: Partial<Order>, message: string, type: 'success' | 'error' = 'success') => {
    await ordersApi.update(openId!, patch)
    setOpenId(null)
    toast(message, type)
    reload()
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Hệ thống Vận hành / <span className="text-orange font-semibold">Tiếp nhận Đơn hàng</span></div>
        <div className="page-header">
          <h1>Tiếp nhận Đơn hàng</h1>
          <p>Đơn khách hàng vừa gửi (đã có báo giá tự động). Xác nhận phân công Kiểm dịch viên &amp; Điều phối viên để chuyển xử lý, hoặc từ chối sớm đơn không hợp lệ.</p>
        </div>
        <div className="card">
          <div className={s.toolbar}>
            <h3 className="font-bold">Danh sách Đơn hàng</h3>
            <SearchBox value={query} onChange={setQuery} placeholder="Tìm Mã đơn, Khách hàng, Tuyến..." />
          </div>
          <div className={s.tabsRow}>
            <div className="tabs" style={{ borderBottom: 'none', marginBottom: 0 }}>
              {TABS.map(([key, label]) => <button key={key} className={`tab ${key === tab ? 'active' : ''}`} onClick={() => setTab(key)}>{label}<span className="count">{rows.filter(o => intakeStatus(o) === key).length}</span></button>)}
            </div>
            <Link to="/manager/approvals" className={s.nextLink}>Sang Phê duyệt Đơn hàng <i className="fa-solid fa-arrow-right" /></Link>
          </div>
          <div ref={tableRef} className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã Đơn hàng</th><th>Khách hàng</th><th>Tuyến đường</th><th>Số ngựa</th><th>Gửi lúc</th><th>Khởi hành</th><th className="text-right">Giá đã báo</th><th>Phụ trách</th><th className="text-right">Thao tác</th></tr></thead>
              <tbody>
                {page.length ? page.map(o => {
                  const st = intakeStatus(o)!
                  return (
                    <tr key={o.id}>
                      <td className={s.idCell}>{o.id}{o.warning && <> <i className={`fa-solid fa-triangle-exclamation ${s.amber}`} title="Có cảnh báo" /></>}</td>
                      <td className="text-muted">{o.customer}</td>
                      <td>{o.routeShort}{o.border && <div className="sub-text"><i className="fa-solid fa-flag" /> {o.border}</div>}</td>
                      <td className="text-muted">{o.horses.length}</td>
                      <td className="text-muted nowrap">{formatDate(o.submittedAt)}<div className="sub-text">{formatClock(o.submittedAt)}</div></td>
                      <td className="text-muted">{formatDate(o.departAt)}</td>
                      <td className="text-right font-semibold nowrap">{formatVND(orderTotal(o))}</td>
                      <td><Assignee o={o} st={st} /></td>
                      <td className="text-right nowrap">{st === 'new' || st === 'needs_manager'
                        ? <button className="btn btn-primary btn-sm" onClick={() => setOpenId(o.id)}>{st === 'new' ? 'Tiếp nhận' : 'Xử lý'}</button>
                        : <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(o.id)}><i className="fa-solid fa-eye" /> Xem</button>}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 24 }}>Không có đơn nào</td></tr>}
              </tbody>
            </table>
          </div>
          {bar}
        </div>
      </div>
      {open && <IntakeModal order={open} orders={all} onClose={() => setOpenId(null)} onSave={save} />}
    </div>
  )
}
