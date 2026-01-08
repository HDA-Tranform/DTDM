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
- **Upload:** AWS 
- **Database:** PostgreSQL
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

### 1. 📝 Đăng Ký Tài Khoản
1. Truy cập http://localhost:3000
2. Click nút **"Đăng ký ngay"** ở góc phải
3. Điền đầy đủ thông tin:
   - Tên đầy đủ
   - Email (dùng để đăng nhập)
   - Mật khẩu (tối thiểu 6 ký tự)
4. Click **"Đăng Ký"**
5. Hệ thống tự động tạo tài khoản **Free** với:
   - ✅ Quota: 5 file
   - ✅ Dung lượng upload: 10MB/file
   - ✅ Xem tài liệu không giới hạn

### 2. 🔐 Đăng Nhập
1. Nhập email và mật khẩu đã đăng ký
2. Click **"Đăng Nhập"**
3. Tự động chuyển đến Dashboard

### 3. 📤 Upload Tài Liệu
1. Vào **Dashboard** (trang chủ sau khi đăng nhập)
2. Điền thông tin tài liệu:
   - **Tiêu đề**: Tên tài liệu (bắt buộc)
   - **Mô tả**: Nội dung mô tả ngắn gọn
3. Click **"Chọn File"** → Chọn file từ máy tính
   - Định dạng hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
   - Giới hạn: 10MB (Free) / 50MB (Premium)
4. Click **"Upload Tài Liệu"**
5. File sẽ được upload lên **AWS S3** và lưu metadata vào database
6. Nhận thông báo thành công

**Lưu ý:**
- Tài khoản Free chỉ upload được 5 file
- Khi hết quota, cần nâng cấp Premium để tiếp tục

### 4. 📄 Xem & Tải Tài Liệu
1. Click menu **"Tài liệu"** hoặc nút **"Xem Tất Cả Tài Liệu"**
2. Xem danh sách tài liệu từ cộng đồng:
   - Tên tài liệu, mô tả
   - Người đăng, ngày upload
   - Loại file, kích thước
3. Click **"Tải xuống"** để download file
4. File được tải từ AWS S3 qua signed URL (bảo mật)

### 5. ⭐ Nâng Cấp Premium
1. Click menu **"Nâng cấp"** hoặc vào trang Payment
2. Xem thông tin gói Premium:
   - 💰 Giá: **199.000đ/tháng**
   - ♾️ Upload không giới hạn
   - 📦 Dung lượng file: tối đa 50MB
   - 🔒 Lưu trữ vĩnh viễn trên AWS S3
3. Chọn phương thức thanh toán:
   - **MoMo**: Ví điện tử MoMo
   - **ZaloPay**: Ví điện tử ZaloPay
4. Click **"Thanh Toán Ngay"**
5. Chuyển đến trang thanh toán của MoMo/ZaloPay
6. Hoàn tất thanh toán trên app
7. Hệ thống tự động:
   - ✅ Cập nhật tài khoản lên Premium
   - 📧 Gửi email xác nhận (qua AWS SES)
   - 🔄 Chuyển về trang success
8. Quay lại Dashboard để kiểm tra

### 6. 👤 Xem Trang Cá Nhân
1. Click menu **"Trang cá nhân"**
2. Xem thông tin tài khoản:
   - **Username & Email**
   - **Gói hiện tại**: Free / Premium ⭐
   - **Quota sử dụng**: X/5 (Free) hoặc ∞ (Premium)
   - **Ngày tham gia**
3. Xem danh sách tài liệu đã upload:
   - Tên file, ngày upload
   - Click **"Tải về"** để download lại
   - Chỉ hiển thị tài liệu của bạn

### 7. 🔄 Quản Lý Tài Liệu
- **Dashboard**: Xem tổng quan và upload file mới
- **Tài liệu**: Xem tất cả tài liệu công khai
- **Profile**: Quản lý tài liệu cá nhân
- File được lưu trữ an toàn trên AWS S3
- Metadata được lưu trên AWS RDS PostgreSQL

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
