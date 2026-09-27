// Dự toán ở bước 4 đặt chuyến. Chuyển NGUYÊN công thức của recalculateStep4Quotation (create_request.js).
// Công thức này KHÁC bảng giá trang chủ (shared/lib/pricing.ts): giữ nguyên, chờ chốt ở docs/PRD.md mục 11–12.
import type { BookingDraft } from './draft'

export interface QuoteRow { title: string; detail: string; unit: string; qty: string; amount: number | null; includedLabel?: string }

export function legacyQuote(d: BookingDraft) {
  const isDomestic = d.originCountry === d.destCountry && d.originCountry === 'VN'
  const horseCount = d.horses.length > 0 ? d.horses.length : Number(d.quantity) || 1
  const quantity = Math.max(1, horseCount)

  let baseFreight = (isDomestic ? 25_000_000 : 120_000_000) * quantity
  const quarantineFee = (isDomestic ? 3_000_000 : 15_000_000) * quantity
  const feedFee = 500_000 * 3 * quantity // 500.000/ngày × 3 ngày × số ngựa
  const stallFee = d.stallType === 'vip' ? 12_000_000 * quantity : 0
  const insuranceRate = d.insurance === 'basic' ? 0.02 : d.insurance === 'premium' ? 0.035 : d.insurance === 'full' ? 0.05 : 0
  const horseValue = Number(d.horseValue) || 2_000_000_000
  const insuranceFee = horseValue * insuranceRate
  const escortFee = 8_500_000
  if (d.needIsolation === 'yes') baseFreight += 10_000_000

  const vnd = (n: number) => n.toLocaleString('vi-VN') + ' ₫'
  const rows: QuoteRow[] = [
    { title: isDomestic ? 'Cước vận chuyển Nội địa đường bộ chuyên dụng' : 'Cước vận chuyển đường bộ xuyên quốc gia', detail: `${d.originLocationName} → ${d.destLocationName}`, unit: vnd(baseFreight / quantity), qty: `${quantity} Cá thể`, amount: baseFreight },
    { title: isDomestic ? 'Phí Kiểm dịch Thú y liên tỉnh' : 'Phí Kiểm dịch Thú y Quốc tế & Thủ tục Hải quan OIE', detail: 'Chứng nhận an toàn sinh học và kiểm tra cửa khẩu', unit: vnd(quarantineFee / quantity), qty: `${quantity} Đơn`, amount: quarantineFee },
    { title: `Khẩu phần dinh dưỡng (${d.foodTypeName || 'Cỏ khô Timothy Hay'})`, detail: 'Dự phòng 3 ngày hành trình và thời gian trung chuyển', unit: '500,000 ₫/ngày', qty: `${3 * quantity} Khẩu phần`, amount: feedFee },
    { title: `Quy cách khoang vận chuyển: ${d.stallTypeName || 'Khoang Tiêu chuẩn'}`, detail: 'Sàn đệm cao su giảm chấn, thông khí đa chiều', unit: stallFee > 0 ? vnd(stallFee / quantity) : '—', qty: `${quantity} Khoang`, amount: stallFee > 0 ? stallFee : null, includedLabel: 'Đã bao gồm' },
    { title: `Bảo hiểm vận chuyển (${d.insuranceName || 'Gói Cơ bản'})`, detail: `Giá trị ngựa khai báo: ${vnd(horseValue)}`, unit: `${(insuranceRate * 100).toFixed(1)}% giá trị`, qty: '1 Hợp đồng', amount: insuranceFee },
    { title: 'Chuyên viên Hộ tống & Giám sát Y tế Sức khỏe 24/7 (Escort)', detail: 'Theo dõi sinh trắc, nhịp tim và báo cáo GPS theo thời gian thực', unit: vnd(escortFee), qty: '1 Chuyên viên', amount: escortFee },
  ]
  const totalCost = baseFreight + quarantineFee + feedFee + stallFee + insuranceFee + escortFee
  return { isDomestic, rows, totalCost }
}
