// Danh sách trang của app nội bộ: URL → trang → vai trò.
import type { AppRoute } from '@shared/routing/types'
import { SitemapPage } from '@shared/routing/SitemapPage'
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
import DriverPage from './features/field/DriverPage'
import EscortPage from './features/field/EscortPage'

const M: AppRoute['roles'] = ['manager']
const SP: AppRoute['roles'] = ['specialist']
const CO: AppRoute['roles'] = ['coordinator']

export const routes: AppRoute[] = [
  { path: '/login', page: StaffLoginPage, roles: [], title: 'Đăng nhập nội bộ', legacy: 'Staffs/staff_login.html', layout: 'bare' },
  { path: '/manager/login', page: ManagerLoginPage, roles: [], title: 'Đăng nhập Quản lý', legacy: 'Manager/manager_login.html', layout: 'bare' },

  { path: '/manager', page: DashboardPage, roles: M, title: 'Bảng điều khiển', legacy: 'Manager/manager_dashboard.html', layout: 'staff' },
  { path: '/manager/intake', page: IntakePage, roles: M, title: 'Tiếp nhận Đơn hàng', legacy: 'Manager/manager_tiep_nhan.html', layout: 'staff' },
  { path: '/manager/approvals', page: ApprovalsPage, roles: M, title: 'Phê duyệt Đơn hàng', legacy: 'Manager/manager_phe_duyet.html', layout: 'staff' },
  { path: '/manager/staff', page: StaffPage, roles: M, title: 'Nhân sự & Điều chuyển', legacy: 'Manager/manager_phan_cong.html', layout: 'staff' },
  { path: '/manager/trip-reports', page: TripReportsPage, roles: M, title: 'Báo cáo Chuyến đi', legacy: 'Manager/manager_trip_reports.html', layout: 'staff' },
  { path: '/manager/incidents', page: IncidentsPage, roles: M, title: 'Sự cố & Chi phí', legacy: 'Manager/manager_duyet_su_co.html', layout: 'staff' },

  { path: '/specialist/verification', page: VerificationListPage, roles: SP, title: 'Hồ sơ được giao', legacy: 'Specialist/CUS2_KiemDich.html', layout: 'staff' },
  { path: '/specialist/verification/:id', page: VerifyPage, roles: SP, title: 'Xác minh hồ sơ', legacy: 'Specialist/chi-tiet-kiem-dich.html', layout: 'staff' },
  { path: '/specialist/trip-papers', page: TripPapersListPage, roles: SP, title: 'Chuẩn bị giấy tờ chuyến đi', legacy: 'Specialist/CUS2_Policy_List.html', layout: 'staff' },
  { path: '/specialist/trip-papers/:id', page: TripPapersPage, roles: SP, title: 'Giấy tờ chuyến đi', legacy: 'Specialist/CUS2_Policy.html', layout: 'staff' },

  { path: '/coordinator/assessment', page: AssessmentPage, roles: CO, title: 'Đánh giá khả thi', legacy: 'Fleet And Route/OPS-03.html', layout: 'staff' },
  { path: '/coordinator/routing', page: RoutingPage, roles: CO, title: 'Lập lộ trình', legacy: 'Fleet And Route/OPS-05.html', layout: 'staff' },
  { path: '/coordinator/assignment', page: AssignmentPage, roles: CO, title: 'Phân công nhân sự', legacy: 'Fleet And Route/OPS-08.html', layout: 'staff' },
  { path: '/coordinator/monitoring', page: MonitoringPage, roles: CO, title: 'Giám sát vận chuyển', legacy: 'Fleet And Route/OPS-06.html', layout: 'staff' },
  { path: '/coordinator/incidents', page: CoordinatorIncidentsPage, roles: CO, title: 'Xử lý sự cố', legacy: 'Fleet And Route/OPS-04.html', layout: 'staff' },
  { path: '/coordinator/fleet', page: FleetPage, roles: CO, title: 'Quản lý đội xe', legacy: 'Fleet And Route/OPS-07.html', layout: 'staff' },
  { path: '/coordinator/staff/:id', page: CrewDetailPage, roles: CO, title: 'Chi tiết nhân sự', legacy: 'Fleet And Route/chi-tiet-nhan-su.html', layout: 'staff' },

  { path: '/driver', page: DriverPage, roles: ['driver'], title: 'Chuyến của tôi', legacy: 'Driver/index.html', layout: 'mobile' },
  { path: '/escort', page: EscortPage, roles: ['escort'], title: 'Nhật ký sức khỏe ngựa', legacy: 'Escort/escort_page.html', layout: 'mobile' },
]

routes.push({ path: '/sitemap', page: () => <SitemapPage routes={routes} appName="App nội bộ" />, roles: [], title: 'Sitemap', layout: 'staff' })
