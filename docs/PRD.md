# PRD — Hệ thống Vận chuyển Ngựa đua (EquineZ Logistics)

> Tài liệu nghiệp vụ gốc. Code phải khớp tài liệu này; chỗ nào lệch thì ghi vào mục 11.
> Cập nhật lần cuối: 26/09/2026.

## 1. Phạm vi

- **Tự vận hành toàn bộ, không thuê ngoài, không hợp tác nhà xe khác.** Công ty có xe, tài xế, nhân viên chăm sóc (hộ tống) và trạm trung chuyển riêng. Mọi chi phí chuyến đi (nhiên liệu, lương, khấu hao, vận hành trạm) đều là chi phí nội bộ.
- **Chỉ vận chuyển đường bộ** bằng xe tải chuyên dụng chở ngựa.
- **Không làm hàng không, không đường biển.** Mọi nội dung về máy bay, sân bay, Air Cargo, IATA là dữ liệu cũ, cần xóa.
- **3 nước:** Việt Nam (VN), Campuchia (KH), Lào (LA).
- **Nội địa** = đi và đến đều trong VN. **Xuyên biên giới** = có qua cửa khẩu.

### Cửa khẩu đang dùng

| Tuyến | Cửa khẩu (phía VN – phía bạn) |
|---|---|
| VN ↔ KH | Mộc Bài (Tây Ninh) – Bavet (Svay Rieng) |
| VN ↔ KH | Tịnh Biên – Phnom Den |
| VN ↔ LA | Tây Trang – Sop Hun |
| VN ↔ LA | Cầu Treo – Nam Phao |
| VN ↔ LA | Lao Bảo – Densavanh |

Nguồn: `GATES` trong `home.js`. Trang tra cước tự chọn cửa khẩu cho quãng đường ngắn nhất.

### Trạm trung chuyển (trạm của công ty, dùng để nghỉ đêm trên tuyến dài)

Trong dữ liệu mẫu hiện có: Vinh (Nghệ An), Quy Nhơn (Bình Định), Tuy Hòa (Phú Yên), Điện Biên. Chưa có danh mục trạm chính thức trong code.

### Điểm đi / điểm đến (`CUS/create_request.js` → `COUNTRY_LOCATIONS`)

- VN: Kho Đồng Nai (Long Thành), Kho Long An (Đức Hòa), Kho Bình Dương, CLB Cưỡi ngựa Sài Gòn
- KH: Kho Phnom Penh, Kho Siem Reap, CLB Cưỡi ngựa Hoàng gia Phnom Penh
- LA: Kho Viêng Chăn, CLB Mã cầu & Cưỡi ngựa Viêng Chăn

## 2. Vai trò

| Vai trò | Thư mục | Việc chính |
|---|---|---|
| Khách hàng | `CUS/` | Đặt đơn, nộp giấy tờ, chọn phương án, thanh toán, theo dõi, nghiệm thu |
| Manager | `Manager/` | Tiếp nhận, duyệt đơn, **người duy nhất được từ chối đơn**, duyệt sự cố & chi phí, điều chuyển nhân sự |
| Kiểm dịch viên | `Specialist/` | Xác minh giấy tờ, làm thủ tục với cơ quan chức năng, bàn giao giấy cho Điều phối |
| Điều phối viên | `Fleet And Route/` (OPS-03..08) | Khảo sát khả thi, lập lộ trình, chọn xe, giám sát chuyến, xử lý sự cố |
| Tài xế | `Driver/` | Chạy xe theo mốc, xác nhận từng mốc |
| Hộ tống | `Escort/` | Chăm sóc ngựa dọc đường, ghi báo cáo sức khỏe |

Đăng nhập nội bộ: `Staffs/staff_login.html` → chuyển trang theo vai trò (`roleMap` trong `staff_login.js`).

## 3. Luồng chính

D = ngày khởi hành. "Ngày làm việc" = T2–T6, 08:00–17:00, trừ ngày lễ (`HOLIDAYS`).

1. **Khách đặt đơn** qua 4 bước: tuyến đường → thông tin ngựa → hồ sơ y tế → xác nhận. Ngày khởi hành phải cách ngày đặt ít nhất **10 ngày** (`MIN_LEAD_DAYS`). Chỗ xe được giữ tạm ngay khi đặt.
2. **Manager tiếp nhận** (`manager_tiep_nhan`): xác nhận Kiểm dịch viên và Điều phối viên mà hệ thống gợi ý (ai ít đơn nhất, không đang nghỉ), có thể đổi người. Manager cũng có thể từ chối sớm dựa trên thông tin khách khai (trùng đơn, không phải ngựa đua, khai mâu thuẫn).
3. **Kiểm dịch viên xác minh giấy tờ** (`kiem_dich`), làm tay từng giấy. Có 3 kết luận:
   - Hợp lệ (mọi giấy của mọi ngựa đều đạt) → chuyển Điều phối.
   - Yêu cầu khách bổ sung (lỗi sửa được) → đồng hồ hạn xử lý tạm dừng trong lúc chờ khách.
   - Báo cáo vấn đề không khắc phục được → chuyển Manager (xem mục 5).
4. **Điều phối viên khảo sát và lập lộ trình** (OPS-03 → OPS-05): chia chặng, chọn xe cho từng chặng. Tài xế đi theo xe (mỗi xe một tài xế cố định). Hộ tống được tự gán cho người đang phụ trách ít chặng nhất; có thể đổi tay ở OPS-08.
   - Khảo sát không khả thi (bắt buộc ghi lý do) → đơn trả về Manager ở trang Phê duyệt; Manager từ chối đơn.
   - Chốt lộ trình khi mọi chặng đã có xe → đơn chuyển Manager duyệt, kèm xe / tài xế / hộ tống.
5. **Manager duyệt đơn** (`manager_phe_duyet`) → khách nhận yêu cầu thanh toán.
6. **Khách thanh toán 100%** trước hạn (xem mục 4). Quá hạn thì đơn tự hủy và chỗ xe được nhả.
7. **Chuẩn bị giấy tờ** (`thu_tuc`):
   - Khách gửi **bản gốc** giấy tờ trước 17:00 D−3.
   - Kiểm dịch viên xin giấy của cơ quan chức năng (làm ngoài hệ thống), sau đó nhập số giấy, cơ quan cấp, hiệu lực và bản scan.
   - Kiểm dịch viên bàn giao cho Điều phối trước 12:00 D−2. Giấy có thời hạn phải còn hiệu lực đến hết ngày giao dự kiến.
8. **Vận chuyển:**
   - Điều phối xác nhận khởi hành (OPS-08) khi mọi chặng đủ xe, tài xế, hộ tống và khách đã thanh toán. Khách thấy hành trình ngay.
   - Tài xế xác nhận từng mốc. Mốc cuối (giao ngựa) → đơn Đã giao, bắt đầu 24 giờ nghiệm thu.
   - Hộ tống ghi báo cáo sức khỏe: thân nhiệt, nhịp tim, tình trạng (Bình thường / Mệt nhẹ / Mắc bệnh). Số đo sớm nhất và mới nhất dùng làm chỉ số lúc nhận / lúc giao trên biên bản nghiệm thu.
   - Hộ tống báo tình trạng nặng (Mắc bệnh, Căng thẳng nặng, Qua đời) → hệ thống tự tạo sự cố khẩn cấp "Y tế ngựa" cho Điều phối.
   - Điều phối giám sát ở OPS-06.
   - Khi có sự cố, Điều phối ghi nhận ở OPS-04 và đề xuất cách xử lý; Manager duyệt ở `manager_duyet_su_co`.
9. **Nghiệm thu** (`CUS/acceptance`):
   - Khách có **24 giờ** để xác nhận hoặc báo vấn đề. Không phản hồi thì hệ thống tự nghiệm thu, đơn chuyển sang Hoàn thành.
   - Nếu khách báo vấn đề: tạm dừng tự nghiệm thu, Manager liên hệ khách trong **4 giờ**.
10. **Manager xem báo cáo chuyến** (`manager_trip_reports`).

## 4. Thời hạn (SLA)

| Việc | Hạn = mốc SỚM HƠN của | Hằng số |
|---|---|---|
| Thẩm định (cam kết với khách) | 17:00 ngày làm việc thứ 5 sau ngày gửi đơn · 17:00 D−4 | `APPRAISAL_WORKING_DAYS`, `APPRAISAL_CAP_DAYS` |
| Kiểm dịch xác minh | 2 ngày làm việc · D−7 | `SLA_WORKING_DAYS.inspector`, `CAP_DAYS.inspector` |
| Lập lộ trình | 2 ngày làm việc · D−5 | `SLA_WORKING_DAYS.coordinator`, `CAP_DAYS.coordinator` |
| Thanh toán | Lúc duyệt + 48 giờ · 17:00 D−2 | `PAYMENT_HOURS`, `PAYMENT_CAP_DAYS` |
| Khách chọn phương án | 48 giờ | `CHOICE_HOURS` |
| Khách gửi bản gốc giấy tờ | 17:00 D−3 | `ORIGINALS_DUE_DAYS` |
| Bàn giao giấy cho Điều phối | 12:00 D−2 | — |
| Nghiệm thu | 24 giờ sau khi giao | `ACCEPTANCE_HOURS` |

Nếu mốc theo D rơi vào ngày nghỉ thì lùi về ngày làm việc liền trước.

## 5. Ngoại lệ

- **Hồ sơ có vấn đề không khắc phục được:** Manager gửi các phương án, khách chọn trong 48 giờ.
  - **A.** Bỏ ngựa có vấn đề, báo giá lại (chỉ khi còn ít nhất 1 ngựa không bị ảnh hưởng). Giá mới: **giữ nguyên cước xe** (cước tính theo xe, không theo ngăn); các dòng còn lại (kiểm dịch, chăm sóc, bảo hiểm…) nhân theo tỷ lệ số ngựa còn lại / số ngựa ban đầu, làm tròn đến nghìn đồng. Hệ thống tự tính khi Manager gửi phương án (`requoteWithout` trong `web/src/shared/lib/pricing.ts`).
  - **B.** Thay ngựa khác
  - **C.** Dời ngày khởi hành (chỉ khi bệnh chữa được)
  - **D.** Kiểm tra lại, tối đa 1 lần, do một kiểm dịch viên KHÁC làm lại từ đầu
  - **E.** Hủy đơn miễn phí (luôn có)
  - Khách không chọn trong 48 giờ → Manager quyết định, có thể từ chối đơn.
- **Công ty trễ hạn thẩm định:** giữ chỗ xe, KHÔNG đổi ngày khởi hành. Đơn chuyển sang "Ưu tiên" và Manager xử lý trực tiếp; hạn mới là 17:00 ngày làm việc kế tiếp. Khách vẫn được hủy miễn phí.
- **Tự động chuyển người** (khi nhân viên trễ hạn hoặc đang nghỉ): chuyển cho người cùng vai trò, chưa từng làm đơn này, ít việc nhất. Nếu không còn ai hoặc đã qua mốc theo D thì Manager xử lý theo thứ tự: gia hạn đặc biệt → đề nghị khách dời ngày → từ chối.
- **Kiểm dịch viên không bao giờ từ chối đơn.** Mọi vấn đề đều báo lên Manager. Đơn bị từ chối phải ghi rõ bị từ chối ở bước nào.

## 6. Giấy tờ

**Khách nộp khi đặt đơn:**
- Nội địa: Hộ chiếu ngựa / Microchip · Giấy chứng nhận tiêm phòng · Giấy tờ chứng minh sở hữu
- Xuyên biên giới: 3 loại trên + Kết quả xét nghiệm EIA & cúm ngựa + Giấy phép nhập khẩu của nước đến

**Kiểm dịch viên xin sau khi khách thanh toán:**
- Nội địa: Giấy chứng nhận kiểm dịch động vật vận chuyển ra khỏi tỉnh
- Xuyên biên giới: Giấy chứng nhận kiểm dịch xuất/nhập khẩu + Tờ khai hải quan cửa khẩu

## 7. Giá & thanh toán

- **Các dòng trên báo giá:** vận chuyển đường bộ (theo loại xe, số ngăn, km) · kiểm dịch & thủ tục · chăm sóc dọc đường · bảo hiểm (Cơ bản 2% / Nâng cao 3,5% / Toàn diện 5% trên giá trị khai báo) · khoang VIP (tùy chọn) · cách ly (tùy chọn).
- **Thanh toán 100%** trước chuyến, chuyển khoản Vietcombank. Nghiệm thu không phát sinh thanh toán thêm.
- **Hoàn tiền:**

| Trường hợp | Hoàn |
|---|---|
| Công ty hủy chuyến | 100% |
| Ngựa không đạt kiểm tra sức khỏe tại chỗ ngày lấy ngựa | 100% trừ phí kiểm dịch đã phát sinh |
| Khách hủy ≥ 7 ngày trước D | 90% |
| Khách hủy 3–6 ngày trước D | 50% |
| Khách hủy < 3 ngày trước D | Không hoàn |

- **Giá biến động theo thị trường:** nhiên liệu (lớn nhất), tỷ giá (phí phát sinh ở KH/LA), phí cầu đường BOT, phí bảo hiểm, VAT. Cách xử lý phụ phí nhiên liệu: **chưa chốt**, xem mục 12.

## 8. Trạng thái

**Đơn phía khách** (`CUS/don_cua_toi.js`): `processing` → (`choose_option` → `rechecking`) → `awaiting_payment` → `paid` → `in_transit` → `delivered` → `completed`. Nhánh kết thúc sớm: `rejected`, `cancelled`.
Khách chỉ thấy 5 bước: Gửi đơn · Chờ thẩm định · Thanh toán · Vận chuyển · Nghiệm thu.

**Chuyến phía Điều hành** (`Fleet And Route/ops_data.js`): `pending_assessment` → `awaiting_routing` → `assigned` → `in_transit` → `done`. Nếu không khả thi: `rejected_assessment`, trả về Manager.
**Sự cố:** `open` → `proposed` (chờ Manager duyệt).

## 9. Mã định danh

`EQ-YYYY-NNNN` đơn hàng · `TR-xxxx` chuyến (nội bộ OPS, nối sang đơn qua `orderId`) · `VH-xxx` xe · `TX-xx` tài xế · `NV-xx` hộ tống · `INC-xxx` sự cố.

## 10. Kỹ thuật (tóm tắt, chi tiết ở `AGENTS.md`)

Prototype HTML/CSS/JS tĩnh, không có backend. Dữ liệu mẫu nằm trong các hằng JS; wizard đặt đơn lưu tạm ở `sessionStorage`. Hằng số thời hạn đang được lặp lại ở nhiều file (`don_cua_toi.js`, `manager_tiep_nhan.js`, `manager_phan_cong.js`, `kiem_dich.js`, `thu_tuc.js`): khi sửa một chỗ thì phải sửa đồng bộ các chỗ còn lại.

**Đã chuyển sang React + TypeScript** trong thư mục `web/` (nhánh `refactor/khiet/code-structure`):
- Có 2 app: `customer` (URL `/`) và `backoffice` (URL `/backoffice`).
- Hằng số nghiệp vụ gom về `web/src/shared/config/`, hàm tính hạn, tính giá, chia chặng ở `web/src/shared/lib/` (có test đối chiếu với code cũ).
- Đã chuyển xong cả 33 trang: 12 trang khách, 8 trang Manager (gồm đăng nhập nội bộ), 4 trang Kiểm dịch, 7 trang Điều phối, Tài xế, Hộ tống. Bản HTML cũ giữ lại để đối chiếu.
- Dữ liệu mẫu gộp về một kho dùng chung: đơn (`mock/orders*.ts`), nhân sự xử lý đơn, sự cố, lịch sử chuyến, chuyến của Điều phối (`mock/trips.ts`, mã TR nối sang đơn qua `orderId`), đội xe và người đi theo chuyến (`mock/fleet.ts`). Thao tác của vai trò này thì vai trò khác thấy ngay, ví dụ Tài xế check-in mốc giao ngựa thì khách thấy trang Nghiệm thu.
- Mã đơn trùng nhau giữa các trang cũ được đánh số lại: 1076–1080 (Manager, Điều phối), 1081–1083 (giấy tờ chuyến đi của Kiểm dịch, gốc 1060, 1057, 1055).

## 11. Code đang lệch với PRD (cần sửa)

1. **Tiền cọc:** `CUS/bao_gia.html` và `CUS/create_request.js` (`depositCost`) ghi cọc 50%, trái với quy tắc thanh toán 100%. Trong `bao_gia.html`, số "dư quyết toán" cũng không khớp với số tiền cọc.
2. **Cách tính giá:** `recalculateStep4Quotation` (`CUS/create_request.js`) và mẫu `CUS/bao_gia.html` dùng giá cố định 25 triệu/ngựa (nội địa) và 120 triệu/ngựa (quốc tế). Mức 120 triệu còn sót từ thời làm hàng không. Dữ liệu đơn thật trong `don_cua_toi.js` lại tính theo xe và km (ví dụ 65 km = 4,2 triệu). Chưa có công thức thống nhất.
3. **Chữ trên trang Cổng khách hàng (`CUS/home_auth.html`) trái quy tắc:** ghi "thẩm định hồ sơ < 24h" và "báo giá trong vòng 24h" (quy tắc: 5 ngày làm việc); ghi "hủy trước 72 giờ để hoàn 100% phí cọc" (quy tắc: bảng hoàn tiền ở mục 7).
4. **Tuyến KH↔LA:** trang chủ (`home.js`) chặn tuyến không đi qua VN, còn trang đặt chuyến (`create_request.js`) vẫn cho chọn.
5. **Nút gửi ở bước 4 đặt chuyến** của bản HTML chuyển sang trang Nghiệm thu. Bản React chuyển về "Đơn của tôi" cho khớp luồng ở mục 3.
6. **Khách chưa có chỗ nộp lại giấy tờ khi được yêu cầu bổ sung:** Kiểm dịch gửi yêu cầu thì đơn nằm ở "Chờ khách bổ sung", nhưng trang khách (cả bản cũ) không có nút nộp lại, nên đơn không tự quay về Kiểm dịch được.
7. **Báo cáo giấy tờ chuyến đi chưa có bước Manager xử lý:** Kiểm dịch báo cáo (khách chưa gửi bản gốc, cơ quan chậm cấp giấy…) thì Manager chỉ xem được ở trang Phê duyệt, chưa có thao tác quyết định.
8. **Tình trạng sức khỏe hộ tống ghi:** code (cả bản cũ) có 6 lựa chọn: Bình thường, Mệt nhẹ, Mắc bệnh, Căng thẳng nặng, Qua đời, Khác. Mục 3 chỉ ghi 3.

## 12. Câu hỏi mở (chưa chốt)

1. **Phụ phí nhiên liệu:**
   - (1) Tách thành dòng riêng, tính % trên cước, chốt % khi khách chấp nhận báo giá
   - (2) Như (1), thêm điều khoản điều chỉnh nếu giá dầu lệch quá ±10%
   - (3) Giá trọn gói có cộng sẵn khoản dự phòng
2. **Tuyến ngoài VN:** có nhận nội địa KH→KH, LA→LA và tuyến KH↔LA không? Code hiện cho phép chọn các tuyến này và xếp tất cả vào loại "quốc tế".
3. **Công thức giá chuẩn:** tính theo km, theo loại xe, hay theo bảng tuyến cố định?
4. **Khởi hành khi Điều phối chưa nhận giấy tờ:** trang Phân công hiện đang chỉ cảnh báo "Chưa nhận giấy tờ từ kiểm dịch viên", vẫn cho khởi hành nếu khách đã thanh toán. Có chặn khởi hành cho tới khi Kiểm dịch bàn giao giấy không?
