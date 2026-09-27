// Bản nháp đơn đặt chuyến qua 4 bước, lưu sessionStorage (giữ đúng key của create_request.js cũ).
import { useState } from 'react'
import type { CountryCode } from '@shared/config/network'

export interface DraftHorse {
  id: number
  name: string
  microchip: string
  breed: string
  breedValue: string
  gender: string
  genderValue: string
  age: string
  weight: string
  color: string
  colorValue: string
  marks: string
  completed: boolean
}

export interface BookingDraft {
  originCountry: CountryCode | ''
  originLocation: string
  originLocationName: string
  destCountry: CountryCode | ''
  destLocation: string
  destLocationName: string
  isInternational: boolean
  departureDate: string
  quantity: number | ''
  urgency: string
  horses: DraftHorse[]
  hasDisease: string
  hasMedication: string
  diseaseDetail: string
  needIsolation: string
  feeding: string
  foodType: string
  foodTypeName: string
  stallType: string
  stallTypeName: string
  waterSupplement: string
  waterSupplementName: string
  insurance: string
  insuranceName: string
  horseValue: number | ''
  specialCare: string
}

export const STORAGE_KEY = 'SWP_RACEHORSE_TRANSPORT_REQUEST'

export const emptyDraft = (): BookingDraft => ({
  originCountry: '', originLocation: '', originLocationName: '',
  destCountry: '', destLocation: '', destLocationName: '',
  isInternational: false, departureDate: '', quantity: '', urgency: '',
  horses: [],
  hasDisease: '', hasMedication: '', diseaseDetail: '', needIsolation: '',
  feeding: '', foodType: '', foodTypeName: '', stallType: '', stallTypeName: '',
  waterSupplement: '', waterSupplementName: '', insurance: '', insuranceName: '', horseValue: '', specialCare: '',
})

function read(): BookingDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft()
  } catch {
    return emptyDraft()
  }
}

export function useBookingDraft() {
  const [draft, setDraft] = useState<BookingDraft>(read)
  const save = (patch: Partial<BookingDraft>) => {
    const next = { ...read(), ...patch }
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* bỏ qua */ }
    setDraft(next)
    return next
  }
  return { draft, save }
}

// DEMO_MODE của create_request.js: bước 2 luôn khai sẵn 3 ngựa mẫu, bỏ qua số lượng ở bước 1.
// Ngựa mẫu đã đổi sang ngựa của khách mẫu (Trang trại Long Thành) cho khớp bộ dữ liệu chung.
export const DEMO_MODE = true
export const DEMO_HORSES: DraftHorse[] = [
  { id: 1, name: 'Storm Runner', microchip: '#VN-985211', breed: 'Thoroughbred (Anh)', breedValue: 'thoroughbred', gender: 'Thiến (Gelding)', genderValue: 'gelding', age: '5', weight: '520', color: 'Nâu đỏ (Bay)', colorValue: 'bay', marks: 'Sao trắng trán, tất trắng chân sau', completed: true },
  { id: 2, name: 'Bạch Phong', microchip: '#VN-985212', breed: 'Arabian (Ả Rập)', breedValue: 'arabian', gender: 'Cái (Mare)', genderValue: 'mare', age: '7', weight: '480', color: 'Bạch mã (White)', colorValue: 'white', marks: 'Đốm trắng nhỏ trên mũi', completed: true },
  { id: 3, name: 'Kim Lân', microchip: '#VN-985213', breed: 'Thoroughbred (Anh)', breedValue: 'thoroughbred', gender: 'Đực (Stallion)', genderValue: 'stallion', age: '6', weight: '550', color: 'Hạt dẻ (Chestnut)', colorValue: 'chestnut', marks: 'Vệt trắng dài giữa trán', completed: true },
]
