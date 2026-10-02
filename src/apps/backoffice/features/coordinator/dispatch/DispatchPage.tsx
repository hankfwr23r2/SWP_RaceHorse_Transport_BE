// Coordinator: kiểm tra sẵn sàng một đơn và phát lệnh xuất bến. Không phát được khi hồ sơ pháp lý chưa được duyệt (quy tắc cứng).
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { VEHICLE_CLASS } from '@shared/config/booking-rules'
import { vehicleClassOf } from '@shared/lib/booking'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi, vehiclesApi } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { useToast } from '@shared/ui/toast'
import { History, TripSummary } from '../../../shared/BookingParts'
import s from '../../../shared/booking.module.css'

export default function DispatchPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: b, reload } = useLoad(() => bookingsApi.get(id), [id])
  const { data: vehicles } = useLoad(vehiclesApi.list)
  const { data: crew } = useLoad(crewApi.list)
  const [seen, setSeen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!b || !vehicles || !crew) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  if (b.intake?.coordinator.name !== session!.name) return <div className="page"><div className="wrap"><div className="alert alert-danger"><i className="fa-solid fa-lock" /><div>Đơn {b.id} không được giao cho bạn. <Link to="/coordinator/dispatch" className="text-orange font-semibold">Về danh sách</Link></div></div></div></div>

  const v = vehicles.find(x => x.id === b.fleet?.vehicleId)
  const driver = crew.find(x => x.id === b.fleet?.driverId)
  const escort = crew.find(x => x.id === b.fleet?.escortId)
  const international = b.type === 'international'
  const legalOk = ['legal_docs_approved', 'dispatch_approved'].includes(b.status)
  const checks: [boolean, string][] = [
    [!!v && v.status !== 'maintenance', `Xe ${v?.plate ?? '—'} không đang bảo dưỡng`],
    [!!v?.inspectionNo, `Đăng kiểm còn hiệu lực (số ${v?.inspectionNo ?? '—'})`],
    ...(international ? [[!!v?.transitPermit, `Giấy phép vận tải liên vận quốc tế (số ${v?.transitPermit ?? '—'})`] as [boolean, string]] : []),
    [!!driver?.license, `Tài xế ${driver?.name ?? '—'} đủ GPLX${international ? ' và hộ chiếu' : ''}`],
    [!!escort, `Hộ tống ${escort?.name ?? '—'} sẵn sàng`],
    [!!b.fleet && b.fleet.etd < b.fleet.etaDest, `Lộ trình đã lập: ETD ${b.fleet ? formatDateTime(b.fleet.etd) : '—'}${b.fleet?.etaBorder ? `, ETA cửa khẩu ${formatDateTime(b.fleet.etaBorder)}` : ''}`],
  ]
  const allOk = checks.every(c => c[0])

  const dispatch = async () => {
    setBusy(true)
    try { await bookingsApi.confirmReadiness(b.id, session!.name); toast(`Đã phát lệnh xuất bến ${b.id}`); reload(); navigate('/coordinator/dispatch') }
    catch (e) { toast(e instanceof Error ? e.message : 'Không phát được lệnh', 'error'); setBusy(false) }
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/coordinator/dispatch">Lệnh xuất bến</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1>Đơn {b.id}</h1><BookingStatusBadge status={b.status} audience="staff" /></div>
        <div className={s.layout}>
          <div className={s.main}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3></div><TripSummary b={b} /></div>

            {!legalOk && (
              <div className="alert alert-danger"><i className="fa-solid fa-ban" /><div><b>Chưa được phát lệnh xuất bến.</b> {b.status === 'documentation_delayed' ? `Khách đã quá hạn nộp giấy tờ. Lệnh xuất bến bị hoãn để xe không chạy không tải đến điểm bốc. Thời gian xe chờ do lỗi hồ sơ tính ${formatVND(b.quote?.demurragePerHour ?? 0)} mỗi giờ.` : 'Hồ sơ pháp lý chưa được Specialist duyệt.'}</div></div>
            )}

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-clipboard-check" /> Kiểm tra sẵn sàng</h3><span className="sub-text">{checks.filter(c => c[0]).length}/{checks.length} đạt</span></div>
              <ul style={{ display: 'grid', gap: 10 }}>
                {checks.map(([ok, text]) => <li key={text} style={{ display: 'flex', gap: 10, fontSize: '0.9rem', color: ok ? 'var(--text)' : 'var(--red)' }}><i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ color: ok ? 'var(--green)' : 'var(--red)', marginTop: 4 }} aria-hidden="true" />{text}</li>)}
              </ul>
              {v && driver && escort && (
                <dl className={s.grid} style={{ marginTop: 16 }}>
                  <div><dt>Xe</dt><dd>{v.plate} · {VEHICLE_CLASS[vehicleClassOf(v.capacity)].label} ({v.capacity} ngăn)</dd></div>
                  <div><dt>Tài xế</dt><dd>{driver.name}<div className={s.sub}>{driver.phone}</div></dd></div>
                  <div><dt>Hộ tống</dt><dd>{escort.name}<div className={s.sub}>{escort.phone}</div></dd></div>
                </dl>
              )}
            </div>

            {b.status === 'legal_docs_approved' && (
              <div className="card">
                <label className={s.check} style={{ borderTop: 'none', paddingTop: 0 }}><input type="checkbox" checked={seen} onChange={e => setSeen(e.target.checked)} />Tôi đã kiểm tra thực tế xe, tài xế và hộ tống đúng như trên.</label>
                <div className={s.actionBar} style={{ marginTop: 14 }}>
                  <div className={s.hint}>Lệnh điều xe, lộ trình và danh mục chứng từ gốc sẽ đẩy xuống app Driver và Escort; khách nhận thông báo.</div>
                  <button className="btn btn-primary" disabled={!allOk || !seen || busy} onClick={dispatch}><i className="fa-solid fa-truck-fast" /> Xác nhận sẵn sàng và phát lệnh xuất bến</button>
                </div>
              </div>
            )}
            {b.status === 'dispatch_approved' && <div className="alert alert-success"><i className="fa-solid fa-truck-fast" /><div>Đã phát lệnh xuất bến {b.readiness && `lúc ${formatDateTime(b.readiness.confirmedAt)}`}. Bước tiếp theo: lập lộ trình chi tiết và Trip Manifest.</div></div>}
          </div>
          <aside className={s.side}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" /> Nhật ký đơn</h3></div><History b={b} /></div>
          </aside>
        </div>
      </div>
    </div>
  )
}
