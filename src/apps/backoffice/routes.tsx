// Danh sách trang của app nội bộ: URL → trang → vai trò.
import type { AppRoute } from '@shared/routing/types'
import { SitemapPage } from '../sitemap/SitemapPage'
import { ManagerLoginPage, StaffLoginPage } from './features/auth/StaffLoginPage'
import IntakePage from './features/manager/intake/IntakePage'
import ApprovalsPage from './features/manager/approvals/ApprovalsPage'
import ManifestsPage from './features/manager/manifests/ManifestsPage'
import DocumentsPage from './features/manager/documents/DocumentsPage'
import StaffPage from './features/manager/staff/StaffPage'
import DashboardPage from './features/manager/dashboard/DashboardPage'
import TripReportsPage from './features/manager/trip-reports/TripReportsPage'
import IncidentsPage from './features/manager/incidents/IncidentsPage'
import VerificationListPage from './features/specialist/verification/VerificationListPage'
import VerifyPage from './features/specialist/verification/VerifyPage'
import LegalListPage from './features/specialist/legal/LegalListPage'
import LegalReviewPage from './features/specialist/legal/LegalReviewPage'
import FleetPlanListPage from './features/coordinator/fleet-plan/FleetPlanListPage'
import FleetPlanPage from './features/coordinator/fleet-plan/FleetPlanPage'
import RouteListPage from './features/coordinator/routes/RouteListPage'
import RoutePlannerPage from './features/coordinator/routes/RoutePlannerPage'
import DispatchListPage from './features/coordinator/dispatch/DispatchListPage'
import DispatchPage from './features/coordinator/dispatch/DispatchPage'
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
  { path: '/manager/intake', page: IntakePage, roles: M, title: 'Tiếp nhận đơn hàng', layout: 'staff' },
  { path: '/manager/approvals', page: ApprovalsPage, roles: M, title: 'Duyệt báo giá', layout: 'staff' },
  { path: '/manager/manifests', page: ManifestsPage, roles: M, title: 'Duyệt Trip Manifest', layout: 'staff' },
  { path: '/manager/documents', page: DocumentsPage, roles: M, title: 'Theo dõi hồ sơ pháp lý', layout: 'staff' },
  { path: '/manager/staff', page: StaffPage, roles: M, title: 'Nhân sự & Điều chuyển', layout: 'staff' },
  { path: '/manager/trip-reports', page: TripReportsPage, roles: M, title: 'Báo cáo Chuyến đi', layout: 'staff' },
  { path: '/manager/incidents', page: IncidentsPage, roles: M, title: 'Sự cố & Chi phí', layout: 'staff' },

  { path: '/specialist/verification', page: VerificationListPage, roles: SP, title: 'Thẩm định y tế', layout: 'staff' },
  { path: '/specialist/verification/:id', page: VerifyPage, roles: SP, title: 'Thẩm định y tế một đơn', example: 'ORD-2026-0102', layout: 'staff' },
  { path: '/specialist/legal', page: LegalListPage, roles: SP, title: 'Hồ sơ pháp lý', layout: 'staff' },
  { path: '/specialist/legal/:id', page: LegalReviewPage, roles: SP, title: 'Duyệt hồ sơ pháp lý', example: 'ORD-2026-0109', layout: 'staff' },

  { path: '/coordinator/fleet-plan', page: FleetPlanListPage, roles: CO, title: 'Phương án xe và lộ trình', layout: 'staff' },
  { path: '/coordinator/fleet-plan/:id', page: FleetPlanPage, roles: CO, title: 'Lập phương án xe', example: 'ORD-2026-0102', layout: 'staff' },
  { path: '/coordinator/routes', page: RouteListPage, roles: CO, title: 'Lộ trình chi tiết', layout: 'staff' },
  { path: '/coordinator/routes/:id', page: RoutePlannerPage, roles: CO, title: 'Lập lộ trình chi tiết', example: 'ORD-2026-0112', layout: 'staff' },
  { path: '/coordinator/dispatch', page: DispatchListPage, roles: CO, title: 'Lệnh xuất bến', layout: 'staff' },
  { path: '/coordinator/dispatch/:id', page: DispatchPage, roles: CO, title: 'Phát lệnh xuất bến', example: 'ORD-2026-0111', layout: 'staff' },
  { path: '/coordinator/monitoring', page: MonitoringPage, roles: CO, title: 'Giám sát vận chuyển', layout: 'staff' },
  { path: '/coordinator/incidents', page: CoordinatorIncidentsPage, roles: CO, title: 'Xử lý sự cố', layout: 'staff' },
  { path: '/coordinator/fleet', page: FleetPage, roles: CO, title: 'Quản lý đội xe', layout: 'staff' },
  { path: '/coordinator/staff/:id', page: CrewDetailPage, roles: CO, title: 'Chi tiết nhân sự', example: 'TX-07', layout: 'staff' },

  { path: '/driver', page: DriverPage, roles: ['driver'], title: 'Chuyến của tôi', layout: 'mobile' },
  { path: '/escort', page: EscortPage, roles: ['escort'], title: 'Nhật ký sức khỏe ngựa', layout: 'mobile' },
]

routes.push({ path: '/sitemap', page: () => <SitemapPage app="backoffice" />, roles: [], title: 'Sitemap', layout: 'staff' })
