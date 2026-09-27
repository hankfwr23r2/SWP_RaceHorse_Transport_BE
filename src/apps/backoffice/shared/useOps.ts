// Dữ liệu dùng chung các trang Điều phối, Tài xế, Hộ tống: chuyến (kèm đơn), đội xe, người đi theo chuyến.
import { crewApi, vehiclesApi, type Vehicle } from '@shared/services/fleet'
import { taskDeadline } from '@shared/lib/deadlines'
import { tripsApi, type TripView } from '@shared/services/trips'
import { useLoad } from '@shared/services/useLoad'

export function useOps() {
  const trips = useLoad(tripsApi.list)
  const vehicles = useLoad(vehiclesApi.list)
  const crew = useLoad(crewApi.list)
  const vehicleList = vehicles.data ?? []
  const crewList = crew.data ?? []
  return {
    ready: !!(trips.data && vehicles.data && crew.data),
    trips: trips.data ?? [],
    vehicles: vehicleList,
    crew: crewList,
    vehicle: (id: string) => vehicleList.find(v => v.id === id),
    name: (id: string) => crewList.find(c => c.id === id)?.name ?? '—',
    reload: () => { trips.reload(); vehicles.reload(); crew.reload() },
  }
}

// Hạn lập lộ trình: mốc sớm hơn của 2 ngày làm việc và khởi hành − 5 ngày
export const routingDeadline = (t: TripView) => taskDeadline({
  assignedAt: t.order.task?.step === 'coordinator' ? t.order.task.assignedAt : t.order.intakeAt ?? t.order.submittedAt,
  departure: t.order.departAt, pausedWorkingDays: 0, specialDeadline: t.order.task?.specialDeadline,
}, 'coordinator')

// Cảnh báo khi chọn xe cho chặng
export const vehicleWarning = (v: Vehicle | undefined, horses: number) =>
  !v ? '' : v.status === 'maintenance' ? 'Xe đang bảo dưỡng' : v.capacity < horses ? `Xe chỉ có ${v.capacity} ngăn, đơn có ${horses} ngựa` : ''
