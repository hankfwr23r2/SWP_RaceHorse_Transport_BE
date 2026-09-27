// Chuyến của tôi (tài xế). Chuyển nguyên giao diện Driver/index.html + style.css + script.js; dữ liệu lấy từ kho chung:
// mốc check-in = hành trình của đơn (khách thấy ngay ở trang Theo dõi). Mốc cuối → đơn Đã giao, khách có 24 giờ nghiệm thu.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDate } from '@shared/lib/format'
import { splitStop } from '@shared/lib/trip'
import { tripsApi } from '@shared/services/trips'
import type { Checkpoint } from '@shared/types/order'
import { TranslateToggle } from '@shared/ui/TranslateToggle'
import { useOps } from '../../shared/useOps'
import s from './Driver.module.css'

// Tên class của CSS cũ → class đã đổi tên của CSS module; class ngoài (Font Awesome) giữ nguyên
const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).map(n => s[n as string] ?? n).join(' ')
const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

type Tab = 'progress' | 'trip'
const NAV: [Tab, string, string, string][] = [
  ['progress', 'fa-route', 'Tiến độ Vận chuyển', 'Tiến độ'],
  ['trip', 'fa-clipboard-list', 'Xem Chuyến đi', 'Xem Chuyến'],
]

export default function DriverPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const { trips, crew, vehicle, name, reload } = useOps()
  const [tab, setTab] = useState<Tab>('progress')
  const me = crew.find(c => c.role === 'driver' && c.name === session!.name)
  // Chuyến đang chạy trước, sau đó chuyến sắp khởi hành gần nhất
  const t = trips
    .filter(x => (x.status === 'in_transit' || x.status === 'assigned') && x.legs.some(l => l.driverId === me?.id))
    .sort((a, b) => Number(b.status === 'in_transit') - Number(a.status === 'in_transit') || a.order.departAt - b.order.departAt)[0]
  const o = t?.order
  const running = t?.status === 'in_transit'
  // Chưa khởi hành: các mốc theo điểm dừng, khóa hết
  const milestones: Checkpoint[] = o?.trip?.checkpoints ?? (o?.stops ?? []).map(x => { const p = splitStop(x); return { label: p.act.charAt(0).toUpperCase() + p.act.slice(1), place: p.place, time: o!.departAt, state: 'next' } })
  const escort = t?.legs[0]?.escortId

  const checkIn = async (last: boolean) => {
    await tripsApi.checkIn(o!.id)
    reload()
    if (last) setTimeout(() => alert('Đã hoàn tất chuyến đi! Tất cả các chặng đã được check-in.'), 300)
  }

  // Lộ trình chi tiết: các chặng xe chạy, xen bước thông quan khi chặng sau bắt đầu ở cửa khẩu phía bên kia
  const stages = t ? t.legs.flatMap((l, i) => {
    const prev = t.legs[i - 1]
    const gate = prev && prev.to !== l.from ? [{ gate: true as const, from: prev.to, to: l.from }] : []
    return [...gate, { gate: false as const, from: l.from, to: l.to, vehicleId: l.vehicleId }]
  }) : []

  return (
    <div className={cls('app-container')}>
      <header className={cls('topbar')}>
        <div className={cls('topbar-logo')}>
          <div className={cls('logo-box')}>EQ</div>
          <span>EquineZLogistics</span>
        </div>
        <div className={cls('driver-info')}>
          <span className={cls('driver-name')}>Đội ngũ Tài xế</span>
          <span className={cls('separator')}>|</span>
          <button className={cls('logout-btn')} onClick={() => { logout(); navigate('/login') }}><i className="fa-solid fa-right-from-bracket" /> Đăng xuất</button>
        </div>
      </header>

      <div className={cls('body-layout')}>
        <aside className={cls('sidebar', 'desktop-only')}>
          <nav className={cls('sidebar-nav')}>
            {NAV.map(([key, icon, label]) => <button key={key} className={cls('nav-item', tab === key && 'active')} onClick={() => setTab(key)}><i className={`fa-solid ${icon}`} /><span>{label}</span></button>)}
          </nav>
        </aside>

        <main className={cls('main-content')}>
          <section className={cls('tab-content', tab === 'trip' && 'active')}>
            <div className={cls('page-header')}>
              <h1>Chi tiết Chuyến đi được phân công</h1>
              <p>Thông tin về chuyến vận chuyển hiện tại của bạn.</p>
            </div>
            {o && (
              <div className={cls('trip-card')}>
                <div className={cls('trip-header')}>
                  <div>
                    <h2>Mã Đơn hàng: {o.id}</h2>
                    <p className={cls('route')}><i className="fa-solid fa-truck" /> {o.from} &rarr; <i className="fa-solid fa-flag-checkered" /> {o.to}</p>
                  </div>
                  <span className={cls('status-badge', 'in-progress')}>{running ? 'Đang Vận chuyển' : 'Chờ khởi hành'}</span>
                </div>
                <div className={cls('trip-body')}>
                  <div className={cls('info-grid')}>
                    <div className={cls('info-block')}><span className={cls('info-label')}>Khách hàng</span><span className={cls('info-value')}>{o.customer}</span></div>
                    <div className={cls('info-block')}><span className={cls('info-label')}>Ngựa</span><span className={cls('info-value')}>{o.horses.length} x {o.horses.map(h => h.name).join(', ')}</span></div>
                    <div className={cls('info-block')}><span className={cls('info-label')}>Điểm Khởi Hành</span><span className={cls('info-value')}>{formatDate(milestones[0]?.time ?? o.departAt)} - {clock(milestones[0]?.time ?? o.departAt)}</span></div>
                    <div className={cls('info-block')}><span className={cls('info-label')}>Bác sĩ Thú y đi kèm</span><span className={cls('info-value')}>{escort ? name(escort) : '—'}</span></div>
                  </div>
                  <div className={cls('instructions-block')}>
                    <h3><i className="fa-solid fa-triangle-exclamation" /> Yêu cầu Đặc biệt</h3>
                    <p>{o.customerNote || 'Không có yêu cầu đặc biệt.'}</p>
                  </div>
                  <div className={cls('detailed-route-plan')} style={{ marginTop: 24 }}>
                    <h3 style={{ color: 'var(--primary-color)', marginBottom: 16, fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Lộ trình Chi tiết (Bộ phận Điều phối)</h3>
                    {stages.map((st, i) => (
                      <div key={i} className={cls('route-stage')}>
                        <div className={cls('stage-icon')}><i className={`fa-solid ${st.gate ? 'fa-flag' : 'fa-truck'}`} /></div>
                        <div className={cls('stage-info')}>
                          {st.gate ? <>
                            <h4>Chặng {i + 1}: Thông quan Cửa khẩu</h4>
                            <p><strong>Thủ tục:</strong> Hải quan &amp; kiểm dịch thú y hai bên</p>
                            <p><strong>Từ:</strong> {st.from}</p>
                            <p><strong>Đến:</strong> {st.to}</p>
                          </> : <>
                            <h4>Chặng {i + 1}: {st.from} đến {st.to}</h4>
                            <p><strong>Từ:</strong> {st.from}</p>
                            <p><strong>Đến:</strong> {st.to}</p>
                            <p><strong>Phương tiện:</strong> {vehicle(st.vehicleId)?.type} EQ (Biển số: {vehicle(st.vehicleId)?.plate})</p>
                          </>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className={cls('tab-content', tab === 'progress' && 'active')}>
            <div className={cls('page-header')}>
              <h1>Tiến độ Vận chuyển</h1>
              <p>Check-in tại mỗi cột mốc để cập nhật hệ thống.</p>
            </div>
            {!o && <p>Bạn chưa được phân công chuyến nào.</p>}
            <div className={cls('milestones-container')}>
              {milestones.map((m, i) => {
                const last = i === milestones.length - 1
                const state = running ? m.state : 'next'
                return (
                  <div key={i} className={cls('milestone', state === 'done' ? 'completed' : state === 'current' ? 'active' : 'disabled')}>
                    {!last && <div className={cls('milestone-line')} />}
                    <div className={cls('milestone-icon')}>{state === 'done' ? <i className="fa-solid fa-check" /> : i + 1}</div>
                    <div className={cls('milestone-content')}>
                      <div className={cls('milestone-header')}>
                        <h3>{i + 1}. {m.label}</h3>
                        {state === 'done' ? <span className={cls('m-status', 'completed-text')}>Đã hoàn thành</span>
                          : state === 'current' ? <span className={cls('m-status', 'pending-text')}>Chờ xử lý</span>
                          : <span className={cls('m-status', 'disabled-text')}>Đã khóa</span>}
                      </div>
                      <p className={cls('m-desc')}>{m.place}</p>
                      <div className={cls('m-action')}>
                        {state === 'done'
                          ? <span className={cls('timestamp')}>Đã check-in lúc {clock(m.time)}</span>
                          : <button className={cls('btn-checkin')} disabled={state !== 'current'} onClick={() => checkIn(last)}><i className="fa-solid fa-location-dot" /> {last ? 'Kết thúc Chuyến' : 'Check In'}</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </main>
      </div>

      <nav className={cls('bottom-nav', 'mobile-only')}>
        {NAV.map(([key, icon, , label]) => <button key={key} className={cls('bottom-nav-item', tab === key && 'active')} onClick={() => setTab(key)}><i className={`fa-solid ${icon}`} /><span>{label}</span></button>)}
      </nav>
      <TranslateToggle />
    </div>
  )
}
