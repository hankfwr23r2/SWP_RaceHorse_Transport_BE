// Nhật ký sức khỏe ngựa (hộ tống). Chuyển từ Escort/escort_page.html + escort.js.
// Báo cáo ghi vào nhật ký sức khỏe của đơn: khách thấy ở trang Theo dõi, số đo lúc nhận / lúc giao dùng cho biên bản nghiệm thu.
// Tình trạng Mắc bệnh / Căng thẳng nặng / Qua đời → hệ thống tự tạo sự cố "Y tế ngựa" cho Điều phối (OPS-04).
// Bỏ nút "Xóa toàn bộ báo cáo" của bản cũ: nhật ký nay là dữ liệu của đơn khách xem được, không để hộ tống tự xóa.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { dayKey } from '@shared/lib/dates'
import { formatDateTime } from '@shared/lib/format'
import { tripsApi } from '@shared/services/trips'
import type { HealthLog } from '@shared/types/order'
import { useToast } from '@shared/ui/toast'
import { cx } from '../../shared/parts'
import { useOps } from '../../shared/useOps'
import s from './Field.module.css'

const STATUS = [['normal', 'Bình thường'], ['mild', 'Mệt nhẹ'], ['sick', 'Mắc bệnh'], ['serious', 'Căng thẳng nặng'], ['critical', 'Qua đời'], ['other', 'Khác']] as const
type StatusKey = (typeof STATUS)[number][0]
const SEVERE: StatusKey[] = ['sick', 'serious', 'critical']
const BADGE: Record<string, string> = { 'Bình thường': 'badge-success', 'Mệt nhẹ': 'badge-warning', 'Khác': 'badge-info' }
const nowInput = () => { const d = new Date(); return `${dayKey(d)}T${formatDateTime(d).slice(11)}` }
const EMPTY = { tripId: '', horse: '', date: '', temp: '', heart: '', status: '' as StatusKey | '', other: '', notes: '', photo: '' }

type Entry = HealthLog & { orderId: string; tripId: string }

export default function EscortPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { ready, trips, crew, reload } = useOps()
  const [tab, setTab] = useState<'report' | 'history'>('report')
  const [detail, setDetail] = useState<Entry | null>(null)
  const [f, setF] = useState({ ...EMPTY, date: nowInput() })
  const [invalid, setInvalid] = useState('')
  const me = crew.find(c => c.role === 'escort' && c.name === session!.name)
  const running = trips.filter(t => t.status === 'in_transit' && t.legs.some(l => l.escortId === me?.id))
  const trip = running.find(t => t.id === f.tripId)
  const history: Entry[] = trips
    .flatMap(t => (t.order.trip?.health ?? []).filter(h => h.by === session!.name && h.temp !== '—').map(h => ({ ...h, orderId: t.orderId, tripId: t.id })))
    .sort((a, b) => b.time - a.time)
  const set = (key: keyof typeof f) => (v: string) => { setInvalid(''); setF({ ...f, [key]: v }) }

  const pickPhoto = (file?: File) => {
    if (!file) return set('photo')('')
    const reader = new FileReader()
    reader.onload = () => set('photo')(String(reader.result))
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!f.tripId) return setInvalid('trip')
    if (!f.horse) return setInvalid('horse')
    if (!f.date) return setInvalid('date')
    if (!f.temp) return setInvalid('temp')
    if (!f.heart) return setInvalid('heart')
    if (!f.status) return setInvalid('status')
    if (f.status === 'other' && !f.other.trim()) return setInvalid('other')
    const label = STATUS.find(x => x[0] === f.status)![1]
    const log: HealthLog = {
      time: new Date(f.date).getTime(), temp: `${f.temp}°C`, heart: `${f.heart} bpm`,
      note: [f.status === 'other' ? f.other.trim() : '', f.notes.trim()].filter(Boolean).join(' — ') || 'Không có ghi chú.',
      horse: f.horse, status: label, by: session!.name, ...(f.photo && { photo: f.photo }),
    }
    const severe = SEVERE.includes(f.status)
    await tripsApi.addHealthLog(trip!.orderId, log, severe)
    toast(severe ? 'Đã gửi báo cáo. Hệ thống đã tạo sự cố khẩn cấp gửi Điều phối' : 'Đã ghi nhận báo cáo sức khỏe', severe ? 'error' : 'success')
    setF({ ...EMPTY, date: nowInput() })
    reload()
  }

  if (!ready) return <p className="text-muted">Đang tải…</p>

  return (
    <>
      <div className={s.segmented}>
        <button className={cx(tab === 'report' && !detail && s.active)} onClick={() => { setDetail(null); setTab('report') }}><i className="fa-solid fa-file-medical" /> Báo cáo</button>
        <button className={cx(tab === 'history' && s.active)} onClick={() => { setDetail(null); setTab('history') }}><i className="fa-solid fa-clock-rotate-left" /> Lịch sử</button>
      </div>

      {detail ? (
        <div className="card">
          <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}><i className="fa-solid fa-arrow-left" /> Về lịch sử</button>
          <div className={s.historyHead} style={{ marginTop: 12 }}><div><small>{detail.tripId} · {detail.orderId}</small><h3>Ngựa: {detail.horse ?? 'Cả chuyến'}</h3></div><span className={`badge ${BADGE[detail.status ?? ''] ?? 'badge-danger'}`}>{detail.status}</span></div>
          <div className={s.infoGrid}>
            <div><span>Ngày giờ kiểm tra</span>{formatDateTime(detail.time)}</div>
            <div><span>Thân nhiệt / Nhịp tim</span>{detail.temp} · {detail.heart}</div>
          </div>
          <h4>Ghi chú</h4><p>{detail.note}</p>
          {detail.photo && <img className={s.detailImg} src={detail.photo} alt="Tình trạng ngựa" />}
        </div>
      ) : tab === 'history' ? (
        <>
          <div className={s.header}><h1>Lịch sử báo cáo sức khỏe</h1><p>Các báo cáo bạn đã gửi. Khách xem được ở trang Theo dõi của đơn.</p></div>
          <div className={s.history}>
            {history.length ? history.map(h => (
              <button key={h.orderId + h.time} className={s.historyCard} onClick={() => setDetail(h)}>
                <div className={s.historyHead}><div><small>{h.tripId} · {h.orderId}</small><h3>Ngựa: {h.horse ?? 'Cả chuyến'}</h3></div><span className={`badge ${BADGE[h.status ?? ''] ?? 'badge-danger'}`}>{h.status}</span></div>
                <div className={s.historyInfo}><div><span>Ngày kiểm tra</span>{formatDateTime(h.time)}</div><div><span>Thân nhiệt</span>{h.temp}</div><div><span>Nhịp tim</span>{h.heart}</div></div>
                <p className="small text-muted">{h.note}</p>
              </button>
            )) : <div className={s.empty}><i className="fa-solid fa-file-medical" /><p>Chưa có báo cáo sức khỏe nào.</p></div>}
          </div>
        </>
      ) : (
        <>
          <div className={s.header}><h1>Báo cáo sức khỏe</h1><p>Ghi nhận tình trạng ngựa trong lúc vận chuyển.</p></div>
          {!running.length ? <div className={s.empty}><i className="fa-solid fa-truck" /><p>Bạn không có chuyến nào đang chạy.</p></div> : (
            <div className="card">
              <div className={s.row}>
                <div className="form-group"><label className="required">Chuyến</label>
                  <select className={cx('form-control', invalid === 'trip' && 'invalid')} value={f.tripId} onChange={e => setF({ ...f, tripId: e.target.value, horse: '' })}>
                    <option value="">Chọn chuyến</option>
                    {running.map(t => <option key={t.id} value={t.id}>{t.id} · {t.orderId} · {t.order.routeShort}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="required">Ngựa</label>
                  <select className={cx('form-control', invalid === 'horse' && 'invalid')} disabled={!trip} value={f.horse} onChange={e => set('horse')(e.target.value)}>
                    <option value="">Chọn ngựa</option>
                    {trip?.order.horses.map(h => <option key={h.name} value={h.name}>{h.name} · {h.chip}</option>)}
                  </select>
                </div>
              </div>
              <div className={s.row}>
                <div className="form-group"><label className="required">Ngày & giờ kiểm tra</label><input type="datetime-local" className={cx('form-control', invalid === 'date' && 'invalid')} value={f.date} onChange={e => set('date')(e.target.value)} /></div>
                <div className={s.row}>
                  <div className="form-group"><label className="required">Thân nhiệt (°C)</label><input type="number" step="0.1" placeholder="38.0" className={cx('form-control', invalid === 'temp' && 'invalid')} value={f.temp} onChange={e => set('temp')(e.target.value)} /></div>
                  <div className="form-group"><label className="required">Nhịp tim (bpm)</label><input type="number" placeholder="36" className={cx('form-control', invalid === 'heart' && 'invalid')} value={f.heart} onChange={e => set('heart')(e.target.value)} /></div>
                </div>
              </div>
              <div className="form-group"><label className="required">Tình trạng sức khỏe</label>
                <div className={cx(s.statusGrid, invalid === 'status' && s.invalid)}>
                  {STATUS.map(([key, label]) => <label key={key} className={cx(s.statusOption, f.status === key && s.selected)}><input type="radio" name="health" checked={f.status === key} onChange={() => set('status')(key)} /> {label}</label>)}
                </div>
                {f.status === 'other' && <><textarea maxLength={500} rows={2} className={cx('form-control', invalid === 'other' && 'invalid')} style={{ marginTop: 8 }} placeholder="Mô tả tình trạng sức khỏe..." value={f.other} onChange={e => set('other')(e.target.value)} /><div className={s.counter}>{f.other.length}/500</div></>}
              </div>
              {f.status && SEVERE.includes(f.status) && <div className={cx('alert alert-danger', s.alert)}><i className="fa-solid fa-triangle-exclamation" /><div><b>Cảnh báo sức khỏe.</b> Hệ thống sẽ tự động tạo báo cáo sự cố khẩn cấp gửi Điều phối viên.</div></div>}
              <div className="form-group"><label>Hình ảnh tình trạng ngựa</label>
                <input type="file" accept="image/*" className="form-control" onChange={e => pickPhoto(e.target.files?.[0])} />
                {f.photo && <div className={s.photo}><img src={f.photo} alt="Xem trước" /><button type="button" aria-label="Bỏ ảnh" onClick={() => set('photo')('')}><i className="fa-solid fa-xmark" /></button></div>}
              </div>
              <div className="form-group"><label>Ghi chú</label><textarea maxLength={500} rows={3} className="form-control" placeholder="Mô tả tình trạng..." value={f.notes} onChange={e => set('notes')(e.target.value)} /><div className={s.counter}>{f.notes.length}/500</div></div>
              <button className="btn btn-primary btn-full btn-lg" onClick={submit}><i className="fa-solid fa-paper-plane" /> Gửi báo cáo sức khỏe</button>
            </div>
          )}
        </>
      )}
    </>
  )
}
