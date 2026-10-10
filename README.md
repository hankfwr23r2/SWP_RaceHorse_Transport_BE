# RaceHorse Transport - Monorepo

Dự án Hệ thống Vận chuyển Ngựa đua (RaceHorse Transport System).

## Cấu trúc thư mục (Monorepo)

- `backend/`: Spring Boot 3 API (Java 17, Spring Security, JWT, SQL Server, JPA/Hibernate).
- `frontend/`: React 19 + TypeScript + Vite (Customer SPA & Backoffice SPA).

---

## Hướng dẫn chạy dự án

### 1. Backend (`backend/`)
- Mở thư mục `backend/` trong IntelliJ IDEA hoặc chạy lệnh:
  ```bash
  cd backend
  ./mvnw spring-boot:run
  ```
- Backend chạy mặc định tại: `http://localhost:8080` (Context-path: `/api/v1`).

### 2. Frontend (`frontend/`)
- Di chuyển vào thư mục `frontend/`, cài đặt thư viện và chạy:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- Customer App: `http://localhost:5173/`
- Backoffice / Admin App: `http://localhost:5173/backoffice`
- Vite đã cấu hình proxy tự động chuyển tiếp `/api/v1` sang `http://localhost:8080/api/v1`.
