// Đăng ký khách. Chuyển từ CUS/register.html: gửi xong chuyển sang trang đăng nhập.
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthShell, authStyles as s } from '@shared/ui/AuthShell'

const FIELDS: [id: string, label: string, type: string, placeholder: string, required: boolean][] = [
  ['fullname', 'Họ và Tên', 'text', 'Nhập họ và tên', true],
  ['password', 'Mật khẩu', 'password', 'Nhập mật khẩu', true],
  ['phone', 'Số điện thoại', 'tel', 'Nhập số điện thoại', true],
  ['email', 'Email', 'email', 'Nhập địa chỉ email', true],
  ['farm', 'Trang trại / Câu lạc bộ', 'text', 'Tên tổ chức (Không bắt buộc)', false],
  ['otp', 'Mã xác thực OTP', 'text', 'Nhập mã OTP', true],
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate('/login')
  }
  return (
    <AuthShell title="Tạo tài khoản" subtitle="Đăng ký để trải nghiệm dịch vụ vận chuyển chuyên nghiệp">
      <form onSubmit={submit}>
        {FIELDS.map(([id, label, type, placeholder, required]) => (
          <div className="form-group" key={id}>
            <label htmlFor={id}>{label}</label>
            <input className="form-control" id={id} type={type} placeholder={placeholder} required={required} />
          </div>
        ))}
        <button type="submit" className="btn btn-primary btn-full btn-lg">Đăng Ký Ngay</button>
      </form>
      <div className={s.switch}>Bạn đã có tài khoản? <Link to="/login">Đăng nhập</Link></div>
    </AuthShell>
  )
}
