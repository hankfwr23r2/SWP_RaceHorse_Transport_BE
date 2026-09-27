// Cổng khách hàng sau đăng nhập. Chuyển từ CUS/home_auth.html (đã bỏ nội dung hàng không).
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { CountUp, useScrollReveal } from '@shared/motion/motion'
import s from './PortalPage.module.css'

const STATS: [React.ReactNode, string][] = [[<CountUp key="safe" to={100} suffix="%" />, 'An toàn Sinh học'], [<CountUp key="countries" to={3} />, 'Quốc gia Kết nối'], ['24/7', 'Nhân viên chăm sóc đi kèm'], ['< 24h', 'Thẩm định Hồ sơ']]

const SERVICES = [
  { img: '/images/truck.jpg', icon: 'fa-truck-fast', title: 'Đội xe tải Chuyên dụng', text: 'Xe tải chuyên dụng 2 đến 9 khoang với hệ thống treo bóng hơi điện tử giảm chấn triệt để, vách ngăn bọc nệm dày và camera giám sát trực tiếp từng chuồng.', features: ['Điều hòa không khí 2 chiều ổn định 20 - 24°C', 'Cầu dẫn thủy lực chống trơn trượt'] },
  { img: '/images/vet.jpg', icon: 'fa-file-shield', title: 'Pháp lý & Kiểm dịch', text: 'Đại diện chủ sở hữu hoàn tất trọn gói thủ tục hải quan xuất nhập cảnh, hộ chiếu ngựa (Horse Passport), kiểm tra vi chip và xét nghiệm thú y.', features: ['Xin phép nhập khẩu & xuất khẩu động vật sống', 'Bố trí trạm cách ly thú y đạt chuẩn trước khi khởi hành'] },
]

const PROCESS: [string, string][] = [
  ['Tiếp nhận & Lập Hồ sơ', 'Khách hàng gửi yêu cầu vận chuyển, tải lên Hộ chiếu ngựa và Sổ tiêm phòng trực tuyến trên hệ thống.'],
  ['Thẩm định & Báo giá', 'Quản lý kiểm tra điều kiện vận chuyển, đối soát yêu cầu thú y và gửi bảng Báo giá chính thức trong vòng 24h.'],
  ['Kiểm dịch & Điều phối', 'Bộ phận vận hành xin giấy chứng nhận kiểm dịch, bố trí xe tải giảm chấn và khoang chuồng phù hợp.'],
  ['Vận chuyển & Bàn giao', 'Nhân viên chăm sóc đi kèm, khách hàng theo dõi nhịp tim trên hệ thống và ký biên bản nghiệm thu khi nhận ngựa.'],
]

const TERMS: [string, string, string][] = [
  ['fa-shield-halved', '1. Trách nhiệm Bảo hiểm', 'Công ty chịu trách nhiệm bảo hiểm toàn diện 100% giá trị ngựa đua trong suốt quá trình vận chuyển. Mọi sự cố phát sinh do lỗi vận hành sẽ được đền bù theo hợp đồng đã ký kết.'],
  ['fa-scale-balanced', '2. Tuân thủ Pháp lý', 'Khách hàng có trách nhiệm cung cấp đầy đủ thông tin y tế, nguồn gốc và Horse Passport hợp lệ. Công ty sẽ đại diện hoàn tất các thủ tục Hải quan và Kiểm dịch.'],
  ['fa-handshake', '3. Chính sách Hủy & Hoàn tiền', 'Yêu cầu hủy chuyến phải được thông báo trước 72 giờ để được hoàn 100% phí cọc. Quá hạn sẽ áp dụng phí phạt.'],
]

export default function PortalPage() {
  const { session } = useAuth()
  const scope = useScrollReveal('[data-reveal]')
  return (
    <div ref={scope} className="page">
      <div className="wrap">
        <section className={s.hero}>
          <span className={s.vip}><i className="fa-solid fa-crown" /> Thành viên VIP: {session?.name}</span>
          <h1>Cổng Điều phối & Quản lý <span>Vận chuyển Ngựa đua</span></h1>
          <p>Theo dõi lộ trình trực tuyến, giám sát các chỉ số nhịp tim & thân nhiệt 24/7, xác nhận báo giá dịch vụ và quản lý hợp đồng vận tải Việt Nam · Lào · Campuchia.</p>
          <div className={s.actions}>
            <Link to="/booking/route" className="btn btn-primary btn-lg"><i className="fa-solid fa-paper-plane" /> Đặt Chuyến Vận Chuyển Mới</Link>
            <Link to="/orders" className={`btn btn-lg ${s.outlineLight}`}><i className="fa-solid fa-file-invoice-dollar" /> Xem Đơn của tôi</Link>
          </div>
        </section>

        <section className={s.stats}>
          {STATS.map(([v, l]) => <div key={l}><div className={s.statValue}>{v}</div><div className={s.statLabel}>{l}</div></div>)}
        </section>

        <section className={s.section} id="dich-vu">
          <h2 className="section-title">Dịch vụ Logistics Ngựa đua Chuyên nghiệp</h2>
          <p className="section-sub">Quy chuẩn vận tải được thiết kế chuyên biệt nhằm triệt tiêu stress, duy trì phong độ thể lực cao nhất cho các chiến mã thi đấu.</p>
          <div className={s.services}>
            {SERVICES.map(sv => (
              <div key={sv.title} data-reveal className={s.serviceCard}>
                <img src={sv.img} alt={sv.title} />
                <div className={s.serviceBody}>
                  <h3><i className={`fa-solid ${sv.icon}`} /> {sv.title}</h3>
                  <p>{sv.text}</p>
                  <ul className={s.features}>{sv.features.map(f => <li key={f}><i className="fa-solid fa-check" />{f}</li>)}</ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <h2 className="section-title">Quy trình Vận hành Chuyên nghiệp</h2>
          <p className="section-sub">Khép kín từ khâu tiếp nhận thông tin trực tuyến đến khi hoàn thành nghiệm thu bàn giao an toàn tại điểm đến.</p>
          <div className={s.process}>
            {PROCESS.map(([t, d], i) => <div key={t} data-reveal data-delay={i * 100} className={s.step}><div className={s.stepNum}>{i + 1}</div><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </section>

        <section data-reveal className="card" id="dieu-khoan">
          <h2 className="section-title"><i className="fa-solid fa-file-contract text-orange" /> Điều khoản Công ty & Cam kết</h2>
          <p className="section-sub">Chúng tôi cam kết mang lại dịch vụ minh bạch, an toàn và tuân thủ quy định pháp luật về vận chuyển động vật sống.</p>
          <div className={s.terms}>
            {TERMS.map(([icon, t, d]) => <div key={t}><h4><i className={`fa-solid ${icon}`} /> {t}</h4><p>{d}</p></div>)}
          </div>
        </section>
      </div>
    </div>
  )
}
