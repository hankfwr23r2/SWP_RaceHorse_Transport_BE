# PRD — Hệ thống Vận chuyển Ngựa đua

> Tài liệu nghiệp vụ gốc. Nội dung lấy từ bộ quy trình do chủ dự án chốt (Flow 1–6, quy định hồ sơ, hạng xe, gói cước). Quy trình đặt trước tiên; các mục sau (hạng xe, gói cước, giấy tờ) phải tuân thủ quy trình.
> Cập nhật lần cuối: 02/10/2026.

## Mục lục

1. Tổng quan quy trình, vai trò và nguyên tắc
2. Flow 1 — Tạo & phê duyệt đơn hàng
3. Flow 2 — Quản lý hồ sơ pháp lý & kiểm dịch thông quan
4. Flow 3 — Lập kế hoạch lộ trình & điều phối phương tiện
5. Flow 4 — Cập nhật trạng thái & nhật ký lộ trình
6. Flow 5 — Xử lý sự cố & điều chỉnh khẩn cấp
7. Flow 6 — Bàn giao, nghiệm thu & quyết toán
8. Ngoại lệ: người nhận từ chối, khách chậm thanh toán, khách hủy đơn
9. Mô hình Carrier-Only và Gói hỗ trợ thông tin phương tiện
10. Hạng xe
11. Gói cước & biểu phí
12. Hồ sơ, giấy tờ & SOP check-in
13. Trạng thái đơn hàng
14. Điểm cần chốt

---

## 1. Tổng quan quy trình, vai trò và nguyên tắc

### 1.1. Phạm vi

- Vận chuyển **ngựa đua đường bộ**, bằng phương tiện chuyên dụng chở ngựa.
- Hai loại tuyến: **Nội địa** và **Quốc tế liên vận CLV** (Việt Nam ⇄ Campuchia ⇄ Lào).

### 1.2. Chuỗi quy trình

```
Flow 1  Tạo & phê duyệt đơn   → báo giá được duyệt, khách thanh toán cọc, hệ thống cấp Carrier Info Sheet
Flow 2  Hồ sơ pháp lý         → khách nộp giấy cần thông tin xe trước 18:00 D-1, Specialist duyệt, Coordinator ra lệnh xuất bến
Flow 3  Lộ trình & điều phối  → Trip Manifest được Manager duyệt, đẩy xuống app Driver/Escort
Flow 4  Nhật ký lộ trình      → check-in từng mốc có ảnh, nhật ký an sinh, thông quan, giao ngựa
Flow 5  Sự cố khẩn cấp        → SOS, phương án xử lý, Manager duyệt, tiếp tục hành trình
Flow 6  Bàn giao & quyết toán → chi phí thực tế có chứng từ, quyết toán, thanh toán số dư, đóng đơn
```

D = ngày khởi hành.

### 1.3. Vai trò

| Vai trò | Việc chính |
|---|---|
| Khách hàng (Customer) | Khai Hồ sơ ngựa, đặt đơn, thanh toán cọc, tự làm thủ tục với cơ quan chức năng và tải hồ sơ lên, giao bản gốc cho tài xế, thanh toán số dư, đánh giá |
| Logistics Manager | Tiếp nhận đơn, duyệt báo giá, duyệt Trip Manifest, duyệt phương án khẩn cấp và ngân sách khẩn cấp, **người duy nhất liên hệ làm việc với Khách hàng khi có sự cố**, duyệt phát hành quyết toán, giám sát và xử lý ngoại lệ |
| Transport Specialist (Kiểm dịch viên) | **Người gác cổng duy nhất** về tính hợp lệ của hồ sơ thú y, kiểm dịch và hải quan. Thẩm định y tế ở Flow 1. Không can thiệp thao tác sơ cứu lâm sàng |
| Fleet & Route Coordinator (Điều phối viên) | Gán xe, 01 Driver, 01 Escort; lập lộ trình; ra Lệnh xuất bến; giám sát chuyến; lập phương án sự cố. **Không** tham gia duyệt hồ sơ giấy tờ |
| Driver (Tài xế) | Lái xe, check-in từng mốc có ảnh chụp trực tiếp, thu và trả bản gốc chứng từ, ký biên bản giao nhận, kê khai chi phí có chứng từ, báo sự cố |
| Escort (Nhân viên chăm sóc) | **Người duy nhất** khám lâm sàng, sơ cứu và xử lý sức khỏe ngựa tại hiện trường; quét microchip; ghi nhật ký an sinh |

### 1.4. Nguyên tắc vận hành bắt buộc

1. **Charter độc quyền:** 01 Đơn = 01 xe chuyên dụng nguyên chuyến. Không ghép chuyến (bảo đảm an toàn sinh học).
2. **Định biên cứng:** mỗi chuyến đúng **01 Driver + 01 Escort**.
3. **Lead time 30 ngày:** khách đặt trước ngày khởi hành tối thiểu 30 ngày (phục vụ cách ly, xét nghiệm dịch tễ, đăng ký liên vận).
4. **Carrier-Only:** công ty chỉ vận chuyển. Khách tự chuẩn bị hồ sơ pháp lý, kiểm dịch và tự khai báo với cơ quan chức năng (xem mục 9).
5. **Hạch toán nhiên liệu và BOT:** không tính trước trong báo giá. Chi phí thực tế được quyết toán sau chuyến theo chứng từ (Evidence-First).
6. **Biển số cố định:** không điều xe thay thế giữa chặng, để giữ tính pháp lý của Giấy kiểm dịch và Tờ khai hải quan do khách nộp.
7. **Cửa khẩu cố định (Fixed Border Policy):** phương tiện không tự ý đổi sang cửa khẩu khác.
8. **Hai thời điểm nộp hồ sơ điện tử:** giấy **không cần thông tin của hệ thống** khách nộp ngay lúc tạo đơn; giấy **cần thông tin của hệ thống** (biển số xe, tài xế, cửa khẩu…) khách nộp **sau khi đã thanh toán cọc**, trước **18:00 ngày D-1** (xem mục 12.3). **Bản gốc** được đối soát và thu tại điểm đón trước khi xe xuất phát.
9. **Chuyên môn thú y:** chỉ Escort khám lâm sàng và sơ cứu tại hiện trường.
10. **Thẩm quyền:** chỉ Logistics Manager duyệt thay đổi phương án di chuyển, ngân sách khẩn cấp và trực tiếp làm việc với khách khi có sự cố.
11. **Xe cứu hộ (Rescue Van)** trong tuyến quốc tế chỉ là phương tiện trung chuyển khẩn cấp đến Holding Stable / phòng khám thú y, không phải xe thay thế để chạy tiếp qua biên giới.
12. **Evidence-First:** chưa có ảnh chứng từ hợp lệ thì ô nhập số tiền bị khóa.

---

## 2. Flow 1 — Tạo & phê duyệt đơn hàng

```
[Khách hàng]                 [Manager]                    [Specialist & Coordinator]
     |-- 1. Tạo đơn từ kho ngựa -->|
     |                             |-- 2. Tự động gán nhân sự -->|
     |                             |                             |-- 3. Thẩm định song song
     |                             |<-- Hoàn tất thẩm định ------|
     |<-- 4. Báo giá đã duyệt -----|
     |-- 5. Thanh toán cọc ------> (hệ thống cấp Carrier Info Sheet)
```

### 2.1. Kho Hồ sơ ngựa (Horse Profile Repository)

Trang "Hồ sơ ngựa" trên Cổng khách hàng. Khách khai báo một lần; các lần đặt sau chỉ cần tích chọn.

**Thông tin định danh cố định:** Tên ngựa, **Mã microchip** (định danh bắt buộc, **không thể chỉnh sửa sau khi lưu**), Giống, Giới tính (Đực / Cái / Thiến), Màu lông, Năm sinh, Đặc điểm nhận dạng.

**Hồ sơ dịch tễ & pháp lý đính kèm:** bản scan Hộ chiếu ngựa (FEI / National Passport); Sổ tiêm phòng / Phiếu xét nghiệm máu (Coggins/EIA âm tính).

**Trạng thái hiển thị cá thể:**

| Trạng thái | Ý nghĩa |
|---|---|
| Sẵn sàng đặt | Đủ Hộ chiếu và Sổ tiêm phòng hợp lệ; chọn được ngay khi tạo đơn |
| Thiếu giấy | Chưa đủ giấy hoặc giấy hết hạn; hệ thống tạm khóa, khách bấm "Sửa" để cập nhật trước khi đặt chuyến |

### 2.2. Bước 1 — Khách tạo đơn từ kho hồ sơ

- **Khóa lịch tự động (Lead Time Validation):** vô hiệu hóa mọi ngày trong vòng 30 ngày kể từ ngày hiện tại. Ngày khởi hành ≥ ngày hiện tại + 30 ngày.
- **Tuyến đường & chủ thể:**
  - Phân loại tuyến: Nội địa hoặc Quốc tế liên vận CLV.
  - Người gửi (Consignor) và Người nhận (Consignee): tên, SĐT, CCCD/MST/Hộ chiếu, địa chỉ chi tiết.
  - Hành trình: Điểm bốc → Điểm trả. Tuyến quốc tế chọn thêm **cửa khẩu xuất/nhập mong muốn**.
- **Chọn ngựa (Horse Selector):**
  - Chỉ tích chọn được cá thể ở trạng thái Sẵn sàng đặt.
  - Cá thể Thiếu giấy: bấm "Sửa" để tải bổ sung Hộ chiếu hoặc Sổ tiêm / phiếu xét nghiệm mới; dữ liệu cập nhật đè vào kho.
  - Bấm "+ Thêm ngựa" để khai nhanh cá thể mới qua popup ngay trong lúc tạo đơn.
- **Tải giấy không cần thông tin của hệ thống:** các giấy khách tự có sẵn, không phụ thuộc biển số xe, tài xế hay cửa khẩu do hệ thống gán, được tải ngay lúc tạo đơn (danh sách ở mục 12.3).
- **Cấu hình dịch vụ & bảo hiểm theo từng cá thể:**
  - Khoang tiêu chuẩn hoặc Khoang đơn mở rộng (Single Stall).
  - Chế độ dinh dưỡng, cữ nước, nhiệt độ điều hòa riêng (nếu có).
  - Bảo hiểm Động vật Sống (Live Animal Transit Insurance), chọn cho từng cá thể:
    - **MUA BẢO HIỂM:** khách không tự nhập giá trị. Hệ thống tính phí theo giống ngựa (mỗi giống có giá trị bảo hiểm cố định, phí = 2% giá trị đó) và hiện phí cho khách trước khi chọn. Icon dấu chấm than (rê chuột vào thì xổ ra) hiện bảng phí bảo hiểm của từng giống; khách chỉ thấy phí, không thấy giá trị ngựa theo giống.
    - **TỪ CHỐI:** khách đồng ý Điều khoản Trách nhiệm Hạn chế của nhà xe.
- Bấm "Gửi yêu cầu đặt đơn". → **Pending Manager Intake**.

### 2.3. Bước 2 — Manager tiếp nhận và tự động gán nhân sự

- Đơn vào hàng đợi của Manager.
- Hệ thống tự động gán:
  - 01 **Specialist**: kiểm tra hồ sơ y tế, xét nghiệm dịch tễ của ngựa.
  - 01 **Fleet & Route Coordinator**: lập phương án xe, tài xế, tuyến đường.
- Manager kiểm tra tổng quan, bấm **"Tiếp nhận & Kích hoạt Thẩm định"** để đẩy dữ liệu song song đến hai bộ phận. → **Under Internal Review**.

### 2.4. Bước 3 — Thẩm định chuyên môn song song

**Nhánh A — Specialist (thẩm định y tế & thể trạng):**
- Đối chiếu tính xác thực của Hộ chiếu, số Microchip và thời hạn xét nghiệm máu (EIA/EVA) theo quy định kiểm dịch.
- Thẩm định sơ bộ các giấy khách đã tải lúc tạo đơn (mục 12.3), gồm tính pháp lý của Import Permit (tuyến quốc tế; khách nộp mới hoặc lấy từ Kho hồ sơ).
- Thiết lập chỉ dẫn an sinh: nhiệt độ điều hòa thùng xe **20°C – 24°C**, cữ dừng xả cơ cho Escort.
- Thao tác: **"Xác nhận Đạt Y tế (Approve Medical Check)"**, hoặc Yêu cầu bổ sung nếu giấy mờ / hết hạn.

**Nhánh B — Coordinator (phương tiện & lộ trình):**
- Gán 01 xe chuyên dụng chở ngựa nguyên chuyến, phù hợp kích thước; kiểm tra hạn Đăng kiểm và Giấy phép liên vận CLV / song phương (tuyến quốc tế).
- Gán đích danh 01 Driver (đủ bằng lái, hộ chiếu) + 01 Escort.
- Lập lộ trình: các trạm dừng nghỉ xả cơ, giờ đón ngựa (ETD), giờ dự kiến tới cửa khẩu (ETA).
- Thao tác: **"Xác nhận Phương án Xe (Confirm Fleet & Route)"**.

Cả hai bộ phận duyệt xong, kết quả chuyển về Dashboard của Manager. → **Pending Final Commercial Approval**.

### 2.5. Bước 4 — Manager duyệt đơn và phát hành báo giá

Hệ thống kết xuất phiếu báo giá gửi khách:

```text
================================================================================
                    PHIẾU BÁO GIÁ ĐƠN HÀNG VẬN TẢI (QUOTATION SHEET)
================================================================================
1. THÔNG TIN CHUNG
   * Mã đơn hàng: ORD-2026-XXXX                  * Ngày lập: DD/MM/YYYY
   * Loại hình tuyến: [ NỘI ĐỊA ] / [ QUỐC TẾ LIÊN VẬN ]
   * Phương thức vận chuyển: NGUYÊN XE CHUYÊN DỤNG (CHARTER ONLY - KHÔNG GHÉP)

2. CHỦ THỂ GIAO NHẬN
   * Người gửi (Consignor): [Tên, SĐT, Địa chỉ bốc ngựa chi tiết]
   * Người nhận (Consignee): [Tên, SĐT, Địa chỉ giao nhận chi tiết]

3. DANH SÁCH CÁ THỂ NGỰA & DỊCH VỤ (ĐÃ DUYỆT BỞI SPECIALIST)
   -----------------------------------------------------------------------------
   #1. [Tên ngựa A] | Microchip: [VN-985211] | Giống: Thoroughbred | Giới tính: Thiến
       - Cấu hình khoang: [Khoang đơn mở rộng / Nhiệt độ cài đặt 22°C]
       - Bảo hiểm vận chuyển: [ ĐỒNG Ý - tính theo giống ] -> Phí: ... VNĐ
   #2. [Tên ngựa B] | Microchip: [VN-985212] | Giống: Arabian | Giới tính: Cái
       - Cấu hình khoang: [Khoang tiêu chuẩn]
       - Bảo hiểm vận chuyển: [ TỪ CHỐI - Áp dụng giới hạn trách nhiệm nhà xe ]
   -----------------------------------------------------------------------------
   * Specialist phụ trách: [Tên Specialist] - Kết luận: ĐẠT TIÊU CHUẨN DỊCH TỄ

4. ĐỘI NGŨ & PHƯƠNG TIỆN (ĐÃ DUYỆT BỞI COORDINATOR)
   * Phương tiện: 01 Xe chuyên dụng [BKS Đầu xe / Giấy phép liên vận số: ...]
   * Nhân sự vận hành (1 Driver + 1 Escort):
     - Tài xế chính (Driver): [Họ tên, SĐT, Số GPLX, Số Hộ chiếu]
     - Chăm sóc chuyên trách (Escort): [Họ tên, SĐT, Số CCCD/Hộ chiếu]
   * Lịch trình bốc ngựa (ETD): [Giờ, Ngày] | ETA Cửa khẩu: [Giờ, Ngày]

5. DỰ TOÁN BÁO GIÁ CHI TIẾT
   a. Chi phí cố định trọn gói (Fixed Base Price):
      - Cước dịch vụ vận chuyển nguyên chuyến (theo cự ly & loại xe):  ... VNĐ
      - Chi phí nhân sự kỹ thuật chuyên trách (01 Driver + 01 Escort):  ... VNĐ
      - Phí phát hành Carrier Info Sheet & hỗ trợ thủ tục barie:       ... VNĐ
      - Phí dịch vụ khoang đặc thù theo từng cá thể:                   ... VNĐ
      - Phí Bảo hiểm Động vật Sống (cho các cá thể đồng ý mua):        ... VNĐ
   b. Chi phí thực tế thanh toán sau (Post-trip Actual Expenses):
      - Nhiên liệu & Vé cầu đường / BOT:
        (Tài xế thanh toán thực tế dọc đường, xuất trình hóa đơn hợp lệ
        để đối soát và thanh toán bù trừ sau khi kết thúc chuyến đi)
   c. Điều khoản chi phí phát sinh dự phòng:
      - Đơn giá lưu xe chờ thông quan/kiểm dịch quá giờ:               ... VNĐ/giờ
   -----------------------------------------------------------------------------
   TỔNG GIÁ TRỊ TẠM TÍNH (CHƯA VAT & CHƯA GỒM BOT/XĂNG DẦU):           ... VNĐ
   TIỀN ĐẶT CỌC GIỮ XE (50% tổng giá trị tạm tính):                    ... VNĐ
   THỜI HẠN GIỮ BÁO GIÁ: 48 Giờ
================================================================================
```

Manager rà soát dữ liệu, điều chỉnh phụ phí / chiết khấu thương mại (nếu có), bấm **"Approve & Send Quotation"**. → **Awaiting Payment**.

### 2.6. Bước 5 — Khách thanh toán cọc và nhận thông tin xe

- Khách có **48 giờ** để thanh toán cọc (50%) trên hệ thống. Quá hạn: đơn tự hủy (**Quote Expired**), xe và nhân sự được nhả cho đơn khác.
- **Hợp đồng vận tải** được tạo và khách ký số / chấp thuận ngay lúc thanh toán cọc.
- Sau khi thanh toán, hệ thống tự động:
  - Xuất **Carrier Info Sheet** gửi tài khoản khách (BKS xe, thông tin 01 Driver và 01 Escort, mã cửa khẩu, ETA).
  - Kích hoạt đồng hồ đếm ngược đến **Cut-off 18:00 ngày D-1** để khách tải các giấy cần thông tin của hệ thống (Health Cert, Tờ khai hải quan, PoA, giấy cách ly, ATA Carnet).
- Khách dùng dữ liệu xe này để tự nộp đơn xin Giấy kiểm dịch (Health Cert) và mở Tờ khai hải quan.
- → **Awaiting Clearance Documents** (Flow 2).

---

## 3. Flow 2 — Quản lý hồ sơ pháp lý & kiểm dịch thông quan

### 3.1. Phân quyền

- **Transport Specialist:** người gác cổng duy nhất, chịu trách nhiệm toàn diện về tính hợp lệ của hồ sơ thú y, kiểm dịch và thủ tục hải quan.
- **Fleet & Route Coordinator:** chỉ quản lý phương tiện, phân công 01 Driver + 01 Escort và lộ trình; không phê duyệt hồ sơ giấy tờ.
- **Logistics Manager:** giám sát tiến độ, xử lý ngoại lệ và phát sinh chi phí lưu xe khi có sự cố hồ sơ.

### 3.2. Tiến trình

| Bước | Chủ thể | Hành động chính | Trạng thái |
|---|---|---|---|
| 1 | Hệ thống | Phát hành Carrier Clearance Kit ngay sau khi nhận cọc | Awaiting Clearance Documents |
| 2 | Khách hàng | Làm việc với cơ quan chức năng, tải Health Cert, Tờ khai hải quan, PoA, giấy cách ly, ATA Carnet, Hóa đơn thương mại (nếu có) lên App trước 18:00 D-1 | Documents Submitted - Pending Review |
| 3 | Specialist | Thẩm định hồ sơ thú y và hải quan | Legal Docs Approved (hoặc Pending Resubmission) |
| 4 | Coordinator | Rà soát kỹ thuật xe, xác nhận Driver & Escort sẵn sàng, kích hoạt Lệnh xuất bến | Dispatch Approved |
| 5 | Driver / Escort | Nhận lệnh trên App, chuẩn bị xe và checklist chứng từ gốc để đón ngựa ngày D | Ready for Pickup (đặt ở Flow 3, bước 4; xem ghi chú dưới bảng) |

**Thứ tự trạng thái giữa Flow 2 và Flow 3:** `Legal Docs Approved` → `Dispatch Approved` (Flow 2, bước 4: Coordinator xác nhận xe và nhân sự sẵn sàng) → `Route Planning in Progress` → `Route Plan Completed` → `Trip Manifest Approved` (Flow 3, bước 1–3) → `Ready for Pickup` (Flow 3, bước 4: Driver / Escort đã nhận Manifest, xe và checklist chứng từ gốc đã chuẩn bị xong) → `En Route to Pickup` (xe lăn bánh đến điểm đón).

### 3.3. Bước 1 — Hệ thống cấp Carrier Clearance Kit

Kích hoạt ngay sau khi khách thanh toán cọc (Flow 1). Gồm:

1. **Carrier Info Sheet (bản chính thức):** biển kiểm soát xe, quy cách thùng điều hòa, số khung / đăng kiểm, số Giấy phép liên vận CLV (tuyến quốc tế), thông tin định danh 01 Driver và 01 Escort do Coordinator phân công, ETA cửa khẩu.
2. **Mẫu Giấy ủy quyền áp tải (PoA Template):** soạn sẵn song ngữ Việt – Anh, điền sẵn thông tin xe, số khung, đích danh Driver và Escort; khách chỉ việc in, ký, đóng mộc đỏ.
3. **Hướng dẫn Khai báo Cửa khẩu (Clearance Guideline):** mã chi cục Hải quan cửa khẩu, mã loại hình vận tải đường bộ, danh mục phòng xét nghiệm thú y đạt chuẩn do Specialist cập nhật.
4. **Đồng hồ đếm ngược** đến Cut-off: đúng 18:00 ngày D-1.

### 3.4. Bước 2 — Khách làm thủ tục và tải hồ sơ

Khách dùng dữ liệu từ Kit để làm việc với Chi cục Thú y và Hải quan, sau đó chụp / scan tải lên trước 18:00 D-1. Đây là các giấy **cần thông tin của hệ thống** (biển số xe, Driver / Escort, cửa khẩu):

- **Hồ sơ Thú y:**
  - Giấy chứng nhận kiểm dịch động vật vận chuyển (Health Cert, mộc đỏ Chi cục Thú y).
  - Giấy chứng nhận cách ly kiểm dịch trước xuất phát (nếu nước đến yêu cầu), nộp sau khi hoàn thành thời gian cách ly 7 – 14 ngày.
- **Hồ sơ Vận tải & Hải quan:**
  - Tờ khai Hải quan điện tử (PDF đã phân luồng hoặc có mã tiếp nhận chính thức).
  - PoA đã ký tên, đóng mộc đỏ của chủ ngựa / doanh nghiệp.
  - Bản scan cuống sổ ATA Carnet (nếu đi thi đấu / triển lãm diện tạm nhập – tái xuất); thông tin xe và tài xế điền vào cuống sổ lấy từ Carrier Info Sheet.
  - Hóa đơn thương mại, file PDF (nếu người gửi bán ngựa cho người nhận), để Specialist đối chiếu với Tờ khai Hải quan điện tử do khách tự khai.

Các giấy không cần thông tin của hệ thống (Import Permit…) khách đã nộp lúc tạo đơn ở Flow 1 (mục 12.3).

### 3.5. Bước 3 — Specialist thẩm định

Specialist là người duy nhất rà soát, trên giao diện hồ sơ số hóa:

- **Thú y & kiểm dịch:**
  - Mã Microchip trên Health Cert khớp tuyệt đối với mã chip ngựa đã khai trong đơn.
  - Health Cert còn hạn khi xe qua trạm kiểm dịch cửa khẩu.
  - Giấy cách ly (nếu có): đã hoàn thành thời gian cách ly và còn hiệu lực.
- **Hải quan & phương tiện** (Tờ khai và cửa khẩu chỉ áp dụng tuyến Quốc tế):
  - Ô "Phương tiện vận chuyển mang hàng" trên Tờ khai phải trùng khớp biển số xe trong Carrier Info Sheet.
  - "Cửa khẩu xuất/nhập" trên tờ khai khớp cửa khẩu trong kế hoạch lộ trình.
  - PoA đúng họ tên, số CCCD/Passport của Driver và Escort đã gán.
  - ATA Carnet (nếu có): thông tin xe và tài xế khớp Carrier Info Sheet.
  - Hóa đơn thương mại (nếu có): thông tin và giá trị khớp với Tờ khai hải quan khách tự khai. Specialist chỉ đối chiếu, không lập hay sửa tờ khai.

**Quyết định:**
- Sai sót: bấm **Yêu cầu bổ sung (Request Resubmission)**, chọn lý do cụ thể (ví dụ: sai BKS trên tờ khai, Health Cert thiếu mộc giáp lai, sai mã chip). Hệ thống gửi cảnh báo khẩn về App khách. → **Pending Resubmission**.
- Hợp lệ: bấm **Duyệt toàn bộ hồ sơ pháp lý (Approve Legal & Clearance Docs)**. → **Legal Docs Approved**.

### 3.6. Bước 4 — Coordinator rà soát kỹ thuật và kích hoạt điều xe

- Ngay khi Specialist duyệt, đơn báo sang màn hình Coordinator.
- Coordinator rà soát lần cuối: tình trạng xe, Driver và Escort sẵn sàng theo lộ trình đã lập. Bấm **Phê duyệt Phương tiện & Lộ trình (Confirm Fleet Readiness)**.
- Hệ thống chuyển **Dispatch Approved**, tự đẩy Lệnh điều xe (Dispatch Order) kèm lộ trình sơ bộ (đã lập ở Flow 1) và danh mục kiểm tra chứng từ gốc xuống App của Driver và Escort; gửi khách thông báo hồ sơ pháp lý đã hoàn tất, xe đang chuẩn bị đến điểm đón.
- Lộ trình chi tiết và Trip Manifest được lập tiếp ở Flow 3. → **Route Planning in Progress**.

### 3.7. Bước 5 — Ngoại lệ quá hạn Cut-off

- **Cảnh báo trước hạn:** D-1 12:00 (trước 6 giờ) và D-1 16:00 (trước 2 giờ), hệ thống gửi Push Notification / SMS nếu khách chưa nộp đủ giấy.
- **Quá 18:00 D-1 chưa đủ hồ sơ hợp lệ:**
  - Đơn chuyển **Documentation Delayed**, gửi cảnh báo đến Logistics Manager.
  - Coordinator tạm hoãn lệnh xuất bến để xe không chạy không tải đến điểm bốc khi chưa đủ điều kiện pháp lý.
  - **Phí chờ (Demurrage):** khách có khoảng đệm tối đa **12 giờ** (đến 06:00 sáng ngày D). Thời gian xe phải chờ do lỗi hồ sơ của khách được tính vào Phí lưu xe chờ thông quan / chậm trễ, theo đơn giá ở mục 11, khi quyết toán.

---

## 4. Flow 3 — Lập kế hoạch lộ trình & điều phối phương tiện

**Mục tiêu:** chuyển phương án sơ bộ thành **Lệnh điều hành chuyến đi chi tiết (Trip Manifest)** sau Flow 2. Coordinator thiết lập các chặng, trạm dừng xả cơ, khớp giờ cửa khẩu, giao lệnh chạy kèm danh mục thu chứng từ gốc cho 01 Driver và 01 Escort.

### 4.1. Bước 1 — Tiếp nhận đơn đã thông qua pháp lý

- Kích hoạt sau khi Specialist duyệt toàn bộ hồ sơ pháp lý và Coordinator xác nhận Fleet Readiness (`Dispatch Approved`, Flow 2), trước 18:00 D-1.
- Hệ thống khóa thông tin xe, nhân sự và mã Microchip (không cho sửa).
- → **Route Planning in Progress**. Thông báo Dashboard Coordinator kèm chỉ dẫn an sinh của Specialist (nhiệt độ khoang, cữ nghỉ tối đa).

### 4.2. Bước 2 — Coordinator thiết kế lộ trình chi tiết

- **Chia chặng (Staging Rule):** ngựa không di chuyển liên tục quá **3 – 4 giờ**. Chia thành các chặng ngắn xen điểm dừng nghỉ tối thiểu **30 – 45 phút**.
- **Các điểm mốc:**
  - **Trạm dừng xả cơ (Rest Stops):** có bóng mát, nguồn nước máy sạch để Escort kiểm tra thể trạng và cho ngựa uống nước.
  - **Trạm Thú y Khẩn cấp dọc đường (Emergency Vet Points):** gán sẵn tọa độ và số điện thoại cấp cứu của các phòng khám thú y trên tuyến.
  - **Cửa khẩu (Border Crossing):** khớp giờ xuất phát để ETA cửa khẩu rơi vào **07:30 – 16:30**, làm thủ tục thông quan và khám lâm sàng trong ngày.
- Bấm **Xác nhận Lộ trình & Phương tiện (Confirm Fleet & Route Plan)**. → **Route Plan Completed**.

### 4.3. Bước 3 — Manager duyệt Trip Manifest

```text
================================================================================
                    LỆNH ĐIỀU HÀNH VẬN TẢI CHI TIẾT (TRIP MANIFEST)
================================================================================
1. THÔNG TIN CHUYẾN ĐI
   * Mã đơn hàng: ORD-2026-XXXX                 * Mã chuyến (Trip ID): TRP-8892
   * Loại tuyến: [ NỘI ĐỊA ] / [ QUỐC TẾ LIÊN VẬN ]
   * Phương tiện: 01 Xe chuyên dụng BKS [51D - 892.45] (Nguyên chuyến - Charter)

2. ĐỘI NGŨ VẬN HÀNH
   * Tài xế (Driver): [Tên, SĐT, Số GPLX, Số Hộ chiếu]
   * Chăm sóc (Escort): [Tên, SĐT, Số CCCD/Hộ chiếu]

3. DANH SÁCH CÁ THỂ NGỰA TRÊN XE
   * #1: [Tên ngựa A] | Microchip: [VN-985211] | Khoang: [Single Stall]
   * #2: [Tên ngựa B] | Microchip: [VN-985212] | Khoang: [Standard Stall]
   * Chỉ định an sinh: Duy trì nhiệt độ 22°C | Cấp nước mỗi 3 giờ | Dừng xả cơ 30p

4. LỊCH TRÌNH DI CHUYỂN TỪNG CHẶNG (DETAILED ROUTE SCHEDULE)
   - Chặng 1: Điểm bốc ngựa [Địa chỉ ...] ➔ Khởi hành: [Giờ:Phút, Ngày]
   - Điểm dừng 1: Trạm nghỉ [Tên/Km số ...] ➔ Dự kiến: [Giờ] (Nghỉ 45 phút)
   - Trạm thú y dự phòng chặng 1: [Tên phòng khám thú y, SĐT: ...]
   - Chặng 2: Tiếp tục hành trình đến Cửa khẩu [Tên cửa khẩu: Mộc Bài / ...]
   - Mốc qua Cửa khẩu (ETA): [08:30 Sáng, Ngày ...] (Làm thủ tục thông quan)
   - Điểm giao đích: [Trang trại / Trường đua nhận ...] ➔ ETA hoàn thành: [Giờ, Ngày]

5. HỒ SƠ & BIỂU MẪU HỆ THỐNG CẤP PHÁT CHO TÀI XẾ MANG THEO
   (Bộ chứng từ nhà xe chuẩn bị và giao cho Driver trước khi xuất bến):
   [x] 1. Bản in Lệnh điều vận chi tiết (Trip Manifest / Run Sheet) có chữ ký duyệt.
   [x] 2. Bản in Carrier Info Sheet chính thức (BKS, thông tin xe, danh tính Driver & Escort).
   [x] 3. Giấy phép vận tải liên vận quốc tế CLV/Song phương của phương tiện (Bản gốc kèm xe).
   [x] 4. Sổ Đăng kiểm xe chuyên dụng & Bảo hiểm trách nhiệm dân sự còn hiệu lực.
   [x] 5. 02 Bản in "Biên bản Giao nhận Động vật sống & Chứng từ gốc" (ký tay với người gửi).
   [x] 6. 02 Bản in "Biên bản Bàn giao & Hoàn tất chuyến đi" (ký tay với người nhận).

6. DANH MỤC CHỨNG TỪ BẮT BUỘC TÀI XẾ PHẢI THU BẢN GỐC TỪ KHÁCH HÀNG TẠI ĐIỂM ĐÓN
   (Khách đã nộp bản mềm ở Flow 2, Tài xế bắt buộc đối soát và thu bản gốc khi nhận ngựa):
   [ ] 1. Hộ chiếu ngựa bản gốc (FEI Passport / National Passport).
   [ ] 2. Giấy chứng nhận kiểm dịch động vật (Health Cert) - Bản gốc mộc đỏ.
   [ ] 3. Giấy phép nhập khẩu (Import Permit) - Bản gốc / Bản in có mã QR hợp lệ.
   [ ] 4. Phiếu xét nghiệm máu EIA/EVA - Bản gốc + 02 bản sao công chứng.
   [ ] 5. Giấy ủy quyền áp tải (PoA) - Bản gốc có chữ ký & con dấu mộc đỏ của chủ ngựa.
   [ ] 6. Sổ ATA Carnet bản gốc (nếu đi thi đấu diện tạm nhập - tái xuất).
   [ ] 7. Hóa đơn thương mại - 03 đến 05 bản gốc ký tên, đóng dấu mộc (nếu người gửi bán ngựa cho người nhận).
================================================================================
```

Manager rà soát tính khả thi của lịch trình và tính đầy đủ danh mục thu bản gốc, bấm **Phê duyệt Lệnh điều vận (Approve Trip Manifest)**. → **Trip Manifest Approved**.

### 4.4. Bước 4 — Bàn giao Lệnh điều vận xuống thiết bị di động

- **Mobile App Driver và Escort** nhận: lộ trình chi tiết, tọa độ trạm dừng, trạm thú y khẩn cấp, danh bạ hỗ trợ; tạo sẵn **Physical Document Checklist** để Driver đối soát và tích chọn khi gặp khách ở điểm đón.
- **Customer Tracking:** hiện thông báo kế hoạch hành trình đã được phê duyệt, xe đang trên đường đến điểm đón; kèm nhắc: "Vui lòng chuẩn bị sẵn các bản gốc hồ sơ (Hộ chiếu, Giấy kiểm dịch, PoA) để bàn giao cho tài xế."
- Khi Driver và Escort đã nhận Manifest và chuẩn bị xong xe cùng checklist chứng từ gốc → **Ready for Pickup**.
- Driver và Escort bắt đầu di chuyển đến điểm bốc ngựa. → **En Route to Pickup**.

---

## 5. Flow 4 — Cập nhật trạng thái & nhật ký lộ trình

**Mục tiêu:** minh bạch hóa hành trình. Driver cập nhật các mốc bằng ảnh chụp trực tiếp kèm Timestamp; Escort ghi nhật ký an sinh; pháp lý hai đầu bảo đảm bằng **Biên bản giấy ký tay** được chụp ảnh số hóa lên hệ thống. Dữ liệu đồng bộ tức thời đến Coordinator và Customer.

### 5.1. Các mốc chặng

| Mốc | Chủ thể | Thao tác | Khách & Coordinator thấy |
|---|---|---|---|
| 1. Tiếp nhận ngựa tại điểm đón | Driver & Escort | Chụp ảnh điểm đón; quét Microchip; đối soát và thu đủ chứng từ gốc; ký tay Biên bản giao nhận 02 bản; chụp ảnh biên bản tải lên App | Xe đã tiếp nhận ngựa, thu đủ chứng từ gốc và lăn bánh (kèm ảnh biên bản ký tay) |
| 2. Dừng nghỉ xả cơ | Driver & Escort | Driver: chụp biển hiệu trạm / cây xăng (có Timestamp), bấm xác nhận. Escort: nhập nhật ký an sinh | Xe đang dừng nghỉ tại [trạm / Km]; tình trạng ngựa; nhiệt độ khoang |
| 3. Tới cửa khẩu quốc tế | Driver | Chụp barie / cổng trạm kiểm soát, bấm xác nhận có mặt | Xe đã tới cửa khẩu [tên], đang làm thủ tục kiểm dịch & thông quan |
| 4. Hoàn tất thông quan | Driver | Chụp Giấy kiểm dịch / cuống ATA Carnet đã có mộc đỏ | Ngựa và phương tiện đã thông quan |
| 5. Bàn giao đích & hoàn tất | Driver & Escort | Chụp điểm đích; trả hồ sơ gốc; ký tay Biên bản bàn giao hoàn tất 02 bản; chụp ảnh tải lên | Chuyến hoàn thành; ngựa và hồ sơ gốc đã bàn giao cho Consignee |

### 5.2. Bước 1 — Tiếp nhận ngựa, thu hồ sơ gốc, ký biên bản tại điểm đón

1. Xe tới trang trại, Driver bấm "Đã tới điểm đón" và chụp 01 ảnh thực tế tại cổng / khu chuồng.
2. Escort dùng máy quét chip cầm tay rà cổ ngựa, đối soát số hiển thị với Microchip trên Hộ chiếu gốc và Health Cert.
3. Driver mở Checklist chứng từ gốc (đã đối soát ở Flow 3), nhận đủ từ người gửi: Hộ chiếu gốc, Health Cert mộc đỏ, Import Permit, PoA mộc đỏ, ATA Carnet (nếu có), Hóa đơn thương mại 03 – 05 bản gốc (nếu có).
4. Driver lấy 02 bản in "Biên bản Giao nhận Động vật sống & Chứng từ gốc". Consignor và Driver cùng kiểm tra, tích nhận từng ngựa và từng hồ sơ gốc, ký bút mực (đóng mộc nếu là trang trại / doanh nghiệp). Người giao giữ 01 bản; Driver giữ 01 bản mang theo xe suốt hành trình.
5. Driver chụp biên bản đã có đủ chữ ký bằng camera trên App, tải lên, bấm **Bắt đầu hành trình (Start Journey)**.
6. Đồng bộ: Customer App báo đã tiếp nhận ngựa và bắt đầu di chuyển, khách xem được ảnh biên bản; Coordinator Dashboard chuyển đơn sang **In Transit - Leg 1**.

### 5.3. Bước 2 — Cập nhật tại các trạm dừng nghỉ xả cơ

Định kỳ mỗi 3 – 4 giờ theo lịch ở Flow 3:

- **Driver check-in:** chọn mốc dừng tương ứng; chụp ảnh trực tiếp bằng camera App (**Live Capture**) rõ biển hiệu trạm / cây xăng / bảng địa danh; hệ thống tự gắn Timestamp; bấm "Xác nhận đã đến trạm dừng".
- **Escort ghi Nhật ký An sinh (Welfare Log)** trong lúc dừng 30 – 45 phút:
  - Thể trạng: Bình thường / Căng thẳng (Stress) / Đổ mồ hôi nhiều.
  - Chăm sóc: đã cấp nước (số lít ước tính), đã bổ sung cỏ khô.
  - Nhiệt độ khoang hiện tại (từ đồng hồ cảm biến, ví dụ 22°C).
  - 01 ảnh thực tế cá thể ngựa trong khoang.
  - Bấm "Gửi nhật ký an sinh".
- Hết giờ nghỉ, **Driver** bấm "Tiếp tục hành trình" để sang chặng tiếp theo.

### 5.4. Bước 3 — Cửa khẩu (chỉ tuyến Quốc tế CLV)

- Khi vào khu vực kiểm soát biên giới, Driver chụp cổng / barie, bấm "Đã tới cửa khẩu [tên]". Hệ thống thông báo Customer và Coordinator.
- Driver và Escort xuất trình bộ hồ sơ bản gốc cho cán bộ Thú y và Hải quan, đưa ngựa vào luồng khám lâm sàng.
- Sau khi được đóng dấu thông quan: Driver chụp trang mộc đỏ kiểm dịch trên Health Cert và cuống ATA Carnet có dấu Hải quan, bấm **Đã thông quan thành công (Customs Cleared)**. Xe qua barie tiếp tục sang nước bạn.
- Customer nhận Push Notification: ngựa đã hoàn tất thông quan tại cửa khẩu [tên] lúc [giờ:phút].
- Nếu cơ quan chức năng yêu cầu bổ sung thông tin hoặc giải trình chuyên sâu ngoài phạm vi vận chuyển tiêu chuẩn, Driver kích hoạt liên lạc trực tuyến 3 bên (Hải quan – Nhân viên điều vận – Chủ hàng) để xử lý tức thời.

### 5.5. Bước 4 — Màn hình giám sát của Coordinator

- **Visual Timeline:** mốc chuyển từ xám (chưa tới) sang xanh lá (đã check-in, có ảnh và Timestamp).
- **Delay Alert:** nếu quá 30 – 45 phút so với ETA của một trạm mà Driver chưa check-in, hệ thống gắn cờ vàng **Delayed Check-in**. Coordinator chủ động liên hệ Driver / Escort.
- **Sức khỏe ngựa:** nhận cảnh báo tức thời nếu Escort báo ngựa mệt mỏi / bỏ ăn, sẵn sàng kích hoạt phương án rẽ vào Trạm Thú y Khẩn cấp đã gán ở Flow 3.

### 5.6. Bước 5 — Bàn giao tại điểm đích

1. Tới nơi, Driver chụp cổng cơ sở tiếp nhận, bấm "Đã tới điểm giao đích".
2. Escort cùng Consignee đưa ngựa ra khỏi khoang, kiểm tra thể trạng lần cuối.
3. Driver trả toàn bộ chứng từ gốc (Hộ chiếu ngựa, Health Cert, cuống ATA Carnet) cho Consignee.
4. Hai bên ký bút mực 02 bản "Biên bản Bàn giao & Hoàn tất chuyến đi". Consignee xác nhận đã nhận đủ số lượng ngựa, thể trạng an toàn, đã nhận đủ hồ sơ gốc. Mỗi bên giữ 01 bản.
5. Driver chụp biên bản có đủ chữ ký, tải lên, bấm **Hoàn tất giao ngựa (Complete Delivery)**.
6. Customer nhận thông báo giao thành công và tải được ảnh biên bản. Manager nhận đơn ở trạng thái **Delivered - Pending Settlement** (chờ tài xế gửi hóa đơn xăng xe để quyết toán).

---

## 6. Flow 5 — Xử lý sự cố & điều chỉnh khẩn cấp

### 6.1. Nguyên tắc bắt buộc

- **Chuyên môn y tế:** Escort là người duy nhất khám lâm sàng, sơ cứu, xử lý sức khỏe ngựa tại hiện trường. Specialist chỉ phụ trách pháp lý, kiểm dịch và quy chế cửa khẩu.
- **Cố định cửa khẩu:** không tự ý đổi cửa khẩu (do ràng buộc của Health Cert mộc đỏ và Tờ khai hải quan). Tắc nghẽn / chậm trễ ở biên giới xử lý bằng cách đưa ngựa về Holding Stable gần cửa khẩu nghỉ chờ thông quan, hoặc quay đầu về trại xuất phát nếu là sự cố bất khả kháng kéo dài.
- **Rescue Van (tuyến CLV):** không phải xe thay thế để chạy tiếp qua biên giới (sai biển số so với hồ sơ hải quan và kiểm dịch). Chỉ là trung chuyển khẩn cấp đưa ngựa ra khỏi xe hỏng về Holding Stable / Vet Clinic, bảo đảm an sinh trong khi chờ xe chính khắc phục.
- **Thẩm quyền:** Logistics Manager là cấp duy nhất duyệt thay đổi phương án di chuyển, duyệt ngân sách khẩn cấp và trực tiếp liên hệ khách.

### 6.2. Phân công theo nhóm sự cố

| Nhóm sự cố | Phát hiện & xử lý tại chỗ | Lập phương án | Phê duyệt cuối |
|---|---|---|---|
| 1. Sức khỏe ngựa (đau bụng Colic, sốt, mất nước, chấn thương) | Escort sơ cứu, đánh giá lâm sàng, yêu cầu tấp xe vào trạm thú y gần nhất | Coordinator định vị và chỉ đường tới Trạm thú y khẩn cấp gần nhất (đã lập ở Flow 3) | Manager duyệt dừng xe / chuyển viện; gọi khách thông báo tình trạng |
| 2. Kỹ thuật phương tiện (hỏng điều hòa thùng, nổ lốp, sự cố động cơ) | Driver đặt cảnh báo an toàn; Escort mở quạt đối lưu dự phòng, xịt nước làm mát thùng | Coordinator điều cứu hộ cơ khí sửa tại chỗ, hoặc điều Rescue Van đưa ngựa về Holding Stable | Manager duyệt chi phí cứu hộ / Rescue Van / tiền thuê chuồng tạm |
| 3. Tắc nghẽn cửa khẩu (tạm dừng tiếp nhận, tắc biên quá giờ) | Driver báo cáo, giữ nguyên vị trí, không tự chuyển hướng sang cửa khẩu khác | Specialist kiểm tra tiến độ mở luồng; Coordinator điều xe về Holding Stable gần đó | Manager duyệt lưu khoang qua đêm; đàm phán phụ phí Demurrage với khách |

### 6.3. Bước 1 — Kích hoạt SOS

- Driver / Escort mở App, bấm **Báo cáo Sự cố Khẩn cấp (SOS Alert)**, chọn nhóm sự cố (Sức khỏe ngựa / Kỹ thuật phương tiện / Tắc nghẽn cửa khẩu), chụp ảnh hoặc quay video ngắn, nhập ghi chú vắn tắt, bấm "Gửi Báo động Khẩn cấp".
- Hệ thống báo động còi + nhấp nháy đỏ trên màn hình Coordinator và Manager. → **Incident Reported - Action Required**.

### 6.4. Bước 2 — Ứng phó hiện trường

- **Sức khỏe ngựa:** Driver tấp xe vào nơi an toàn. Escort đo thân nhiệt, kiểm tra niêm mạc mắt / nướu, cho uống dung dịch bù điện giải, tiêm / cho uống thuốc chống co thắt giảm đau nếu có dấu hiệu Colic (theo tủ thuốc thú y trên xe).
- **Hỏng điều hòa khoang:** Driver khởi động máy phát điện phụ và quạt hút đối lưu. Escort mở ô thoáng tự nhiên, xịt nước hạ nhiệt chân và cổ ngựa để ngăn sốc nhiệt.

### 6.5. Bước 3 — Coordinator lập kế hoạch điều chỉnh

- **Sức khỏe ngựa:** trích danh bạ Trạm Thú y gần nhất; gọi báo trước cho bác sĩ trực triệu chứng của ngựa; lập tuyến ngắn nhất điều hướng xe đến trạm.
- **Hỏng phương tiện:**
  1. Ưu tiên số 1: liên hệ cứu hộ cơ khí gần nhất sửa tại hiện trường, giữ nguyên xe chính (đúng biển số trên hồ sơ hải quan). Trong lúc sửa, nguồn điện phụ trợ (ắc quy / máy phát) duy trì máy lạnh và quạt hút; ETA cửa khẩu được cập nhật cho khách.
  2. Nếu xe chính hỏng nặng, **không sửa nhanh được trong 02 giờ:** điều Rescue Van đến sang ngựa; Rescue Van chỉ chở ngựa về Holding Stable hoặc phòng khám thú y để hạ ngựa nghỉ, cấp nước sạch và cỏ khô. Rescue Van không chạy tiếp qua cửa khẩu. Xe chính sửa xong tại xưởng sẽ đến Holding Stable đón lại ngựa, tiếp tục hành trình bằng đúng phương tiện đã khai báo.
  3. Xe chính hỏng hoàn toàn không khắc phục được (hoặc tai nạn): đơn chuyển sang **phương án hủy chuyến bất khả kháng**, đưa ngựa về điểm xuất phát. Đơn vị lập **Biên bản xác nhận sự cố bất khả kháng** gửi khách làm căn cứ hủy tờ khai cũ tại cơ quan thẩm quyền, và xử lý bồi thường theo hợp đồng vận chuyển.
- **Tắc nghẽn biên giới / quá giờ Hải quan:** Specialist liên hệ cán bộ Kiểm dịch Thú y và Hải quan xác nhận thời gian mở luồng ngày hôm sau, rà soát hiệu lực Health Cert mộc đỏ (tuyệt đối không đề xuất đổi cửa khẩu). Coordinator điều xe về Holding Stable gần cửa khẩu nhất đã liên kết để ngựa nghỉ qua đêm, tránh lưu khoang xe quá lâu.
- Coordinator hoàn thành **Phiếu Kế hoạch Xử lý Sự cố (Incident Action Plan)** trình Manager. → **Pending Emergency Approval**.

### 6.6. Bước 4 — Manager duyệt phương án và làm việc với khách

- Kiểm tra phương án (rẽ vào trạm thú y, điều Rescue Van đưa ngựa về trạm nghỉ, hoặc thuê chuồng đệm gần cửa khẩu).
- Phê duyệt hạn mức tài chính khẩn cấp (**Emergency Budget**) để Driver / Escort thanh toán viện phí, cứu hộ hoặc thuê chuồng tại chỗ.
- Bấm **Phê duyệt Phương án Khẩn cấp (Approve Emergency Plan)**.
- Manager **trực tiếp gọi khách** (chủ ngựa / CLB): giải thích nguyên nhân, cập nhật tình trạng an toàn của ngựa, thông báo phương án đã duyệt và ETA mới.
- → **Emergency Plan Active**.

### 6.7. Bước 5 — Minh bạch trạng thái và tiếp tục hành trình

- **Customer Interface:** bản đồ cập nhật lộ trình rẽ nhánh vào Trạm Thú y / Trại đệm gần cửa khẩu; nhật ký hiển thị: "Chuyến xe đang tạm dừng tại [Trạm thú y X / Trại đệm Cửa khẩu Y] để chăm sóc sức khỏe cho ngựa theo tiêu chuẩn an sinh động vật. Đội ngũ Escort đang túc trực theo dõi 24/7. Thời gian dự kiến hoàn thành mới: [Giờ, Ngày]."
- **Khôi phục hành trình:** khi ngựa ổn định, hoặc xe chính đã đến đón lại ngựa từ Rescue Van, hoặc cửa khẩu mở luồng lại: Escort xác nhận thể trạng ngựa đủ điều kiện tiếp tục; Driver bấm **Tiếp tục Hành trình Chính (Resume Journey)**. → **In Transit**.
- Toàn bộ hóa đơn chi tại chỗ (thuốc men, viện phí, phí xe cứu hộ, tiền thuê chuồng đệm) được chụp tải lên mục **Chi phí phát sinh thực tế (Actual Incurred Expenses)** làm căn cứ đối soát khi quyết toán.

---

## 7. Flow 6 — Bàn giao, nghiệm thu & quyết toán

**Mục tiêu:** khép vòng đời đơn qua 3 trụ cột:
1. **Nghiệm thu thực địa & pháp lý:** kiểm tra lâm sàng ngựa, trả bản gốc mộc đỏ, ký Biên bản giấy bàn giao hoàn tất.
2. **Quyết toán tài chính minh bạch (Evidence-First):** đối soát chi phí thực tế (dầu: hóa đơn đỏ + ảnh ODO; BOT: biên lai / hóa đơn trạm thu phí tài xế nộp; phụ phí khẩn cấp đã duyệt ở Flow 5), bù trừ cọc ở Flow 1.
3. **Lưu trữ & đồng bộ:** cập nhật lịch sử chuyến vào Kho Hồ sơ ngựa, giải phóng xe và nhân sự.

### 7.1. Tiến trình

| Bước | Chủ thể | Hành động chính | Trạng thái |
|---|---|---|---|
| 1 | Driver & Escort | Dắt ngựa xuống an toàn; kiểm tra thể trạng; trả hồ sơ gốc; ký tay 02 bản Biên bản; chụp ảnh gửi App | Delivered - Pending Settlement |
| 2 | Driver | Chụp hóa đơn đỏ tiền dầu (+ ảnh ODO), biên lai / hóa đơn các trạm thu phí BOT tài xế đã trả, hóa đơn viện phí / chuồng đệm (nếu có ở Flow 5) | Expenses Submitted - Pending Audit |
| 3 | Manager | Đối chiếu biên lai BOT và hóa đơn dầu; lập và phát hành Final Settlement Sheet | Settlement Issued - Awaiting Final Payment |
| 4 | Customer | Xem đối soát (ảnh hóa đơn dầu, biên lai BOT); thanh toán số dư; chấm điểm | Fully Paid |
| 5 | Hệ thống | Đóng đơn (Order Completed); cập nhật kho hồ sơ ngựa; giải phóng xe & nhân sự | Archived / Completed |

### 7.2. Bước 1 — Nghiệm thu thực địa và ký biên bản bàn giao

- Escort cùng Consignee hướng dẫn ngựa bước xuống cầu dốc; hai bên kiểm tra lâm sàng: khớp chân, mắt, dấu hiệu sốt / mất nước, vết trầy xước (nếu có).
- Driver trả tận tay người nhận: Hộ chiếu ngựa bản gốc, Health Cert mộc đỏ, cuống ATA Carnet (nếu hàng tạm xuất – tái nhập).
- Driver xuất trình 02 bản "Biên bản Bàn giao & Hoàn tất Chuyến đi". Consignee xác nhận ngựa đúng mã chip, thể trạng an toàn, đã nhận đủ hồ sơ gốc. Hai bên ký bút mực (đóng mộc nếu là CLB / trường đua); mỗi bên giữ 01 bản.
- Driver chụp biên bản đủ chữ ký, bấm **Xác nhận Hoàn tất Giao ngựa**. Hệ thống gửi Push cho khách: ngựa đã được bàn giao an toàn lúc [giờ:phút].
- → **Delivered - Pending Settlement**.

### 7.3. Bước 2 — Kê khai chi phí thực tế và khóa nhập liệu (Evidence-First)

**Chứng từ theo nhóm chi phí:**
- **Nhiên liệu (dầu diesel):** hóa đơn GTGT điện tử / hóa đơn đỏ thể hiện ngày giờ đổ, biển số xe, số lít, tổng tiền. **Bắt buộc kèm 01 ảnh đồng hồ ODO** tại thời điểm đổ dầu.
- **Cầu đường / BOT:** tài xế tự trả tại từng trạm thu phí dọc đường, **mỗi lần trả chụp biên lai / hóa đơn** và tải lên làm chứng từ (tên trạm, số tiền, giờ qua trạm).
- **Chi phí khẩn cấp (nếu có ở Flow 5):** hóa đơn viện phí thú y, hóa đơn thuốc cấp cứu, hoặc biên lai tiền chuồng đệm có mộc / chữ ký cơ sở tiếp nhận.

**Luồng kiểm soát trên App của Driver:**
1. Ô nhập số tiền bị khóa mặc định.
2. Driver mở camera ứng dụng chụp chứng từ thực tế, tải lên trước.
3. Tải lên thành công thì ô "Số tiền trên hóa đơn (VNĐ)" mới mở khóa để điền.
4. Không có ảnh chứng từ hợp lệ thì nút "Gửi Bảng Kê Chi Phí" bị vô hiệu hóa hoàn toàn.

→ **Expenses Submitted - Pending Audit**.

### 7.4. Bước 3 — Đối soát đa nguồn và lập Bảng quyết toán

- **BOT:** Manager đối chiếu từng biên lai tài xế nộp (tên trạm, số tiền, giờ qua trạm) với lộ trình và các mốc check-in ở Flow 4. Ảnh các biên lai được đính kèm Bảng quyết toán cuối cùng cho khách.
- **Nhiên liệu:** kiểm tra hóa đơn đỏ, so khớp biển số, đối chiếu số lít với quãng đường GPS + ảnh ODO để bảo đảm đúng định mức tiêu hao.
- **Chi phí khẩn cấp:** đối chiếu hóa đơn viện phí / thuê chuồng với hạn mức Manager đã duyệt ở Flow 5.

```text
================================================================================
                    BẢNG QUYẾT TOÁN CHI PHÍ ĐƠN HÀNG CUỐI CÙNG
                            (FINAL SETTLEMENT SHEET)
================================================================================
* Mã đơn hàng: ORD-2026-XXXX                     * Mã chuyến: TRP-8892
* Khách hàng: [Tên khách hàng / Trang trại gửi]  * Ngày hoàn tất: DD/MM/YYYY
* Tuyến đường: [Điểm bốc] ➔ [Điểm giao]          * Phương tiện: 01 Xe Charter BKS [...]
--------------------------------------------------------------------------------
I. CÁC KHOẢN PHÍ ĐÃ DUYỆT BAN ĐẦU (FLOW 1)
   1. Cước vận chuyển chuyên dụng cơ sở:                         ... VNĐ
   2. Phí nhân sự kỹ thuật (01 Driver + 01 Escort):              ... VNĐ
   3. Phí xuất Carrier Info Sheet & hỗ trợ cửa khẩu:             ... VNĐ
   4. Phí cấu hình khoang & chăm sóc riêng:                      ... VNĐ
   5. Phí Bảo hiểm Động vật Sống:                                ... VNĐ
   -----------------------------------------------------------------------------
   CỘNG MỤC I (A):                                               ... VNĐ

II. CHI PHÍ THỰC TẾ PHÁT SINH DỌC ĐƯỜNG (CÓ CHỨNG TỪ ĐỐI SOÁT)
   1. Tiền nhiên liệu thực tế (Hóa đơn đỏ + Ảnh ODO):            ... VNĐ
   2. Phí cầu đường BOT (Biên lai trạm thu phí do tài xế nộp):   ... VNĐ
   3. Chi phí khẩn cấp đã duyệt ở Flow 5 (Viện phí / Chuồng đệm): ... VNĐ
   4. Phí lưu xe chờ thông quan quá giờ (Demurrage - nếu có):    ... VNĐ
   -----------------------------------------------------------------------------
   CỘNG MỤC II (B):                                              ... VNĐ

--------------------------------------------------------------------------------
TỔNG GIÁ TRỊ ĐƠN HÀNG THỰC TẾ (A + B):                           ... VNĐ
TRỪ: TIỀN ĐẶT CỌC KHÁCH ĐÃ TRẢ (FLOW 1):                       - ... VNĐ
--------------------------------------------------------------------------------
SỐ TIỀN CÒN LẠI KHÁCH HÀNG CẦN THANH TOÁN:                       ... VNĐ
================================================================================
```

Manager ký duyệt số liệu, bấm **Phê duyệt & Phát hành Quyết toán (Approve & Issue Final Invoice)**. → **Settlement Issued - Awaiting Final Payment**.

### 7.5. Bước 4 — Khách thanh toán số dư và đánh giá

- Khách nhận thông báo Bảng quyết toán trên App; bấm từng khoản chi phí thực tế để xem ảnh hóa đơn dầu và biên lai BOT chi tiết.
- Thanh toán số tiền còn lại qua cổng thanh toán tích hợp (chuyển khoản ngân hàng / thẻ tín dụng).
- Chấm điểm 1 – 5 sao cho chuyến đi; gửi đánh giá riêng về độ êm ái / an toàn của xe (Driver) và mức độ chuyên nghiệp / sức khỏe của ngựa (Escort).
- → **Fully Paid**.

### 7.6. Bước 5 — Đóng đơn và đồng bộ Kho Hồ sơ ngựa

- Hệ thống chuyển đơn sang **Order Completed**.
- Tăng số chuyến đi thành công của cá thể ngựa trong kho (ví dụ hiển thị "Đã có 6 đơn"); cập nhật toàn bộ nhật ký hành trình vào lý lịch cá thể ngựa (phục vụ tiêu chuẩn kiểm dịch và truy xuất nguồn gốc của các giải đua quốc tế).
- Chuyển xe chuyên dụng sang **Available**; chuyển 01 Driver và 01 Escort sang **Available** để Coordinator điều phối chuyến sau.
- → **Archived / Completed**.

---

## 8. Ngoại lệ

### 8.1. Người nhận (Consignee) từ chối tiếp nhận ngựa tại điểm đích

- Driver tuyệt đối không dắt ngựa xuống xe khi chưa có đại diện tiếp nhận ký biên bản. Driver bấm **"Consignee Refused Delivery"** trên App.
- Coordinator điều xe đưa ngựa về Holding Stable gần nhất đã liên kết để hạ ngựa nghỉ, cấp nước sạch và cỏ khô, theo dõi.
- Toàn bộ chi phí lưu xe (Demurrage), tiền thuê chuồng đệm và chi phí thức ăn / nước uống trong thời gian chờ được cộng dồn vào Bảng quyết toán cuối cùng của khách.

**Sau khi đã thông quan (tuyến Quốc tế, xe đã qua barie biên giới), áp dụng cho cả khách hủy đơn và Consignee từ chối nhận tại nước bạn:**
- Đã qua barie biên giới = đã hoàn tất xuất khẩu. Tuyệt đối **không tự ý quay đầu xe** về Việt Nam. Ưu tiên an sinh: chuyển ngay về cơ sở đệm sở tại.
- Không giao ngựa nếu người nhận từ chối ký biên bản. Không lưu ngựa trên xe quá **02 giờ**. Coordinator điều xe về **Holding Stable** liên kết tại nước bạn để hạ ngựa chăm sóc.
- **Chế tài tài chính:** khách thanh toán 100% cước chiều đi (tiền cọc 50% đã nộp được tính vào số tiền này, khách trả phần còn lại), và chịu toàn bộ chi phí lưu chuồng, tiền cỏ nước và phí lưu xe tại nước bạn.
- **Hồi hương:** muốn đưa ngựa về Việt Nam thì đóng đơn cũ và mở **Đơn hàng Hồi hương độc lập (Return Transit)**; làm lại thủ tục kiểm dịch nhập khẩu ngược từ đầu (chờ 7 – 10 ngày tại trạm đệm).
- Khách chối bỏ trách nhiệm quá **48 giờ**: áp dụng quyền cầm giữ động vật theo hợp đồng (Lien on Cargo).

### 8.2. Khách chậm trễ hoặc từ chối thanh toán số dư

- **Hạn đệm 24 giờ** kể từ lúc Manager phát hành Bảng quyết toán.
- **Sau 24 giờ:** trạng thái chuyển **Payment Overdue**. Hệ thống:
  - Khóa tài khoản và bảo lưu dữ liệu: tự động khóa quyền đặt đơn mới, tạm ngừng toàn bộ quyền truy cập / trích xuất dữ liệu các cá thể ngựa trong Kho Hồ sơ ngựa (khách không lấy được lý lịch, lịch sử tiêm phòng, chứng chỉ vận tải để đăng ký giải đua).
- **Cầm giữ:** nếu ngựa đang ở Holding Stable, nhà xe thực thi quyền cầm giữ theo hợp đồng vận chuyển cho đến khi khách thanh toán đủ chi phí vận tải và chăm sóc lưu trú.
- **Quá 07 ngày:** hệ thống trích xuất toàn bộ gói hồ sơ điện tử (Hợp đồng, Báo giá, Lệnh điều vận, ảnh Biên bản ký tay, hóa đơn dầu, biên lai BOT) chuyển Bộ phận Pháp lý để khởi kiện hoặc yêu cầu cơ quan thẩm quyền xử lý theo pháp luật.

### 8.3. Khách hủy đơn (Cancel Order) và hoàn cọc

Khách đã thanh toán cọc 50% mới có hoàn / mất cọc. Hệ thống tính theo mốc thời gian thực lúc khách bấm **Cancel Order**:

| Thời điểm hủy | Mất | Hoàn lại | Cơ sở |
|---|---|---|---|
| Trước D-7 (từ 7 ngày trở lên) | 20% tiền cọc | 80% | Bù phí mở hồ sơ |
| Từ D-7 đến D-3 | 50% tiền cọc | 50% | Bù chi phí giữ chỗ xe Charter |
| Từ 72 giờ trước D đến 18:00 D-1 | 80% tiền cọc | 20% | Bù chi phí Coordinator và Specialist đã hoàn tất kế hoạch |
| Sau 18:00 D-1 hoặc ngày D | 100% tiền cọc | 0% | Xe đã nhận lệnh / xuất bến |

**Bất khả kháng** (dịch bệnh, thiên tai, ngựa ốm có chứng nhận): hoàn lại 70% tiền cọc.

Hủy sau khi xe đã qua cửa khẩu xử lý theo mục 8.1.

---

## 9. Mô hình Carrier-Only và Gói hỗ trợ thông tin phương tiện

### 9.1. Mô hình

Tuân thủ nghiêm ngặt **Carrier-Only (chỉ vận chuyển)**. Hệ thống **không** làm dịch vụ hải quan trọn gói và **không** đứng tên ủy thác tờ khai. Khách chủ động chuẩn bị hồ sơ pháp lý / kiểm dịch và tự khai báo với cơ quan chức năng. Hệ thống cung cấp dữ liệu phương tiện đạt chuẩn vận tải động vật sống để khách hoàn tất thủ tục thông quan.

### 9.2. Gói hỗ trợ Cung cấp Thông tin Phương tiện & Hồ sơ Vận tải (Carrier Clearance Support)

**Thời điểm bàn giao dữ liệu:** sau khi khách thanh toán, hệ thống tự xuất **Carrier Info Sheet**, trước giờ khởi hành tối thiểu 24 – 48 giờ.

**Bộ dữ liệu bàn giao cho khách:**
- **Phương tiện:** biển kiểm soát đầu xe (và rơ-moóc nếu có), loại thùng xe chuyên dụng điều hòa, số khung (VIN), số giấy kiểm định an toàn kỹ thuật (đăng kiểm).
- **Tài xế / Áp tải:** họ tên, số CCCD / Hộ chiếu, số GPLX, số điện thoại liên hệ trực tiếp.
- **Lộ trình:** cửa khẩu xuất / nhập, mã trạm hải quan dự kiến, thời gian xe có mặt tại cửa khẩu (ETA).

**Nghĩa vụ của khách:** dùng dữ liệu trên để nộp đơn kiểm dịch động vật và mở tờ khai hải quan; sau đó tải lên hệ thống ảnh chụp Tờ khai hải quan (đã phân luồng / tiếp nhận) và Giấy kiểm dịch hợp lệ trước hạn chót (Deadline) để kích hoạt lệnh xuất bến.

### 9.3. Chính sách phương tiện và sự cố kỹ thuật

- **Biển số cố định:** không điều xe thay thế giữa chặng (xem mục 1.4).
- **Sự cố kỹ thuật thông thường:** sửa tại chỗ bằng kỹ thuật lưu động / garage liên kết. Trong lúc sửa, nguồn điện phụ trợ (ắc quy / máy phát) duy trì máy lạnh và quạt hút để giữ nhiệt độ chuẩn. Hệ thống cập nhật ETA cửa khẩu cho khách.
- **Sự cố bất khả kháng (hỏng không sửa được, tai nạn):** kích hoạt đội cứu nạn chuyển ngựa về trạm lưu trú / chăm sóc thú y an toàn gần nhất. Đơn vị lập Biên bản xác nhận sự cố bất khả kháng gửi khách làm căn cứ hủy tờ khai cũ tại cơ quan thẩm quyền và xử lý bồi thường theo hợp đồng vận chuyển. Chi tiết xử lý ở Flow 5.

---

## 10. Hạng xe

Căn cứ tiêu chuẩn chế tạo xe vận chuyển ngựa của các hãng lớn (Stephex Horseboxes, Bloomfields), hệ thống có 3 hạng xe:

| Hạng | Loại xe | Sức chứa |
|---|---|---|
| **Light** | Xe tải nhẹ / Van | 2 Stalls |
| **Medium** | Xe tải trung | 4 đến 6 Stalls |
| **Heavy** | Xe tải nặng | 9 Stalls |

Coordinator gán 01 xe phù hợp số ngựa và kích thước. Dù xe còn chỗ trống, **không** ghép ngựa của đơn khác (Charter độc quyền).

---

## 11. Gói cước & biểu phí

### 11.1. Báo giá (chi tiết ở mục 2.5)

- **Chi phí cố định trọn gói (Fixed Base Price):** cước vận chuyển nguyên chuyến (theo cự ly và loại xe); nhân sự (01 Driver + 01 Escort); phí phát hành Carrier Info Sheet và hỗ trợ thủ tục barie; phí khoang đặc thù theo cá thể; phí bảo hiểm Động vật Sống (cá thể đồng ý mua).
- **Chi phí thực tế thanh toán sau:** nhiên liệu, BOT (và chi phí khẩn cấp đã duyệt, Demurrage nếu có, khi quyết toán).
- **Tiền đặt cọc giữ xe:** cố định **50%** tổng giá trị tạm tính (chưa VAT, chưa gồm BOT / xăng dầu). Hoàn / mất cọc khi hủy đơn theo mục 8.3.
- **Thời hạn giữ báo giá:** 48 giờ.

### 11.2. Phí cấp Bộ hồ sơ thông tin phương tiện (Carrier Data Package)

**Miễn phí** (đã tích hợp trong giá cước vận chuyển tiêu chuẩn) **hoặc** thu phí tiện ích **200.000đ – 500.000đ / chuyến**. Gồm: phiếu vận chuyển, xác thực đăng kiểm xe, hỗ trợ xuất trình giấy tờ xe tại luồng kiểm soát cửa khẩu.

### 11.3. Phí lưu khoang / chờ thông quan (Demurrage / Detention)

**300.000đ – 500.000đ / giờ.** Áp dụng khi:
- Xe đã đến cửa khẩu đúng hẹn nhưng giấy tờ do khách chuẩn bị bị đình trệ, sai sót, hoặc cơ quan chức năng yêu cầu bổ sung khiến phương tiện không thể đi tiếp đúng lộ trình; và
- Xe phải chờ do khách chưa đủ hồ sơ hợp lệ sau Cut-off (Flow 2, bước 5, khoảng đệm đến 06:00 ngày D).

### 11.4. Chi phí thực tế (không nằm trong báo giá cố định)

Nhiên liệu; BOT; chi phí khẩn cấp đã duyệt (thú y, thuốc, Holding Stable, Rescue); Demurrage. Tất cả phải có chứng từ (xem mục 7.3).

---

## 12. Hồ sơ, giấy tờ & SOP check-in

**Phạm vi:** mục 12.1 – 12.3 áp dụng cho tuyến vận chuyển đường bộ liên vận quốc tế Việt Nam ⇄ Campuchia ⇄ Lào bằng phương tiện chuyên dụng chở ngựa. Tuyến Nội địa có danh mục riêng ở mục 12.4.

**Phân định trách nhiệm:** khách (chủ hàng / chủ ngựa) chịu trách nhiệm chuẩn bị toàn bộ hồ sơ kỹ thuật thú y, giấy phép xuất / nhập khẩu và thông quan. Đơn vị vận tải tiếp nhận chứng từ vật lý trước giờ xe xuất phát, thực hiện quyền ủy quyền áp tải, xuất trình chứng từ tại barie biên phòng, hải quan và trạm kiểm dịch cửa khẩu.

Khách chuẩn bị đầy đủ và phân thành **02 túi hồ sơ** trước khi bàn giao cho tài xế / người áp tải.

### 12.1. Bộ A — Túi hồ sơ kỹ thuật thú y & động vật sống

Người áp tải chuyên trách giữ trực tiếp, làm thủ tục tại Trạm Kiểm dịch Động vật cửa khẩu hai đầu.

1. **Hộ chiếu ngựa (Equine Passport / FEI Passport):** bản gốc. Có sơ đồ nhận dạng chi tiết (vệt lông, xoáy lông, màu sắc, sẹo) và mã Microchip trùng khớp tuyệt đối với chip cấy trên thân ngựa.
2. **Giấy chứng nhận kiểm dịch động vật xuất khẩu (Veterinary Health Certificate):** bản gốc có mộc đỏ của Cơ quan Thú y có thẩm quyền nước xuất khẩu, còn hiệu lực.
3. **Giấy phép nhập khẩu (Import Permit):** bản gốc, hoặc bản in điện tử hợp lệ có mã QR / chữ ký số do Cục Thú y / Bộ Nông nghiệp nước nhập khẩu phê duyệt.
4. **Hồ sơ xét nghiệm dịch tễ (Equine Lab Tests):** bản gốc kèm 02 bản sao công chứng. Kết quả âm tính Thiếu máu truyền nhiễm ngựa (EIA / Coggins), Viêm động mạch ngựa (EVA); xác nhận tiêm phòng Cúm ngựa (Equine Influenza), Dại (Rabies) theo quy định liên vận.
5. **Chứng nhận cách ly kiểm dịch trước xuất phát (Pre-export Quarantine Certificate):** bản gốc, xác nhận ngựa đã qua cách ly theo dõi dịch tễ tại trại nuôi theo yêu cầu của nước nhập khẩu.
6. **Nhật ký chăm sóc & An sinh động vật dọc đường (Animal Welfare & Feeding Log):** mẫu do hệ thống cấp hoặc chủ ngựa bàn giao; ghi khẩu phần ăn, cữ uống, nhiệt độ yêu cầu và thuốc hỗ trợ (nếu có).

### 12.2. Bộ B — Cặp hồ sơ phương tiện, vận tải & thủ tục hải quan

Lưu trong cabin xe, do Tài xế chính quản lý để xuất trình tại luồng Hải quan, Biên phòng.

1. **Văn bản ủy quyền áp tải & xuất trình chứng từ (Letter of Authorization / PoA):** bản gốc song ngữ Việt – Anh, có công chứng hoặc mộc đỏ của chủ ngựa / đại diện pháp luật; ủy quyền cho tài xế / người áp tải ghi trên phiếu điều vận thay mặt chủ hàng giải trình, làm việc với Hải quan và Thú y cửa khẩu.
2. **Giấy gửi hàng đường bộ & Vận đơn (Consignment Note / Waybill):** bản gốc do hệ thống phát hành, có chữ ký xác nhận của đại diện giao nhận hai bên.
3. **Hợp đồng điện tử mua bán / Hóa đơn thương mại (Commercial Invoice) / Kê khai giá trị thi đấu:** chỉ khi người gửi bán ngựa cho người nhận (hệ thống chỉ là hệ thống vận chuyển, không làm hợp đồng mua bán). Khách tải **bản mềm (PDF)** ở Flow 2 trước 18:00 D-1 để Specialist đối chiếu với Tờ khai Hải quan điện tử do khách tự khai. **Bản gốc:** khách in tối thiểu **03 – 05 bản** ký tên, đóng dấu mộc, giao Tài xế ở Flow 3 & 4 để kẹp vào bộ chứng từ gốc trình Hải quan cửa khẩu khi thông quan. (Hợp đồng vận tải giữa khách và nhà xe là hợp đồng khác, ký lúc đóng cọc ở Flow 1.)
4. **Sổ ATA Carnet** (bắt buộc với diện Tạm nhập – Tái xuất phục vụ thi đấu / biểu diễn): bản gốc cuống sổ còn nguyên vẹn để Hải quan hai nước đóng dấu.
5. **Hồ sơ phương tiện vận tải liên vận quốc tế:**
   - Giấy phép vận tải đường bộ quốc tế liên vận (Hiệp định CLV: Campuchia – Lào – Việt Nam, hoặc song phương).
   - Giấy đăng kiểm an toàn kỹ thuật phương tiện chuyên dụng chở ngựa (còn hạn).
   - Bảo hiểm trách nhiệm dân sự bắt buộc của phương tiện, hiệu lực tại các quốc gia trong lộ trình.
   - Hộ chiếu và Giấy phép lái xe quốc tế / liên vận hợp lệ của tài xế và phụ xe áp tải.

### 12.3. Quy trình tiếp nhận & kiểm tra chứng từ (Check-in SOP)

1. **Tiền kiểm — hai thời điểm tải hồ sơ điện tử (tuyến Quốc tế; tuyến Nội địa xem mục 12.4).** Quy tắc: giấy nào không cần thông tin của hệ thống thì nộp trước lúc tạo đơn; giấy nào cần thông tin của hệ thống thì nộp sau khi đã cọc.

   | Thời điểm | Giấy | Ghi chú |
   |---|---|---|
   | **Lúc tạo đơn** (Flow 1) | Hộ chiếu ngựa; Sổ tiêm phòng; Hồ sơ xét nghiệm dịch tễ (EIA / EVA, Cúm, Dại); Import Permit (nộp mới hoặc lấy từ Kho hồ sơ, Specialist thẩm định sơ bộ) | Không phụ thuộc xe, tài xế, cửa khẩu |
   | **Lúc thanh toán cọc** (Flow 1) | Hợp đồng vận tải: tạo và khách ký số / chấp thuận cùng lúc đóng cọc 50% | Không phải giấy khách tự chuẩn bị |
   | **Sau khi cọc, trước 18:00 D-1** (Flow 2) | Health Cert (Giấy kiểm dịch); Tờ khai hải quan; PoA; ATA Carnet (nếu có); Giấy cách ly trước xuất phát (nếu nước đến yêu cầu, nộp sau khi hoàn thành cách ly 7 – 14 ngày); Hóa đơn thương mại, bản mềm PDF (nếu người gửi bán ngựa cho người nhận) | Cần biển số xe, Driver / Escort, cửa khẩu từ Carrier Info Sheet; hóa đơn để Specialist đối chiếu với Tờ khai hải quan khách tự khai |
   | **Hệ thống / nhà xe cấp, khách không tải** | Carrier Info Sheet (phát hành ngay sau cọc); Consignment Note / Waybill; Hồ sơ phương tiện (giấy phép liên vận CLV, đăng kiểm, bảo hiểm xe, hộ chiếu / bằng lái tài xế và phụ xe) | Waybill và giấy xe / tài xế phát hành ở Flow 3, sau khi Manager duyệt Trip Manifest |

   Hệ thống đối soát mã chip, ngày cấp phép và thông tin tài xế / xe.
2. **Bàn giao thực tế tại điểm bốc hàng:** người giao ngựa ký biên bản giao nhận chứng từ vật lý với tài xế / người áp tải. Mọi thiếu sót hoặc sai lệch thông tin trên bản gốc so với bản tải lên hệ thống dẫn đến **đình chỉ xuất phát tạm thời**.
3. **Sự cố giấy tờ tại cửa khẩu:** nếu cơ quan chức năng yêu cầu bổ sung hoặc giải trình chuyên sâu ngoài phạm vi vận chuyển tiêu chuẩn, tài xế kích hoạt liên lạc trực tuyến 3 bên (Hải quan – Nhân viên điều vận – Chủ hàng).

### 12.4. Danh mục giấy tờ tuyến Nội địa

Nội địa = đi và đến đều trong Việt Nam. Danh mục này áp dụng cho mọi đơn di chuyển qua địa giới cấp tỉnh, và phải tuân thủ quy định của Chi cục Chăn nuôi & Thú y cấp tỉnh. Không qua cửa khẩu, nên bỏ toàn bộ giấy xuất / nhập khẩu và thủ tục hải quan. Giữ nguyên quy tắc hai thời điểm nộp (mục 12.3), Cut-off 18:00 D-1, và thu bản gốc tại điểm đón.

| Thời điểm | Giấy |
|---|---|
| **Lúc tạo đơn** | Hộ chiếu ngựa (bản gốc có Microchip trùng chip trên thân ngựa); Sổ tiêm phòng, gồm Tiêm phòng Cúm ngựa (còn hạn trong 6 – 12 tháng) và Tiêm phòng Uốn ván (còn hiệu lực); Xét nghiệm EIA / Coggins âm tính trong vòng 6 – 12 tháng |
| **Lúc thanh toán cọc** | Hợp đồng vận tải: tạo và khách ký số / chấp thuận cùng lúc đóng cọc 50% |
| **Sau khi cọc, trước 18:00 D-1** | Health Cert nội địa (mộc đỏ, Chi cục Chăn nuôi & Thú y cấp tỉnh cấp, hiệu lực 15 – 30 ngày); **PoA bắt buộc** (Giấy ủy quyền áp tải, để đối soát với CSGT và Quản lý thị trường liên tỉnh, tránh bị giữ xe vì nghi vấn vận chuyển động vật không rõ nguồn gốc) |
| **Hệ thống / nhà xe cấp, khách không tải** | Carrier Info Sheet (không có mục cửa khẩu); Waybill; Trip Manifest; Đăng kiểm xe và Bảo hiểm trách nhiệm dân sự của xe; CCCD và GPLX của Driver, CCCD của Escort |

**Khám lâm sàng:** ngựa không sốt, không lở loét móng, không có triệu chứng hô hấp.

**Đơn đi và đến trong cùng một tỉnh:** tạm thời áp dụng như đơn Nội địa thông thường (danh mục trên). Danh mục giản lược cho đơn cùng tỉnh chốt sau.

**Không áp dụng cho nội địa:** Import Permit, Chứng nhận cách ly trước xuất phát, ATA Carnet, Hóa đơn thương mại / Kê khai giá trị, Tờ khai hải quan, Giấy phép vận tải liên vận quốc tế, hộ chiếu tài xế và phụ xe.

**Bản gốc Driver thu tại điểm đón (Flow 4):** Health Cert nội địa và PoA, cùng Hộ chiếu ngựa. Trả lại cho Consignee ở điểm giao như tuyến quốc tế.

**Khác với tuyến Quốc tế:** Carrier Clearance Kit nội địa không có Clearance Guideline cửa khẩu; Flow 4 bỏ mốc 3 và mốc 4 (cửa khẩu, thông quan); Specialist không đối chiếu Tờ khai hải quan và cửa khẩu.

---

## 13. Trạng thái đơn hàng

Theo thứ tự xuất hiện trong quy trình:

| Giai đoạn | Trạng thái |
|---|---|
| Flow 1 | `Pending Manager Intake` → `Under Internal Review` → `Pending Final Commercial Approval` → `Awaiting Payment` (hoặc `Quote Expired`) |
| Flow 2 | `Awaiting Clearance Documents` → `Documents Submitted - Pending Review` → `Pending Resubmission` / `Legal Docs Approved` → `Dispatch Approved`; quá hạn: `Documentation Delayed` |
| Flow 3 | `Route Planning in Progress` → `Route Plan Completed` → `Trip Manifest Approved` → `Ready for Pickup` → `En Route to Pickup` |
| Flow 4 | `In Transit - Leg 1` → `Delayed Check-in` (cờ cảnh báo của Coordinator) → `Delivered - Pending Settlement` |
| Flow 5 | `Incident Reported - Action Required` → `Pending Emergency Approval` → `Emergency Plan Active` → `In Transit` |
| Flow 6 | `Expenses Submitted - Pending Audit` → `Settlement Issued - Awaiting Final Payment` → `Fully Paid` → `Order Completed` → `Archived / Completed`; quá hạn: `Payment Overdue` |
| Hủy đơn | `Cancelled` (khách bấm Cancel Order, hoàn / mất cọc theo mục 8.3) |

---

## 14. Điểm cần chốt

Quy trình gốc đã đủ để dựng. Các điểm dưới đây là **giả định tạm** khi dựng giao diện Flow 1–4, cần chủ dự án xác nhận hoặc thay số thật.

1. **Biểu giá chưa có công thức chính thức.** Đang dùng số mẫu trong `src/shared/config/booking-rules.ts`: cước theo km và hạng xe (bậc km của trang tra cước, hệ số 1,0 / 1,4 / 1,9 cho Light / Medium / Heavy), nhân sự 1.800.000 đ/ngày, khoang đơn mở rộng 1.500.000 đ/ngựa, Carrier Info Sheet 300.000 đ (quốc tế), bảo hiểm 2% giá trị theo giống (`BREED_INSURED_VALUE`: Thoroughbred 1 tỷ, Arabian 800 triệu, Warmblood 900 triệu, Quarter Horse 600 triệu, Appaloosa 500 triệu, Khác 400 triệu), phí lưu xe 400.000 đ/giờ.
2. **Dữ liệu danh bạ mẫu:** trạm Thú y khẩn cấp (tên, số điện thoại), số khung, số đăng kiểm, giấy phép liên vận của xe, CCCD và GPLX của nhân sự đều là số sinh mẫu.
3. **Hủy đơn:** nút "bất khả kháng" do khách tự tick, chưa có bước nhân viên đối chiếu giấy chứng nhận. Hủy khi xe đã nhận ngựa (đang vận chuyển) chưa làm, thuộc mục 8.1.
4. **Mốc nhận lệnh:** Ready for Pickup đặt khi cả Driver và Escort đều bấm nhận lệnh trên app; En Route to Pickup khi Driver bấm bắt đầu đến điểm đón.
5. **Chia chặng nội địa:** tuyến nội địa trong bộ địa điểm hiện có đều ngắn (dưới 4 giờ lái) nên thường không cần trạm nghỉ; quy tắc 3–4 giờ vẫn áp dụng và có kiểm tra.
6. **Chưa làm (Flow 5, 6):** SOS và xử lý sự cố, kê khai chi phí có chứng từ, quyết toán, thanh toán số dư, đánh giá, đóng đơn, Payment Overdue, Consignee từ chối nhận. Các trang cũ của Manager (Bảng điều khiển, Nhân sự, Báo cáo chuyến đi, Sự cố & Chi phí), Điều phối (Sự cố, Đội xe) và trang Nghiệm thu của khách vẫn chạy trên dữ liệu cũ.
