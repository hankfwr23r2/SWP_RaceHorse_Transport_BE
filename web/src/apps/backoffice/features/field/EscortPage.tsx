// Nhật ký sức khỏe ngựa (hộ tống). Chuyển nguyên giao diện Escort/escort_page.html + escort_style.css + escort.js; dữ liệu lấy từ kho chung:
// báo cáo ghi vào nhật ký sức khỏe của đơn (khách thấy ở trang Theo dõi). Mắc bệnh / Căng thẳng nặng / Qua đời → tự tạo sự cố cho Điều phối.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDateTime } from '@shared/lib/format'
import { tripsApi } from '@shared/services/trips'
import type { HealthLog } from '@shared/types/order'
import { TranslateToggle } from '@shared/ui/TranslateToggle'
import { useOps } from '../../shared/useOps'
import s from './Escort.module.css'

// Tên class của CSS cũ → class đã đổi tên của CSS module; class ngoài (Font Awesome) giữ nguyên
const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).map(n => s[n as string] ?? n).join(' ')

const STATUS = { normal: 'Bình thường', mild: 'Mệt nhẹ', sick: 'Mắc bệnh', serious: 'Căng thẳng nặng', critical: 'Qua đời', other: 'Khác' } as const
type StatusKey = keyof typeof STATUS
const SEVERE: StatusKey[] = ['sick', 'serious', 'critical']
const keyOf = (label?: string) => (Object.keys(STATUS) as StatusKey[]).find(k => STATUS[k] === label) ?? 'other'

const StatusBadge = ({ h }: { h: HealthLog }) => <span className={cls('status', keyOf(h.status))}>{h.status}</span>

type Tab = 'home' | 'report' | 'history' | 'detail'
type Entry = HealthLog & { orderId: string }
const EMPTY = { orderId: '', horse: '', date: '', temp: '', status: '' as StatusKey | '', other: '', notes: '', image: '' }

export default function EscortPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const { trips, crew, reload } = useOps()
  // Điện thoại mở trang chủ, máy tính mở thẳng form báo cáo (như bản cũ)
  const [tab, setTab] = useState<Tab>(() => (window.innerWidth <= 768 ? 'home' : 'report'))
  const [f, setF] = useState(EMPTY)
  const [message, setMessage] = useState<{ title: string; text: string; error: boolean } | null>(null)
  const [detail, setDetail] = useState<Entry | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const me = crew.find(c => c.role === 'escort' && c.name === session!.name)
  const running = trips.filter(t => t.status === 'in_transit' && t.legs.some(l => l.escortId === me?.id))
  const horses = running.find(t => t.orderId === f.orderId)?.order.horses ?? []
  const history: Entry[] = trips
    .flatMap(t => (t.order.trip?.health ?? []).filter(h => h.by === session!.name && h.temp !== '—').map(h => ({ ...h, orderId: t.orderId })))
    .sort((a, b) => b.time - a.time)
  const set = (key: keyof typeof f) => (v: string) => setF({ ...f, [key]: v })

  const show = (title: string, text: string, error = false) => {
    setMessage({ title, text, error })
    setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const pickImage = (file?: File) => {
    if (!file) return set('image')('')
    const reader = new FileReader()
    reader.onload = e => set('image')(String(e.target!.result))
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!f.orderId) return show('Missing Trip ID', 'Please select a Trip ID before submitting.', true)
    if (!f.horse) return show('Missing Horse ID', 'Please select a Horse ID before submitting.', true)
    if (!f.date) return show('Missing inspection date', 'Please select the inspection date and time.', true)
    if (!f.temp) return show('Missing temperature', 'Please enter the horse temperature.', true)
    if (!f.status) return show('Missing health status', 'Please select the horse health status.', true)
    if (f.status === 'other' && !f.other.trim()) return show('Missing health description', 'Please describe the health condition.', true)
    const log: HealthLog = {
      time: new Date(f.date).getTime(), temp: `${f.temp}°C`, heart: '—', note: f.notes.trim() || 'No notes provided.',
      horse: f.horse, status: STATUS[f.status], by: session!.name,
      ...(f.other.trim() && { other: f.other.trim() }), ...(f.image && { photo: f.image }),
    }
    await tripsApi.addHealthLog(f.orderId, log, SEVERE.includes(f.status))
    setF(EMPTY)
    if (fileRef.current) fileRef.current.value = ''
    reload()
    show('Health Report submitted', 'The health report was recorded successfully.')
  }

  const deleteAll = async () => {
    await tripsApi.deleteHealthLogs(session!.name)
    setConfirmDelete(false)
    reload()
  }

  const open = (t: Tab) => { setTab(t); if (t !== 'detail') setDetail(null) }

  return (
    <div className={cls('app-container')}>
      <header className={cls('topbar')}>
        <div className={cls('brand')}><div className={cls('logo')}>EQ</div><span>EquineLogistics</span></div>
        <div className={cls('user-menu')}>
          <span>Escort</span>
          <span className={cls('divider')}>|</span>
          <button className={cls('logout-btn')} onClick={() => { logout(); navigate('/login') }}><i className="fa-solid fa-right-from-bracket" /> Đăng xuất</button>
        </div>
      </header>

      <div className={cls('body-layout')}>
        <aside className={cls('sidebar', 'desktop-only')}>
          <nav className={cls('sidebar-nav')}>
            <button className={cls('nav-item', tab === 'report' && 'active')} onClick={() => open('report')}><i className="fa-solid fa-file-medical" /><span>Health Report</span></button>
            <button className={cls('nav-item', tab === 'history' && 'active')} onClick={() => open('history')}><i className="fa-solid fa-clock-rotate-left" /><span>Health Report History</span></button>
          </nav>
        </aside>

        <main className={cls('main-content')}>
          <section className={cls('tab-content', tab === 'home' ? 'active' : 'hidden')}>
            <div className={cls('mobile-home')}>
              <h1>Escort</h1>
              <p>Select an option</p>
              <div className={cls('home-actions')}>
                <button className={cls('home-action-card')} onClick={() => open('report')}>
                  <i className="fa-solid fa-file-medical" />
                  <div className={cls('home-action-text')}><h2>Health Report</h2><p>Submit a health report for a horse</p></div>
                  <i className="fa-solid fa-chevron-right" />
                </button>
                <button className={cls('home-action-card')} onClick={() => open('history')}>
                  <i className="fa-solid fa-clock-rotate-left" />
                  <div className={cls('home-action-text')}><h2>Health Report History</h2><p>View previous horse health reports</p></div>
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </div>
          </section>

          <section className={cls('tab-content', tab === 'report' ? 'active' : 'hidden')}>
            <button className={cls('mobile-back-btn')} onClick={() => open('home')}><i className="fa-solid fa-arrow-left" /><span>Trang chủ</span></button>
            <div className={cls('page-header')}><h1>Health Report</h1><p>Submit a health report for the horse during transportation.</p></div>
            <div className={cls('health-card')}>
              <div className={cls('selection-row')}>
                <div className={cls('form-group')}>
                  <label htmlFor="tripId">Trip ID</label>
                  <select id="tripId" value={f.orderId} onChange={e => setF({ ...f, orderId: e.target.value, horse: '' })}>
                    <option value="">Select Trip ID</option>
                    {running.map(t => <option key={t.orderId} value={t.orderId}>{t.orderId}</option>)}
                  </select>
                </div>
                <div className={cls('form-group')}>
                  <label htmlFor="horseId">Horse ID</label>
                  <select id="horseId" disabled={!horses.length} value={f.horse} onChange={e => set('horse')(e.target.value)}>
                    <option value="">Select Horse ID</option>
                    {horses.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={cls('selection-row')}>
                <div className={cls('form-group')}>
                  <label htmlFor="date">Ngày &amp; Giờ kiểm tra</label>
                  <input type="datetime-local" id="date" value={f.date} onChange={e => set('date')(e.target.value)} />
                </div>
                <div className={cls('form-group')}>
                  <label htmlFor="temperature">Nhiệt độ Cơ thể</label>
                  <div className={cls('temperature-input')}>
                    <i className="fa-solid fa-temperature-half" />
                    <input type="number" id="temperature" step="0.1" placeholder="38.5" value={f.temp} onChange={e => set('temp')(e.target.value)} />
                    <span>°C</span>
                  </div>
                </div>
              </div>
              <div className={cls('form-group', 'health-status')}>
                <label>Tình trạng Sức khỏe</label>
                <div className={cls('radio-box')}>
                  {(Object.keys(STATUS) as StatusKey[]).map(k => (
                    <label key={k} className={cls('radio-option', f.status === k && 'selected')}>
                      <input type="radio" name="health" value={k} checked={f.status === k} onChange={() => set('status')(k)} />
                      <span className={cls('radio-circle')} />
                      <span>{STATUS[k]}</span>
                    </label>
                  ))}
                  <div className={cls('other-input-container', f.status === 'other' && 'show')}>
                    <textarea maxLength={500} placeholder="Mô tả tình trạng sức khỏe..." value={f.other} onChange={e => set('other')(e.target.value)} />
                    <span className={cls('character-count')}>{f.other.length}/500</span>
                  </div>
                </div>
              </div>
              <div className={cls('health-alert')}>
                <div className={cls('alert-icon')}>!</div>
                <div className={cls('alert-content')}><strong>CẢNH BÁO SỨC KHỎE</strong><span>Hệ thống sẽ tự động tạo báo cáo khẩn cấp (Incident Report) gửi về trung tâm.</span></div>
              </div>
              <div className={cls('form-group', 'image-group')}>
                <label>Hình ảnh tình trạng ngựa</label>
                <label className={cls('image-upload-box')} htmlFor="horseImage">
                  <i className="fa-solid fa-cloud-arrow-up" />
                  <strong>Upload Image</strong>
                  <span>Thêm hình ảnh để hỗ trợ báo cáo</span>
                  <input ref={fileRef} type="file" id="horseImage" accept="image/*" onChange={e => pickImage(e.target.files?.[0])} />
                </label>
                <div className={cls('image-preview', !!f.image && 'show')}>
                  <img src={f.image || undefined} alt="Preview" />
                  <button type="button" onClick={() => { set('image')(''); if (fileRef.current) fileRef.current.value = '' }}><i className="fa-solid fa-xmark" /></button>
                </div>
              </div>
              <div className={cls('form-group', 'notes-group')}>
                <label htmlFor="notes">Notes</label>
                <div className={cls('textarea-wrapper')}>
                  <textarea id="notes" maxLength={500} placeholder="Mô tả tình trạng..." value={f.notes} onChange={e => set('notes')(e.target.value)} />
                  <span className={cls('character-count')}>{f.notes.length}/500</span>
                </div>
              </div>
              <div ref={messageRef} className={cls('submit-message', !!message && 'show', message?.error && 'error')} role="status" aria-live="polite">
                <i className={`fa-solid ${message?.error ? 'fa-circle-exclamation' : 'fa-circle-check'}`} />
                <div><strong>{message?.title ?? 'Health Report đã được gửi'}</strong><span>{message?.text ?? 'Báo cáo sức khỏe đã được ghi nhận thành công.'}</span></div>
              </div>
              <button className={cls('submit-button')} type="button" onClick={submit}><i className="fa-solid fa-paper-plane" /><span>GỬI HEALTH REPORT</span></button>
            </div>
          </section>

          <section className={cls('tab-content', tab === 'history' ? 'active' : 'hidden')}>
            <button className={cls('mobile-back-btn')} onClick={() => open('home')}><i className="fa-solid fa-arrow-left" /><span>Trang chủ</span></button>
            <div className={cls('page-header')}>
              <div className={cls('history-title-row')}>
                <h1>Health Report History</h1>
                <button className={cls('delete-all-button')} type="button" onClick={() => history.length && setConfirmDelete(true)}><i className="fa-solid fa-trash" /><span>Delete All Reports</span></button>
              </div>
              <p>View previous health reports submitted for horses.</p>
            </div>
            <div className={cls('delete-confirmation', confirmDelete && 'show')} role="dialog" aria-labelledby="deleteConfirmationTitle" aria-hidden={!confirmDelete}>
              <div className={cls('delete-confirmation-icon')}><i className="fa-solid fa-triangle-exclamation" /></div>
              <div className={cls('delete-confirmation-content')}><strong id="deleteConfirmationTitle">Delete all health reports?</strong><span>This action cannot be undone.</span></div>
              <div className={cls('delete-confirmation-actions')}>
                <button className={cls('cancel-delete-button')} type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className={cls('confirm-delete-button')} type="button" onClick={deleteAll}><i className="fa-solid fa-trash" /> Delete All</button>
              </div>
            </div>
            <div className={cls('history-container')}>
              {history.length ? history.map(h => (
                <div key={h.orderId + h.time} className={cls('history-card')} onClick={() => { setDetail(h); setTab('detail') }}>
                  <div className={cls('history-header')}>
                    <div><span className={cls('history-trip')}>{h.orderId}</span><h3>Horse: {h.horse}</h3></div>
                    <StatusBadge h={h} />
                  </div>
                  <div className={cls('history-info')}>
                    <div><span>Ngày kiểm tra</span><strong>{formatDateTime(h.time)}</strong></div>
                    <div><span>Nhiệt độ</span><strong>{h.temp.replace('°C', '')} °C</strong></div>
                  </div>
                  <p className={cls('history-notes')}>{h.note}</p>
                  <div className={cls('view-report')}><span>View Report</span><i className="fa-solid fa-chevron-right" /></div>
                </div>
              )) : (
                <div className={cls('history-empty')}>
                  <div className={cls('empty-icon')}><i className="fa-solid fa-file-medical" /></div>
                  <h2>No Health Reports Yet</h2>
                  <p>There are no health reports available.</p>
                </div>
              )}
            </div>
          </section>

          <section className={cls('tab-content', tab === 'detail' ? 'active' : 'hidden')}>
            <button className={cls('mobile-back-btn')} onClick={() => open('history')}><i className="fa-solid fa-arrow-left" /><span>Back to History</span></button>
            <div className={cls('page-header')}><h1>Health Report Details</h1><p>Detailed information about this health report.</p></div>
            <div className={cls('report-detail-card')}>
              {detail && <>
                <div className={cls('detail-header')}>
                  <div><span className={cls('history-trip')}>{detail.orderId}</span><h2>Horse: {detail.horse}</h2></div>
                  <StatusBadge h={detail} />
                </div>
                <div className={cls('detail-grid')}>
                  <div className={cls('detail-item')}><span>Trip ID</span><strong>{detail.orderId}</strong></div>
                  <div className={cls('detail-item')}><span>Horse ID</span><strong>{detail.horse}</strong></div>
                  <div className={cls('detail-item')}><span>Inspection Date</span><strong>{formatDateTime(detail.time)}</strong></div>
                  <div className={cls('detail-item')}><span>Temperature</span><strong>{detail.temp.replace('°C', '')} °C</strong></div>
                </div>
                <div className={cls('detail-section')}><h3>Notes</h3><p>{detail.note}</p></div>
                {detail.other && <div className={cls('detail-section')}><h3>Additional Condition</h3><p>{detail.other}</p></div>}
                {detail.photo && <div className={cls('detail-section')}><h3>Health Condition Image</h3><img className={cls('detail-image')} src={detail.photo} alt="Horse health condition" /></div>}
              </>}
            </div>
          </section>
        </main>
      </div>
      <TranslateToggle />
    </div>
  )
}
