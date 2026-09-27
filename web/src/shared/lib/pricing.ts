// Tra cước tham khảo (trang chủ). Chuyển nguyên logic từ home.js.
// Công thức báo giá của trang Tạo yêu cầu khác công thức này: xem features/booking/legacy-quote.ts (PRD mục 11).
import { GATES, type GeoPoint, type Place } from '../config/network'
import {
  AVG_SPEED_KMH, BIG_TRUCK_FACTOR, BORDER_HOURS, CARE_FEE_PER_DAY, DRIVE_HOURS_PER_DAY,
  INSURANCE_RATE, KM_TIERS, QUARANTINE_FEE, ROAD_FACTOR, TRIP_OPEN_FEE,
} from '../config/public-pricing'
import type { ServiceLine } from '../types/order'
import { formatVND } from './format'

export function haversineKm(a: GeoPoint, b: GeoPoint) {
  const rad = (x: number) => x * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export const roadKm = (km: number) => Math.max(10, Math.round(km * ROAD_FACTOR / 10) * 10)

// Cước một xe theo bậc km; big = xe 4 ngăn
export function truckCost(km: number, big: boolean) {
  let left = km, from = 0, cost = TRIP_OPEN_FEE
  for (const [to, rate] of KM_TIERS) {
    const part = Math.min(left, to - from)
    if (part <= 0) break
    cost += part * rate
    left -= part
    from = to
  }
  return big ? cost * BIG_TRUCK_FACTOR : cost
}

// Xe 4 ngăn cho mỗi 4 ngựa; phần dư 1–2 ngựa dùng xe 2 ngăn, 3 ngựa dùng xe 4 ngăn. true = xe 4 ngăn
export function trucksFor(horses: number) {
  const trucks: boolean[] = Array(Math.floor(horses / 4)).fill(true)
  const rest = horses % 4
  if (rest) trucks.push(rest === 3)
  return trucks
}

// Tuyến xuyên biên giới: chọn cửa khẩu cho quãng đường ngắn nhất
export function routeOf(from: Place, to: Place): { km: number; gate: string | null } {
  if (from.country === 'VN' && to.country === 'VN') return { km: roadKm(haversineKm(from, to)), gate: null }
  const foreign = from.country === 'VN' ? to : from
  return GATES.filter(g => g.country === foreign.country)
    .map(g => ({ km: roadKm(haversineKm(from, g) + haversineKm(g, to)), gate: g.name }))
    .sort((a, b) => a.km - b.km)[0]
}

export type FeeRow = [label: string, detail: string, amount: number]

export interface FeeEstimate { km: number; gate: string | null; hours: number; days: number; truckLabel: string; rows: FeeRow[]; total: number }

// Ước tính cước tham khảo; value = giá trị ngựa khai báo (0 = không mua bảo hiểm)
export function estimateFee(from: Place, to: Place, horses: number, value: number): FeeEstimate {
  const { km, gate } = routeOf(from, to)
  const border = !!gate
  const hours = km / AVG_SPEED_KMH + (border ? BORDER_HOURS : 0)
  const days = Math.max(1, Math.ceil(hours / DRIVE_HOURS_PER_DAY))
  const trucks = trucksFor(horses)
  const bigCount = trucks.filter(Boolean).length
  const smallCount = trucks.length - bigCount
  const truckLabel = [bigCount ? `${bigCount} xe 4 ngăn` : '', smallCount ? `${smallCount} xe 2 ngăn` : ''].filter(Boolean).join(' + ')
  const quarantine = border ? QUARANTINE_FEE.border : QUARANTINE_FEE.domestic

  const rows: FeeRow[] = [
    ['Vận chuyển đường bộ', `${truckLabel} · ${km} km`, trucks.reduce((t, big) => t + truckCost(km, big), 0)],
    [border ? 'Kiểm dịch & thủ tục xuất nhập cảnh' : 'Kiểm dịch vận chuyển nội địa', `${horses} ngựa × ${formatVND(quarantine)}`, horses * quarantine],
    ['Chăm sóc dọc đường', `${horses} ngựa × ${days} ngày × ${formatVND(CARE_FEE_PER_DAY)}`, horses * days * CARE_FEE_PER_DAY],
  ]
  if (value) rows.push(['Bảo hiểm vận chuyển (gói cơ bản)', `${INSURANCE_RATE.basic * 100}% × giá trị khai báo ${formatVND(value)}`, value * INSURANCE_RATE.basic])
  return { km, gate, hours, days, truckLabel, rows, total: rows.reduce((t, r) => t + r[2], 0) }
}

// Giá mới khi bỏ ngựa có vấn đề (phương án A, PRD mục 5). Cước xe giữ nguyên vì tính theo xe, không theo ngăn.
// Các dòng còn lại tính theo ngựa nên chia theo số ngựa còn lại, làm tròn đến nghìn đồng.
export function requoteWithout(services: ServiceLine[], horses: number, remaining: number): ServiceLine[] {
  return services.map(([name, detail, amount]) => /vận chuyển đường bộ/i.test(name)
    ? [name, detail, amount]
    : [name, detail.replace(/\d+ ngựa/, `${remaining} ngựa`), Math.round(amount * remaining / horses / 1000) * 1000])
}
