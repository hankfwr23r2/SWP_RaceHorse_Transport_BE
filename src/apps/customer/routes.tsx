// Danh sách trang của app khách: URL → trang → vai trò. Rỗng roles = công khai.
import type { AppRoute } from '@shared/routing/types'
import { SitemapPage } from '../sitemap/SitemapPage'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import HomePage from './features/home/HomePage'
import PortalPage from './features/portal/PortalPage'
import Step1RoutePage from './features/booking/Step1RoutePage'
import Step2HorsesPage from './features/booking/Step2HorsesPage'
import Step3ServicesPage from './features/booking/Step3ServicesPage'
import Step4ReviewPage from './features/booking/Step4ReviewPage'
import OrdersPage from './features/orders/OrdersPage'
import OrderDetailPage from './features/orders/OrderDetailPage'
import AcceptancePage from './features/acceptance/AcceptancePage'
import QuotesPage from './features/quote/QuotesPage'
import TrackingPage from './features/tracking/TrackingPage'

const C = ['customer'] as AppRoute['roles']

export const routes: AppRoute[] = [
  { path: '/', page: HomePage, roles: [], title: 'Trang chủ', layout: 'public' },
  { path: '/login', page: LoginPage, roles: [], title: 'Đăng nhập', layout: 'bare' },
  { path: '/register', page: RegisterPage, roles: [], title: 'Đăng ký', layout: 'bare' },
  { path: '/portal', page: PortalPage, roles: C, title: 'Cổng khách hàng', layout: 'customer' },
  { path: '/booking/route', page: Step1RoutePage, roles: C, title: 'Đặt chuyến · Tuyến đường', layout: 'customer' },
  { path: '/booking/horses', page: Step2HorsesPage, roles: C, title: 'Đặt chuyến · Thông tin ngựa', layout: 'customer' },
  { path: '/booking/services', page: Step3ServicesPage, roles: C, title: 'Đặt chuyến · Dịch vụ & Y tế', layout: 'customer' },
  { path: '/booking/review', page: Step4ReviewPage, roles: C, title: 'Đặt chuyến · Xác nhận', layout: 'customer' },
  { path: '/orders', page: OrdersPage, roles: C, title: 'Đơn của tôi', layout: 'customer' },
  { path: '/orders/:id', page: OrderDetailPage, roles: C, title: 'Chi tiết đơn', example: 'EQ-2026-1028', layout: 'customer' },
  { path: '/quotes', page: QuotesPage, roles: C, title: 'Báo giá của tôi', layout: 'customer' },
  { path: '/tracking', page: TrackingPage, roles: C, title: 'Tra cứu lộ trình', layout: 'customer' },
  { path: '/acceptance', page: AcceptancePage, roles: C, title: 'Nghiệm thu', layout: 'customer' },
]

routes.push({ path: '/sitemap', page: () => <SitemapPage app="customer" />, roles: [], title: 'Sitemap', layout: 'public' })
