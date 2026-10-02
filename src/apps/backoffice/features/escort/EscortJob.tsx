// Việc của Hộ tống theo từng mốc (Flow 4, PRD mục 5): quét microchip tại điểm đón, nhật ký an sinh tại trạm nghỉ và điểm giao.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { WELFARE_CONDITION, type WelfareCondition } from '@shared/config/booking-rules'
import { currentCheckpoint } from '@shared/lib/booking'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import type { Booking, Checkpoint } from '@shared/types/booking'
import { CaptureField } from '@shared/ui/CaptureField'
import { useToast } from '@shared/ui/toast'
import { Panel } from '../../shared/field'
import s from '../../shared/field.module.css'

type Run = (fn: () => Promise<unknown>, msg: string) => Promise<void>

function ScanStep({ b, run }: { b: Booking; run: Run }) {
  const { session } = useAuth()
  const [chip, setChip] = useState('')
  const pickup = b.trip!.checkpoints[0]
  const scanned = pickup.chips ?? []
  const all = scanned.length >= b.horses.length
  return (
    <Panel title="Quét microchip" icon="fa-wave-square" tone={all ? 'ok' : 'warn'}>
      <p>Quét máy cầm tay vào cổ từng con, nhập số hiển thị và đối soát với Hộ chiếu, Health Cert. Đã quét <b>{scanned.length}/{b.horses.length}</b>.</p>
      <ul>{b.horses.map(h => { const ok = scanned.includes(h.microchip.toUpperCase()); return <li key={h.horseId} style={{ display: 'flex', gap: 10, padding: '8px 0', fontSize: '0.92rem' }}><i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-circle'}`} style={{ color: ok ? 'var(--green)' : 'var(--line)', marginTop: 4 }} /><span><b>{h.name}</b>{ok && <span className="sub-text"> · {h.microchip}</span>}</span></li> })}</ul>
      {!all && (
        <form style={{ display: 'grid', gap: 10 }} onSubmit={e => { e.preventDefault(); if (chip.trim()) run(() => bookingsApi.scanChip(b.id, session!.name, chip), 'Microchip khớp').then(() => setChip('')) }}>
          <label htmlFor="chip" className="font-semibold" style={{ fontSize: '0.88rem' }}>Số microchip trên máy quét</label>
          <input id="chip" className="form-control" style={{ minHeight: 52, fontSize: '1.05rem' }} value={chip} onChange={e => setChip(e.target.value)} placeholder="VD: VN-985211" autoComplete="off" />
          <button type="submit" className={`btn btn-primary ${s.big}`} disabled={!chip.trim()}><i className="fa-solid fa-wave-square" /> Ghi nhận</button>
        </form>
      )}
    </Panel>
  )
}

function WelfareForm({ b, cp, run }: { b: Booking; cp: Checkpoint; run: Run }) {
  const { session } = useAuth()
  const final = cp.type === 'delivery'
  const [condition, setCondition] = useState<WelfareCondition>('normal')
  const [water, setWater] = useState('8')
  const [hay, setHay] = useState(true)
  const [temp, setTemp] = useState(String(b.medical?.temp ?? 22))
  const [photo, setPhoto] = useState<string>()
  const [note, setNote] = useState('')
  const valid = !!photo && Number(temp) > 0 && water !== ''
  return (
    <Panel title={final ? 'Kiểm tra thể trạng lần cuối' : `Nhật ký an sinh · ${cp.place}`} icon="fa-heart-pulse" tone="warn">
      <p>{final ? 'Hạ ngựa an toàn, kiểm tra lần cuối cùng người nhận.' : 'Trong lúc dừng nghỉ, kiểm tra ngựa và ghi nhật ký.'}</p>
      <div role="radiogroup" aria-label="Thể trạng" style={{ display: 'grid', gap: 8 }}>
        {(Object.keys(WELFARE_CONDITION) as WelfareCondition[]).map(k => (
          <label key={k} style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 52, padding: '0 14px', border: `1.5px solid ${condition === k ? 'var(--orange)' : 'var(--line)'}`, borderRadius: 'var(--radius)', background: condition === k ? 'var(--orange-soft)' : 'white', cursor: 'pointer', fontWeight: 600 }}>
            <input type="radio" name="cond" checked={condition === k} onChange={() => setCondition(k)} style={{ width: 20, height: 20, accentColor: 'var(--orange)' }} />{WELFARE_CONDITION[k].label}
          </label>
        ))}
      </div>
      <div className="form-group" style={{ margin: 0 }}><label htmlFor="water">Nước đã cấp (lít, ước tính)</label><input id="water" inputMode="decimal" className="form-control" style={{ minHeight: 48 }} value={water} onChange={e => setWater(e.target.value.replace(/[^\d.]/g, ''))} /></div>
      <label style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 48 }}><input type="checkbox" checked={hay} onChange={e => setHay(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--orange)' }} />Đã bổ sung cỏ khô</label>
      <div className="form-group" style={{ margin: 0 }}><label htmlFor="temp">Nhiệt độ khoang hiện tại (°C)</label><input id="temp" inputMode="decimal" className="form-control" style={{ minHeight: 48 }} value={temp} onChange={e => setTemp(e.target.value.replace(/[^\d.]/g, ''))} /></div>
      <CaptureField label="Ảnh ngựa trong khoang" required value={photo} onChange={setPhoto} />
      <div className="form-group" style={{ margin: 0 }}><label htmlFor="wnote">Ghi chú</label><input id="wnote" className="form-control" style={{ minHeight: 48 }} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: ngựa đổ mồ hôi nhẹ, đã xịt nước" /></div>
      <button className={`btn btn-primary ${s.big}`} disabled={!valid} onClick={() => run(() => bookingsApi.submitWelfare(b.id, session!.name, { condition, waterLiters: Number(water), hay, temp: Number(temp), photo: photo!, note: note.trim() }), 'Đã gửi nhật ký an sinh')}><i className="fa-solid fa-paper-plane" /> Gửi nhật ký an sinh</button>
    </Panel>
  )
}

export function EscortJob({ b, reload }: { b: Booking; reload: () => void }) {
  const toast = useToast()
  const run: Run = async (fn, msg) => {
    try { await fn(); toast(msg); reload() } catch (e) { toast(e instanceof Error ? e.message : 'Không thực hiện được', 'error') }
  }
  const cp = currentCheckpoint(b)
  const pickup = b.trip?.checkpoints[0]

  if (b.status === 'delivered_pending_settlement') return <Panel title="Đã giao ngựa" icon="fa-flag-checkered" tone="ok"><p>Chuyến hoàn tất lúc {b.trip?.deliveredAt && formatDateTime(b.trip.deliveredAt)}. Cảm ơn bạn.</p></Panel>
  if (b.status === 'en_route_to_pickup') {
    return pickup?.arrivedAt ? <ScanStep key={pickup.chips?.length ?? 0} b={b} run={run} /> : <Panel title="Xe đang đến điểm đón" icon="fa-truck-moving" tone="warn"><p>Khi tài xế check-in tại điểm đón, bạn sẽ quét microchip từng con và đối soát với hộ chiếu, Health Cert.</p></Panel>
  }
  if (b.status === 'in_transit' && cp) {
    const logged = b.trip!.welfare.some(w => w.checkpointId === cp.id)
    if ((cp.type === 'rest' || cp.type === 'delivery') && cp.arrivedAt && !logged) return <WelfareForm key={cp.id} b={b} cp={cp} run={run} />
    if ((cp.type === 'rest' || cp.type === 'delivery') && cp.arrivedAt && logged) return <Panel title="Đã gửi nhật ký an sinh" icon="fa-circle-check" tone="ok"><p>{cp.type === 'rest' ? 'Chờ tài xế bấm tiếp tục hành trình.' : 'Chờ tài xế ký biên bản bàn giao và hoàn tất giao ngựa.'}</p></Panel>
    return <Panel title="Đang di chuyển" icon="fa-truck-fast" tone="warn"><p>Mốc tiếp theo: <b>{cp.label.toLowerCase()}</b> tại {cp.place}, dự kiến {formatDateTime(cp.plannedAt)}. Theo dõi ngựa và sẵn sàng ghi nhật ký khi xe dừng.</p></Panel>
  }
  return null
}
