// Dữ liệu mẫu của luồng đặt đơn phải khớp quy tắc nghiệp vụ
import { describe, expect, it } from 'vitest'
import { currentCheckpoint, delayedCheckpoint, horseReadiness, missingClearanceDocs, reviewDone, validateRoutePlan } from '../../lib/booking'
import { seedVehicles } from './fleet'
import { seedBookings, seedHorses } from './bookings'

const horses = seedHorses()
const bookings = seedBookings()
const vehicles = seedVehicles()

describe('hồ sơ ngựa mẫu', () => {
  it('mã và microchip không trùng', () => {
    expect(new Set(horses.map(h => h.id)).size).toBe(horses.length)
    expect(new Set(horses.map(h => h.microchip)).size).toBe(horses.length)
  })
  it('có cả ngựa sẵn sàng đặt và ngựa thiếu giấy / hết hạn', () => {
    const ok = horses.filter(h => horseReadiness(h).ok).length
    expect(ok).toBeGreaterThan(0)
    expect(ok).toBeLessThan(horses.length)
  })
})

describe('đơn mẫu Flow 2', () => {
  it('đã nộp giấy thì đủ giấy bắt buộc, đơn bị yêu cầu nộp lại có lý do', () => {
    bookings.filter(b => !['pending_intake', 'under_review', 'pending_commercial', 'awaiting_payment', 'quote_expired', 'awaiting_clearance_docs', 'pending_resubmission'].includes(b.status)).forEach(b => expect(missingClearanceDocs(b), b.id).toEqual([]))
    const fix = bookings.find(b => b.status === 'pending_resubmission')!
    expect(fix.clearance!.rejection!.reasons.length).toBeGreaterThan(0)
    expect(fix.clearance!.rejection!.docs.length).toBeGreaterThan(0)
  })
  it('đã duyệt pháp lý thì có người duyệt, đã xuất bến thì có Coordinator xác nhận', () => {
    const afterLegal = ['legal_docs_approved', 'route_planning', 'route_plan_completed', 'trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']
    bookings.filter(b => afterLegal.includes(b.status)).forEach(b => expect(b.clearance!.approvedBy, b.id).toBeTruthy())
    bookings.filter(b => afterLegal.slice(1).includes(b.status)).forEach(b => expect(b.readiness, b.id).toBeTruthy())
  })
})

describe('đơn mẫu', () => {
  it('mã đơn không trùng, đặt trước ngày đi ít nhất 30 ngày', () => {
    expect(new Set(bookings.map(b => b.id)).size).toBe(bookings.length)
    bookings.forEach(b => expect(b.departAt - b.createdAt, b.id).toBeGreaterThanOrEqual(30 * 86_400_000 - 86_400_000))
  })
  it('mọi trạng thái của Flow 1 đều có đơn mẫu', () => {
    expect(new Set(bookings.map(b => b.status))).toEqual(new Set(['pending_intake', 'under_review', 'pending_commercial', 'awaiting_payment', 'quote_expired', 'awaiting_clearance_docs', 'documents_submitted', 'pending_resubmission', 'legal_docs_approved', 'route_planning', 'route_plan_completed', 'trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']))
  })
  it('ngựa trong đơn có trong hồ sơ, số ngựa không vượt 9', () => {
    bookings.forEach(b => {
      expect(b.horses.length, b.id).toBeLessThanOrEqual(9)
      b.horses.forEach(bh => expect(horses.find(h => h.id === bh.horseId)?.microchip, `${b.id} ${bh.name}`).toBe(bh.microchip))
    })
  })
  it('đơn quốc tế có cửa khẩu và Import Permit, đơn nội địa thì không', () => {
    bookings.forEach(b => {
      expect(!!b.gate, b.id).toBe(b.type === 'international')
      expect(!!b.importPermit, b.id).toBe(b.type === 'international')
    })
  })
  it('xe của đơn đủ ngăn cho số ngựa và tài xế đi theo xe', () => {
    bookings.filter(b => b.fleet).forEach(b => {
      const v = vehicles.find(x => x.id === b.fleet!.vehicleId)!
      expect(v.capacity, b.id).toBeGreaterThanOrEqual(b.horses.length)
      expect(b.fleet!.driverId, b.id).toBe(v.driverId)
    })
  })
  it('dữ liệu từng trạng thái khớp cổng chuyển bước', () => {
    bookings.forEach(b => {
      const afterReview = !['pending_intake', 'under_review'].includes(b.status)
      expect(reviewDone(b), `${b.id} cổng thẩm định`).toBe(afterReview)
      expect(!!b.intake, `${b.id} intake`).toBe(b.status !== 'pending_intake')
      const quoted = !['pending_intake', 'under_review', 'pending_commercial'].includes(b.status)
      expect(!!b.quote, `${b.id} quote`).toBe(quoted)
      expect(!!b.payment, `${b.id} payment`).toBe(quoted && !['awaiting_payment', 'quote_expired'].includes(b.status))
    })
  })
  it('cọc đúng 50% tổng báo giá', () => {
    bookings.filter(b => b.quote).forEach(b => expect(Math.abs(b.quote!.deposit - b.quote!.total / 2), b.id).toBeLessThanOrEqual(500))
  })
})

describe('đơn mẫu Flow 3', () => {
  const planned = bookings.filter(b => b.route)
  it('lộ trình mẫu qua kiểm tra chia chặng, riêng đơn ETA cửa khẩu sớm chỉ có cảnh báo', () => {
    expect(planned.length).toBeGreaterThan(0)
    planned.forEach(b => expect(validateRoutePlan(b.route!, b.type === 'international').errors, b.id).toEqual([]))
    const early = bookings.find(b => b.status === 'route_plan_completed')!
    expect(validateRoutePlan(early.route!, true).warnings.length).toBe(1)
  })
  it('đã duyệt Manifest thì có mã chuyến TRP, đã sẵn sàng thì Driver và Escort đều xác nhận', () => {
    bookings.filter(b => ['trip_manifest_approved', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement'].includes(b.status)).forEach(b => expect(b.manifest!.tripId, b.id).toMatch(/^TRP-\d{4}$/))
    bookings.filter(b => ['ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement'].includes(b.status)).forEach(b => { expect(b.manifest!.acks.driver, b.id).toBeTruthy(); expect(b.manifest!.acks.escort, b.id).toBeTruthy() })
    bookings.filter(b => ['en_route_to_pickup', 'in_transit', 'delivered_pending_settlement'].includes(b.status)).forEach(b => expect(b.manifest!.departedAt, b.id).toBeTruthy())
  })
})

describe('đơn mẫu Flow 4', () => {
  const running = bookings.filter(b => b.status === 'in_transit')
  it('đơn đang chạy có hành trình, mốc hiện tại là mốc đầu tiên chưa hoàn tất, mốc đã xong có ảnh', () => {
    expect(running.length).toBeGreaterThan(0)
    running.forEach(b => {
      const cps = b.trip!.checkpoints
      const firstOpen = cps.findIndex(c => !c.doneAt)
      expect(firstOpen, b.id).toBeGreaterThan(0)
      cps.slice(0, firstOpen).forEach(c => { expect(c.photo, `${b.id} ${c.id}`).toBeTruthy(); expect(c.arrivedAt, `${b.id} ${c.id}`).toBeTruthy() })
      cps.slice(firstOpen).forEach(c => expect(c.doneAt, `${b.id} ${c.id}`).toBeUndefined())
      expect(currentCheckpoint(b)!.id).toBe(cps[firstOpen].id)
    })
  })
  it('mốc nhận ngựa đã quét đủ chip và thu đủ bản gốc; mỗi trạm nghỉ đã qua có nhật ký an sinh', () => {
    bookings.filter(b => b.trip).forEach(b => {
      const [pickup, ...rest] = b.trip!.checkpoints
      expect(pickup.chips?.length, b.id).toBe(b.horses.length)
      rest.filter(c => c.type === 'rest' && c.doneAt).forEach(c => expect(b.trip!.welfare.some(w => w.checkpointId === c.id), `${b.id} ${c.id}`).toBe(true))
    })
  })
  it('có đơn trễ mốc (cờ vàng) và đơn đã giao xong hết mốc', () => {
    expect(running.filter(b => delayedCheckpoint(b)).length).toBeGreaterThan(0)
    const done = bookings.filter(b => b.status === 'delivered_pending_settlement')
    expect(done.length).toBeGreaterThan(0)
    done.forEach(b => { expect(b.trip!.checkpoints.every(c => c.doneAt), b.id).toBe(true); expect(b.trip!.deliveredAt, b.id).toBeTruthy() })
  })
})
