// Khung chung 4 bước đặt chuyến: breadcrumb, tiêu đề, thanh bước.
import type { ReactNode } from 'react'
import { useStaggerIn } from '@shared/motion/motion'
import { Link } from 'react-router'
import s from './Booking.module.css'

const STEPS = ['1. Tuyến đường', '2. Thông tin ngựa', '3. Dịch vụ & Y tế', '4. Xác nhận & Dự toán']

export function BookingShell({ step, crumb, title, subtitle, children }: { step: number; crumb: string; title: string; subtitle: string; children: ReactNode }) {
  const ref = useStaggerIn('.card, [data-step]', [step])
  return (
    <div ref={ref} className="page">
      <div className="wrap">
        <div className="breadcrumb">
          <Link to="/portal">Cổng Khách hàng</Link> / {step > 1 ? <Link to="/booking/route">Đặt chuyến</Link> : <span>Đặt chuyến</span>} / <span className="text-orange font-semibold">{crumb}</span>
        </div>
        <div className="page-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className={s.stepper}>
          {STEPS.map((label, i) => (
            <div key={label} data-step className={`${s.step} ${i + 1 < step ? s.done : i + 1 === step ? s.current : ''}`}>
              <span className={s.stepNum}>{i + 1 < step ? <i className="fa-solid fa-check" /> : i + 1}</span>{label}
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}
