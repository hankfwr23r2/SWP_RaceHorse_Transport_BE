// App Tài xế: nhận lệnh điều vận (Flow 3), rồi check-in từng mốc hành trình (Flow 4, PRD mục 4.4, 5).
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { manifestDocuments } from '@shared/lib/booking'
import { formatDateTime } from '@shared/lib/format'
import { bookingsApi } from '@shared/services/bookings'
import { TripTimeline } from '@shared/ui/TripTimeline'
import { useNow } from '@shared/ui/useNow'
import { useToast } from '@shared/ui/toast'
import { Checklist, Empty, Panel, Segmented, TripHeader, TripPicker } from '../../shared/field'
import { ManifestView } from '../../shared/ManifestView'
import { useFieldTrips } from '../../shared/useFieldTrips'
import s from '../../shared/field.module.css'
import { DriverJob } from './DriverJob'

type Tab = 'job' | 'journey' | 'manifest'

export default function DriverPage() {
  const { session } = useAuth()
  const toast = useToast()
  const now = useNow()
  const { ready, trips, trip, setSelected, reload, vehicle, driver, escort } = useFieldTrips('driver')
  const [tab, setTab] = useState<Tab>('job')
  const [checked, setChecked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  if (!ready) return <p className="text-muted">Đang tải…</p>
  if (!trip) return <Empty text="Bạn chưa có chuyến nào cần xử lý." />

  const items = [...manifestDocuments(trip).system, 'Xe đã kiểm tra: dầu, lốp, điều hòa thùng, máy phát điện phụ']
  const acked = trip.manifest?.acks.driver
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
          {trip.status === 'trip_manifest_approved' && !acked && (
            <Panel title="Nhận lệnh và chuẩn bị xe" icon="fa-clipboard-check">
              <p>Lệnh điều vận đã được duyệt. Tick từng mục khi đã có trên xe, rồi xác nhận.</p>
              <Checklist items={items} checked={checked} onChange={setChecked} />
              <button className={`btn btn-primary ${s.big}`} disabled={checked.length < items.length || busy} onClick={() => run(() => bookingsApi.acknowledgeManifest(trip.id, 'driver', session!.name), 'Đã xác nhận nhận lệnh điều vận')}>
                <i className="fa-solid fa-check" /> Tôi đã nhận lệnh ({checked.length}/{items.length})
              </button>
            </Panel>
          )}
          {trip.status === 'trip_manifest_approved' && acked && (
            <Panel title="Đã nhận lệnh" icon="fa-circle-check" tone="ok">
              <p>Bạn xác nhận lúc {formatDateTime(acked)}. {trip.manifest?.acks.escort ? '' : 'Đang chờ nhân viên hộ tống xác nhận.'}</p>
            </Panel>
          )}
          {trip.status === 'ready_for_pickup' && (
            <Panel title="Sẵn sàng đón ngựa" icon="fa-truck-fast" tone="ok">
              <p>Tài xế và hộ tống đều đã nhận lệnh. Giờ đón dự kiến {trip.fleet && formatDateTime(trip.fleet.etd)}. Khi xuất phát từ bãi xe, bấm bên dưới.</p>
              <button className={`btn btn-primary ${s.big}`} disabled={busy} onClick={() => run(() => bookingsApi.departToPickup(trip.id, session!.name), 'Đã bắt đầu đến điểm đón')}><i className="fa-solid fa-truck-moving" /> Bắt đầu đến điểm đón</button>
            </Panel>
          )}
          <DriverJob key={trip.id} b={trip} reload={reload} />
        </>
      )}
    </>
  )
}
