// Theo dõi hạn xử lý và tự động chuyển người. Chuyển nguyên logic từ manager_phan_cong.js.
// Quy tắc (docs/PRD.md mục 5):
// - Chuyển khi: đơn trễ hạn HOẶC người phụ trách đang nghỉ.
// - Người nhận: cùng vai trò, đang làm việc, chưa từng phụ trách đơn này; ít đơn nhất, bằng nhau theo mã nhân viên.
// - Đơn khởi hành sớm được chuyển trước. Không tự chuyển khi không còn người nhận hoặc đã qua mốc chót → Manager xử lý.
import { MIN_LEAD_DAYS, SLA_WORKING_DAYS, WORK_END_HOUR } from '@shared/config/business-rules'
import { atHour, shiftWorkingDays, workingDaysBetween } from '@shared/lib/dates'
import { capDeadline, taskDeadline } from '@shared/lib/deadlines'
import { formatDate, formatDeadline } from '@shared/lib/format'
import type { StaffMember } from '@shared/services/mock/staff'
import type { Order, TaskTrack } from '@shared/types/order'

export const ROLE_LABEL = { inspector: 'Kiểm dịch viên', coordinator: 'Điều phối viên' } as const
export const STEP_LABEL = { inspector: 'Kiểm dịch', coordinator: 'Lập lộ trình' } as const

export interface Task extends TaskTrack { orderId: string; customer: string; route: string; departure: number }

const ACTIVE: Order['status'][] = ['processing', 'choose_option', 'rechecking']
// Việc đang theo dõi: đơn còn ở đúng bước của người phụ trách
export const tasksOf = (orders: Order[]): Task[] => orders
  .filter(o => o.task && ACTIVE.includes(o.status) && o.stage === (o.task.step === 'inspector' ? 'inspecting' : 'routing'))
  .map(o => ({ ...o.task!, orderId: o.id, customer: o.customer, route: o.routeShort, departure: o.departAt }))

const timing = (t: Task) => ({ assignedAt: t.assignedAt, departure: t.departure, pausedWorkingDays: t.pausedWorkingDays, specialDeadline: t.specialDeadline })
export const deadlineOf = (t: Task) => taskDeadline(timing(t), t.step)
export const capOf = (t: Task) => capDeadline(timing(t), t.step)

const find = (staff: StaffMember[], id: string) => staff.find(s => s.id === id)!

// Lý do cần chuyển người, hoặc null nếu không cần
export function transferReason(t: Task, staff: StaffMember[], now = Date.now()) {
  // Gia hạn đặc biệt = manager chấp nhận chờ người phụ trách đi làm lại
  if (find(staff, t.assigneeId).status === 'off' && !t.specialDeadline) return 'Người phụ trách nghỉ'
  if (t.pausedSince) return null
  if (now > deadlineOf(t).time) return 'Trễ hạn'
  return null
}

// Người nhận hợp lệ, đã sắp theo thứ tự ưu tiên
export function candidatesFor(t: Task, staff: StaffMember[], tasks: Task[]) {
  const previous = t.history.map(h => h.fromId)
  const count = (id: string) => tasks.filter(x => x.assigneeId === id).length
  return staff
    .filter(s => s.role === t.step && s.status === 'working' && s.id !== t.assigneeId && !previous.includes(s.id))
    .sort((a, b) => count(a.id) - count(b.id) || a.id.localeCompare(b.id))
}

export interface Transfer { orderId: string; task: TaskTrack; fromId: string; toId: string; reason: string }

// Chạy mỗi lần dữ liệu thay đổi; đơn khởi hành sớm được xử lý trước. Trả về các lần chuyển (chưa lưu).
export function autoTransfer(tasks: Task[], staff: StaffMember[], now = Date.now()): Transfer[] {
  const working = tasks.map(t => ({ ...t, history: [...t.history] }))
  const moved: Transfer[] = []
  ;[...working].sort((a, b) => a.departure - b.departure).forEach(t => {
    if (t.reschedule) return
    const reason = transferReason(t, staff, now)
    if (!reason || now >= capOf(t)) return
    const to = candidatesFor(t, staff, working)[0]
    if (!to) return
    const fromId = t.assigneeId
    t.history.push({ time: now, fromId, toId: to.id, reason, auto: true })
    t.assigneeId = to.id
    t.assignedAt = now
    t.pausedWorkingDays = 0
    delete t.specialDeadline
    const { orderId, customer: _c, route: _r, departure: _d, ...task } = t
    moved.push({ orderId, task, fromId, toId: to.id, reason })
  })
  return moved
}

// code: paused | on_track | due_soon | manager
export function stateOf(t: Task, staff: StaffMember[], now = Date.now()): { code: 'paused' | 'on_track' | 'due_soon' | 'manager'; cause?: string; remaining?: number } {
  if (t.reschedule) return { code: 'manager', cause: `Đã đề nghị khách dời ngày khởi hành đến ${formatDate(t.reschedule.newDate)}, chờ khách phản hồi` }
  const reason = transferReason(t, staff, now)
  if (reason) {
    const why = now >= capOf(t) ? 'đã qua mốc chót theo ngày khởi hành' : `không còn ${ROLE_LABEL[t.step].toLowerCase()} nào đang làm việc chưa từng phụ trách đơn`
    return { code: 'manager', cause: `${reason}, ${why}` }
  }
  if (t.pausedSince) return { code: 'paused' }
  const remaining = workingDaysBetween(now, deadlineOf(t).time)
  return { code: remaining <= 1 ? 'due_soon' : 'on_track', remaining }
}

// Phương án 1: gia hạn đặc biệt
export function specialExtensionOption(t: Task, staff: StaffMember[], now = Date.now()) {
  const assignee = find(staff, t.assigneeId)
  const cap = capOf(t)
  // Người phụ trách nghỉ: chờ đi làm lại rồi tính đủ số ngày làm việc của bước
  const newDeadline = assignee.status === 'off' ? atHour(shiftWorkingDays(assignee.offTo!, SLA_WORKING_DAYS[t.step]), WORK_END_HOUR) : cap
  const label = assignee.status === 'off'
    ? `Chờ ${assignee.name} đi làm lại (nghỉ đến ${formatDate(assignee.offTo!)}), hạn mới ${formatDeadline(newDeadline)}`
    : `Giữ ${assignee.name}, gia hạn đặc biệt đến mốc chót ${formatDeadline(cap)}`
  const ok = newDeadline <= cap && now < cap && !t.specialDeadline
  const why = t.specialDeadline ? 'Đơn đã được gia hạn đặc biệt 1 lần' : `Không kịp mốc chót ${formatDeadline(cap)}`
  return { ok, newDeadline, label, why: ok ? '' : why }
}

export const MIN_RESCHEDULE_DAYS = MIN_LEAD_DAYS
