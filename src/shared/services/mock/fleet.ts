// Đội xe và người đi theo chuyến (tài xế, hộ tống). Gốc: Fleet And Route/ops_data.js (vehicles, staff).
// Gộp thêm xe và người đã ghi trong đơn mẫu (review, trip.contacts) để mọi trang dùng chung một danh sách.
// Mỗi xe có một tài xế cố định: chọn xe là gán tài xế theo.

export type VehicleStatus = 'available' | 'in_use' | 'maintenance'
export interface Vehicle {
  id: string
  name: string
  type: string
  capacity: number // số ngăn
  plate: string
  status: VehicleStatus
  maintenance: string // ngày bảo trì gần nhất (YYYY-MM-DD)
  driverId: string
}

export interface CrewMember { id: string; name: string; role: 'driver' | 'escort'; phone: string; note?: string }

export const seedVehicles = (): Vehicle[] => [
  { id: 'VH-001', name: 'Xe Thùng VIP', type: 'Xe tải chuyên dụng', capacity: 2, plate: '29H-12345', status: 'in_use', maintenance: '2026-09-15', driverId: 'TX-01' },
  { id: 'VH-002', name: 'Xe Thùng Tiêu chuẩn', type: 'Xe tải chuyên dụng', capacity: 4, plate: '51C-98765', status: 'available', maintenance: '2026-09-10', driverId: 'TX-02' },
  { id: 'VH-003', name: 'Xe Thùng Lạnh', type: 'Xe tải chuyên dụng', capacity: 4, plate: '30A-55678', status: 'in_use', maintenance: '2026-09-01', driverId: 'TX-03' },
  { id: 'VH-004', name: 'Xe Container Quốc tế', type: 'Container đặc biệt', capacity: 6, plate: '51D-11122', status: 'available', maintenance: '2026-09-08', driverId: 'TX-04' },
  { id: 'VH-005', name: 'Xe Thùng VIP', type: 'Xe tải chuyên dụng', capacity: 2, plate: '43C-222.11', status: 'maintenance', maintenance: '2026-09-20', driverId: 'TX-06' },
  { id: 'VH-006', name: 'Xe Mui bạt', type: 'Xe tải chuyên dụng', capacity: 2, plate: '65C-101.22', status: 'available', maintenance: '2026-09-12', driverId: 'TX-05' },
  { id: 'VH-007', name: 'Xe chuyên dụng 4 ngăn', type: 'Xe tải chuyên dụng', capacity: 4, plate: '51C-123.45', status: 'in_use', maintenance: '2026-09-05', driverId: 'TX-07' },
  { id: 'VH-008', name: 'Xe chuyên dụng 2 ngăn', type: 'Xe tải chuyên dụng', capacity: 2, plate: '60C-222.10', status: 'available', maintenance: '2026-09-18', driverId: 'TX-08' },
  { id: 'VH-009', name: 'Xe chuyên dụng 4 ngăn', type: 'Xe tải chuyên dụng', capacity: 4, plate: '29H-456.78', status: 'available', maintenance: '2026-09-11', driverId: 'TX-09' },
  { id: 'VH-010', name: 'Xe chuyên dụng 4 ngăn', type: 'Xe tải chuyên dụng', capacity: 4, plate: '51C-888.99', status: 'available', maintenance: '2026-09-03', driverId: 'TX-10' },
  { id: 'VH-011', name: 'Xe chuyên dụng 2 ngăn', type: 'Xe tải chuyên dụng', capacity: 2, plate: '61C-345.67', status: 'available', maintenance: '2026-09-16', driverId: 'TX-11' },
  { id: 'VH-012', name: 'Xe chuyên dụng 2 ngăn', type: 'Xe tải chuyên dụng', capacity: 2, plate: '70C-045.18', status: 'available', maintenance: '2026-09-09', driverId: 'TX-12' },
  { id: 'VH-013', name: 'Xe chuyên dụng 2 ngăn', type: 'Xe tải chuyên dụng', capacity: 2, plate: '29C-310.77', status: 'available', maintenance: '2026-09-14', driverId: 'TX-13' },
]

export const seedCrew = (): CrewMember[] => [
  { id: 'TX-01', name: 'Nguyễn Văn A', role: 'driver', phone: '0901 111 222' },
  { id: 'TX-02', name: 'Trần Văn B', role: 'driver', phone: '0901 333 444' },
  { id: 'TX-03', name: 'Lê Văn C', role: 'driver', phone: '0901 555 666' },
  { id: 'TX-04', name: 'Phạm Văn D', role: 'driver', phone: '0901 777 888' },
  { id: 'TX-05', name: 'Đặng Hoài Phúc', role: 'driver', phone: '0901 999 000' },
  { id: 'TX-06', name: 'Lê Minh Tuấn', role: 'driver', phone: '0903 121 314' },
  { id: 'TX-07', name: 'Nguyễn Văn Hùng', role: 'driver', phone: '0908 111 222' },
  { id: 'TX-08', name: 'Phan Thanh Hải', role: 'driver', phone: '0903 515 717' },
  { id: 'TX-09', name: 'Trần Quốc Bảo', role: 'driver', phone: '0903 818 919' },
  { id: 'TX-10', name: 'Phạm Đức Anh', role: 'driver', phone: '0904 202 303' },
  { id: 'TX-11', name: 'Võ Thanh Sơn', role: 'driver', phone: '0904 404 505' },
  { id: 'TX-12', name: 'Lê Văn Tài', role: 'driver', phone: '0904 606 707' },
  { id: 'TX-13', name: 'Trịnh Văn Long', role: 'driver', phone: '0904 808 909' },
  { id: 'NV-01', name: 'Lê Thị C', role: 'escort', phone: '0902 111 222', note: 'NVCS 5 năm KN' },
  { id: 'NV-02', name: 'Võ Thị Lan', role: 'escort', phone: '0908 333 444', note: 'NVCS 3 năm KN' },
  { id: 'NV-03', name: 'Huỳnh Thị Mai', role: 'escort', phone: '0902 555 666', note: 'NVCS 2 năm KN' },
  { id: 'NV-04', name: 'Đỗ Văn Nam', role: 'escort', phone: '0902 777 888', note: 'NVCS 4 năm KN' },
  { id: 'NV-05', name: 'Đỗ Thị Hạnh', role: 'escort', phone: '0902 999 000', note: 'NVCS 1 năm KN' },
]
