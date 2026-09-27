// Danh sách trang của app nội bộ: URL → trang → vai trò.
import type { AppRoute } from '@shared/routing/types'
import { SitemapPage } from '../sitemap/SitemapPage'
import { ManagerLoginPage, StaffLoginPage } from './features/auth/StaffLoginPage'
import IntakePage from './features/manager/intake/IntakePage'
import ApprovalsPage from './features/manager/approvals/ApprovalsPage'
import StaffPage from './features/manager/staff/StaffPage'
import DashboardPage from './features/manager/dashboard/DashboardPage'
import TripReportsPage from './features/manager/trip-reports/TripReportsPage'
import IncidentsPage from './features/manager/incidents/IncidentsPage'
import VerificationListPage from './features/specialist/verification/VerificationListPage'
import VerifyPage from './features/specialist/verification/VerifyPage'
import TripPapersListPage from './features/specialist/trip-papers/TripPapersListPage'
import TripPapersPage from './features/specialist/trip-papers/TripPapersPage'
import AssessmentPage from './features/coordinator/assessment/AssessmentPage'
import RoutingPage from './features/coordinator/routing/RoutingPage'
import AssignmentPage from './features/coordinator/assignment/AssignmentPage'
import MonitoringPage from './features/coordinator/monitoring/MonitoringPage'
import CoordinatorIncidentsPage from './features/coordinator/incidents/CoordinatorIncidentsPage'
import FleetPage from './features/coordinator/fleet/FleetPage'
import CrewDetailPage from './features/coordinator/crew/CrewDetailPage'
import DriverPage from './features/driver/DriverPage'
import EscortPage from './features/escort/EscortPage'

const M: AppRoute['roles'] = ['manager']
const SP: AppRoute['roles'] = ['specialist']
const CO: AppRoute['roles'] = ['coordinator']

export const routes: AppRoute[] = [
  { path: '/login', page: StaffLoginPage, roles: [], title: 'Đăng nhập nội bộ', layout: 'bare' },
  { path: '/manager/login', page: ManagerLoginPage, roles: [], title: 'Đăng nhập Quản lý', layout: 'bare' },

  { path: '/manager', page: DashboardPage, roles: M, title: 'Bảng điều khiển', layout: 'staff' },
  { path: '/manager/intake', page: IntakePage, roles: M, title: 'Tiếp nhận Đơn hàng', layout: 'staff' },
  { path: '/manager/approvals', page: ApprovalsPage, roles: M, title: 'Phê duyệt Đơn hàng', layout: 'staff' },
  { path: '/manager/staff', page: StaffPage, roles: M, title: 'Nhân sự & Điều chuyển', layout: 'staff' },
  { path: '/manager/trip-reports', page: TripReportsPage, roles: M, title: 'Báo cáo Chuyến đi', layout: 'staff' },
  { path: '/manager/incidents', page: IncidentsPage, roles: M, title: 'Sự cố & Chi phí', layout: 'staff' },

  { path: '/specialist/verification', page: VerificationListPage, roles: SP, title: 'Hồ sơ được giao', layout: 'staff' },
  { path: '/specialist/verification/:id', page: VerifyPage, roles: SP, title: 'Xác minh hồ sơ', example: 'EQ-2026-1065', layout: 'staff' },
  { path: '/specialist/trip-papers', page: TripPapersListPage, roles: SP, title: 'Chuẩn bị giấy tờ chuyến đi', layout: 'staff' },
  { path: '/specialist/trip-papers/:id', page: TripPapersPage, roles: SP, title: 'Giấy tờ chuyến đi', example: 'EQ-2026-1058', layout: 'staff' },

  { path: '/coordinator/assessment', page: AssessmentPage, roles: CO, title: 'Đánh giá khả thi', layout: 'staff' },
  { path: '/coordinator/routing', page: RoutingPage, roles: CO, title: 'Lập lộ trình', layout: 'staff' },
  { path: '/coordinator/assignment', page: AssignmentPage, roles: CO, title: 'Phân công nhân sự', layout: 'staff' },
  { path: '/coordinator/monitoring', page: MonitoringPage, roles: CO, title: 'Giám sát vận chuyển', layout: 'staff' },
  { path: '/coordinator/incidents', page: CoordinatorIncidentsPage, roles: CO, title: 'Xử lý sự cố', layout: 'staff' },
  { path: '/coordinator/fleet', page: FleetPage, roles: CO, title: 'Quản lý đội xe', layout: 'staff' },
  { path: '/coordinator/staff/:id', page: CrewDetailPage, roles: CO, title: 'Chi tiết nhân sự', example: 'TX-07', layout: 'staff' },

  { path: '/driver', page: DriverPage, roles: ['driver'], title: 'Chuyến của tôi', layout: 'mobile' },
  { path: '/escort', page: EscortPage, roles: ['escort'], title: 'Nhật ký sức khỏe ngựa', layout: 'mobile' },
]

routes.push({ path: '/sitemap', page: () => <SitemapPage app="backoffice" />, roles: [], title: 'Sitemap', layout: 'staff' })
