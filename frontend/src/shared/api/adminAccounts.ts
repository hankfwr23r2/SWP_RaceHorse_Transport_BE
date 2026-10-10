import apiClient, { type ApiResponse } from './client'
import type { Role } from '../types/role'

export interface CreateStaffPayload {
  name: string
  email: string
  phone?: string
  role: Role
}

export interface AccountApiItem {
  id: string
  userId: number
  name: string
  email: string
  phone?: string
  role: Role
  status: 'active' | 'locked'
  staffCode?: string
  hireDate?: string
  tempPassword?: string
}

export const adminAccountsApi = {
  // 1. Lấy danh sách tài khoản từ Backend (GET /api/v1/admin/accounts)
  list: async (): Promise<AccountApiItem[]> => {
    const res = await apiClient.get<ApiResponse<AccountApiItem[]>>('/admin/accounts')
    return res.data.data
  },

  // 2. Tạo tài khoản nhân viên mới (POST /api/v1/admin/accounts)
  create: async (payload: CreateStaffPayload): Promise<AccountApiItem> => {
    const res = await apiClient.post<ApiResponse<AccountApiItem>>('/admin/accounts', payload)
    return res.data.data
  },

  // 3. Khóa hoặc Mở khóa tài khoản (PATCH /api/v1/admin/accounts/{userId}/status)
  toggleLock: async (userId: number, locked: boolean): Promise<void> => {
    await apiClient.patch(`/admin/accounts/${userId}/status`, { locked })
  },

  // 4. Đặt lại mật khẩu tạm (POST /api/v1/admin/accounts/{userId}/reset-password)
  resetPassword: async (userId: number): Promise<string> => {
    const res = await apiClient.post<ApiResponse<{ tempPassword: string }>>(`/admin/accounts/${userId}/reset-password`)
    return res.data.data.tempPassword
  },
}

export default adminAccountsApi
