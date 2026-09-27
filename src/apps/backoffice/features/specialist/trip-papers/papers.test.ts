// Đối chiếu danh sách "Chuẩn bị giấy tờ chuyến đi" với dữ liệu gốc của thu_tuc.js
import { describe, expect, it } from 'vitest'
import { seedOrders } from '@shared/services/mock/orders'
import { seedOtherOrders } from '@shared/services/mock/orders-others'
import { papersState, procedureExpiresEarly, progressOf } from './papers'

const orders = [...seedOrders(), ...seedOtherOrders()]
const get = (id: string) => orders.find(o => o.id === id)!
const idsIn = (state: string) => orders.filter(o => papersState(o, 'Phạm Văn Hưng') === state).map(o => o.id).sort()

describe('giấy tờ chuyến đi của Phạm Văn Hưng', () => {
  it('chia đúng tab', () => {
    expect(idsIn('preparing')).toEqual(['EQ-2026-1054', 'EQ-2026-1058', 'EQ-2026-1081', 'EQ-2026-1082'])
    expect(idsIn('ready')).toEqual(['EQ-2026-1083'])
    expect(idsIn('handed')).toEqual(['EQ-2026-1028', 'EQ-2026-1050'])
    expect(idsIn('reported')).toEqual(['EQ-2026-1052'])
  })
  it('giấy kiểm dịch hết hiệu lực trước ngày giao (EQ-2026-1082 đi 2 ngày) không tính là đủ', () => {
    expect(procedureExpiresEarly(get('EQ-2026-1082'), 'quarantine_border')).toBe(true)
    expect(progressOf(get('EQ-2026-1082'))).toEqual({ total: 7, done: 6, ready: false })
  })
})
