# DACK_DangTinDienDan

Nguyễn Đoàn Trung Hiếu — 2280600903  
Phan Anh Tứ — 2280603616

## Task 1 — Đăng nhập / đăng ký / đăng xuất + MongoDB

### Cấu trúc

- `backend/` — Express, Mongoose, JWT, cookie httpOnly + Bearer token (localStorage).
- `ForumWeb/` — HTML/CSS/JS tĩnh, gọi API cùng origin (`credentials: 'include'`).

### Chạy dự án

1. Cài **MongoDB** (local hoặc Atlas) và tạo database (ví dụ `dangtin_diendan`).
2. Trong `backend/`: copy `backend/.env.example` → `backend/.env`. **`MONGODB_URI` dùng `mongodb://` (non-SRV)** giống **`DACK_OnlineLearningWEB/backend/.env`**: nhiều `host:27017`, `ssl=true`, `replicaSet=...`. Điền **`MONGODB_REPLICA_SET`** (từ Atlas Connect) để thay `THAY_REPLICA_SET`, và mật khẩu thay `MAT_KHAU`. Không dùng `mongodb+srv` nếu máy lỗi DNS/querySrv.
3. `cd backend` → `npm install` → `npm run verify:mongo` (kiểm tra URI + tạo DB/collection lần đầu trên Atlas) → `npm run seed:roles` → `npm run seed:admin` → `npm run dev`.
4. Trình duyệt: **http://localhost:3000/** (không mở file HTML bằng `file://`).

**Lỗi `querySrv ECONNREFUSED` hoặc `_mongodb._tcp.cluster0...`:** `backend/.env` đang dùng **`mongodb+srv://`**. Đổi sang **`mongodb://`** (3 host `shard-00-xx:27017`, `ssl=true`, `replicaSet=...`) — copy từ Atlas **Connect → Drivers** (chuỗi standard), giống **`DACK_OnlineLearningWEB/backend/.env`**. Điền **`MONGODB_REPLICA_SET`** nếu dùng placeholder trong `backend/.env.example`. Chỉ dùng lại SRV nếu chắc DNS ổn: thêm **`MONGODB_ALLOW_SRV=true`** vào `.env`.

**Atlas không thấy collection?** MongoDB chỉ tạo database/collection khi **có ghi thành công**. Trong Data Explorer chọn database trùng path URI (ví dụ `dangtin_diendan`). Kiểm tra **Network Access** trên Atlas nếu kết nối bị từ chối.

### Test hai tài khoản (cùng bộ màn hình)

- **Admin**: đăng nhập `admin` / `Admin@123456` (hoặc giá trị `SEED_ADMIN_*` trong `.env`) → chuyển tới `admin.html`.
- **User**: **Đăng ký** trên `register.html` → **Đăng nhập** → về `index.html`, badge User. **Đăng xuất** xóa token và cookie.

### API (xác thực)

| Method | Đường dẫn | Mô tả |
|--------|-----------|--------|
| POST | `/api/auth/register` | Đăng ký (role USER) |
| POST | `/api/auth/login` | Đăng nhập; trả `token` + `user` (có `roleName`) |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | User hiện tại (cần Bearer hoặc cookie) |
| GET | `/api/health` | Kiểm tra server |
