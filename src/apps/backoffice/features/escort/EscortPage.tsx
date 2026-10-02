// App Hộ tống (Escort): nhận lệnh, chuẩn bị tủ thuốc (Flow 3), rồi quét chip và ghi nhật ký an sinh (Flow 4, PRD mục 4.4, 5).
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { TripTimeline } from '@shared/ui/TripTimeline'
import { useNow } from '@shared/ui/useNow'
import { useToast } from '@shared/ui/toast'
import { Checklist, Empty, Panel, Segmented, TripHeader, TripPicker } from '../../shared/field'
import { ManifestView } from '../../shared/ManifestView'
import { useFieldTrips } from '../../shared/useFieldTrips'
import s from '../../shared/field.module.css'
import { EscortJob } from './EscortJob'

type Tab = 'job' | 'journey' | 'manifest'

const KIT = [
  'Tủ thuốc thú y: thuốc giảm đau chống co thắt, dung dịch bù điện giải',
  'Nhiệt kế và ống nghe, máy quét microchip cầm tay',
  'Nước sạch và cỏ khô đủ cho cả chuyến',
  'Bình xịt nước làm mát thùng xe, quạt đối lưu dự phòng',
  'Sổ ghi nhật ký an sinh trên app đã đăng nhập, pin điện thoại đủ',
]

export default function EscortPage() {
  const { session } = useAuth()
  const toast = useToast()
  const now = useNow()
  const { ready, trips, trip, setSelected, reload, vehicle, driver, escort } = useFieldTrips('escort')
  const [tab, setTab] = useState<Tab>('job')
  const [checked, setChecked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  if (!ready) return <p className="text-muted">Đang tải…</p>
  if (!trip) return <Empty text="Bạn chưa có chuyến nào cần xử lý." />

  const acked = trip.manifest?.acks.escort
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast(msg); setChecked([]); reload() } catch (e) { toast(e instanceof Error ? e.message : 'Không thực hiện được', 'error') }
    setBusy(false)
  }

  return (
    <>
      <TripPicker trips={trips} value={trip.id} onChange={id => { setSelected(id); setChecked([]) }} />
      <TripHeader b={trip} />
      <Segmented<Tab> value={tab} onChange={setTab} tabs={[['job', 'Việc', 'fa-list-check'], ['journey', 'Hành trình', 'fa-route'], ['manifest', 'Lệnh', 'fa-clipboard-list']]} />

      {tab === 'manifest' && <ManifestView b={trip} vehicle={vehicle} driver={driver} escort={escort} />}
      {tab === 'journey' && <Panel title="Các mốc hành trình" icon="fa-route"><TripTimeline b={trip} now={now} staff /></Panel>}
      {tab === 'job' && (
        <>
          <Panel title="Chỉ dẫn an sinh" icon="fa-heart-pulse">
            <p>Nhiệt độ khoang <b>{trip.medical?.temp ?? 22}°C</b>. {trip.medical?.restPlan || 'Nghỉ xả cơ 30 phút sau mỗi 3 giờ.'}{trip.medical?.welfareNote ? ` ${trip.medical.welfareNote}` : ''}</p>
          </Panel>
          {trip.status === 'trip_manifest_approved' && !acked && (
            <Panel title="Nhận lệnh và chuẩn bị" icon="fa-clipboard-check">
              <p>Tick từng mục khi đã chuẩn bị, rồi xác nhận nhận lệnh.</p>
              <Checklist items={KIT} checked={checked} onChange={setChecked} />
              <button className={`btn btn-primary ${s.big}`} disabled={checked.length < KIT.length || busy} onClick={() => run(() => bookingsApi.acknowledgeManifest(trip.id, 'escort', session!.name), 'Đã xác nhận nhận lệnh điều vận')}>
                <i className="fa-solid fa-check" /> Tôi đã nhận lệnh ({checked.length}/{KIT.length})
              </button>
            </Panel>
          )}
          {trip.status === 'trip_manifest_approved' && acked && (
            <Panel title="Đã nhận lệnh" icon="fa-circle-check" tone="ok"><p>Bạn xác nhận lúc {formatDateTime(acked)}. {trip.manifest?.acks.driver ? '' : 'Đang chờ tài xế xác nhận.'}</p></Panel>
          )}
          {trip.status === 'ready_for_pickup' && <Panel title="Sẵn sàng đón ngựa" icon="fa-truck-fast" tone="ok"><p>Giờ đón dự kiến {trip.fleet && formatDateTime(trip.fleet.etd)}. Chờ tài xế bắt đầu đến điểm đón.</p></Panel>}
          <EscortJob key={trip.id} b={trip} reload={reload} />
        </>
      )}
    </>
  )
}
