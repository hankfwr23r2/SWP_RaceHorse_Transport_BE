// Đáp án lấy bằng cách chạy hàm tra cước của home.js cũ với cùng đầu vào.
import { describe, expect, it } from 'vitest'
import { PLACES } from '../config/network'
import { estimateFee, requoteWithout, routeOf, truckCost, trucksFor } from './pricing'

const place = (id: string) => PLACES.find(p => p.id === id)!

describe('tra cước (home.js)', () => {
  const cases: [string, string, number, number, string | null, number][] = [
    // [đi, đến, số ngựa, km, cửa khẩu, cước xe]
    ['dni', 'pnh', 2, 320, 'Mộc Bài – Bavet', 11_200_000],
    ['hn', 'vte', 5, 780, 'Cầu Treo – Nam Phao', 46_800_000],
    ['hcm', 'dn', 3, 820, null, 28_140_000],
    ['ct', 'rep', 8, 590, 'Tịnh Biên – Phnom Den', 46_480_000],
    ['dni', 'bd', 1, 60, null, 4_560_000],
  ]
  it.each(cases)('%s → %s, %i ngựa', (from, to, horses, km, gate, truck) => {
    const route = routeOf(place(from), place(to))
    expect(route).toEqual({ km, gate })
    expect(trucksFor(horses).reduce((t, big) => t + truckCost(km, big), 0)).toBeCloseTo(truck, 0)
  })

  it('tổng = cộng các dòng, có bảo hiểm khi khai giá trị', () => {
    const r = estimateFee(place('hn'), place('vte'), 5, 2_000_000_000)
    expect(r.rows).toHaveLength(4)
    expect(r.total).toBe(r.rows.reduce((t, row) => t + row[2], 0))
  })
})

describe('giá mới khi bỏ ngựa (phương án A)', () => {
  const services: [string, string, number][] = [
    ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · 560 km', 18_000_000],
    ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói cho 2 ngựa: xét nghiệm, chứng nhận', 7_600_000],
    ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm', 2_000_000],
    ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1_600_000],
  ]
  it('giữ nguyên cước xe, chia các dòng còn lại theo số ngựa', () => {
    expect(requoteWithout(services, 2, 1)).toEqual([
      ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · 560 km', 18_000_000],
      ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói cho 1 ngựa: xét nghiệm, chứng nhận', 3_800_000],
      ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm', 1_000_000],
      ['Bảo hiểm vận chuyển', 'Gói cơ bản', 800_000],
    ])
  })
  it('nhận cả tên dòng "Cước vận chuyển đường bộ", làm tròn đến nghìn đồng', () => {
    const r = requoteWithout([['Cước vận chuyển đường bộ', '', 18_000_000], ['Phí kiểm dịch nội địa', '', 1_000_000]], 3, 2)
    expect(r).toEqual([['Cước vận chuyển đường bộ', '', 18_000_000], ['Phí kiểm dịch nội địa', '', 667_000]])
  })
})
