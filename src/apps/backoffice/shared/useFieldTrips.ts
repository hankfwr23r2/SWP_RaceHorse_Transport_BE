// Chuyến của tài xế / hộ tống đang đăng nhập (app di động).
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { bookingsApi } from '@shared/services/bookings'
import { crewApi, vehiclesApi } from '@shared/services/fleet'
import { useLoad } from '@shared/services/useLoad'
import type { Booking } from '@shared/types/booking'

// Trạng thái đơn mà Driver / Escort nhìn thấy trên app (từ lúc Manifest được duyệt)
export const FIELD_STATUSES: Booking['status'][] = ['trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']

export function useFieldTrips(role: 'driver' | 'escort') {
  const { session } = useAuth()
  const { data: all, reload } = useLoad(bookingsApi.list)
  const { data: crew } = useLoad(crewApi.list)
  const { data: vehicles } = useLoad(vehiclesApi.list)
  const [selected, setSelected] = useState('')
  const me = crew?.find(c => c.role === role && c.name === session!.name)
  const key = role === 'driver' ? 'driverId' : 'escortId'
  const trips = (all ?? []).filter(b => b.fleet && me && b.fleet[key] === me.id && FIELD_STATUSES.includes(b.status)).sort((a, z) => a.departAt - z.departAt)
  const trip = trips.find(t => t.id === selected) ?? trips[0]
  return {
    ready: !!(all && crew && vehicles), me, crew: crew ?? [], vehicles: vehicles ?? [], trips, trip, setSelected, reload,
    driver: crew?.find(c => c.id === trip?.fleet?.driverId), escort: crew?.find(c => c.id === trip?.fleet?.escortId), vehicle: vehicles?.find(v => v.id === trip?.fleet?.vehicleId),
  }
}
