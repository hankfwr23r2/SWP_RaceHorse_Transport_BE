// Máy trạng thái của luồng đặt đơn: chạy trọn vẹn một chuyến từ lúc xe đến điểm đón tới khi giao xong, và các chặn nghiệp vụ.
import { beforeAll, describe, expect, it } from 'vitest'
import { manifestDocuments } from '../lib/booking'
import { bookingsApi } from './bookings'

const ID = 'ORD-2026-0116' // en_route_to_pickup, 2 ngựa, nội địa
const D = 'Nguyễn Văn Hùng'
const E = 'Võ Thị Lan'
const fail = async (p: Promise<unknown>) => { try { await p } catch (e) { return (e as Error).message } return '' }

describe('hành trình một chuyến (Flow 4)', () => {
  beforeAll(async () => { expect((await bookingsApi.get(ID))!.status).toBe('en_route_to_pickup') })

  it('không bắt đầu hành trình khi chưa check-in, chưa quét chip, chưa đủ bản gốc, chưa có biên bản', async () => {
    expect(await fail(bookingsApi.startJourney(ID, D))).toMatch(/check-in/)
    await bookingsApi.arriveAtPickup(ID, D, 'capture_pickup.jpg')
    expect(await fail(bookingsApi.startJourney(ID, D))).toMatch(/microchip/)
  })
  it('chip lạ bị từ chối, chip đúng được ghi nhận, quét đủ hết ngựa mới qua', async () => {
    expect(await fail(bookingsApi.scanChip(ID, E, 'VN-000000'))).toMatch(/không khớp/)
    const b = (await bookingsApi.get(ID))!
    for (const h of b.horses) await bookingsApi.scanChip(ID, E, h.microchip.toLowerCase())
    expect(await fail(bookingsApi.startJourney(ID, D))).toMatch(/chứng từ gốc/)
    const originals = manifestDocuments(b).originals
    await bookingsApi.collectOriginals(ID, D, originals.slice(0, 1))
    expect(await fail(bookingsApi.startJourney(ID, D))).toMatch(/chứng từ gốc/)
    await bookingsApi.collectOriginals(ID, D, originals)
    expect(await fail(bookingsApi.startJourney(ID, D))).toMatch(/biên bản/)
    await bookingsApi.uploadHandover(ID, D, 'bien_ban.jpg')
    const started = await bookingsApi.startJourney(ID, D)
    expect(started.status).toBe('in_transit')
    expect(started.trip!.startedAt).toBeTruthy()
  })
  it('qua trạm nghỉ: phải check-in có ảnh và có nhật ký an sinh mới được tiếp tục', async () => {
    const b = (await bookingsApi.get(ID))!
    const cp = b.trip!.checkpoints.find(c => !c.doneAt)!
    if (cp.type === 'rest') {
      expect(await fail(bookingsApi.continueJourney(ID, D))).toMatch(/Chưa ở trạm nghỉ/)
      expect(await fail(bookingsApi.arriveCheckpoint(ID, D, ''))).toMatch(/ảnh/)
      await bookingsApi.arriveCheckpoint(ID, D, 'capture_rest.jpg')
      expect(await fail(bookingsApi.continueJourney(ID, D))).toMatch(/nhật ký an sinh/)
      await bookingsApi.submitWelfare(ID, E, { condition: 'normal', waterLiters: 8, hay: true, temp: 22, photo: 'ngua.jpg', note: '' })
      await bookingsApi.continueJourney(ID, D)
    }
  })
  it('giao ngựa: cần Escort kiểm tra lần cuối và ảnh biên bản có chữ ký', async () => {
    expect(await fail(bookingsApi.completeDelivery(ID, D))).toMatch(/Chưa tới điểm giao/)
    await bookingsApi.arriveCheckpoint(ID, D, 'capture_delivery.jpg')
    expect(await fail(bookingsApi.completeDelivery(ID, D))).toMatch(/kiểm tra thể trạng/)
    await bookingsApi.submitWelfare(ID, E, { condition: 'normal', waterLiters: 2, hay: false, temp: 22, photo: 'ngua_cuoi.jpg', note: 'Ngựa khỏe' })
    expect(await fail(bookingsApi.completeDelivery(ID, D))).toMatch(/Biên bản/)
    await bookingsApi.uploadHandover(ID, D, 'bien_ban_ban_giao.jpg')
    const done = await bookingsApi.completeDelivery(ID, D)
    expect(done.status).toBe('delivered_pending_settlement')
    expect(done.trip!.deliveredAt).toBeTruthy()
    expect(done.trip!.checkpoints.every(c => c.doneAt)).toBe(true)
  })
})

describe('lệnh điều vận (Flow 3)', () => {
  it('chỉ Ready for Pickup khi cả Driver và Escort đã nhận lệnh', async () => {
    const id = 'ORD-2026-0114'
    const a = await bookingsApi.acknowledgeManifest(id, 'driver', D)
    expect(a.status).toBe('trip_manifest_approved')
    expect(await fail(bookingsApi.departToPickup(id, D))).toMatch(/chưa sẵn sàng/)
    const b = await bookingsApi.acknowledgeManifest(id, 'escort', E)
    expect(b.status).toBe('ready_for_pickup')
    expect((await bookingsApi.departToPickup(id, D)).status).toBe('en_route_to_pickup')
  })
  it('lộ trình vi phạm chia chặng không hoàn tất được; không phát lệnh xuất bến khi chưa duyệt pháp lý', async () => {
    const planning = (await bookingsApi.list()).find(b => b.status === 'route_planning')!
    const long = { legs: [{ no: 1, from: 'A', to: 'B', departAt: 0, arriveAt: 6 * 3_600_000 }], rests: [], vets: [{ name: 'v', phone: '1', near: 'n' }] }
    expect(await fail(bookingsApi.saveRoutePlan(planning.id, 'Trần Minh', long))).toMatch(/vượt 4 giờ/)
    const submitted = (await bookingsApi.list()).find(b => b.status === 'documents_submitted')!
    expect(await fail(bookingsApi.confirmReadiness(submitted.id, 'Trần Minh'))).toMatch(/chưa được Specialist duyệt/)
  })
})
