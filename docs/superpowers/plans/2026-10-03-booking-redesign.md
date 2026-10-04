# Thiết kế lại luồng đặt đơn — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển code từ luồng cũ (khách nộp giấy, 1 đơn = 1 xe, cọc 50%) sang luồng mới trong `docs/PRD.md` (Specialist làm giấy, nhiều xe/đơn tự gán, cọc 30% + 70% ngày D, báo giá cố định).

**Architecture:** Giữ hai bộ dữ liệu như AGENTS.md mô tả; chỉ sửa bộ **mới** (`types/booking.ts`, `services/bookings.ts`). `Booking.fleet / manifest / trip / readiness` được thay bằng `Booking.trips: VehicleTrip[]` (mỗi xe một chuyến) cùng `Booking.route` dùng chung. Logic thuần ở `lib/booking.ts` (có test), service chỉ gọi hàm thuần và chặn nghiệp vụ.

**Tech Stack:** React 19, TypeScript, Vite, vitest, oxlint, CSS module. Không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-10-03-booking-redesign-design.md` (nghiệp vụ đầy đủ ở `docs/PRD.md`).

## Global Constraints

- **Không commit, không push, không tạo nhánh** nếu người dùng chưa nói rõ (quy tắc của người dùng). Bỏ qua bước commit ở mẫu chuẩn; để file ở working tree.
- Comment và chuỗi giao diện bằng tiếng Việt, khớp phong cách file xung quanh. Tên từ chuyên ngành hiển thị cho người dùng: "Lệnh điều xe" thay Manifest, "Mã chuyến" thay Trip ID (đã chốt). Mã trong code giữ tên cũ (`manifest` trong tên file trang nếu có).
- Số mẫu: `DEPOSIT_RATE = 0.3`, dự phòng nhiên liệu/BOT `0.05`, biên lợi nhuận `0.05`, nhiên liệu + BOT `9_000` đ/km, phí thủ tục `{domestic: 0, international: 300_000}`.
- Mỗi xe đúng 01 Driver + 01 Escort. Tài xế đi theo xe (`Vehicle.driverId` cố định, đã có trong dữ liệu mẫu); `autoAssign` chọn Escort.
- Charter độc quyền: ngựa mỗi đơn chỉ lên xe của đơn đó; mỗi ngựa thuộc đúng một xe.
- Chia ngựa: ít xe nhất; không có xe đủ chỗ thì chia đều (6 ngựa, không còn xe 6 chỗ → 3 + 3).
- Sửa file `services/mock/*` thì tăng `MOCK_VERSION` (`src/shared/services/store.ts`).
- Không đụng bộ dữ liệu cũ (`types/order.ts`, `services/orders.ts`, `services/trips.ts`) ngoài việc sửa import hỏng.
- Quy tắc chạy kiểm: `npm run build` (= oxlint && tsc -b && vitest run && vite build) phải xanh trước khi báo xong. **Giữa chừng `tsc` sẽ đỏ** từ Task 1 đến Task 8; dùng `npx vitest run <file>` cho kiểm thử logic và `npx tsc -b 2>&1 | grep <thư mục>` để theo dõi lỗi còn lại.
- PRD là nguồn nghiệp vụ. Hoàn tất thì xóa dòng 14.8 trong `docs/PRD.md` (mục "Code chưa theo PRD").

## Review Focus

- Đơn 1 ngựa, 2 ngựa, 9 ngựa, 10 ngựa (MAX_HORSES): `autoAssign` không được để xe nào vượt sức chứa, và không bỏ sót ngựa nào (tổng ngựa trên các xe = số ngựa của đơn). Test ở Task 2.
- Xe/Escort đã bận đơn khác trong 3 ngày quanh ngày D: không được gán lại; thiếu xe hoặc Escort thì trả lỗi rõ, đơn vẫn ở `under_review`. Test ở Task 2 và Task 3.
- Khách trả 70% khi chưa tới bước cho phép, trả hai lần, hoặc hủy đơn sau khi đã trả 70%: không được trả hai lần, hủy hoàn 100% số dư. Test ở Task 3.
- Driver bấm "Bắt đầu hành trình" của xe A khi xe B của cùng đơn chưa đủ điều kiện: xe A vẫn đi được nếu khách đã trả đủ; đơn thành `in_transit` khi có xe đầu tiên chạy, và `delivered_pending_settlement` khi mọi xe giao xong. Test ở Task 3.
- Specialist đánh dấu `Clearance Done` khi còn hạng mục chưa xong, hoặc khi còn ngựa chưa có cờ thông quan (quốc tế): phải bị chặn. Test ở Task 3.
- Đơn nội địa không có hạng mục hải quan, Import Permit, cờ thông quan ngựa. Test ở Task 2.

---

## Cấu trúc file

| File | Việc |
|---|---|
| `src/shared/config/booking-rules.ts` | Trạng thái mới, hạng mục giấy, hằng số giá, policy sự cố |
| `src/shared/types/booking.ts` | `VehicleTrip`, `Clearance` mới, `Waybill`, `Balance`, bỏ `fleet/manifest/trip/readiness/importPermit` |
| `src/shared/lib/booking.ts` | `autoAssign`, báo giá theo xe, giấy tờ, suy trạng thái đơn từ các chuyến |
| `src/shared/lib/booking.test.ts` | Test các hàm trên |
| `src/shared/services/bookings.ts` | API: tiếp nhận + tự gán, xác nhận xe và lộ trình, cọc/Vận đơn, giấy tờ, trả 70%, Flow 3–4 theo `tripId` |
| `src/shared/services/bookings.test.ts` | Máy trạng thái mới |
| `src/shared/services/mock/bookings.ts` (+ `.test.ts`) | Đơn mẫu cho mọi trạng thái, có đơn nhiều xe |
| `src/apps/customer/**` | Chi tiết đơn, thẻ tiến độ giấy tờ, bước tiếp theo, đặt đơn, cổng khách, tra cứu |
| `src/apps/backoffice/**` | Manager, Specialist, Coordinator, Driver, Escort |

---

### Task 1: Cấu hình và kiểu dữ liệu

**Files:**
- Modify: `src/shared/config/booking-rules.ts`
- Modify: `src/shared/types/booking.ts`

**Interfaces:**
- Produces (dùng ở mọi task sau): `BookingStatus` mới; `CLEARANCE_DOC`, `ClearanceDocType`; `DEPOSIT_RATE`, `FUEL_BOT_PER_KM`, `FUEL_BUFFER_RATE`, `MARGIN_RATE`, `CLEARANCE_FEE`, `INCIDENT_COST_POLICY`; kiểu `VehicleTrip`, `ClearanceItem`, `Clearance`, `Waybill`, `Balance`.

- [ ] **Step 1: Sửa `booking-rules.ts`**

Thay các khối sau (giữ nguyên phần còn lại):

```ts
// ===== Cọc, báo giá =====
export const DEPOSIT_RATE = 0.3 // cọc 30% để nhận Vận đơn; 70% còn lại trả ngày D (PRD mục 2.6, 11.1)
export const QUOTE_VALID_HOURS = 48
export const DOCS_CUTOFF_HOUR = 18 // 18:00 ngày D-1: mốc cảnh báo nội bộ giấy tờ và mốc hoàn cọc (PRD mục 3.4, 8.3)
```

Trạng thái:

```ts
export type BookingStatus =
  | 'pending_intake' | 'under_review' | 'pending_commercial' | 'awaiting_payment' | 'quote_expired' // Flow 1
  | 'waybill_issued' | 'clearance_in_progress' | 'clearance_done' // Flow 2
  | 'ready_for_pickup' | 'en_route_to_pickup' // Flow 3
  | 'in_transit' | 'delivered_pending_settlement' // Flow 4
  | 'cancelled'
```

`BOOKING_STATUS` giữ các mục còn lại, bỏ 8 mục cũ (`awaiting_clearance_docs`, `documents_submitted`, `pending_resubmission`, `documentation_delayed`, `legal_docs_approved`, `dispatch_approved`, `route_planning`, `route_plan_completed`, `trip_manifest_approved`) và thêm:

```ts
  waybill_issued: { code: 'Waybill Issued', label: 'Đã có Vận đơn, chờ Specialist tiếp nhận', customerLabel: 'Đã có vận đơn', tone: 'success' },
  clearance_in_progress: { code: 'Clearance In Progress', label: 'Specialist đang làm thủ tục giấy tờ', customerLabel: 'Đang làm thủ tục giấy tờ', tone: 'info' },
  clearance_done: { code: 'Clearance Done', label: 'Giấy tờ xong, chờ Driver và Escort nhận lệnh', customerLabel: 'Giấy tờ đã xong', tone: 'success' },
```

Sửa nhãn có nhắc Manifest: `ready_for_pickup: label 'Sẵn sàng đón ngựa'` giữ nguyên.

```ts
export const BOOKING_STEPS = ['Gửi đơn', 'Thẩm định', 'Báo giá', 'Đặt cọc', 'Giấy tờ', 'Sẵn sàng', 'Vận chuyển', 'Quyết toán']
export const stepOf = (s: BookingStatus): number => ({
  pending_intake: 0, under_review: 1, pending_commercial: 1, awaiting_payment: 2, quote_expired: 2,
  waybill_issued: 4, clearance_in_progress: 4, clearance_done: 5,
  ready_for_pickup: 5, en_route_to_pickup: 6, in_transit: 6, delivered_pending_settlement: 7, cancelled: 0,
}[s])
```

`publicStepOf` giữ nguyên công thức (nhánh `else` = 3 cho mọi trạng thái giữa).

Hạng mục giấy (thay khối `ClearanceDocType`, `ClearanceOption`, `CLEARANCE_DOC`, `REJECT_REASONS`):

```ts
// ===== Giấy tờ pháp lý do Specialist làm (Flow 2, PRD mục 3.3, 12) =====
export type ClearanceDocType = 'health_cert' | 'poa' | 'customs_declaration' | 'import_permit' | 'quarantine_cert' | 'ata_carnet' | 'commercial_invoice'
// base: có sẵn ở mọi đơn thuộc tuyến tương ứng; không phải base thì Specialist thêm khi cần
export const CLEARANCE_DOC: Record<ClearanceDocType, { label: string; short: string; hint: string; international: boolean; base: boolean }> = {
  health_cert: { label: 'Giấy chứng nhận kiểm dịch động vật vận chuyển', short: 'Giấy kiểm dịch', hint: 'Mộc đỏ của cơ quan thú y có thẩm quyền.', international: false, base: true },
  poa: { label: 'Giấy ủy quyền áp tải', short: 'Giấy ủy quyền áp tải', hint: 'Song ngữ, ghi đúng tài xế và hộ tống của từng xe.', international: false, base: true },
  customs_declaration: { label: 'Tờ khai hải quan điện tử', short: 'Tờ khai hải quan', hint: 'Biển số xe và cửa khẩu phải khớp lộ trình.', international: true, base: true },
  import_permit: { label: 'Giấy phép nhập khẩu', short: 'Giấy phép nhập khẩu', hint: 'Do cơ quan thú y nước nhập khẩu phê duyệt.', international: true, base: true },
  quarantine_cert: { label: 'Giấy chứng nhận cách ly kiểm dịch trước xuất phát', short: 'Giấy cách ly', hint: 'Chỉ khi nước đến yêu cầu.', international: true, base: false },
  ata_carnet: { label: 'Sổ ATA Carnet', short: 'ATA Carnet', hint: 'Chỉ khi đi thi đấu, triển lãm (tạm nhập, tái xuất).', international: true, base: false },
  commercial_invoice: { label: 'Hóa đơn thương mại', short: 'Hóa đơn thương mại', hint: 'Chỉ khi người gửi bán ngựa cho người nhận.', international: true, base: false },
}
```

Hằng số giá (thay `CARRIER_DATA_FEE`; `DEMURRAGE_PER_HOUR` giữ vì PRD 11.3 vẫn dùng khi lỗi khách):

```ts
export const FUEL_BOT_PER_KM = 9_000 // nhiên liệu + BOT ước tính mỗi km (số mẫu)
export const FUEL_BUFFER_RATE = 0.05 // dự phòng trên nhiên liệu và BOT
export const MARGIN_RATE = 0.05 // biên lợi nhuận, gộp vào đơn giá, không hiện thành dòng riêng
export const CLEARANCE_FEE = { domestic: 0, international: 300_000 } // phí thủ tục kiểm dịch & hải quan, cố định
```

Policy sự cố (cuối file):

```ts
// ===== Chính sách chi phí sự cố (PRD mục 11.5): liên quan ngựa thì khách chịu, liên quan vận chuyển thì nhà xe chịu =====
export const INCIDENT_COST_POLICY: { who: 'customer' | 'carrier'; group: string; items: string[] }[] = [
  { who: 'customer', group: 'Liên quan đến ngựa', items: ['Thuốc, viện phí thú y', 'Chuồng đệm, cỏ và nước trong lúc chờ', 'Ngựa ốm hoặc chấn thương', 'Hồ sơ ngựa sai hoặc hết hạn', 'Người nhận từ chối', 'Hồi hương', 'Lưu xe do lỗi phía khách'] },
  { who: 'carrier', group: 'Liên quan đến vận chuyển', items: ['Hỏng xe, cứu hộ cơ khí, xe cứu hộ', 'Hỏng điều hòa thùng xe', 'Tai nạn do xe hoặc tài xế', 'Chậm do nhà xe', 'Giấy nhà xe làm sai', 'Chênh lệch nhiên liệu và BOT'] },
  { who: 'carrier', group: 'Tắc cửa khẩu', items: ['Nhà xe chịu toàn bộ phí lưu xe, tiền chuồng và chăm sóc ngựa. Khách chấp nhận giao trễ khi tắc cửa khẩu và không yêu cầu bồi thường.'] },
]
```

Bỏ `HORSE_DOC_TYPES` không đổi. Xóa `REFUND_RATE` không đổi (giữ).

- [ ] **Step 2: Sửa `types/booking.ts`**

Đổi dòng import đầu: bỏ `ClearanceOption`. Xóa `FleetPlan`, `ClearanceFile`, `ClearanceRejection`, `Readiness`, `Manifest`, `Booking.importPermit`, `Booking.fleet`, `Booking.manifest`, `Booking.trip`, `Booking.readiness`. Sửa/thêm:

```ts
export interface QuoteLine { label: string; detail: string; amount: number }
export interface Adjustment { label: string; amount: number }
export interface Quote {
  lines: QuoteLine[]
  adjustments: Adjustment[]
  subtotal: number
  total: number
  deposit: number // 30%
  balance: number // 70% còn lại, trả ngày D
  sentAt: number
  expiresAt: number
  sentBy: string
}

// ===== Giấy tờ pháp lý do Specialist làm (Flow 2) =====
export type ClearanceStatus = 'todo' | 'doing' | 'done'
export interface ClearanceItem { type: ClearanceDocType; status: ClearanceStatus; note: string; photos: string[]; updatedAt?: number; by?: string }
export interface CustomerFlag { at: number; note: string; by: string } // khách báo sai thông tin, không chặn tiến độ
export interface Clearance {
  items: ClearanceItem[]
  horsesCleared: string[] // horseId đã có giấy thông quan (quốc tế)
  flags: CustomerFlag[]
  acceptedAt?: number // Specialist tiếp nhận Vận đơn
  acceptedBy?: string
  doneAt?: number
  doneBy?: string
}

// ===== Mỗi xe của đơn là một chuyến (PRD mục 1.4, 10.2) =====
export interface DriverPack { items: string[]; at: number; by: string } // Coordinator nhập cho Driver mang theo
export interface VehicleTrip {
  tripId: string // TRP-NNNN-1, TRP-NNNN-2...
  vehicleId: string
  driverId: string
  escortId: string
  horseIds: string[]
  acks: { driver?: number; escort?: number } // nhận Lệnh điều xe trên app
  driverPack?: DriverPack
  departedAt?: number // Driver bấm bắt đầu đến điểm đón
  run?: TripRun
}
export interface Waybill { no: string; issuedAt: number }
export interface Payment { paidAt: number; amount: number; reference: string }
export interface PlanConfirmed { at: number; by: string; note: string }
```

`RoutePlan`: bỏ `returnNote`. `Booking`: thay phần kết quả từng bước:

```ts
  // ----- kết quả từng bước -----
  medical?: MedicalReview
  trips?: VehicleTrip[] // hệ thống tự gán khi tiếp nhận, Coordinator sửa được
  plan?: PlanConfirmed // Coordinator đã xác nhận xe, nhân sự và lộ trình
  route?: RoutePlan // một lộ trình dùng chung cho mọi xe
  quote?: Quote
  payment?: Payment // cọc 30%
  waybill?: Waybill
  clearance?: Clearance
  balance?: Payment // 70% ngày D
  cancellation?: Cancellation
```

`TripRun` giữ nguyên. Trong `Cancellation` giữ nguyên.

- [ ] **Step 3: Chạy kiểm** — `npx tsc -b 2>&1 | head -5` sẽ báo lỗi hàng loạt; chấp nhận. Kiểm riêng hai file: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "config/booking-rules|types/booking"` → không có lỗi trong hai file này.

---

### Task 2: Logic thuần (autoAssign, báo giá, giấy tờ, trạng thái đơn)

**Files:**
- Modify: `src/shared/lib/booking.ts`
- Modify (test): `src/shared/lib/booking.test.ts`

**Interfaces:**
- Consumes: kiểu từ Task 1; `Vehicle`, `CrewMember` từ `../services/mock/fleet`.
- Produces:
  - `autoAssign(horseIds: string[], vehicles: Vehicle[], crew: CrewMember[], busy: { vehicles: Set<string>; crew: Set<string> }): { ok: boolean; reason?: string; trips: AutoTrip[] }` với `AutoTrip = Pick<VehicleTrip, 'vehicleId' | 'driverId' | 'escortId' | 'horseIds'>`
  - `busyResources(all: Booking[], departAt: number, exceptId?: string): { vehicles: Set<string>; crew: Set<string> }`
  - `tripIdFor(bookingId: string, index: number): string` → `TRP-0114-1`
  - `waybillNoOf(bookingId: string): string` → `VD-0114`
  - `quoteLines(b: QuoteInput, vehicles: Pick<Vehicle, 'capacity'>[])` → `{ lines, km, days }`
  - `finalizeQuote(lines, adjustments, sentAt, sentBy): Quote`
  - `defaultClearanceItems(type: Booking['type']): ClearanceItem[]`, `blankClearance(type)`
  - `clearanceProgress(c: Clearance): { done: number; total: number }`
  - `canCompleteClearance(b: Pick<Booking,'type'|'horses'|'clearance'>): string | null` (trả lý do chặn, `null` nếu được)
  - `isClearanceOverdue(b, now): boolean`
  - `deriveStatus(b: Pick<Booking,'status'|'trips'|'clearance'>): BookingStatus`
  - `reviewDone(b)` = `medical approved && !!plan`
  - `HOLDING`, `CANCELLABLE` cập nhật; `manifestDocuments(b)` không dùng `clearance.options`.

- [ ] **Step 1: Viết test thất bại** — thêm vào `booking.test.ts` (xóa các test cũ của `requiredClearanceDocs`, `missingClearanceDocs`, `legalChecks`, `isDocsOverdue`, `reviewDone` cũ, báo giá cũ và `tripIdOf`; giữ test ngày, hồ sơ ngựa, hạng xe, lộ trình, hủy đơn):

```ts
import type { CrewMember, Vehicle } from '../services/mock/fleet'
import { autoAssign, canCompleteClearance, defaultClearanceItems, deriveStatus, finalizeQuote, quoteLines, tripIdFor } from './booking'

const veh = (id: string, capacity: number, over: Partial<Vehicle> = {}): Vehicle => ({ id, name: id, type: 'x', capacity, plate: id, status: 'available', maintenance: '2026-09-01', driverId: `D-${id}`, ...over })
const esc = (id: string): CrewMember => ({ id, name: id, role: 'escort', phone: '0', })
const none = { vehicles: new Set<string>(), crew: new Set<string>() }
const ids = (n: number) => Array.from({ length: n }, (_, i) => `H${i + 1}`)

describe('autoAssign', () => {
  it('một xe đủ chỗ thì dùng đúng một xe, chọn xe nhỏ nhất đủ chỗ', () => {
    const r = autoAssign(ids(2), [veh('A', 6), veh('B', 2), veh('C', 9)], [esc('E1'), esc('E2')], none)
    expect(r.ok).toBe(true)
    expect(r.trips).toHaveLength(1)
    expect(r.trips[0]).toMatchObject({ vehicleId: 'B', driverId: 'D-B', escortId: 'E1', horseIds: ['H1', 'H2'] })
  })
  it('6 ngựa, không còn xe 6 chỗ: chia đều 3 + 3 cho hai xe, mỗi xe một Escort riêng', () => {
    const r = autoAssign(ids(6), [veh('A', 4), veh('B', 4), veh('C', 2)], [esc('E1'), esc('E2'), esc('E3')], none)
    expect(r.ok).toBe(true)
    expect(r.trips.map(t => t.horseIds.length)).toEqual([3, 3])
    expect(new Set(r.trips.map(t => t.escortId)).size).toBe(2)
  })
  it('không xe nào vượt sức chứa, không sót ngựa (1, 2, 9, 10 ngựa)', () => {
    const fleet = [veh('A', 6), veh('B', 6), veh('C', 2), veh('D', 9)]
    for (const n of [1, 2, 9, 10]) {
      const r = autoAssign(ids(n), fleet, [esc('E1'), esc('E2'), esc('E3')], none)
      expect(r.ok, `n=${n}`).toBe(true)
      expect(r.trips.flatMap(t => t.horseIds).sort()).toEqual(ids(n).sort())
      r.trips.forEach(t => expect(t.horseIds.length).toBeLessThanOrEqual(fleet.find(v => v.id === t.vehicleId)!.capacity))
    }
  })
  it('xe bảo dưỡng, xe hoặc tài xế bận, Escort bận đều bị loại', () => {
    const fleet = [veh('A', 2, { status: 'maintenance' }), veh('B', 2), veh('C', 2)]
    const r = autoAssign(ids(2), fleet, [esc('E1'), esc('E2')], { vehicles: new Set(['B']), crew: new Set(['E1']) })
    expect(r.trips[0]).toMatchObject({ vehicleId: 'C', escortId: 'E2' })
  })
  it('thiếu xe hoặc thiếu Escort thì báo lỗi và không gán', () => {
    expect(autoAssign(ids(5), [veh('A', 2), veh('B', 2)], [esc('E1'), esc('E2')], none)).toMatchObject({ ok: false, trips: [] })
    expect(autoAssign(ids(4), [veh('A', 2), veh('B', 2)], [esc('E1')], none)).toMatchObject({ ok: false, trips: [] })
    expect(autoAssign([], [veh('A', 2)], [esc('E1')], none).ok).toBe(false)
  })
})

describe('báo giá cố định', () => {
  const origin = { id: 'KHO-DN', name: 'Kho Đồng Nai', country: 'VN' as const }
  const dest = { id: 'KHO-PNH', name: 'Kho Phnom Penh', country: 'KH' as const }
  const b = { type: 'international' as const, origin, dest, gate: 'Mộc Bài', horses: [bh({ stall: 'single', insurance: { opted: true } })] }
  it('mỗi xe có cước, nhân sự, nhiên liệu và BOT; không có phí lưu xe hay Carrier Info Sheet', () => {
    const { lines } = quoteLines(b, [{ capacity: 2 }, { capacity: 4 }])
    expect(lines.filter(l => /^Cước/.test(l.label))).toHaveLength(2)
    expect(lines.filter(l => /^Nhiên liệu/.test(l.label))).toHaveLength(2)
    expect(lines.some(l => /lưu xe|Carrier/i.test(l.label))).toBe(false)
    expect(lines.some(l => /thủ tục/.test(l.label))).toBe(true)
  })
  it('nhiên liệu và BOT cộng dự phòng 5% và lợi nhuận 5% trên km của lộ trình', () => {
    const { lines, km } = quoteLines(b, [{ capacity: 2 }])
    const fuel = lines.find(l => /^Nhiên liệu/.test(l.label))!
    expect(fuel.amount).toBe(Math.round((km * 9_000 * 1.05 * 1.05) / 1000) * 1000)
  })
  it('cọc 30%, số dư 70%, cộng lại đúng tổng', () => {
    const q = finalizeQuote([{ label: 'a', detail: '', amount: 10_000_000 }], [], NOW, 'M')
    expect(q.deposit).toBe(3_000_000)
    expect(q.balance).toBe(7_000_000)
    expect(q.deposit + q.balance).toBe(q.total)
  })
})

describe('giấy tờ do Specialist làm', () => {
  it('nội địa chỉ có giấy kiểm dịch và giấy ủy quyền; quốc tế thêm tờ khai và giấy phép nhập khẩu', () => {
    expect(defaultClearanceItems('domestic').map(i => i.type)).toEqual(['health_cert', 'poa'])
    expect(defaultClearanceItems('international').map(i => i.type)).toEqual(['health_cert', 'poa', 'customs_declaration', 'import_permit'])
  })
  it('chưa xong hạng mục nào hoặc thiếu cờ thông quan thì chưa hoàn tất được', () => {
    const items = defaultClearanceItems('international')
    const base = { type: 'international' as const, horses: [bh({ horseId: 'H1' }), bh({ horseId: 'H2' })] }
    expect(canCompleteClearance({ ...base, clearance: { items, horsesCleared: [], flags: [] } })).toMatch(/hạng mục/)
    const done = items.map(i => ({ ...i, status: 'done' as const }))
    expect(canCompleteClearance({ ...base, clearance: { items: done, horsesCleared: ['H1'], flags: [] } })).toMatch(/thông quan/)
    expect(canCompleteClearance({ ...base, clearance: { items: done, horsesCleared: ['H1', 'H2'], flags: [] } })).toBeNull()
  })
  it('nội địa không đòi cờ thông quan', () => {
    const done = defaultClearanceItems('domestic').map(i => ({ ...i, status: 'done' as const }))
    expect(canCompleteClearance({ type: 'domestic', horses: [bh()], clearance: { items: done, horsesCleared: [], flags: [] } })).toBeNull()
  })
})

describe('trạng thái đơn suy từ các chuyến', () => {
  const trip = (n: number, over: Partial<VehicleTrip> = {}): VehicleTrip => ({ tripId: tripIdFor('ORD-2026-0150', n), vehicleId: `V${n}`, driverId: 'd', escortId: 'e', horseIds: [], acks: { driver: 1, escort: 1 }, ...over })
  const done = { items: [], horsesCleared: [], flags: [], doneAt: 1 }
  it('Ready for Pickup khi giấy xong và mọi xe đã nhận lệnh', () => {
    expect(deriveStatus({ status: 'clearance_done', clearance: done, trips: [trip(1), trip(2, { acks: { driver: 1 } })] })).toBe('clearance_done')
    expect(deriveStatus({ status: 'clearance_done', clearance: done, trips: [trip(1), trip(2)] })).toBe('ready_for_pickup')
  })
  it('có xe đi trước thì đơn đang đến điểm đón / đang vận chuyển; giao xong hết mới Delivered', () => {
    const base = { status: 'ready_for_pickup' as const, clearance: done }
    expect(deriveStatus({ ...base, trips: [trip(1, { departedAt: 1 }), trip(2)] })).toBe('en_route_to_pickup')
    expect(deriveStatus({ ...base, trips: [trip(1, { run: { checkpoints: [], welfare: [], startedAt: 1 } }), trip(2)] })).toBe('in_transit')
    const delivered = { checkpoints: [], welfare: [], startedAt: 1, deliveredAt: 2 }
    expect(deriveStatus({ ...base, trips: [trip(1, { run: delivered }), trip(2, { run: { ...delivered, deliveredAt: undefined } })] })).toBe('in_transit')
    expect(deriveStatus({ ...base, trips: [trip(1, { run: delivered }), trip(2, { run: delivered })] })).toBe('delivered_pending_settlement')
  })
  it('không đổi trạng thái ngoài các giai đoạn Flow 3–4', () => {
    expect(deriveStatus({ status: 'awaiting_payment', clearance: done, trips: [trip(1)] })).toBe('awaiting_payment')
  })
})
```

(Thêm `import type { VehicleTrip } from '../types/booking'`.)

- [ ] **Step 2: Chạy test thấy thất bại** — `npx vitest run src/shared/lib/booking.test.ts` → FAIL (`autoAssign is not exported`).

- [ ] **Step 3: Cài đặt trong `lib/booking.ts`**

Sửa import (bỏ `CARRIER_DATA_FEE`, `CLEARANCE_DOC` kiểu cũ, `DOCS_CUTOFF_HOUR` giữ; thêm `CLEARANCE_FEE`, `FUEL_BOT_PER_KM`, `FUEL_BUFFER_RATE`, `MARGIN_RATE`; kiểu `BookingStatus`, `ClearanceItem`, `VehicleTrip`; `CrewMember`). Giữ `docsDueAt` (dùng cho hoàn cọc và cảnh báo). Bỏ `isDocsOverdue`, `requiredClearanceDocs`, `missingClearanceDocs`, `legalChecks`, `LegalCheck`, `tripIdOf`, `suggestStaff` giữ nguyên.

```ts
// ===== Gán xe tự động (PRD mục 10.2) =====
export type AutoTrip = Pick<VehicleTrip, 'vehicleId' | 'driverId' | 'escortId' | 'horseIds'>
export interface AutoAssignResult { ok: boolean; reason?: string; trips: AutoTrip[] }

// Ít xe nhất; không xe nào đủ chỗ thì lấy các xe lớn nhất cho tới khi đủ chỗ, rồi chia đều (lần lượt từng ngựa, bỏ qua xe đã đầy).
export function autoAssign(horseIds: string[], vehicles: Vehicle[], crew: CrewMember[], busy: { vehicles: Set<string>; crew: Set<string> }): AutoAssignResult {
  const fail = (reason: string): AutoAssignResult => ({ ok: false, reason, trips: [] })
  const n = horseIds.length
  if (!n) return fail('Đơn chưa có ngựa.')
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
  const free = vehicles.filter(v => v.status !== 'maintenance' && !busy.vehicles.has(v.id) && !busy.crew.has(v.driverId))
  const escorts = crew.filter(c => c.role === 'escort' && !busy.crew.has(c.id)).sort(byId)
  const single = [...free].filter(v => v.capacity >= n).sort((a, b) => a.capacity - b.capacity || byId(a, b))[0]
  const chosen: Vehicle[] = []
  if (single) chosen.push(single)
  else {
    let seats = 0
    for (const v of [...free].sort((a, b) => b.capacity - a.capacity || byId(a, b))) {
      chosen.push(v)
      seats += v.capacity
      if (seats >= n) break
    }
    if (seats < n) return fail(`Đội xe rảnh chỉ chở được ${seats}/${n} ngựa vào ngày này.`)
  }
  if (escorts.length < chosen.length) return fail(`Cần ${chosen.length} Escort rảnh, hiện có ${escorts.length}.`)
  const groups: string[][] = chosen.map(() => [])
  let i = 0
  for (const id of horseIds) {
    while (groups[i % chosen.length].length >= chosen[i % chosen.length].capacity) i++
    groups[i % chosen.length].push(id)
    i++
  }
  return { ok: true, trips: chosen.map((v, k) => ({ vehicleId: v.id, driverId: v.driverId, escortId: escorts[k].id, horseIds: groups[k] })) }
}

export const tripIdFor = (bookingId: string, index: number) => `TRP-${bookingId.slice(-4)}-${index}`
export const waybillNoOf = (bookingId: string) => `VD-${bookingId.slice(-4)}`
```

Xe và nhân sự bận (thay `reservedVehicleIds`):

```ts
export function busyResources(all: Booking[], departAt: number, exceptId?: string) {
  const vehicles = new Set<string>()
  const crew = new Set<string>()
  all.filter(o => o.id !== exceptId && HOLDING.includes(o.status) && Math.abs(o.departAt - departAt) < 3 * DAY)
    .forEach(o => (o.trips ?? []).forEach(t => { vehicles.add(t.vehicleId); crew.add(t.driverId); crew.add(t.escortId) }))
  return { vehicles, crew }
}
```

`HOLDING`: `['under_review', 'pending_commercial', 'awaiting_payment', 'waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit']`. `CANCELLABLE`: `['pending_intake', 'under_review', 'pending_commercial', 'awaiting_payment', 'waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup', 'en_route_to_pickup']`.

Báo giá (thay `quoteLines`, `finalizeQuote`, bỏ `QUOTE` cũ):

```ts
export function quoteLines(b: QuoteInput, vehicles: Pick<Vehicle, 'capacity'>[]) {
  const international = b.type === 'international'
  const km = routeKm(b.origin, b.dest, b.gate)
  const days = tripDays(km, international)
  const m = 1 + MARGIN_RATE
  const many = vehicles.length > 1
  const lines: QuoteLine[] = []
  vehicles.forEach((v, i) => {
    const cls = vehicleClassOf(v.capacity)
    const tag = many ? ` (xe ${i + 1}/${vehicles.length})` : ''
    lines.push(
      { label: `Cước vận chuyển nguyên chuyến${tag}`, detail: `Xe ${VEHICLE_CLASS[cls].label} (${VEHICLE_CLASS[cls].stalls}) · ${km} km`, amount: roundK(truckCost(km, false) * CLASS_FACTOR[cls] * m) },
      { label: `Nhân sự kỹ thuật, 01 Driver + 01 Escort${tag}`, detail: `${days} ngày`, amount: roundK(days * CREW_FEE_PER_DAY * m) },
      { label: `Nhiên liệu và BOT${tag}`, detail: `Ước tính theo lộ trình ${km} km, đã gồm dự phòng`, amount: roundK(km * FUEL_BOT_PER_KM * (1 + FUEL_BUFFER_RATE) * m) },
    )
  })
  const singles = b.horses.filter(h => h.stall === 'single').length
  if (singles) lines.push({ label: 'Khoang đơn mở rộng', detail: `${singles} ngựa`, amount: singles * SINGLE_STALL_FEE })
  lines.push({ label: 'Thủ tục kiểm dịch và hải quan', detail: international ? 'Nhà xe làm trọn gói' : 'Nhà xe làm giấy kiểm dịch trong nước', amount: international ? CLEARANCE_FEE.international : CLEARANCE_FEE.domestic })
  const insured = b.horses.filter(h => h.insurance.opted)
  if (insured.length) lines.push({ label: 'Bảo hiểm Động vật Sống', detail: `${insured.length} ngựa mua bảo hiểm`, amount: insured.reduce((t, h) => t + insuranceFee(h.breed), 0) })
  return { lines, km, days }
}

export function finalizeQuote(lines: QuoteLine[], adjustments: Adjustment[], sentAt: number, sentBy: string): Quote {
  const subtotal = lines.reduce((t, l) => t + l.amount, 0)
  const total = Math.max(0, subtotal + adjustments.reduce((t, a) => t + a.amount, 0))
  const deposit = roundK(total * DEPOSIT_RATE)
  return { lines, adjustments, subtotal, total, deposit, balance: total - deposit, sentAt, expiresAt: sentAt + QUOTE_VALID_HOURS * HOUR, sentBy }
}
```

(Bỏ `SINGLE_STALL_FEE` định dạng `formatVND` nếu không còn dùng — `formatVND` có thể hết dùng, xóa import nếu oxlint báo.)

Cổng chuyển bước và giấy tờ:

```ts
export const reviewDone = (b: Pick<Booking, 'medical' | 'plan'>) => b.medical?.status === 'approved' && !!b.plan

// ===== Giấy tờ do Specialist làm (Flow 2) =====
export const defaultClearanceItems = (type: Booking['type']): ClearanceItem[] =>
  (Object.keys(CLEARANCE_DOC) as ClearanceDocType[])
    .filter(t => CLEARANCE_DOC[t].base && (type === 'international' || !CLEARANCE_DOC[t].international))
    .map(t => ({ type: t, status: 'todo', note: '', photos: [] }))
export const blankClearance = (type: Booking['type']): Clearance => ({ items: defaultClearanceItems(type), horsesCleared: [], flags: [] })
export const clearanceProgress = (c: Clearance) => ({ done: c.items.filter(i => i.status === 'done').length, total: c.items.length })

// Lý do chưa hoàn tất được (null = được)
export function canCompleteClearance(b: Pick<Booking, 'type' | 'horses' | 'clearance'>): string | null {
  const c = b.clearance
  if (!c) return 'Đơn chưa có danh sách giấy tờ.'
  const { done, total } = clearanceProgress(c)
  if (done < total) return `Còn ${total - done} hạng mục chưa xong.`
  if (b.type === 'international') {
    const missing = b.horses.filter(h => !c.horsesCleared.includes(h.horseId))
    if (missing.length) return `Chưa ghi nhận thông quan cho: ${missing.map(h => h.name).join(', ')}.`
  }
  return null
}

// Quá 18:00 ngày D-1 mà giấy tờ chưa xong: cảnh báo nội bộ cho Manager, không tính phí khách
export const isClearanceOverdue = (b: Pick<Booking, 'status' | 'departAt'>, now = Date.now()) =>
  (b.status === 'waybill_issued' || b.status === 'clearance_in_progress') && now > docsDueAt(b.departAt)

// ===== Trạng thái đơn từ các chuyến (PRD mục 13) =====
const DERIVED: BookingStatus[] = ['clearance_done', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']
export function deriveStatus(b: Pick<Booking, 'status' | 'trips' | 'clearance'>): BookingStatus {
  if (!DERIVED.includes(b.status)) return b.status
  const trips = b.trips ?? []
  if (trips.length && trips.every(t => t.run?.deliveredAt)) return 'delivered_pending_settlement'
  if (trips.some(t => t.run?.startedAt)) return 'in_transit'
  if (trips.some(t => t.departedAt)) return 'en_route_to_pickup'
  return trips.length && trips.every(t => t.acks.driver && t.acks.escort) ? 'ready_for_pickup' : 'clearance_done'
}
```

`manifestDocuments(b)`: đổi tham số `Pick<Booking, 'type' | 'clearance'>` thành `Pick<Booking, 'type'>`; `system` bỏ dòng "Carrier Info Sheet", đổi dòng đầu thành `'Bản in Lệnh điều xe (Trip Manifest)'` và thêm `'Vận đơn (Waybill)'`, `'Giấy kiểm dịch, tờ khai, giấy ủy quyền áp tải nhà xe đã làm (bản in)'`; `originals` chỉ gồm giấy khách giao: `'Hộ chiếu ngựa bản gốc (FEI / National Passport)'`, `'Sổ tiêm phòng'`, `'Phiếu xét nghiệm EIA/EVA, bản gốc kèm 02 bản sao công chứng'`. Bỏ phụ thuộc `clearance.options`.

`buildRoutePlan(b, etd)`: đổi tham số thứ hai thành `etd: number`; `preset` rỗng (`const preset: string[] = []`). `buildCheckpoints` giữ nguyên (đọc `b.route`, `b.gate`) và không đổi chữ ký.

`delayedCheckpoint`, `currentCheckpoint`, `legNumber`, `lastWelfare`: đổi tham số `Pick<Booking,'trip'>` thành `{ run?: TripRun }` rồi đọc `.run` thay `.trip`; `delayedCheckpoint(t: { run?: TripRun }, status: BookingStatus, now)`. `refundOf` giữ nguyên chữ ký.

- [ ] **Step 4: Chạy test** — `npx vitest run src/shared/lib/booking.test.ts` → PASS. Sửa test cũ còn lại (`buildRoutePlan`, `delayedCheckpoint`, `manifestDocuments`) theo chữ ký mới cho tới khi PASS.

---

### Task 3: Service `bookings.ts` và máy trạng thái

**Files:**
- Modify: `src/shared/services/bookings.ts`
- Modify (test): `src/shared/services/bookings.test.ts`

**Interfaces:**
- Consumes: Task 1–2.
- Produces (khóa tên, UI dùng):

```ts
// khách
customerBookingsApi.create(customer, input) / list / get / cancel(customer,id,reason,forceMajeure)
customerBookingsApi.team(customer, id): Promise<TripTeam[]>      // mỗi xe: tripId, horseNames, vehicle, driver, escort
customerBookingsApi.payDeposit(customer, id)                      // cọc 30% → waybill_issued, cấp mã Vận đơn
customerBookingsApi.payBalance(customer, id)                      // 70%, chỉ khi ready_for_pickup / en_route_to_pickup
customerBookingsApi.flagClearance(customer, id, note)            // báo sai thông tin, không đổi trạng thái
customerBookingsApi.resubmit(customer, id)                        // giữ nguyên (bổ sung hồ sơ ngựa)
// nội bộ
bookingsApi.activate(id, by, specialist, coordinator)            // tự gán xe (autoAssign) → under_review
bookingsApi.assignPreview(id): Promise<AutoAssignResult>         // chạy lại tự gán (nút "Gán lại")
bookingsApi.confirmPlan(id, by, input: { trips: Pick<VehicleTrip,'vehicleId'|'driverId'|'escortId'|'horseIds'>[]; route: Pick<RoutePlan,'legs'|'rests'|'vets'|'borderEta'>; note: string })
bookingsApi.approveMedical / requestResubmission                  // giữ nguyên
bookingsApi.quoteDraft(id) / sendQuote(id, by, adjustments)
bookingsApi.acceptWaybill(id, by)                                 // Specialist: waybill_issued → clearance_in_progress
bookingsApi.updateClearanceItem(id, by, type, patch: { status?: ClearanceStatus; note?: string; photos?: string[] })
bookingsApi.addClearanceItem(id, by, type)                        // thêm hạng mục không base
bookingsApi.markHorseCleared(id, by, horseId, cleared: boolean)
bookingsApi.completeClearance(id, by)                             // → clearance_done (+ deriveStatus)
bookingsApi.setDriverPack(id, tripId, by, items: string[])
bookingsApi.acknowledgeTrip(id, tripId, who, by)
bookingsApi.departToPickup(id, tripId, by)
// Flow 4 (mọi hàm thêm tham số tripId ngay sau id): arriveAtPickup, scanChip, collectOriginals, uploadHandover, startJourney, arriveCheckpoint, submitWelfare, continueJourney, customsCleared, completeDelivery
```

- [ ] **Step 1: Viết test thất bại** — thay `bookings.test.ts`. Dữ liệu mẫu đơn đang chạy (ID cụ thể do Task 4 tạo); trong plan dùng hằng và `seed` được Task 4 chốt: `ENROUTE = 'ORD-2026-0116'` (1 xe, en_route_to_pickup, `trips[0].tripId = 'TRP-0116-1'`, đã trả 70%), `MULTI = 'ORD-2026-0118'` (2 xe, waybill_issued), `READY2 = 'ORD-2026-0114'` (ready_for_pickup chờ nhận lệnh, xem Task 4). Test mẫu (viết đủ trước khi cài đặt):

```ts
const T = 'TRP-0116-1'
describe('hành trình một xe (Flow 4)', () => {
  // giữ nguyên các bước hiện có, đổi mọi lời gọi thành (ID, T, ...)
  it('không bắt đầu hành trình khi khách chưa trả 70%', async () => {
    // ORD-2026-0119: en_route_to_pickup nhưng chưa trả số dư (Task 4)
    await bookingsApi.arriveAtPickup('ORD-2026-0119', 'TRP-0119-1', D, 'a.jpg')
    // ... quét chip, thu gốc, ảnh biên bản như test hiện có ...
    expect(await fail(bookingsApi.startJourney('ORD-2026-0119', 'TRP-0119-1', D))).toMatch(/70%/)
  })
})
describe('nhiều xe', () => {
  it('đơn in_transit khi xe đầu tiên chạy, delivered khi xe cuối giao xong', async () => { /* dùng ORD-2026-0120 (2 xe, đã trả đủ) */ })
})
describe('giấy tờ do Specialist', () => {
  it('chỉ tiếp nhận Vận đơn khi waybill_issued; không hoàn tất khi còn hạng mục chưa xong', async () => {
    const id = 'ORD-2026-0118'
    expect((await bookingsApi.acceptWaybill(id, 'Lê Hương')).status).toBe('clearance_in_progress')
    expect(await fail(bookingsApi.completeClearance(id, 'Lê Hương'))).toMatch(/hạng mục/)
    const b = (await bookingsApi.get(id))!
    for (const i of b.clearance!.items) await bookingsApi.updateClearanceItem(id, 'Lê Hương', i.type, { status: 'done', photos: ['a.jpg'] })
    expect(await fail(bookingsApi.completeClearance(id, 'Lê Hương'))).toMatch(/thông quan/)
    for (const h of b.horses) await bookingsApi.markHorseCleared(id, 'Lê Hương', h.horseId, true)
    expect((await bookingsApi.completeClearance(id, 'Lê Hương')).status).toBe('clearance_done')
  })
})
describe('thanh toán', () => {
  it('trả 70% chỉ khi xe sẵn sàng, không trả hai lần', async () => { /* customerBookingsApi.payBalance trên đơn ready_for_pickup; lần hai ném lỗi 'đã thanh toán' */ })
  it('hủy sau khi trả 70% hoàn 100% số dư cộng hoàn cọc theo mốc', async () => { /* kiểm cancellation.refund */ })
})
describe('tự gán khi tiếp nhận', () => {
  it('thiếu xe thì activate ném lỗi và đơn vẫn pending_intake', async () => { /* đơn mẫu pending_intake có 10 ngựa */ })
})
```

Test viết đủ code khi thực hiện (mẫu trên là khung; mỗi `it` phải có assertion cụ thể như đã nêu, không để thân rỗng).

- [ ] **Step 2: Chạy test thấy thất bại** — `npx vitest run src/shared/services/bookings.test.ts`.

- [ ] **Step 3: Viết lại `services/bookings.ts`** theo các quy tắc sau (giữ cấu trúc file, `log`, `must`, `expect`, `createStore`):

  1. `applySystemRules()`: chỉ còn hết hạn báo giá. Bỏ ba luật cũ khác. Thêm hàm xuất `syncStatus(b)` = `store.update(id, { status: deriveStatus(b) })` gọi sau mọi thao tác đổi `trips`.
  2. `toCustomerView`: `QUOTED = ['awaiting_payment','quote_expired','waybill_issued','clearance_in_progress','clearance_done','ready_for_pickup','en_route_to_pickup','in_transit','delivered_pending_settlement']`; khi chưa `QUOTED` thì xóa `trips` và `route`. Khách thấy `trips` (bỏ `driverPack`, `acks`) sau báo giá.
  3. `team()` trả `TripTeam[]`: `{ tripId, horseNames: string[], vehicle: {plate, kind, stalls}, driver: {name, phone}, escort: {name, phone} }` (bỏ VIN, đăng kiểm, CCCD, GPLX: không còn Carrier Info Sheet cho khách).
  4. `activate`: lấy `vehicles`, `crew` từ `fleet.ts`, `busyResources(store.all(), b.departAt, id)`, chạy `autoAssign`. Không `ok` thì ném `Error(reason)` (đơn giữ `pending_intake`). `ok` thì lưu `trips` (kèm `tripId: tripIdFor(id, i + 1)`, `acks: {}`), `clearance: blankClearance(b.type)`, `status: 'under_review'`.
  5. `assignPreview(id)`: chạy lại `autoAssign` loại trừ chính đơn, trả kết quả, không lưu.
  6. `confirmPlan`: `expect(b,'under_review')`; kiểm: mỗi ngựa của đơn xuất hiện đúng một lần trên các xe; xe không bảo dưỡng, đủ chỗ (`horseIds.length <= capacity`), không bận (`busyResources`), `escortId` không trùng giữa các xe, mỗi xe có Escort; `validateRoutePlan` không lỗi. Lưu `trips` (giữ `acks` rỗng, `tripId` đánh lại theo thứ tự), `route: {...route, completedAt, by}`, `plan: {at, by, note}`. Chuyển `pending_commercial` nếu `reviewDone`.
  7. `quoteDraft`: lấy `vehicles` của `b.trips`, gọi `quoteLines(b, vehicles)`. `sendQuote`: `finalizeQuote(lines, adjustments, now, by)`.
  8. `payDeposit`: `expect awaiting_payment`; `payment = {paidAt, amount: quote.deposit, reference: 'EQZ-xxxx-DEP'}`, `waybill = {no: waybillNoOf(id), issuedAt}`, `status: 'waybill_issued'`, `clearance` giữ (đã tạo ở `activate`). Log: `Đặt cọc 30%, cấp Vận đơn ${no}`.
  9. `acceptWaybill`, `updateClearanceItem`, `addClearanceItem` (chỉ type chưa có và hợp lệ theo tuyến), `markHorseCleared` (chỉ quốc tế): yêu cầu `status` là `waybill_issued` hoặc `clearance_in_progress` (riêng `acceptWaybill` chỉ `waybill_issued`). `updateClearanceItem` tự chuyển `waybill_issued` → `clearance_in_progress` nếu chưa tiếp nhận. `completeClearance`: `canCompleteClearance(b)` có lý do thì ném lỗi; không thì `clearance.doneAt/doneBy`, `status: 'clearance_done'` rồi `deriveStatus` (có thể thành `ready_for_pickup` nếu mọi xe đã nhận lệnh).
  10. `flagClearance`: thêm vào `clearance.flags`, không đổi trạng thái; chỉ khi `clearance_in_progress`/`clearance_done`/`waybill_issued`.
  11. `setDriverPack(id, tripId, by, items)`: lưu `driverPack`; được từ `waybill_issued` đến `ready_for_pickup`.
  12. `acknowledgeTrip(id, tripId, who, by)`: cho phép từ `waybill_issued` (Lệnh điều xe phát ngay sau cọc); lưu `acks[who]`; rồi `deriveStatus`.
  13. `departToPickup(id, tripId, by)`: yêu cầu `clearance.doneAt` và cả hai `acks` của xe đó, nếu không thì ném `Error('Xe chưa sẵn sàng: ...')`; set `departedAt`; `deriveStatus`.
  14. Flow 4: mỗi hàm lấy `const t = tripOf(b, tripId)`; thay `b.trip` bằng `t.run`; `arriveAtPickup` tạo `t.run ??= { checkpoints: buildCheckpoints(b), welfare: [] }`; trạng thái cũ `expect(b,'en_route_to_pickup')` đổi thành kiểm trên chuyến (`t.departedAt` có, `t.run?.startedAt` chưa có; với các hàm sau khi chạy: `t.run?.startedAt && !t.run.deliveredAt`). `startJourney` thêm chặn đầu tiên: `if (!b.balance) throw new Error('Khách chưa thanh toán 70% còn lại.')`. Cuối mỗi hàm đổi trạng thái chuyến gọi `store.update(id, { trips, status: deriveStatus({...b, trips}) , history })`.
  15. `payBalance(customer, id)`: chủ đơn; `status` phải `ready_for_pickup` hoặc `en_route_to_pickup` (còn lại ném `Error('Chưa đến bước thanh toán số dư.')`); đã có `balance` thì ném `Error('Đơn đã thanh toán số dư.')`; lưu `balance = {paidAt, amount: quote.balance, reference: '...-BAL'}`.
  16. `cancel`: `refundOf(b.departAt, b.payment.amount, ...)`; nếu có `b.balance` thì cộng thêm `balance.amount` vào `refund` (hoàn 100% số dư); `rate` vẫn là tỷ lệ hoàn cọc.
  17. `publicBookingsApi.track`: thay mảng tên trạng thái cần khách xử lý bằng `['awaiting_payment']` hoặc `b.medical?.status === 'resubmit'`; `now`/`delivery` lấy từ chuyến có `run` đầu tiên đang chạy.
  18. Xóa `SUBMITTABLE`, `submitClearance`, `approveLegal`, `requestClearanceFix`, `confirmReadiness`, `saveRoutePlan`, `returnRoutePlan`, `approveManifest`, `acknowledgeManifest`, `confirmFleet`.

- [ ] **Step 4: Chạy test** — `npx vitest run src/shared/services/bookings.test.ts` (sau Task 4 mới có dữ liệu mẫu; làm Task 3 và 4 liền nhau, chạy test ở cuối Task 4).

---

### Task 4: Dữ liệu mẫu

**Files:**
- Modify: `src/shared/services/mock/bookings.ts`
- Modify (test): `src/shared/services/mock/bookings.test.ts`
- Modify: `src/shared/services/store.ts` (`MOCK_VERSION + 1`)

- [ ] **Step 1: Đọc `mock/bookings.ts`, chuyển từng đơn mẫu** theo bảng:

| Trạng thái cũ | Thành | Ghi chú |
|---|---|---|
| `awaiting_clearance_docs`, `documents_submitted`, `pending_resubmission`, `legal_docs_approved` | `waybill_issued` hoặc `clearance_in_progress` | `clearance` có `items` (một vài `done`, ảnh `giay_kiem_dich.jpg`...), bỏ `docs`/`rejection` |
| `dispatch_approved`, `route_planning`, `route_plan_completed`, `trip_manifest_approved` | `clearance_done` | mọi hạng mục `done`, `clearance.doneAt` |
| `ready_for_pickup` | giữ | đủ `acks` hai bên |
| `en_route_to_pickup`, `in_transit`, `delivered_pending_settlement` | giữ | `trips[].run` thay `trip`; đã có `balance` |

  - Mọi đơn có phương án xe: `fleet` → `trips: [{ tripId, vehicleId, driverId, escortId, horseIds, acks }]`; `plan: {at, by, note}`; `route` dùng chung (bỏ `returnNote`).
  - Đơn đã cọc: `payment` bỏ `contractSignedAt`, `amount` = 30% của `quote.total`; `waybill`; `quote.deposit/balance` mới, bỏ `demurragePerHour`.
  - Bỏ `importPermit`, `clearance.options/docs`.
  - **Đơn cần thêm** (giữ mã đã dùng trong test, các mã còn lại ghi trong test):
    - `ORD-2026-0116`: 1 xe, `en_route_to_pickup`, có `balance` (giữ như hiện tại).
    - `ORD-2026-0114`: `ready_for_pickup`-tiền đề: `clearance_done`, xe đã nhận lệnh một bên (test nhận lệnh).
    - `ORD-2026-0118`: **2 xe** (6 ngựa, 3 + 3), `waybill_issued`, quốc tế.
    - `ORD-2026-0119`: 1 xe, `en_route_to_pickup`, **chưa** có `balance`.
    - `ORD-2026-0120`: **2 xe**, `in_transit` một xe đã chạy, một xe đang `en_route_to_pickup`, đã có `balance`.
    - Một đơn `pending_intake` có 10 ngựa (vượt đội xe rảnh) để test thiếu xe.
  - Mỗi đơn quốc tế `in_transit` trở đi có `clearance.horsesCleared` đủ ngựa.

- [ ] **Step 2: Cập nhật `mock/bookings.test.ts`**: bỏ các test `Flow 2` cũ (giấy khách nộp, `approvedBy`, `readiness`) và `importPermit`; sửa test "mọi trạng thái" thành tập trạng thái mới; test "xe của đơn" lặp trên `b.trips` (mỗi xe đủ ngăn, tổng ngựa các xe = số ngựa đơn, mỗi ngựa đúng một xe, tài xế đi theo xe); thêm: đơn đã cọc có `waybill` và `payment.amount ≈ quote.total * 0.3`, đơn quốc tế `clearance_done` trở đi đã đủ `horsesCleared`, có ít nhất một đơn nhiều xe. Tăng `MOCK_VERSION`.

- [ ] **Step 3: Chạy** — `npx vitest run src/shared` → PASS toàn bộ (Task 2, 3, 4).

---

### Task 5: App khách (customer)

**Files:**
- Modify: `src/apps/customer/features/orders/nextStep.ts`, `OrderDetailPage.tsx`, `OrdersPage.tsx`
- Replace: `src/apps/customer/features/orders/ClearanceCard.tsx` → `ClearanceProgressCard.tsx` (xóa file cũ)
- Modify: `src/apps/customer/features/booking/Step1RoutePage.tsx`, `Step4ReviewPage.tsx`, `draft.ts` (bỏ upload Import Permit)
- Modify: `src/apps/customer/features/portal/PortalPage.tsx`, `src/shared/ui/QuoteSheet.tsx`, `src/shared/ui/TripTimeline.tsx` nếu hỏng

- [ ] **Step 1: `nextStep.ts`**: cập nhật hằng `POST_PAYMENT` (`waybill_issued`, `clearance_in_progress`, `clearance_done`, `ready_for_pickup`, `en_route_to_pickup`, `in_transit`, `delivered_pending_settlement`), `ROUTE_STAGE` (`clearance_done` trở đi), `ROUTE_VISIBLE` (mọi trạng thái đã báo giá). Thay các `case`:
  - `awaiting_payment`: tiêu đề `Đặt cọc 30% trong …`.
  - `waybill_issued`: `fa-file-contract`, "Đã có Vận đơn", "Nhà xe đang bắt đầu làm giấy kiểm dịch và hải quan cho bạn. Bạn không cần làm gì thêm."
  - `clearance_in_progress`: "Nhà xe đang làm thủ tục giấy tờ", kèm `x/y hạng mục đã xong` (dùng `clearanceProgress`).
  - `clearance_done`: "Giấy tờ đã xong. Xe và nhân sự đang chuẩn bị."
  - `ready_for_pickup`: `actionNeeded: !b.balance`, tiêu đề "Trả số dư 70% vào ngày bốc ngựa" khi chưa trả, ngược lại "Sẵn sàng đón ngựa".
  - `en_route_to_pickup`: nhắc trả 70% nếu chưa (`actionNeeded: !b.balance`).
  - `in_transit`: lấy mốc từ chuyến chạy đầu tiên (`b.trips?.find(t => t.run)`), đọc `t.run.checkpoints`.
  - Bỏ các `case` giấy tờ khách nộp và `route_*`, `dispatch_approved`, `trip_manifest_approved`.
  - Xóa import `docsDueAt`, `formatVND` nếu thừa.

- [ ] **Step 2: `ClearanceProgressCard.tsx`**: props `{ b: CustomerBookingView; onFlag: (note: string) => Promise<void> }`. Hiện danh sách `clearance.items` (nhãn từ `CLEARANCE_DOC[type].short`, trạng thái Chưa làm/Đang làm/Xong dạng `StatusBadge` hiện có trong `shared/ui`, ghi chú, ảnh Specialist chụp dạng ô thu nhỏ). Dưới cùng nút "Báo sai thông tin" mở ô nhập ghi chú và gửi `onFlag`. Ảnh dùng `ImagePreview` (Task 9; trước mắt render tên tệp, thay ở Task 9). Chỉ hiện từ `waybill_issued`.

- [ ] **Step 3: `OrderDetailPage.tsx`**: bỏ khối nộp giấy và Carrier Info Sheet; thay bằng `ClearanceProgressCard`; thêm khối "Xe và ngựa" từ `customerBookingsApi.team` (mỗi xe: biển số, tài xế, escort, danh sách ngựa); khối thanh toán hiện cọc 30% đã trả, số dư 70%, nút "Thanh toán số dư" (gọi `payBalance`, chỉ bật ở `ready_for_pickup`/`en_route_to_pickup` khi chưa có `balance`); khối "Chính sách chi phí sự cố" dạng bấm để mở dùng `INCIDENT_COST_POLICY` (thẻ `<details>`); hành trình đọc từ `b.trips` và `b.route`; ảnh biên bản lấy từ mọi chuyến.
- [ ] **Step 4: `Step1RoutePage.tsx`/`Step4ReviewPage.tsx`/`draft.ts`**: bỏ ô tải Import Permit và trường `importPermit` khỏi `NewBookingInput`/draft. Sửa `OrdersPage.tsx`, `PortalPage.tsx`, `QuoteSheet.tsx` theo kiểu mới (`quote.balance`, bỏ `demurragePerHour`, hiện dòng "Đặt cọc 30%" và "Thanh toán 70% ngày D"; ghi chú "Báo giá cố định, không phụ thu ngoài phiếu").
- [ ] **Step 5: Kiểm** — `npx tsc -b 2>&1 | grep "apps/customer\|shared/ui"` → không còn lỗi trong các thư mục này.

---

### Task 6: Manager

**Files:**
- Modify: `manager/intake/IntakePage.tsx`, `manager/approvals/ApprovalsPage.tsx`, `manager/documents/DocumentsPage.tsx`
- Delete: `manager/manifests/ManifestsPage.tsx`; sửa `routes.tsx` (bỏ import và dòng `/manager/manifests`)
- Modify: `backoffice/shared/BookingParts.tsx`, `ManifestView.tsx`

- [ ] **Step 1: `IntakePage.tsx`**: nút "Tiếp nhận" gọi `bookingsApi.activate` rồi bắt lỗi từ `autoAssign`: hiển thị ô cảnh báo đỏ "Chưa gán được xe: {message}", đơn ở lại hàng đợi. Sau khi thành công hiện tóm tắt các xe vừa gán.
- [ ] **Step 2: `ApprovalsPage.tsx`**: bảng báo giá đọc `quoteDraft(id)` mới (nhiều xe), phần "Xe và nhân sự" liệt kê `b.trips`; thêm dòng cọc 30%/70%; bỏ phí lưu xe.
- [ ] **Step 3: `DocumentsPage.tsx`** (Theo dõi hồ sơ pháp lý): hiện đơn `waybill_issued`/`clearance_in_progress`/`clearance_done` với tiến độ `clearanceProgress`, cờ `isClearanceOverdue` (badge đỏ "Quá 18:00 D-1, chưa xong giấy"), cờ khách báo sai (`clearance.flags`). Xóa mọi tham chiếu `docsDueAt`/`clearance.docs`.
- [ ] **Step 4: `BookingParts.tsx`** (`ReviewChips`): chip "Xe & lộ trình" dùng `b.plan` thay `b.fleet`. `ManifestView.tsx`: nhận `{ b, trip }`, đổi tiêu đề thành "Lệnh điều xe" và "Mã chuyến"; danh sách ngựa của xe đó (`trip.horseIds`), bộ giấy Driver (`trip.driverPack?.items` + `manifestDocuments(b).system`).
- [ ] **Step 5: Kiểm** — `npx tsc -b 2>&1 | grep "backoffice/features/manager\|backoffice/shared"`.

---

### Task 7: Specialist

**Files:**
- Rewrite: `specialist/legal/LegalListPage.tsx`, `specialist/legal/LegalReviewPage.tsx` (giữ đường dẫn `/specialist/legal`, đổi tiêu đề trong `routes.tsx` thành "Giấy tờ chuyến đi" và "Làm giấy tờ một đơn")
- Check: `specialist/verification/*` chỉ dùng `b.fleet`/`reviewDone` → sửa theo `b.plan`

- [ ] **Step 1: `LegalListPage.tsx`**: liệt kê đơn `waybill_issued` + `clearance_in_progress` (thấy tiến độ `x/y`, cờ quá hạn, cờ khách báo sai).
- [ ] **Step 2: `LegalReviewPage.tsx`**: trang làm việc: nút "Tiếp nhận Vận đơn" (`acceptWaybill`) khi `waybill_issued`; danh sách `clearance.items`, mỗi hạng mục có chọn trạng thái (Chưa làm/Đang làm/Xong), ô ghi chú, nút "Chụp ảnh" dùng `CaptureField` (lưu tên tệp vào `photos`); nút "Thêm hạng mục" liệt kê giấy không base theo tuyến (`addClearanceItem`); tuyến quốc tế: danh sách ngựa kèm công tắc "Đã có giấy thông quan" (`markHorseCleared`); danh sách `flags` của khách; nút "Hoàn tất giấy tờ" (`completeClearance`) bị vô hiệu kèm lý do từ `canCompleteClearance`.
- [ ] **Step 3: `verification/*`**: đổi `b.fleet` → `b.plan`/`b.trips` nếu có. 
- [ ] **Step 4: Kiểm** — `npx tsc -b 2>&1 | grep "features/specialist"`.

---

### Task 8: Coordinator, Driver, Escort

**Files:**
- Rewrite: `coordinator/fleet-plan/FleetPlanPage.tsx` (xe + nhân sự + ngựa + lộ trình trong một trang), `FleetPlanListPage.tsx`
- Delete: `coordinator/routes/RouteListPage.tsx`, `RoutePlannerPage.tsx`, `coordinator/dispatch/DispatchListPage.tsx`, `DispatchPage.tsx` (+ dòng tương ứng trong `routes.tsx`); chuyển phần dựng lộ trình (`buildRoutePlan`, `validateRoutePlan`, bảng chặng) từ `RoutePlannerPage` vào `FleetPlanPage`
- Modify: `coordinator/fleet/FleetPage.tsx`, `coordinator/monitoring/MonitoringPage.tsx`
- Modify: `backoffice/shared/useFieldTrips.ts`, `field.tsx`, `driver/DriverPage.tsx`, `driver/DriverJob.tsx`, `escort/EscortPage.tsx`, `escort/EscortJob.tsx`

- [ ] **Step 1: `FleetPlanPage.tsx`**: tải `bookingsApi.get`, `vehiclesApi`, `crewApi`; hiển thị `b.trips` do hệ thống gán: mỗi xe một thẻ gồm chọn xe (chỉ xe còn rảnh theo `busyResources`), chọn Escort, danh sách ngựa với ô chuyển ngựa sang xe khác; nút "Gán lại tự động" (`assignPreview`); bảng lộ trình (chặng, trạm nghỉ, trạm thú y, ETA cửa khẩu) từ `buildRoutePlan(b, etd)` có chỉnh sửa như `RoutePlannerPage` cũ; ô ETD; lỗi `validateRoutePlan` hiện ngay; nút "Xác nhận phương án xe và lộ trình" gọi `confirmPlan`. Danh sách (`FleetPlanListPage`): đơn `under_review` chưa có `plan`.
- [ ] **Step 2: Bộ giấy cho Driver**: trong `FleetPlanPage` (hoặc trang theo dõi đơn đã cọc của Coordinator) thêm khung "Giấy tài xế mang theo" cho mỗi xe: danh sách ô tích mặc định từ `manifestDocuments(b).system`, lưu bằng `setDriverPack`. Hiển thị từ lúc `waybill_issued`. Đặt khung này ở trang `monitoring` mở rộng: thêm danh sách "Đơn đã cọc cần chuẩn bị" dẫn tới trang này.
- [ ] **Step 3: `FleetPage.tsx`**: mỗi xe hiện các ngựa đang chở (từ đơn đang `HOLDING` có `trips[].vehicleId === xe`): "Xe này chở: ngựa A, B (đơn …)"; chiều ngược lại ở chi tiết đơn đã có (`Xe và ngựa`).
- [ ] **Step 4: `MonitoringPage.tsx`**: giám sát theo từng chuyến (`b.trips`), mốc từ `t.run`, cờ `delayedCheckpoint(t, b.status)`.
- [ ] **Step 5: `useFieldTrips.ts`**: trả danh sách **chuyến của tôi** (không phải đơn): lọc `all.flatMap(b => (b.trips ?? []).map(t => ({ b, t })))` có `t[key] === me.id` và `b.status` thuộc `FIELD_STATUSES = ['waybill_issued', 'clearance_in_progress', 'clearance_done', 'ready_for_pickup', 'en_route_to_pickup', 'in_transit', 'delivered_pending_settlement']`; chọn theo `tripId`. Trả `{ b, t }`. `field.tsx`: `TripPicker`/`TripHeader` dùng `t.tripId`.
- [ ] **Step 6: `DriverPage/DriverJob`, `EscortPage/EscortJob`**: mọi lời gọi `bookingsApi.*` thêm `t.tripId`; nút "Nhận lệnh" → `acknowledgeTrip`; nút "Bắt đầu đến điểm đón" chỉ bật khi `clearance.doneAt` và đã nhận lệnh hai bên (hiện lý do khi khóa); nút "Bắt đầu hành trình" hiện lý do "Khách chưa thanh toán 70%" khi `!b.balance`; Driver thấy `t.driverPack.items` làm danh sách giấy mang theo; checklist bản gốc dùng `manifestDocuments(b).originals`; Escort đọc `t.run`. Hiển thị "Lệnh điều xe" thay "Manifest/Lệnh điều vận".
- [ ] **Step 7: Kiểm** — `npx tsc -b 2>&1 | grep "features/coordinator\|features/driver\|features/escort"`.

---

### Task 9: Dọn dẹp, kiểm toàn bộ, PRD

**Files:**
- Modify: `src/apps/backoffice/routes.tsx`, sitemap nếu liệt kê trang đã xóa
- Modify: `docs/PRD.md` (xóa dòng 14.8), `AGENTS.md` (mô tả luồng mới)

- [ ] **Step 1: Quét tham chiếu còn sót**

Run: `grep -rnE "\.fleet\b|\.manifest\b|clearance\.docs|contractSignedAt|demurragePerHour|Carrier Info|documentation_delayed|legal_docs_approved|trip_manifest_approved|dispatch_approved|route_planning|route_plan_completed|awaiting_clearance_docs|documents_submitted|pending_resubmission" src --include='*.ts' --include='*.tsx'`
Expected: chỉ còn các kết quả trong bộ dữ liệu cũ (`orders`, `trips`) hoặc không có gì. Sửa mọi chỗ khác.

- [ ] **Step 2: `npm run build`** → oxlint, tsc, vitest, vite build đều xanh. Sửa lỗi cho tới khi xanh.

- [ ] **Step 3: Chạy thử trên trình duyệt** (`npm run dev`, mở `/sitemap`): trọn luồng mới. Khách đặt đơn 6 ngựa (hoặc đơn mẫu `pending_intake`) → `manager@` tiếp nhận (thấy 2 xe tự gán) → `specialist@` duyệt hồ sơ ngựa và `ops@` chỉnh xe + lập lộ trình + xác nhận → `manager@` duyệt báo giá → khách đặt cọc 30% (thấy mã Vận đơn) → `specialist@` tiếp nhận và làm từng hạng mục, ghi nhận thông quan, hoàn tất → `ops@` nhập giấy cho từng tài xế → `driver@`/`escort@` nhận lệnh → khách trả 70% → xe đi đón, check-in, giao. Xem console không lỗi. Chụp trạng thái đơn ở từng bước đối chiếu bảng PRD mục 13.

- [ ] **Step 4: Đồng bộ tài liệu**: xóa mục 14.8 trong `docs/PRD.md`, đánh lại số mục sau; sửa đoạn mô tả luồng trong `AGENTS.md` ("Chạy thử trọn Flow 1→4", "Gotchas": trạng thái mới, `trips`, `autoAssign`, tài khoản mẫu) cho khớp.

- [ ] **Step 5: Báo kết quả** gồm: build xanh hay không, những gì chưa kiểm được, và nhắc phần UX (xem trước ảnh, đổi thuật ngữ, ẩn chữ dài) làm ở kế hoạch riêng.

---

## Tự rà soát

- **Phủ spec:** trạng thái (T1), `autoAssign` + báo giá + giấy tờ + suy trạng thái (T2), cọc 30%/Vận đơn/70%/chặn xuất bến/hủy (T3), mẫu và test dữ liệu (T4), trang khách (T5), Manager (T6), Specialist (T7), Coordinator/Driver/Escort (T8), PRD + build + chạy thử (T9). Policy sự cố: config (T1) + hiển thị cho khách (T5). Bỏ trang duyệt Manifest (T6). Không có việc nào của spec thiếu task.
- **Nhất quán tên:** `VehicleTrip`, `trips`, `plan`, `balance`, `waybill`, `tripIdFor`, `waybillNoOf`, `busyResources`, `deriveStatus`, `canCompleteClearance`, `acknowledgeTrip`, `confirmPlan` dùng đồng nhất ở T1–T8.
- **Ghi chú trung thực:** các bước UI (T5–T8) mô tả theo hành vi và danh tính hàm/prop vì nội dung từng trang phải đọc lại lúc làm; mỗi bước kết thúc bằng lệnh `tsc` lọc theo thư mục để chứng minh xong. Dữ liệu mẫu (T4) có bảng chuyển đổi nhưng cần đọc file khi làm.
