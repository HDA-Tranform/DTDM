# Hệ Thống Quản Lý Tài Liệu 📚

Ứng dụng web quản lý và chia sẻ tài liệu với các tính năng:

## Tính Năng

✅ Đăng ký / Đăng nhập
✅ Upload tài liệu (PDF/DOC)
✅ Kiểm tra quota
✅ Xem tài liệu của người khác
✅ Gói Premium (upload không giới hạn)
✅ Thanh toán qua MoMo / ZaloPay
✅ Trang profile (quota, gói)
✅ Thông báo upload thành công

## Công Nghệ

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Upload:** Multer
- **Database:** JSON file (có thể nâng cấp lên MongoDB)

## Cài Đặt

### 1. Cài đặt Node.js dependencies

```bash
npm install
```

### 2. Chạy server

```bash
npm start
```

Hoặc chạy ở chế độ development (tự động reload):

```bash
npm run dev
```

Server sẽ chạy tại: http://localhost:3000

## Cấu Trúc Thư Mục

```
DTDM/
├── public/                 # Frontend files
│   ├── css/
│   │   └── styles.css     # CSS chung
│   ├── js/
│   │   ├── auth.js        # Logic đăng nhập/đăng ký
│   │   ├── dashboard.js   # Logic dashboard
│   │   ├── documents.js   # Logic danh sách tài liệu
│   │   ├── payment.js     # Logic thanh toán
│   │   └── profile.js     # Logic trang cá nhân
│   ├── login.html         # Trang đăng nhập/đăng ký
│   ├── dashboard.html     # Trang dashboard & upload
│   ├── documents.html     # Trang danh sách tài liệu
│   ├── payment.html       # Trang thanh toán
│   └── profile.html       # Trang cá nhân
├── uploads/               # Thư mục lưu file upload (tự tạo)
├── database.json          # Database (tự tạo khi chạy)
├── server.js              # Express server
└── package.json           # Dependencies

```

## Hướng Dẫn Sử Dụng

### 1. Đăng Ký Tài Khoản
- Mở http://localhost:3000
- Chọn "Đăng ký ngay"
- Điền thông tin: tên, email, mật khẩu
- Tài khoản Free mặc định có quota 5 file

### 2. Đăng Nhập
- Nhập email và mật khẩu
- Truy cập Dashboard

### 3. Upload Tài Liệu
- Vào Dashboard
- Điền tiêu đề, mô tả
- Chọn file PDF hoặc DOC (max 10MB)
- Click "Upload"
- Hệ thống sẽ kiểm tra quota tự động

### 4. Xem Tài Liệu
- Click "Xem Tất Cả Tài Liệu"
- Xem danh sách tài liệu từ cộng đồng
- Tải xuống file mong muốn

### 5. Nâng Cấp Premium
- Click "Nâng Cấp Premium"
- Chọn phương thức thanh toán (MoMo/ZaloPay)
- Xác nhận thanh toán 199.000đ
- Nhận quyền upload không giới hạn

### 6. Xem Profile
- Click "Trang Cá Nhân"
- Xem thông tin tài khoản
- Kiểm tra quota sử dụng
- Xem tài liệu đã upload

## API Endpoints

### Authentication
- `POST /api/register` - Đăng ký
- `POST /api/login` - Đăng nhập
- `GET /api/user/:userId` - Lấy thông tin user

### Documents
- `POST /api/upload` - Upload tài liệu
- `GET /api/documents` - Lấy tất cả tài liệu
- `GET /api/documents/user/:userId` - Lấy tài liệu của user

### Payment
- `POST /api/upgrade` - Nâng cấp Premium

## Gói Dịch Vụ

### Free
- 5 file upload
- Xem tài liệu không giới hạn
- File tối đa 10MB

### Premium (199.000đ/tháng)
- Upload không giới hạn
- Xem tài liệu không giới hạn
- File tối đa 50MB
- Hỗ trợ ưu tiên

## Lưu Ý

- Database hiện tại dùng file JSON (phù hợp cho demo)
- Mật khẩu chưa được hash (nên dùng bcrypt trong production)
- Thanh toán đang ở chế độ giả lập (cần tích hợp API thật)
- File upload lưu local (nên dùng cloud storage cho production)

## Phát Triển Thêm

Có thể nâng cấp:
- ✨ Sử dụng MongoDB thay vì JSON file
- 🔐 Hash password với bcrypt
- 💳 Tích hợp API thanh toán thật (MoMo/ZaloPay)
- ☁️ Upload file lên cloud (AWS S3, Cloudinary)
- 🔍 Tìm kiếm tài liệu
- 📊 Phân loại tài liệu theo danh mục
- 💬 Comment và đánh giá tài liệu
- 📧 Xác thực email
- 🔒 Reset password

## License

MIT
