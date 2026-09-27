import type { StaffRole } from '@shared/types/role'

// Menu theo vai trò. Giữ đúng thứ tự và tên mục của các trang HTML cũ
// (Manager: MANAGER_NAV_ITEMS; Kiểm dịch, Điều phối: thanh bên ops-sidebar). Kiểm dịch: mục đầu đổi tên theo tiêu đề trang.
export const STAFF_MENUS: Record<StaffRole, [path: string, label: string][]> = {
  manager: [
    ['/manager', 'Bảng điều khiển'],
    ['/manager/intake', 'Tiếp nhận Đơn hàng'],
    ['/manager/approvals', 'Phê duyệt Đơn hàng'],
    ['/manager/staff', 'Nhân sự'],
    ['/manager/trip-reports', 'Báo cáo Chuyến đi'],
    ['/manager/incidents', 'Sự cố & Chi Phí'],
  ],
  specialist: [
    ['/specialist/verification', 'Hồ sơ được giao'],
    ['/specialist/trip-papers', 'Chuẩn bị giấy tờ chuyến đi'],
  ],
  coordinator: [
    ['/coordinator/assessment', 'Khả thi'],
    ['/coordinator/routing', 'Lộ trình'],
    ['/coordinator/assignment', 'Phân công'],
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
  coordinator: '/coordinator/assessment',
  driver: '/driver',
  escort: '/escort',
}
