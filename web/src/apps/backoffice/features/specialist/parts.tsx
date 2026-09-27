// Thành phần dùng chung 2 luồng Kiểm dịch: xem tài liệu, dòng thông tin đơn.
import type { ReactNode } from 'react'
import { Modal } from '@shared/ui/Modal'
import s from './Specialist.module.css'

export const FilePreview = ({ file, note = 'Bản xem trước tài liệu khách tải lên', onClose }: { file: string; note?: string; onClose: () => void }) => (
  <Modal title="Xem tài liệu" onClose={onClose} footer={<button className="btn btn-ghost" onClick={onClose}>Đóng</button>}>
    <div className={s.preview}><i className="fa-solid fa-file-pdf" /><b>{file}</b><span>{note}</span></div>
  </Modal>
)

export const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => <div className={s.infoRow}><span>{label}</span><span>{children}</span></div>
