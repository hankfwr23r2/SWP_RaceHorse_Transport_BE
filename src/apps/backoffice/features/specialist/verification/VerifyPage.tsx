// Specialist: thẩm định y tế một đơn. Đạt thì ghi chỉ dẫn an sinh; sai sót thì yêu cầu khách bổ sung (bắt buộc ghi lý do).
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { HORSE_DOC, HORSE_DOC_TYPES, TARGET_TEMP, type HorseDocType } from '@shared/config/booking-rules'
import { horseReadiness } from '@shared/lib/booking'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { horsesApi } from '@shared/services/horses'
import { useLoad } from '@shared/services/useLoad'
import type { Booking, HorseProfile } from '@shared/types/booking'
import { BookingStatusBadge } from '@shared/ui/BookingStatusBadge'
import { HorseDocChips } from '@shared/ui/HorseDocChips'
import { useToast } from '@shared/ui/toast'
import { History, ReviewChips, TripSummary } from '../../../shared/BookingParts'
import s from '../../../shared/booking.module.css'

type Pair = { horseId: string; doc: HorseDocType }
const key = (p: Pair) => `${p.horseId}:${p.doc}`

function Review({ b, horses, onDone }: { b: Booking; horses: HorseProfile[]; onDone: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [checked, setChecked] = useState<string[]>([])
  const [temp, setTemp] = useState(String(b.medical?.temp ?? TARGET_TEMP.default))
  const [rest, setRest] = useState(b.medical?.restPlan || 'Nghỉ xả cơ 30 phút sau mỗi 3 giờ di chuyển')
  const [note, setNote] = useState(b.medical?.welfareNote ?? '')
  const [fixing, setFixing] = useState(false)
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const problems = horses.flatMap(h => { const r = horseReadiness(h, b.departAt); return [...r.missing, ...r.expired].map(doc => ({ horseId: h.id, doc })) })
  const allChecked = checked.length === horses.length
  const tempNum = Number(temp)
  const tempOk = tempNum >= TARGET_TEMP.min && tempNum <= TARGET_TEMP.max
  const permitMissing = b.type === 'international' && !b.importPermit
  const canApprove = allChecked && !problems.length && tempOk && !permitMissing

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await fn(); toast(ok); onDone() } catch (e) { toast(e instanceof Error ? e.message : 'Không thực hiện được', 'error'); setBusy(false) }
  }
  const approve = () => run(() => bookingsApi.approveMedical(b.id, session!.name, { temp: tempNum, restPlan: rest.trim(), welfareNote: note.trim() }), `Đã xác nhận đạt y tế ${b.id}`)
  const requestFix = () => run(async () => {
    await bookingsApi.requestResubmission(b.id, session!.name, reason, items.map(i => { const [horseId, doc] = i.split(':'); return { horseId, doc: doc as HorseDocType } }))
    navigate('/specialist/verification')
  }, 'Đã yêu cầu khách bổ sung hồ sơ')
  const startFix = () => { setFixing(true); setItems(problems.map(key)) }

  return (
    <>
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-horse-head" /> Đối chiếu hồ sơ {horses.length} ngựa</h3></div>
        <div style={{ display: 'grid', gap: 12 }}>
          {horses.map(h => {
            const r = horseReadiness(h, b.departAt)
            const bh = b.horses.find(x => x.horseId === h.id)
            return (
              <div key={h.id} className={s.horse}>
                <div className={s.horseTop}>
                  <div><div className={s.horseName}>{h.name}</div><div className={s.horseMeta}>Chip {h.microchip} · {h.breed} · sinh {h.birthYear}</div></div>
                  {r.ok ? <span className="badge badge-success">Đủ giấy, còn hạn đến ngày đi</span> : <span className="badge badge-danger">Giấy chưa đạt</span>}
                </div>
                <HorseDocChips horse={h} at={b.departAt} />
                {bh && <div className={s.config}><span>Khách yêu cầu <b>{bh.targetTemp}°C</b></span>{bh.feeding && <span>Dinh dưỡng: <b>{bh.feeding}</b></span>}</div>}
                {b.medical?.status === 'pending' && (
                  <label className={s.check}><input type="checkbox" checked={checked.includes(h.id)} disabled={!r.ok} onChange={e => { const on = e.target.checked; setChecked(c => (on ? [...c, h.id] : c.filter(x => x !== h.id))) }} />
                    Đã đối chiếu hộ chiếu, microchip {h.microchip} và hạn xét nghiệm EIA/EVA</label>
                )}
              </div>
            )
          })}
        </div>
        {b.type === 'international' && <p className={s.hint} style={{ marginTop: 12 }}><i className="fa-solid fa-file-import" /> Import Permit: {b.importPermit ? `${b.importPermit.fileName} (kiểm tra tính pháp lý)` : <b style={{ color: 'var(--red)' }}>chưa có</b>}</p>}
      </div>

      {b.medical?.status === 'pending' && (
        <>
          <div className="card">
            <div className="card-header"><h3><i className="fa-solid fa-heart-pulse" /> Chỉ dẫn an sinh cho chuyến đi</h3></div>
            <div className={s.form2}>
              <div className="form-group">
                <label htmlFor="temp" className="required">Nhiệt độ khoang ({TARGET_TEMP.min}–{TARGET_TEMP.max}°C)</label>
                <input id="temp" type="number" step={0.5} className={`form-control ${tempOk ? '' : 'invalid'}`} value={temp} onChange={e => setTemp(e.target.value)} />
                {!tempOk && <div className="form-error">Nhiệt độ phải trong khoảng {TARGET_TEMP.min}–{TARGET_TEMP.max}°C.</div>}
              </div>
              <div className="form-group"><label htmlFor="rest">Lịch nghỉ, xả cơ</label><input id="rest" className="form-control" value={rest} onChange={e => setRest(e.target.value)} /></div>
            </div>
            <div className="form-group"><label htmlFor="wn">Ghi chú an sinh cho Escort</label><input id="wn" className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Kim Lân dễ căng thẳng, theo dõi mồ hôi" /></div>
          </div>

          <div className="card">
            <div className={s.actionBar}>
              <div>
                <b>{canApprove ? 'Sẵn sàng xác nhận đạt y tế' : 'Chưa thể xác nhận đạt'}</b>
                <div className={s.hint}>{!allChecked ? `Cần tick đối chiếu cả ${horses.length} ngựa. ` : ''}{problems.length ? 'Có giấy thiếu hoặc hết hạn, hãy yêu cầu khách bổ sung. ' : ''}{permitMissing ? 'Thiếu Import Permit. ' : ''}{!tempOk ? 'Nhiệt độ ngoài khoảng cho phép.' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={startFix} disabled={busy}><i className="fa-solid fa-rotate-left" /> Yêu cầu bổ sung</button>
                <button className="btn btn-primary" onClick={approve} disabled={!canApprove || busy}><i className="fa-solid fa-circle-check" /> Xác nhận đạt y tế</button>
              </div>
            </div>
            {fixing && (
              <div className={`${s.actionBox} ${s.actionDanger}`} style={{ marginTop: 14 }}>
                <b>Yêu cầu khách bổ sung hồ sơ</b>
                <div className={s.reasonList} role="group" aria-label="Giấy cần bổ sung">
                  {horses.flatMap(h => HORSE_DOC_TYPES.map(doc => ({ h, doc }))).map(({ h, doc }) => (
                    <label key={h.id + doc}><input type="checkbox" checked={items.includes(key({ horseId: h.id, doc }))} onChange={e => { const on = e.target.checked; const k = key({ horseId: h.id, doc }); setItems(x => (on ? [...x, k] : x.filter(i => i !== k))) }} />{h.name}: {HORSE_DOC[doc].label}</label>
                  ))}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="reason" className="required">Lý do (khách sẽ thấy)</label>
                  <textarea id="reason" className="form-control" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="VD: Phiếu xét nghiệm EIA bị mờ, không đọc được ngày lấy mẫu." />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setFixing(false)}>Hủy</button>
                  <button className="btn btn-danger" onClick={requestFix} disabled={busy || !reason.trim() || !items.length}>Gửi yêu cầu bổ sung</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {b.medical?.status === 'resubmit' && (
        <div className="alert alert-warning"><i className="fa-solid fa-hourglass-half" /><div><b>Đang chờ khách bổ sung.</b> {b.medical.resubmit?.reason} Khi khách gửi lại, đơn sẽ quay về mục “Cần thẩm định”.</div></div>
      )}
      {b.medical?.status === 'approved' && (
        <div className="alert alert-success"><i className="fa-solid fa-circle-check" /><div><b>Đã xác nhận đạt y tế</b> lúc {b.medical.at && formatDateTime(b.medical.at)}. Nhiệt độ {b.medical.temp}°C. {b.medical.restPlan}</div></div>
      )}
    </>
  )
}

export default function VerifyPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const { data: b, reload } = useLoad(() => bookingsApi.get(id), [id])
  const { data: horses } = useLoad(async () => {
    const booking = await bookingsApi.get(id)
    if (!booking) return []
    return (await Promise.all(booking.horses.map(h => horsesApi.get(booking.customer, h.horseId)))).filter(Boolean) as HorseProfile[]
  }, [id, b?.medical?.status])

  if (!b || !horses) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  if (b.intake?.specialist.name !== session!.name) return <div className="page"><div className="wrap"><div className="alert alert-danger"><i className="fa-solid fa-lock" /><div>Đơn {b.id} không được giao cho bạn. <Link to="/specialist/verification" className="text-orange font-semibold">Về danh sách</Link></div></div></div></div>

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/specialist/verification">Thẩm định y tế</Link> / <span className="text-orange font-semibold">{b.id}</span></div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1>Đơn {b.id}</h1><BookingStatusBadge status={b.status} audience="staff" /><ReviewChips b={b} /></div>
        <div className={s.layout}>
          <div className={s.main}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-route" /> Chuyến đi</h3></div><TripSummary b={b} /></div>
            <Review key={b.medical?.status} b={b} horses={horses} onDone={reload} />
          </div>
          <aside className={s.side}>
            <div className="card"><div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" /> Nhật ký đơn</h3></div><History b={b} /></div>
          </aside>
        </div>
      </div>
    </div>
  )
}
