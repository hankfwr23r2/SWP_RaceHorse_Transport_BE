// Service nhân sự nội bộ (kiểm dịch viên, điều phối viên). Sau này: GET/PATCH /api/staff
import type { Order } from '../types/order'
import { seedStaff, type StaffMember } from './mock/staff'
import { createStore } from './store'

const store = createStore<StaffMember>('staff', seedStaff)

export const staffApi = {
  list: async (): Promise<StaffMember[]> => structuredClone(store.all()),
  update: async (id: string, patch: Partial<StaffMember>) => structuredClone(store.update(id, patch)),
}

// Số đơn đang xử lý của một người (dùng để gợi ý người ít việc nhất):
// kiểm dịch viên: đơn đang ở bước kiểm dịch · điều phối viên: đơn đang ở bước kiểm dịch hoặc lập lộ trình
const ACTIVE: Order['status'][] = ['processing', 'choose_option', 'rechecking']
export const loadOf = (name: string, role: StaffMember['role'], orders: Order[]) =>
  orders.filter(o => ACTIVE.includes(o.status) && (role === 'inspector'
    ? o.stage === 'inspecting' && o.inspector === name
    : (o.stage === 'inspecting' || o.stage === 'routing') && o.coordinator === name)).length

// Người đang làm việc ít việc nhất (gợi ý phân công)
export function suggestStaff(staff: StaffMember[], role: StaffMember['role'], orders: Order[], exclude: string[] = []) {
  return staff
    .filter(s => s.role === role && s.status === 'working' && !exclude.includes(s.name))
    .map(s => ({ ...s, load: loadOf(s.name, role, orders) }))
    .sort((a, b) => a.load - b.load || a.id.localeCompare(b.id))
}
