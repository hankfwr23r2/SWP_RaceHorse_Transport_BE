// Đối chiếu danh sách "Hồ sơ được giao" với dữ liệu gốc của kiem_dich.js
import { describe, expect, it } from 'vitest'
import { seedOrders } from '@shared/services/mock/orders'
import { seedOtherOrders } from '@shared/services/mock/orders-others'
import { progressOf, verifyState } from './verification'

const orders = [...seedOrders(), ...seedOtherOrders()]
const ME = 'Phạm Văn Hưng'
const get = (id: string) => orders.find(o => o.id === id)!
const idsIn = (state: string) => orders.filter(o => verifyState(o, ME) === state).map(o => o.id).sort()

describe('hồ sơ được giao cho Phạm Văn Hưng', () => {
  it('chia đúng tab', () => {
    expect(idsIn('verifying')).toEqual(['EQ-2026-1060', 'EQ-2026-1065', 'EQ-2026-1066', 'EQ-2026-1067', 'EQ-2026-1073'])
    expect(idsIn('waiting')).toEqual(['EQ-2026-1068'])
    expect(idsIn('reported')).toEqual(expect.arrayContaining(['EQ-2026-1047', 'EQ-2026-1069', 'EQ-2026-1075']))
    expect(idsIn('passed')).toContain('EQ-2026-1062')
  })
  it('không thấy đơn của kiểm dịch viên khác', () => {
    expect(verifyState(get('EQ-2026-1046'), ME)).toBeNull()
  })
  it('tiến độ xác minh (EQ-2026-1067: 3 ngựa × 3 giấy, 4 đã xác minh, 1 không hợp lệ)', () => {
    expect(progressOf(get('EQ-2026-1067'), 'verifying')).toEqual({ total: 9, decided: 4, invalid: 1, allDecided: false, allValid: false })
  })
  it('đơn đã báo cáo từ dữ liệu cũ: giấy trong căn cứ là không hợp lệ', () => {
    expect(progressOf(get('EQ-2026-1069'), 'reported')).toMatchObject({ total: 3, decided: 3, invalid: 1 })
  })
})
