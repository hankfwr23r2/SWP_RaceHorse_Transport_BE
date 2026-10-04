# Flow 5 (sự cố) và Flow 6 (quyết toán, đóng đơn) — phần code phải làm

Nghiệp vụ gốc ở `docs/PRD.md` mục 6, 7, 8.2, 11.5, 13. File này chỉ chốt **phạm vi code** và các quyết định.

## Phạm vi

**Flow 5.** Driver hoặc Escort báo SOS cho một xe đang chạy (3 nhóm: sức khỏe ngựa, hỏng phương tiện, tắc cửa khẩu) → Coordinator lập phương án (kèm ETA mới, hạn mức tài chính đề nghị) → Manager duyệt (đặt hạn mức khẩn cấp, xác nhận đã gọi khách) hoặc trả về → khi đang xử lý, Driver và Escort tải chi phí có chứng từ (ảnh trước, mở khóa số tiền sau) → Escort xác nhận ngựa đủ sức (sự cố sức khỏe) → Driver bấm Tiếp tục hành trình chính.

**Flow 6.** Giao xong → Driver gửi bảng kê chi phí (không có chi phí thì hệ thống tự phát hành bảng quyết toán 0 đồng) → Manager đối soát, chọn bên chịu từng khoản theo chính sách 11.5, phát hành Bảng quyết toán → khách xem chứng từ, trả (nếu có), chấm điểm → đóng đơn, cộng số chuyến vào hồ sơ ngựa, nhả xe và nhân sự. Quá 24 giờ chưa trả: `Payment Overdue`, khóa đặt đơn mới.

**Ngoài phạm vi (ghi ở PRD mục 14):** hủy chuyến bất khả kháng khi xe hỏng hoàn toàn (6.5.3), người nhận từ chối (8.1), nhật ký sự cố nhiều lần cho một xe cùng lúc (mỗi xe tối đa 1 sự cố mở), thu hồi hồ sơ gửi Pháp lý sau 7 ngày (8.2), khóa xem hồ sơ ngựa chỉ làm ở mức chặn đặt đơn mới.

## Trạng thái đơn

Thêm: `incident_reported`, `pending_emergency_approval`, `emergency_plan_active` (suy từ các sự cố mở của các xe, ưu tiên theo thứ tự đó), `expenses_submitted`, `settlement_issued`, `payment_overdue`, `completed` (gộp `Fully Paid`, `Order Completed`, `Archived / Completed`: chuyển tức thì khi khách trả và chấm điểm).

## Dữ liệu (`types/booking.ts`)

- `Booking.incidents?: Incident[]` — mỗi sự cố thuộc một `tripId`; có `kind`, `status` (`reported | pending_approval | active | resolved`), ảnh và ghi chú lúc báo, `plan`, `rejection`, `approval` (hạn mức đã duyệt, xác nhận đã gọi khách), `fitConfirmedAt` (Escort), `expenses: IncidentExpense[]`.
- `IncidentExpense`: danh mục, ảnh chứng từ (bắt buộc), số tiền, bên chịu (mặc định theo chính sách, Manager sửa được lúc đối soát).
- `Booking.settlement?` — các dòng chi phí khách chịu, tổng, hạn trả (24 giờ), đã trả lúc.
- `Booking.rating?` — chấm điểm chuyến, tài xế, hộ tống (1–5) và nhận xét.

## Quy tắc (`lib/booking.ts`, có test)

- Bên chịu mặc định: thú y và thuốc → khách; chuồng đệm → khách (trừ sự cố tắc cửa khẩu → nhà xe); cứu hộ, sửa xe → nhà xe; khác → nhà xe (Manager quyết).
- `deriveStatus` thêm các trạng thái sự cố; `orderGroupOf` thêm nhóm **Chờ quyết toán**.
- Phương án hợp lệ theo nhóm sự cố: sức khỏe ngựa → đưa vào trạm thú y; hỏng phương tiện → sửa tại chỗ hoặc xe cứu hộ; tắc cửa khẩu → đưa về Holding Stable chờ.

## Giao diện

- **Driver / Escort:** nút SOS, thẻ sự cố (trạng thái, phương án), form chi phí (ảnh trước), nút xác nhận đủ sức (Escort), Tiếp tục hành trình, bảng kê chi phí sau giao.
- **Coordinator:** trang Xử lý sự cố mới (thay trang cũ), lập phương án.
- **Manager:** trang Sự cố & Chi phí mới (thay trang cũ): duyệt / trả về phương án, đối soát chi phí, phát hành quyết toán.
- **Khách:** thông báo sự cố và bảng quyết toán trong chi tiết đơn, trả và chấm điểm; thay trang Nghiệm thu cũ (xóa); nhóm Chờ quyết toán ở Đơn của tôi.
- **Thông báo đẩy** cho mọi sự việc mới (SOS, phương án, duyệt, tiếp tục, quyết toán, quá hạn, hoàn tất).
