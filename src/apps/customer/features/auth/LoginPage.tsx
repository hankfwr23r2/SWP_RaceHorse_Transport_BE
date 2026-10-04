// Đăng nhập khách. Chuyển từ CUS/login.html (giả lập: mọi email hợp lệ đều vào tài khoản mẫu).
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { accountsApi } from '@shared/services/accounts'
import { CUSTOMER } from '@shared/services/mock/orders'
import { AuthShell, authStyles as s } from '@shared/ui/AuthShell'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  const [error, setError] = useState('')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = data.get('email') as string
    // Tài khoản bị khóa (ví dụ quá hạn thanh toán) hoặc sai mật khẩu thì không vào được
    const auth = await accountsApi.authenticate(email, (data.get('password') as string) ?? '', 'customer')
    if (!auth.ok) return setError(auth.reason)
    login({ role: 'customer', name: CUSTOMER.name, username: email })
    navigate(from ?? '/portal')
  }

  return (
    <AuthShell title="Đăng nhập vào tài khoản" subtitle="Đăng nhập để tiếp tục sử dụng dịch vụ vận chuyển chuyên nghiệp" back={<Link to="/"><i className="fa-solid fa-arrow-left" /> Về Trang chủ</Link>}>
      <form onSubmit={submit}>
        {error && <div className={`alert alert-danger ${s.error}`}><i className="fa-solid fa-circle-exclamation" /><div>{error}</div></div>}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input className="form-control" type="email" id="email" name="email" placeholder="example@gmail.com" required onChange={() => setError('')} />
        </div>
        <div className="form-group">
          <label htmlFor="password">Mật khẩu</label>
          <input className="form-control" type="password" id="password" name="password" placeholder="••••••••" required />
        </div>
        <p className="text-right small" style={{ marginBottom: 16 }}><a href="#" className="text-orange">Quên mật khẩu?</a></p>
        <button type="submit" className="btn btn-primary btn-full btn-lg">Đăng nhập</button>
      </form>
      <div className={s.switch}>Nếu bạn chưa có tài khoản, bạn có thể <Link to="/register">Đăng ký tại đây!</Link></div>
      <div className={s.extra}>Dành cho nội bộ: <a href="/backoffice/login">Đăng nhập nhân viên</a></div>
    </AuthShell>
  )
}
