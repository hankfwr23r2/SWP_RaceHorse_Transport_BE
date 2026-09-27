// Khung chung của app nội bộ: header gọn (dùng chung với app khách) + menu theo vai trò.
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { PageTransition } from '@shared/motion/motion'
import { ROLE_LABEL, type StaffRole } from '@shared/types/role'
import { AppHeader, appHeaderStyles as h } from '@shared/ui/AppHeader'
import { TranslateToggle } from '@shared/ui/TranslateToggle'
import { HOME_OF, STAFF_MENUS } from './staffMenus'
import s from './StaffLayout.module.css'

function Header() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const role = session?.role as StaffRole | undefined
  return (
    <AppHeader
      homeHref={role ? HOME_OF[role] : '/login'} badge={role && ROLE_LABEL[role]}
      links={role ? STAFF_MENUS[role] : []} userName={session?.name}
      onLogout={() => { logout(); navigate('/login') }}
    />
  )
}

export function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main><PageTransition>{children}</PageTransition></main>
      <footer className={h.footer}>© 2026 Vận chuyển Ngựa đua. SWP Project.</footer>
      <TranslateToggle />
    </>
  )
}

export function MobileStaffLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className={s.mobileMain}><PageTransition>{children}</PageTransition></main>
      <TranslateToggle />
    </>
  )
}
