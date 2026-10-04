import type { StaffRole } from '@shared/types/role'

// Menu theo vai trò. Các mục của Flow 1 (tiếp nhận, duyệt báo giá, thẩm định y tế, phương án xe) theo quy trình mới.
export const STAFF_MENUS: Record<StaffRole, [path: string, label: string][]> = {
  manager: [
    ['/manager', 'Bảng điều khiển'],
    ['/manager/intake', 'Tiếp nhận đơn'],
    ['/manager/approvals', 'Duyệt báo giá'],
    ['/manager/progress', 'Tiến độ đơn'],
    ['/manager/trip-reports', 'Báo cáo Chuyến đi'],
    ['/manager/incidents', 'Sự cố'],
  ],
  specialist: [
    ['/specialist/verification', 'Thẩm định y tế'],
    ['/specialist/legal', 'Giấy tờ chuyến đi'],
  ],
  coordinator: [
    ['/coordinator/fleet-plan', 'Xe và lộ trình'],
    ['/coordinator/dispatch', 'Giấy cho tài xế'],
    ['/coordinator/monitoring', 'Giám sát'],
    ['/coordinator/incidents', 'Sự cố'],
    ['/coordinator/fleet', 'Đội xe'],
  ],
  driver: [['/driver', 'Chuyến của tôi']],
  escort: [['/escort', 'Nhật ký sức khỏe']],
}

export const HOME_OF: Record<StaffRole, string> = {
  manager: '/manager',
  specialist: '/specialist/verification',
  coordinator: '/coordinator/fleet-plan',
  driver: '/driver',
  escort: '/escort',
}
