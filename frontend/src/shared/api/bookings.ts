import apiClient, { type ApiResponse } from './client'

export interface BookingPartyDto {
  name: string
  phone: string
}

export interface BookingHorseDto {
  horseId?: string
  name: string
  microchip?: string
  breed?: string
  sex?: string
  stall?: string
  feedPackage?: string
  waterPlan?: string
  insuranceOpted?: boolean
}

export interface CreateBookingPayload {
  type: string
  originName: string
  originCountry?: string
  destName: string
  destCountry?: string
  departAt: number
  consignor: BookingPartyDto
  consignee: BookingPartyDto
  horses: BookingHorseDto[]
}

export interface BackendBookingResponse {
  id: string
  numericId: number
  type: string
  customer: string
  customerName: string
  status: string
  createdAt: number
  departAt: number
  originName: string
  originCountry?: string
  destName: string
  destCountry?: string
  consignor: BookingPartyDto
  consignee: BookingPartyDto
  totalHorses: number
  horses: BookingHorseDto[]
  waybillNo?: string
}

export const backendBookingApi = {
  // 1. Khách hàng tạo đơn vận chuyển mới (POST /api/v1/customer/bookings)
  create: async (payload: CreateBookingPayload): Promise<BackendBookingResponse> => {
    const res = await apiClient.post<ApiResponse<BackendBookingResponse>>('/customer/bookings', payload)
    return res.data.data
  },

  // 2. Khách hàng xem danh sách đơn của mình (GET /api/v1/customer/bookings)
  getCustomerBookings: async (): Promise<BackendBookingResponse[]> => {
    const res = await apiClient.get<ApiResponse<BackendBookingResponse[]>>('/customer/bookings')
    return res.data.data
  },

  // 3. Khách hàng xem chi tiết đơn (GET /api/v1/customer/bookings/{id})
  getCustomerBookingById: async (id: number | string): Promise<BackendBookingResponse> => {
    const res = await apiClient.get<ApiResponse<BackendBookingResponse>>(`/customer/bookings/${id}`)
    return res.data.data
  },

  // 4. Manager lấy danh sách đơn chờ tiếp nhận (GET /api/v1/manager/bookings/intake)
  getIntakeBookings: async (status = 'pending_intake'): Promise<BackendBookingResponse[]> => {
    const res = await apiClient.get<ApiResponse<BackendBookingResponse[]>>('/manager/bookings/intake', {
      params: { status },
    })
    return res.data.data
  },

  // 5. Manager lấy danh sách tất cả đơn (GET /api/v1/manager/bookings)
  getAllBookings: async (): Promise<BackendBookingResponse[]> => {
    const res = await apiClient.get<ApiResponse<BackendBookingResponse[]>>('/manager/bookings')
    return res.data.data
  },
}
