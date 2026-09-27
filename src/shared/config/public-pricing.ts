// Bảng giá CÔNG KHAI (khách được thấy). Chuyển nguyên từ home.js.
// Giá vốn, biên lãi KHÔNG đặt ở đây: xem apps/backoffice/config.

export const TRIP_OPEN_FEE = 3_000_000 // phí mở chuyến, mỗi xe
export const KM_TIERS: [number, number][] = [[300, 26_000], [600, 20_000], [Infinity, 15_000]] // [đến km, ₫/km], mỗi xe 2 ngăn
export const BIG_TRUCK_FACTOR = 1.4 // xe 4 ngăn
export const QUARANTINE_FEE = { domestic: 900_000, border: 3_800_000 } // mỗi ngựa
export const CARE_FEE_PER_DAY = 800_000 // mỗi ngựa, mỗi ngày
export const INSURANCE_RATE = { basic: 0.02, full: 0.05 } // theo giá trị ngựa khai báo

// Ước tính quãng đường và thời gian
export const ROAD_FACTOR = 1.35 // đường bộ dài hơn đường chim bay
export const AVG_SPEED_KMH = 50
export const BORDER_HOURS = 3
export const DRIVE_HOURS_PER_DAY = 10
