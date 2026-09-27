// Đăng nhập nội bộ và đăng nhập Manager. Chuyển từ Staffs/staff_login.html (+ staff_login.js) và Manager/manager_login.html.
// Giả lập: email chứa từ khóa vai trò (manager, driver, escort, specialist, ops…) quyết định trang được vào.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { LOGIN_KEYWORDS } from '@shared/services/mock/staff'
import { AuthShell, authStyles as s } from '@shared/ui/AuthShell'
import { HOME_OF } from '../../layouts/staffMenus'

function LoginForm({ managerOnly }: { managerOnly: boolean }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = (new FormData(e.currentTarget).get('email') as string).toLowerCase()
    // Cổng Manager: mọi tài khoản đều vào trang Manager (như manager_login.html cũ)
    const match = managerOnly ? LOGIN_KEYWORDS[0] : LOGIN_KEYWORDS.find(([key]) => email.includes(key))
    if (!match) return setError('Email không hợp lệ hoặc không thuộc hệ thống nội bộ. (Gợi ý: email cần chứa manager, driver, escort, ops hoặc specialist)')
    const [, role, name] = match
    login({ role, name, username: email })
    navigate(HOME_OF[role])
  }

  return (
    <form onSubmit={submit}>
      {error && <div className={`alert alert-danger ${s.error}`}><i className="fa-solid fa-circle-exclamation" /><div>{error}</div></div>}
      <div className="form-group">
        <label htmlFor="email">{managerOnly ? 'Tên đăng nhập / Email' : 'Email'}</label>
        <input className="form-control" id="email" name="email" placeholder={managerOnly ? 'manager@equine.vn' : 'VD: manager@equine.vn, specialist@equine.vn'} required onChange={() => setError('')} />
      </div>
      <div className="form-group">
        <label htmlFor="password">Mật khẩu</label>
        <input className="form-control" id="password" type="password" placeholder="••••••••" required />
      </div>
      <p className="text-right small" style={{ marginBottom: 16 }}><a href="#" className="text-orange">Quên mật khẩu?</a></p>
      <button type="submit" className="btn btn-primary btn-full btn-lg">{managerOnly ? 'Đăng nhập Quản lý' : 'Đăng nhập'}</button>
    </form>
  )
}

export function StaffLoginPage() {
  return (
    <AuthShell title="Đăng nhập Nội bộ" subtitle="Vui lòng đăng nhập bằng email được cấp" heading="Hệ thống Nội bộ" tagline="Cổng đăng nhập dành cho nhân viên. Quản lý, tài xế, hộ tống và vận hành." homeHref="/" homeExternal>
      <LoginForm managerOnly={false} />
      <div className={s.extra}><a href="/">← Quay lại Trang chủ</a></div>
    </AuthShell>
  )
}

export function ManagerLoginPage() {
  return (
    <AuthShell title="Cổng Quản lý" subtitle="Vui lòng đăng nhập với tài khoản cấp quản lý" heading="Hệ thống Quản lý Vận hành" tagline="Nền tảng kiểm soát và điều phối toàn diện lộ trình vận chuyển ngựa đua an toàn, tiêu chuẩn." homeHref="/" homeExternal>
      <LoginForm managerOnly />
      <div className={s.extra}><a href="/">← Quay lại Trang chủ</a></div>
    </AuthShell>
  )
}
