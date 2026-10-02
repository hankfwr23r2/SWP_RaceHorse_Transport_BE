// Việc của Tài xế theo từng mốc hành trình (Flow 4, PRD mục 5): check-in kèm ảnh chụp trực tiếp, thu và trả bản gốc, ký biên bản.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { currentCheckpoint, manifestDocuments } from '@shared/lib/booking'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import type { Booking, Checkpoint } from '@shared/types/booking'
import { CaptureField } from '@shared/ui/CaptureField'
import { useToast } from '@shared/ui/toast'
import { Checklist, Panel } from '../../shared/field'
import s from '../../shared/field.module.css'

type Run = (fn: () => Promise<unknown>, msg: string) => Promise<void>

// Chụp ảnh rồi xác nhận một mốc
function ArriveStep({ title, icon, button, hint, run, action }: { title: string; icon: string; button: string; hint: string; run: Run; action: (photo: string) => Promise<unknown> }) {
  const [photo, setPhoto] = useState<string>()
  return (
    <Panel title={title} icon={icon} tone="warn">
      <p>{hint}</p>
      <CaptureField label="Ảnh chụp tại chỗ" required value={photo} onChange={setPhoto} />
      <button className={`btn btn-primary ${s.big}`} disabled={!photo} onClick={() => run(() => action(photo!), 'Đã check-in, khách và điều phối thấy ngay')}><i className="fa-solid fa-location-dot" /> {button}</button>
    </Panel>
  )
}

function PickupStep({ b, run }: { b: Booking; run: Run }) {
  const { session } = useAuth()
  const pickup = b.trip!.checkpoints[0]
  const originalsAll = manifestDocuments(b).originals
  const [photo, setPhoto] = useState<string | undefined>(pickup.handoverPhoto)
  const scanned = pickup.chips?.length ?? 0
  const ready = scanned >= b.horses.length && (pickup.originals?.length ?? 0) >= originalsAll.length && !!pickup.handoverPhoto
  return (
    <>
      <Panel title="Escort quét microchip" icon="fa-wave-square" tone={scanned >= b.horses.length ? 'ok' : undefined}>
        <p>Hộ tống quét từng con và đối soát với hộ chiếu, Health Cert. Đã quét <b>{scanned}/{b.horses.length}</b> ngựa.</p>
        <ul className={s.checklist}>{b.horses.map(h => <li key={h.horseId} style={{ padding: '6px 0', fontSize: '0.9rem' }}><i className={`fa-solid ${pickup.chips?.includes(h.microchip.toUpperCase()) ? 'fa-circle-check' : 'fa-circle'}`} style={{ color: pickup.chips?.includes(h.microchip.toUpperCase()) ? 'var(--green)' : 'var(--line)', marginRight: 8 }} />{h.name} · {h.microchip}</li>)}</ul>
      </Panel>
      <Panel title="Thu chứng từ gốc" icon="fa-folder-open">
        <p>Kiểm tra và nhận đủ bản gốc từ người gửi. Tick từng giấy khi đã nhận.</p>
        <Checklist items={originalsAll} checked={pickup.originals ?? []} onChange={next => run(() => bookingsApi.collectOriginals(b.id, session!.name, next), 'Đã ghi nhận chứng từ gốc')} />
      </Panel>
      <Panel title="Ký biên bản giao nhận" icon="fa-file-signature">
        <p>Dùng 02 bản in “Biên bản Giao nhận Động vật sống & Chứng từ gốc”. Người gửi và bạn cùng ký bút mực, mỗi bên giữ 01 bản, rồi chụp biên bản đã ký.</p>
        <CaptureField label="Ảnh biên bản có đủ chữ ký" required value={photo} onChange={setPhoto} />
        <button className="btn btn-outline" disabled={!photo || photo === pickup.handoverPhoto} onClick={() => run(() => bookingsApi.uploadHandover(b.id, session!.name, photo!), 'Đã tải ảnh biên bản')}><i className="fa-solid fa-upload" /> Tải ảnh biên bản</button>
      </Panel>
      <Panel title="Bắt đầu hành trình" icon="fa-truck-fast" tone={ready ? 'ok' : undefined}>
        <p>{ready ? 'Đủ điều kiện xuất phát. Khách sẽ thấy ngựa đã được tiếp nhận.' : 'Cần quét đủ microchip, thu đủ chứng từ gốc và tải ảnh biên bản có chữ ký.'}</p>
        <button className={`btn btn-primary ${s.big}`} disabled={!ready} onClick={() => run(() => bookingsApi.startJourney(b.id, session!.name), 'Hành trình bắt đầu (In Transit - Leg 1)')}><i className="fa-solid fa-play" /> Bắt đầu hành trình</button>
      </Panel>
    </>
  )
}

function DeliveryStep({ b, cp, run }: { b: Booking; cp: Checkpoint; run: Run }) {
  const { session } = useAuth()
  const [photo, setPhoto] = useState<string | undefined>(cp.handoverPhoto)
  const [returned, setReturned] = useState(false)
  const welfare = b.trip!.welfare.some(w => w.checkpointId === cp.id)
  const ready = welfare && returned && !!cp.handoverPhoto
  return (
    <>
      <Panel title="Hộ tống kiểm tra lần cuối" icon="fa-heart-pulse" tone={welfare ? 'ok' : 'warn'}>
        <p>{welfare ? 'Hộ tống đã kiểm tra thể trạng ngựa và ghi nhật ký.' : 'Hộ tống đang hạ ngựa và kiểm tra thể trạng lần cuối. Chờ hộ tống ghi nhật ký.'}</p>
      </Panel>
      <Panel title="Trả chứng từ gốc và ký biên bản" icon="fa-file-signature">
        <label className={s.checklist} style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 48 }}><input type="checkbox" checked={returned} onChange={e => setReturned(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--orange)' }} /><span>Đã trả toàn bộ chứng từ gốc cho người nhận</span></label>
        <p>Dùng 02 bản in “Biên bản Bàn giao & Hoàn tất Chuyến đi”. Người nhận xác nhận đủ ngựa, thể trạng an toàn, đủ hồ sơ gốc. Hai bên ký, mỗi bên giữ 01 bản.</p>
        <CaptureField label="Ảnh biên bản có đủ chữ ký" required value={photo} onChange={setPhoto} />
        <button className="btn btn-outline" disabled={!photo || photo === cp.handoverPhoto} onClick={() => run(() => bookingsApi.uploadHandover(b.id, session!.name, photo!), 'Đã tải ảnh biên bản')}><i className="fa-solid fa-upload" /> Tải ảnh biên bản</button>
      </Panel>
      <button className={`btn btn-primary ${s.big}`} disabled={!ready} onClick={() => run(() => bookingsApi.completeDelivery(b.id, session!.name), 'Đã giao ngựa. Khách nhận thông báo')}><i className="fa-solid fa-flag-checkered" /> Hoàn tất giao ngựa</button>
    </>
  )
}

function CustomsStep({ b, run }: { b: Booking; run: Run }) {
  const { session } = useAuth()
  const [hc, setHc] = useState<string>()
  const [ata, setAta] = useState<string>()
  const needAta = !!b.clearance?.options.ata
  const photos = [hc, needAta ? ata : 'n/a'].filter(Boolean) as string[]
  return (
    <Panel title="Hoàn tất thông quan" icon="fa-stamp" tone="warn">
      <p>Sau khi Thú y và Hải quan đóng dấu, chụp trang mộc đỏ để làm bằng chứng.</p>
      <CaptureField label="Ảnh trang mộc đỏ kiểm dịch trên Health Cert" required value={hc} onChange={setHc} />
      {needAta && <CaptureField label="Ảnh cuống sổ ATA Carnet có dấu Hải quan" required value={ata} onChange={setAta} />}
      <button className={`btn btn-primary ${s.big}`} disabled={!hc || (needAta && !ata)} onClick={() => run(() => bookingsApi.customsCleared(b.id, session!.name, photos.filter(p => p !== 'n/a')), 'Đã thông quan. Khách nhận thông báo')}><i className="fa-solid fa-circle-check" /> Đã thông quan thành công</button>
    </Panel>
  )
}

export function DriverJob({ b, reload }: { b: Booking; reload: () => void }) {
  const { session } = useAuth()
  const toast = useToast()
  const run: Run = async (fn, msg) => {
    try { await fn(); toast(msg); reload() } catch (e) { toast(e instanceof Error ? e.message : 'Không thực hiện được', 'error') }
  }
  const cp = currentCheckpoint(b)
  const pickup = b.trip?.checkpoints[0]

  if (b.status === 'delivered_pending_settlement') return <Panel title="Đã giao ngựa" icon="fa-flag-checkered" tone="ok"><p>Giao xong lúc {b.trip?.deliveredAt && formatDateTime(b.trip.deliveredAt)}. Bước tiếp theo: gửi hóa đơn nhiên liệu để quyết toán.</p></Panel>

  if (b.status === 'en_route_to_pickup') {
    if (!pickup?.arrivedAt) return <ArriveStep key="pickup" title="Check-in tại điểm đón" icon="fa-location-dot" button="Đã tới điểm đón" hint={`Khi tới trang trại, chụp ảnh cổng hoặc khu chuồng. Dự kiến ${b.fleet && formatDateTime(b.fleet.etd)}.`} run={run} action={photo => bookingsApi.arriveAtPickup(b.id, session!.name, photo)} />
    return <PickupStep b={b} run={run} />
  }

  if (b.status === 'in_transit' && cp) {
    const arrive = (title: string, button: string, hint: string, icon: string) => <ArriveStep key={cp.id} title={title} icon={icon} button={button} hint={hint} run={run} action={photo => bookingsApi.arriveCheckpoint(b.id, session!.name, photo)} />
    if (cp.type === 'rest') {
      if (!cp.arrivedAt) return arrive(`Tới ${cp.place}`, 'Xác nhận đã tới trạm dừng', 'Chụp rõ biển hiệu trạm dừng hoặc cây xăng. Hệ thống tự gắn giờ vào ảnh.', 'fa-mug-hot')
      const ok = b.trip!.welfare.some(w => w.checkpointId === cp.id)
      return (
        <Panel title="Đang nghỉ xả cơ" icon="fa-mug-hot" tone={ok ? 'ok' : 'warn'}>
          <p>{ok ? 'Hộ tống đã gửi nhật ký an sinh. Hết giờ nghỉ, bấm tiếp tục.' : 'Chờ hộ tống kiểm tra ngựa và gửi nhật ký an sinh.'}</p>
          <button className={`btn btn-primary ${s.big}`} disabled={!ok} onClick={() => run(() => bookingsApi.continueJourney(b.id, session!.name), 'Tiếp tục hành trình')}><i className="fa-solid fa-play" /> Tiếp tục hành trình</button>
        </Panel>
      )
    }
    if (cp.type === 'border') return arrive('Tới cửa khẩu', 'Đã tới cửa khẩu', 'Chụp barie hoặc cổng trạm kiểm soát.', 'fa-flag')
    if (cp.type === 'customs') return <CustomsStep b={b} run={run} />
    if (cp.type === 'delivery') return cp.arrivedAt ? <DeliveryStep b={b} cp={cp} run={run} /> : arrive('Tới điểm giao', 'Đã tới điểm giao', 'Chụp ảnh cổng cơ sở tiếp nhận.', 'fa-flag-checkered')
  }
  return null
}
