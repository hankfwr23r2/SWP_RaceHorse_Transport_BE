# Thiết kế lại luồng đặt đơn (03/10/2026)

Nghiệp vụ đầy đủ nằm ở `docs/PRD.md` (đã viết lại cùng ngày). File này chỉ liệt kê **phần code phải sửa**. Đã làm xong (code theo PRD); mục 14.8 của PRD đã xóa.

## Phạm vi

Phần 1 (nghiệp vụ lõi, gồm nhiều xe). Phần UX (xem trước ảnh, đổi thuật ngữ, ẩn chữ dài) làm sau, tách spec riêng.

## Thay đổi so với code hiện tại

| # | Nội dung | Từ | Thành |
|---|---|---|---|
| 1 | Giấy tờ | Khách nộp sau cọc, hạn 18:00 D-1 | Specialist làm và cập nhật tiến độ; khách chỉ xem, báo sai |
| 2 | Xe | `Booking.fleet` một xe | `Booking.vehicles[]`: `{vehicleId, driverId, escortId, horseIds[], tripId}` |
| 3 | Gán xe | Coordinator chọn tay | Hàm thuần `autoAssign` chạy khi Manager tiếp nhận; Coordinator sửa được |
| 4 | Lộ trình | Lập ở Flow 3 | Lập ở bước xác nhận xe (Flow 1), một lần cho cả đơn |
| 5 | Cọc | 50%, hợp đồng ký số | 30%, sinh mã Vận đơn, bỏ hợp đồng |
| 6 | Số dư | Sau chuyến | 70% ngày D; chặn Driver bấm "Bắt đầu hành trình" đến khi trả đủ |
| 7 | Báo giá | Nhiên liệu/BOT tính sau; có phí lưu xe, Carrier Info Sheet | Nhiên liệu/BOT ước tính theo km lộ trình +5%; lợi nhuận 5% gộp vào đơn giá; phí thủ tục kiểm dịch & hải quan; bỏ phí lưu xe |
| 8 | Chuyến | Một Lệnh điều xe và một `trip` cho đơn, Manager duyệt Lệnh điều xe | Mỗi xe một Lệnh điều xe, một `TripRun`; Lệnh điều xe tự phát khi khách cọc, **bỏ bước Manager duyệt** |
| 9 | Policy sự cố | Chưa có | Bảng hằng số trong config, hiện trong báo giá (bấm mở) |

## Trạng thái (`BookingStatus`)

Bỏ: `trip_manifest_approved`, `awaiting_clearance_docs`, `documents_submitted`, `pending_resubmission`, `documentation_delayed`, `legal_docs_approved`, `dispatch_approved`, `route_planning`, `route_plan_completed`.
Thêm: `waybill_issued`, `clearance_in_progress`, `clearance_done`.
Luồng: `pending_intake → under_review → pending_commercial → awaiting_payment → waybill_issued → clearance_in_progress → clearance_done → ready_for_pickup → en_route_to_pickup → in_transit → delivered_pending_settlement`.
Trạng thái đơn nhiều xe lấy từ các chuyến (xem PRD mục 13). Cập nhật `BOOKING_STATUS`, `stepOf`, `publicStepOf`, `HOLDING`, `BookingStatusBadge`, `nextStep.ts`, `QUOTED`, `ROUTE_SHOWN`, `applySystemRules`.

## Dữ liệu và quy tắc

- `types/booking.ts`: thay `Clearance` bằng danh sách hạng mục `{type, status: todo|doing|done, note, photos[], updatedAt, by}` kèm `customerFlags`; thêm `waybill {no, issuedAt}`, `balance {paidAt, amount}`, `driverPack` (giấy cho từng Driver), `customsCleared` theo ngựa; `manifest` và `trip` chuyển vào từng phần tử của `vehicles[]`; bỏ `Payment.contractSignedAt`.
- `config/booking-rules.ts`: `DEPOSIT_RATE = 0.3`; `FUEL_BUFFER_RATE = 0.05`; `MARGIN_RATE = 0.05`; đơn giá nhiên liệu và BOT theo km (số mẫu); phí thủ tục; `INCIDENT_COST_POLICY`; bỏ `DOCS_CUTOFF_HOUR` (chuyển thành ngưỡng cảnh báo nội bộ) và `demurragePerHour` khỏi báo giá.
- `lib/booking.ts`: `autoAssign(horses, fleet, staff, day)` (ít xe nhất, chia đều khi không có xe đủ chỗ, mỗi xe 01 Driver + 01 Escort, báo thiếu); `validateAssignment` dùng cho cả tự gán và sửa tay; cập nhật tính báo giá theo từng xe.
- `services/bookings.ts`: `acceptIntake` chạy `autoAssign`; `confirmFleetAndRoute` (Coordinator); `payDeposit` sinh Vận đơn; `updateClearanceItem`, `markHorseCustomsCleared`, `completeClearance` (Specialist); `payBalance` (khách, ngày D); chuyển trạng thái Flow 3 – 4 theo từng xe; chặn `startJourney` khi chưa trả đủ.

## Trang phải đổi

- **Customer:** chi tiết đơn (bỏ `ClearanceCard` nộp giấy, thay bằng tiến độ giấy tờ và danh sách xe/ngựa; nút trả 70% ngày D; xem bảng chính sách sự cố), báo giá, đặt đơn (bỏ tải Import Permit).
- **Specialist:** trang `legal` thành danh sách hạng mục giấy tờ và ghi nhận thông quan theo ngựa.
- **Coordinator:** `fleet-plan` gộp xe và lộ trình, hiện phương án tự gán để sửa; nhập bộ giấy cho Driver; `fleet` hiện xe chở ngựa nào.
- **Manager:** `intake`, `approvals`; bỏ trang duyệt `manifests`.
- **Driver / Escort:** chỉ thấy chuyến của xe mình; Driver bị chặn "Bắt đầu hành trình" khi chưa trả đủ.
- **Trang tra cứu công khai** ở trang chủ: bước gọn mới.

## Dữ liệu mẫu và kiểm thử

- Cập nhật `services/mock/bookings.ts` cho mọi trạng thái mới, gồm ít nhất một đơn nhiều xe; tăng `MOCK_VERSION`.
- Test: `autoAssign` (một xe, chia đều 6 → 3 + 3, thiếu xe, thiếu nhân sự, sức chứa theo hạng), báo giá (dự phòng, lợi nhuận, cọc 30%, số dư 70%), chặn `startJourney`, máy trạng thái mới, nhất quán dữ liệu mẫu, hoàn cọc theo cọc 30%.
- Chạy `npm run build` (oxlint, tsc, vitest, vite build) và chạy thử trọn luồng trên trình duyệt trước khi báo xong.

## Ngoài phạm vi

Flow 5 và 6 trong code (chỉ có văn bản và config policy); UX; backend.

## Còn mở (đã ghi ở PRD mục 14)

Cách xử lý ATA Carnet và Hóa đơn thương mại; đơn giá nhiên liệu và BOT theo km; phí thủ tục.
