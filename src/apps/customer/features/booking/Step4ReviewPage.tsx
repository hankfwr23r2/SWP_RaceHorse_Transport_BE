// Bước 4: xác nhận, tải Import Permit (quốc tế) và gửi đơn. Đơn gửi đi ở trạng thái "Chờ Manager tiếp nhận".
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { VEHICLE_CLASS } from '@shared/config/booking-rules'
import { COUNTRIES } from '@shared/config/network'
import { classForHorses, findLocation, fromIsoDay, insuranceFee } from '@shared/lib/booking'
import { formatDate, formatVND } from '@shared/lib/format'
import { customerBookingsApi } from '@shared/services/bookings'
import { horsesApi } from '@shared/services/horses'
import { useLoad } from '@shared/services/useLoad'
import { SEX_LABEL, type PlaceRef } from '@shared/types/booking'
import { FileField } from '@shared/ui/FileField'
import { useToast } from '@shared/ui/toast'
import { BookingShell } from './BookingShell'
import { countriesOf, useBookingDraft } from './draft'
import s from './Booking.module.css'


export default function Step4ReviewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { session } = useAuth()
  const owner = session!.name
  const { draft, save, clear } = useBookingDraft()
  const { data: horses } = useLoad(() => horsesApi.list(owner), [owner])
  const [agree, setAgree] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false) // đã gửi: bản nháp bị xóa, không chuyển ngược về bước 1

  if (sent) return null
  const countries = countriesOf(draft)
  if (!countries || !draft.departDate) return <Navigate to="/booking/route" replace />
  if (!draft.horseIds.length) return <Navigate to="/booking/horses" replace />
  if (draft.horseIds.some(id => !draft.config[id]?.insurance)) return <Navigate to="/booking/services" replace />

  const international = draft.type === 'international'
  const rows = draft.horseIds.map(id => horses?.find(h => h.id === id)).filter(Boolean) as NonNullable<typeof horses>
  const place = (id: string, country: PlaceRef['country']): PlaceRef => ({ id, name: findLocation(id)?.name ?? id, country })
  const origin = place(draft.originId, countries.origin)
  const dest = place(draft.destId, countries.dest)
  const permitMissing = international && !draft.importPermit
  const cls = VEHICLE_CLASS[classForHorses(rows.length)]

  const submit = async () => {
    setSubmitted(true)
    if (permitMissing || !agree || busy) return
    setBusy(true)
    try {
      const order = await customerBookingsApi.create(owner, {
        type: draft.type as 'domestic' | 'international', origin, dest, gate: international ? draft.gate : undefined,
        departAt: fromIsoDay(draft.departDate), consignor: draft.consignor, consignee: draft.consignee, importPermit: international ? draft.importPermit : undefined,
        horses: rows.map(h => {
          const c = draft.config[h.id]
          return { horseId: h.id, name: h.name, microchip: h.microchip, breed: h.breed, sex: h.sex, stall: c.stall, targetTemp: c.targetTemp, feeding: c.feeding, water: c.water, careNote: c.careNote, insurance: { opted: c.insurance === 'buy' } }
        }),
      })
      setSent(true)
      clear()
      toast(`Đã gửi đơn ${order.id}`)
      navigate(`/orders/${order.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không gửi được đơn.', 'error')
      setBusy(false)
    }
  }

  return (
    <BookingShell step={4} title="Xác nhận và gửi đơn" subtitle="Kiểm tra lại thông tin. Sau khi gửi, Quản lý sẽ tiếp nhận và bắt đầu thẩm định.">
      <div className={`card ${s.review}`} data-card>
        <div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3><Link to="/booking/route" className={s.editLink}>Sửa</Link></div>
        <dl className={s.reviewGrid}>
          <div><dt>Loại chuyến</dt><dd>{international ? `Quốc tế (${COUNTRIES[countries.origin].name} → ${COUNTRIES[countries.dest].name})` : 'Trong nước'}</dd></div>
          <div><dt>Ngày khởi hành</dt><dd>{formatDate(fromIsoDay(draft.departDate))}</dd></div>
          <div><dt>Điểm đón</dt><dd>{origin.name}</dd></div>
          <div><dt>Điểm giao</dt><dd>{dest.name}</dd></div>
          {international && <div><dt>Cửa khẩu</dt><dd>{draft.gate}</dd></div>}
          <div><dt>Người gửi</dt><dd>{draft.consignor.name}<br /><small className="text-muted">{draft.consignor.phone}</small></dd></div>
          <div><dt>Người nhận</dt><dd>{draft.consignee.name}<br /><small className="text-muted">{draft.consignee.phone}</small></dd></div>
        </dl>
      </div>

      <div className="card" data-card>
        <div className="card-header"><h3><i className="fa-solid fa-horse-head" /> {rows.length} ngựa · xe {cls.label} ({cls.stalls})</h3><Link to="/booking/services" className={s.editLink}>Sửa</Link></div>
        {rows.map(h => {
          const c = draft.config[h.id]
          return (
            <div key={h.id} className={s.reviewHorse}>
              <div><b>{h.name}</b> <small>Chip {h.microchip} · {h.breed} · {SEX_LABEL[h.sex]}</small></div>
              <div className="text-right">{c.stall === 'single' ? 'Khoang đơn' : 'Khoang tiêu chuẩn'} · {c.targetTemp}°C</div>
              <small>{c.insurance === 'buy' ? 'Mua bảo hiểm chuyến đi' : 'Từ chối bảo hiểm (trách nhiệm hạn chế)'}</small>
              <small className="text-right">{c.insurance === 'buy' ? `Phí ${formatVND(insuranceFee(h.breed))}` : ''}</small>
            </div>
          )
        })}
      </div>

      {international && (
        <div className="card" data-card>
          <div className="card-header"><h3><i className="fa-solid fa-file-import" /> Giấy phép nhập khẩu</h3></div>
          <FileField
            label="Import Permit của nước đến" required invalid={submitted && permitMissing} fileName={draft.importPermit?.fileName}
            hint="Bản gốc hoặc bản in điện tử có mã QR / chữ ký số. Specialist thẩm định sơ bộ khi tiếp nhận đơn."
            onChange={f => save({ importPermit: f ? { fileName: f, uploadedAt: Date.now() } : undefined })}
          />
          {submitted && permitMissing && <div className="form-error">Tải Giấy phép nhập khẩu để gửi đơn quốc tế.</div>}
          <div className="alert alert-info" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-circle-info" />
            <div>Tờ khai hải quan, Giấy kiểm dịch (Health Cert) và Giấy ủy quyền cần biển số xe và thông tin tài xế, nên bạn nộp <b>sau khi đặt cọc</b>, hạn 18:00 ngày trước ngày khởi hành.</div>
          </div>
        </div>
      )}

      <div className="card" data-card>
        <label className={s.commit}>
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
          <span>Tôi xác nhận thông tin chính xác và hiểu rằng công ty chỉ vận chuyển, tôi tự chuẩn bị và nộp hồ sơ pháp lý, kiểm dịch, hải quan với cơ quan chức năng.</span>
        </label>
        {submitted && !agree && <div className="form-error">Cần xác nhận để gửi đơn.</div>}
      </div>

      <div className={s.actions}>
        <Link to="/booking/services" className="btn btn-ghost"><i className="fa-solid fa-arrow-left" /> Dịch vụ và bảo hiểm</Link>
        <button type="button" className="btn btn-primary btn-lg" onClick={submit} disabled={busy}><i className="fa-solid fa-paper-plane" /> {busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt đơn'}</button>
      </div>
    </BookingShell>
  )
}
