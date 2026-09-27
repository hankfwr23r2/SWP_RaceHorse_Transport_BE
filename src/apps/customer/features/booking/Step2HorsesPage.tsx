// Bước 2: Thông tin từng ngựa. Chuyển từ CUS/create_request_step2.html + initStep2().
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { BookingShell } from './BookingShell'
import { DEMO_HORSES, DEMO_MODE, useBookingDraft, type DraftHorse } from './draft'
import s from './Booking.module.css'

const BREEDS: [string, string][] = [['thoroughbred', 'Thoroughbred (Anh)'], ['arabian', 'Arabian (Ả Rập)'], ['quarter', 'Quarter Horse'], ['warmblood', 'Warmblood'], ['appaloosa', 'Appaloosa'], ['other', 'Khác']]
const GENDERS: [string, string][] = [['stallion', 'Đực (Stallion)'], ['mare', 'Cái (Mare)'], ['gelding', 'Thiến (Gelding)']]
const blankHorse = (id: number): DraftHorse => ({ id, name: '', microchip: '', breed: '', breedValue: '', gender: '', genderValue: '', age: '', weight: '', color: '', colorValue: '', marks: '', completed: false })
const isComplete = (h: DraftHorse) => !!(h.name && h.microchip && h.breedValue && h.genderValue && h.weight && h.colorValue)

export default function Step2HorsesPage() {
  const navigate = useNavigate()
  const { draft, save } = useBookingDraft()
  const quantity = DEMO_MODE ? 3 : Math.max(1, Number(draft.quantity) || 1)
  const [horses, setHorses] = useState<DraftHorse[]>(() =>
    DEMO_MODE ? DEMO_HORSES.slice(0, quantity) : Array.from({ length: quantity }, (_, i) => draft.horses.find(h => h.id === i + 1) ?? blankHorse(i + 1)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { save({ horses, quantity }) }, [])
  const [currentId, setCurrentId] = useState(1)
  const [warning, setWarning] = useState('')
  const horse = horses.find(h => h.id === currentId)!

  const edit = (patch: Partial<DraftHorse>) => {
    setWarning('')
    const next = horses.map(h => (h.id === currentId ? { ...h, ...patch } : h)).map(h => ({ ...h, completed: isComplete(h) }))
    setHorses(next)
    save({ horses: next })
  }
  const pick = (options: [string, string][], valueKey: 'breed' | 'gender' | 'color') => (value: string) =>
    edit({ [`${valueKey}Value`]: value, [valueKey]: options.find(o => o[0] === value)?.[1] ?? '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const incomplete = horses.find(h => !h.completed)
    if (incomplete) {
      setWarning(`Vui lòng hoàn thành thông tin Ngựa #${incomplete.id} trước khi tiếp tục.`)
      setCurrentId(incomplete.id)
      return
    }
    save({ horses, quantity: horses.length })
    navigate('/booking/services')
  }

  return (
    <BookingShell step={2} crumb="Bước 2: Thông tin cá thể ngựa" title="Khai báo Thông tin Cá thể Ngựa" subtitle="Đặc điểm sinh trắc học và hình ảnh giúp đối chiếu mã định danh vi chip khi bàn giao vận chuyển.">
      <form onSubmit={submit}>
        <div className="card">
          <div className="card-header">
            <h2><i className="fa-solid fa-horse-head" /> Cá thể Ngựa #{horse.id}{horse.name && ` — ${horse.name}`} — Thông tin Nhận dạng</h2>
            <span className="badge badge-muted">Thông tin tự động lưu khi chuyển cá thể</span>
          </div>
          <div className={s.horseBar}>
            <div className={`form-group ${s.formGroup}`}>
              <label htmlFor="horse_selector">Cá thể</label>
              <select id="horse_selector" className="form-control" value={currentId} onChange={e => setCurrentId(Number(e.target.value))}>
                {horses.map(h => <option key={h.id} value={h.id}>Ngựa #{String(h.id).padStart(2, '0')}{h.name ? ` — ${h.name}` : ' — Chưa khai báo'}{h.completed ? ' · Đã khai báo' : ''}</option>)}
              </select>
            </div>
            <span className="badge badge-info">Đã khai báo {horses.filter(h => h.completed).length} / {quantity}</span>
          </div>
          {warning && <div className="alert alert-danger" style={{ marginBottom: 16 }}><i className="fa-solid fa-circle-exclamation" /> {warning}</div>}

          <div className={s.grid2}>
            <div className="form-group"><label className="required">Tên ngựa (Tên đăng ký thi đấu)</label><input className="form-control" placeholder="VD: Storm Runner" value={horse.name} onChange={e => edit({ name: e.target.value })} /></div>
            <div className="form-group"><label className="required">Mã Vi chip Microchip ID</label><input className="form-control" placeholder="VD: #VN-985211" value={horse.microchip} onChange={e => edit({ microchip: e.target.value })} /></div>
            <div className="form-group"><label className="required">Giống ngựa</label>
              <select className="form-control" value={horse.breedValue} onChange={e => pick(BREEDS, 'breed')(e.target.value)}><option value="">— Chọn giống —</option>{BREEDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="form-group"><label className="required">Giới tính</label>
              <select className="form-control" value={horse.genderValue} onChange={e => pick(GENDERS, 'gender')(e.target.value)}><option value="">— Chọn —</option>{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="form-group"><label>Tuổi (Năm)</label><input className="form-control" type="number" min={1} max={30} placeholder="Tuổi" value={horse.age} onChange={e => edit({ age: e.target.value })} /></div>
            <div className="form-group"><label className="required">Trọng lượng (kg)</label><input className="form-control" type="number" placeholder="kg" value={horse.weight} onChange={e => edit({ weight: e.target.value })} /></div>
            <div className="form-group"><label className="required">Màu sắc lông chính</label>
              <input className="form-control" placeholder="VD: Nâu đỏ (Bay)" value={horse.color} onChange={e => edit({ color: e.target.value, colorValue: e.target.value })} /></div>
            <div className="form-group"><label>Đặc điểm dị biệt nhận dạng (nếu có)</label><input className="form-control" placeholder="VD: Vệt trắng chữ sao ở trán, đốm chân sau bên phải" value={horse.marks} onChange={e => edit({ marks: e.target.value })} /></div>
          </div>
          <div className="form-group">
            <label className="required">Hình ảnh đối chiếu nhận dạng</label>
            <div className={s.upload}><i className="fa-solid fa-cloud-arrow-up" />Kéo thả hình ảnh hoặc <span className="text-orange font-semibold">chọn tệp từ máy</span><br />Yêu cầu ảnh toàn thân + góc chụp khuôn mặt (JPG/PNG, tối đa 5MB)</div>
            <span className={s.fileChip}><i className="fa-solid fa-circle-check" /> Đã chọn 2 ảnh ({horse.name ? horse.name.toLowerCase().replace(/\s+/g, '_') : 'horse'}_profile.jpg, front.jpg)</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2><i className="fa-solid fa-file-shield" /> Hồ sơ Pháp lý & Giấy tờ Thú y</h2><span className="badge badge-warning">Bắt buộc thẩm định</span></div>
          <div className={s.grid2}>
            <div className="form-group">
              <label className="required">Hộ chiếu Ngựa (Horse Passport)</label>
              <div className={s.upload}><i className="fa-solid fa-passport" />Kéo thả file Hộ chiếu hoặc <span className="text-orange font-semibold">Chọn tệp</span><br />Định dạng PDF, JPG hoặc PNG (Tối đa 5MB)</div>
              <span className={s.fileChip}><i className="fa-solid fa-file-pdf" /> passport_storm_runner.pdf (2.4 MB)</span>
            </div>
            <div className="form-group">
              <label className="required">Sổ Tiêm chủng / Chứng nhận Kiểm dịch</label>
              <div className={s.upload}><i className="fa-solid fa-syringe" />Kéo thả sổ tiêm hoặc <span className="text-orange font-semibold">Chọn tệp</span><br />Yêu cầu vacxin cúm ngựa (Equine Influenza) trong 6 tháng</div>
              <span className={s.fileChip}><i className="fa-solid fa-file-pdf" /> vaccination_card_2026.pdf (1.8 MB)</span>
            </div>
          </div>
        </div>

        <div className={s.actions}>
          <Link to="/booking/route" className="btn btn-ghost"><i className="fa-solid fa-arrow-left" /> Bước 1: Tuyến đường</Link>
          <button type="submit" className="btn btn-primary">Tiếp tục: Dịch vụ & Y tế <i className="fa-solid fa-arrow-right" /></button>
        </div>
      </form>
    </BookingShell>
  )
}
