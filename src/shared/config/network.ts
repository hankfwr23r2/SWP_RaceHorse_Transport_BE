// Mạng lưới vận chuyển: 3 nước, điểm nhận/giao, cửa khẩu, trạm trung chuyển. Khớp docs/PRD.md mục 1.

export type CountryCode = 'VN' | 'LA' | 'KH'

export const COUNTRIES: Record<CountryCode, { name: string; meta: string }> = {
  VN: { name: 'Việt Nam', meta: 'Nội địa & xuất phát' },
  LA: { name: 'Lào', meta: 'Qua 3 cửa khẩu' },
  KH: { name: 'Campuchia', meta: 'Qua 2 cửa khẩu' },
}

export interface GeoPoint { lat: number; lng: number }

// Điểm dùng cho tra cước ở trang chủ (tọa độ để ước tính km)
export interface Place extends GeoPoint { id: string; name: string; country: CountryCode }
export const PLACES: Place[] = [
  { id: 'hn', name: 'Hà Nội', country: 'VN', lat: 21.03, lng: 105.85 },
  { id: 'dn', name: 'Đà Nẵng', country: 'VN', lat: 16.05, lng: 108.2 },
  { id: 'qn', name: 'Quy Nhơn (Bình Định)', country: 'VN', lat: 13.78, lng: 109.22 },
  { id: 'hcm', name: 'TP. Hồ Chí Minh', country: 'VN', lat: 10.77, lng: 106.66 },
  { id: 'dni', name: 'Đồng Nai', country: 'VN', lat: 10.78, lng: 106.95 },
  { id: 'bd', name: 'Bình Dương', country: 'VN', lat: 11.0, lng: 106.65 },
  { id: 'tn', name: 'Tây Ninh', country: 'VN', lat: 11.31, lng: 106.1 },
  { id: 'ct', name: 'Cần Thơ', country: 'VN', lat: 10.03, lng: 105.78 },
  { id: 'vte', name: 'Vientiane', country: 'LA', lat: 17.97, lng: 102.6 },
  { id: 'svk', name: 'Savannakhet', country: 'LA', lat: 16.57, lng: 104.75 },
  { id: 'lpb', name: 'Luang Prabang', country: 'LA', lat: 19.89, lng: 102.13 },
  { id: 'pks', name: 'Pakse', country: 'LA', lat: 15.12, lng: 105.8 },
  { id: 'pnh', name: 'Phnom Penh', country: 'KH', lat: 11.56, lng: 104.92 },
  { id: 'rep', name: 'Siem Reap', country: 'KH', lat: 13.36, lng: 103.86 },
  { id: 'btb', name: 'Battambang', country: 'KH', lat: 13.1, lng: 103.2 },
  { id: 'kos', name: 'Sihanoukville', country: 'KH', lat: 10.63, lng: 103.5 },
]

// Cửa khẩu đường bộ: tọa độ phía Việt Nam
export interface Gate extends GeoPoint { name: string; country: Exclude<CountryCode, 'VN'> }
export const GATES: Gate[] = [
  { name: 'Mộc Bài – Bavet', country: 'KH', lat: 11.07, lng: 106.2 },
  { name: 'Tịnh Biên – Phnom Den', country: 'KH', lat: 10.6, lng: 104.95 },
  { name: 'Lao Bảo – Densavanh', country: 'LA', lat: 16.62, lng: 106.6 },
  { name: 'Cầu Treo – Nam Phao', country: 'LA', lat: 18.38, lng: 105.13 },
  { name: 'Tây Trang – Sop Hun', country: 'LA', lat: 21.23, lng: 102.95 },
]

// Kho / điểm nhận giao dùng khi đặt đơn (trang Tạo yêu cầu, bước 1)
export interface BookingLocation { id: string; name: string; type: 'farm' | 'club' }
export const COUNTRY_LOCATIONS: Record<CountryCode, BookingLocation[]> = {
  VN: [
    { id: 'KHO-DN', name: 'Kho Đồng Nai — Trang trại Đua ngựa Long Thành', type: 'farm' },
    { id: 'KHO-LA', name: 'Kho Long An — Trang trại Huấn luyện Mỹ Quỳnh (Đức Hòa)', type: 'farm' },
    { id: 'KHO-BD', name: 'Kho Bình Dương — Trung tâm Cưỡi ngựa Đức Hòa', type: 'farm' },
    { id: 'CLB-SG', name: 'CLB Cưỡi ngựa Sài Gòn (Saigon Pony Club - Q.2, TP.HCM)', type: 'club' },
  ],
  KH: [
    { id: 'KHO-PNH', name: 'Kho Phnom Penh — Trung tâm Kiểm dịch Động vật Phnom Penh', type: 'farm' },
    { id: 'KHO-SR', name: 'Kho Siem Reap — Trại Ngựa & Vật nuôi Angkor', type: 'farm' },
    { id: 'SAI-PNH', name: 'CLB Cưỡi ngựa Hoàng gia Phnom Penh (Phnom Penh Equestrian Club)', type: 'club' },
  ],
  LA: [
    { id: 'KHO-VTE', name: 'Kho Viêng Chăn — Trang trại Chăn nuôi & Kiểm dịch Vientiane', type: 'farm' },
    { id: 'CLB-VTE', name: 'CLB Mã cầu & Cưỡi ngựa Viêng Chăn (Vientiane Equestrian Club)', type: 'club' },
  ],
}

// Trạm trung chuyển của công ty (nghỉ đêm trên tuyến dài)
export const STATIONS = ['Trạm nghỉ Vinh (Nghệ An)', 'Trạm nghỉ Quy Nhơn (Bình Định)', 'Trạm nghỉ Tuy Hòa (Phú Yên)', 'Trạm nghỉ Điện Biên']
