// Tiến độ giấy tờ phía khách (Flow 2, PRD mục 3.4): nhà xe làm hết, khách chỉ xem và báo sai thông tin nếu thấy.
import { useState } from 'react'
import { CLEARANCE_DOC } from '@shared/config/booking-rules'
import { clearanceProgress } from '@shared/lib/booking'
import { formatDateTime } from '@shared/lib/format'
import { customerBookingsApi, type CustomerBookingView } from '@shared/services/bookings'
import type { ClearanceStatus } from '@shared/types/booking'
import { ImageThumb } from '@shared/ui/ImageThumb'
import { useToast } from '@shared/ui/toast'
import s from './OrderDetail.module.css'

const STATUS: Record<ClearanceStatus, { label: string; cls: string; icon: string }> = {
  todo: { label: 'Chưa làm', cls: 'badge-muted', icon: 'fa-circle' },
  doing: { label: 'Đang làm', cls: 'badge-info', icon: 'fa-spinner' },
  done: { label: 'Xong', cls: 'badge-success', icon: 'fa-circle-check' },
}

export function ClearanceProgressCard({ b, owner, onDone }: { b: CustomerBookingView; owner: string; onDone: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const c = b.clearance
  if (!c) return null
  const { done, total } = clearanceProgress(c)

  const send = async () => {
    setBusy(true)
    try { await customerBookingsApi.flagClearance(owner, b.id, note); toast('Đã báo cho nhà xe'); setNote(''); setOpen(false); onDone() }
    catch (e) { toast(e instanceof Error ? e.message : 'Không gửi được', 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="card">
      <div className="card-header"><h3><i className="fa-solid fa-file-signature" /> Giấy tờ kiểm dịch và hải quan</h3><span className={`badge ${done === total ? 'badge-success' : 'badge-info'}`}>{done}/{total} hạng mục</span></div>
      <p className="form-hint" style={{ marginBottom: 12 }}>Nhà xe làm trọn gói các giấy tờ này cho bạn. Bạn chỉ cần xem lại thông tin.</p>
      <ul className={s.fix}>
        {c.items.map(i => (
          <li key={i.type} className={s.fixItem}>
            <span><b>{CLEARANCE_DOC[i.type].short}</b>{i.note && <small style={{ display: 'block' }}>{i.note}</small>}{i.photos.length > 0 && <span style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>{i.photos.map(p => <ImageThumb key={p} name={p} size={44} />)}<small>{i.updatedAt ? formatDateTime(i.updatedAt) : ''}</small></span>}</span>
            <span className={`badge ${STATUS[i.status].cls}`}><i className={`fa-solid ${STATUS[i.status].icon}`} aria-hidden="true" /> {STATUS[i.status].label}</span>
          </li>
        ))}
      </ul>
      {b.type === 'international' && (
        <p className="form-hint" style={{ marginTop: 10 }}>Giấy thông quan: {c.horsesCleared.length}/{b.horses.length} ngựa đã được ghi nhận.</p>
      )}
      {c.flags.length > 0 && <div className="alert alert-info" style={{ marginTop: 12 }}><i className="fa-solid fa-flag" /><div><b>Bạn đã báo:</b> {c.flags.map(f => f.note).join('; ')}</div></div>}
      {!['waybill_issued', 'clearance_in_progress'].includes(b.status) ? null : !open
        ? <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setOpen(true)}><i className="fa-solid fa-triangle-exclamation" /> Báo sai thông tin</button>
        : (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label htmlFor="flagnote">Thông tin nào chưa đúng?</label>
            <textarea id="flagnote" className="form-control" rows={3} value={note} onChange={e => setNote(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" disabled={busy || !note.trim()} onClick={send}>Gửi cho nhà xe</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Hủy</button>
            </div>
            <p className="form-hint">Việc này không làm chậm tiến độ. Nhà xe sẽ kiểm tra và sửa nếu cần.</p>
          </div>
        )}
    </div>
  )
}
