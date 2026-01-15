# Copilot Instructions - DTDM Document Management System

## Architecture Overview

Express.js document management system với AWS cloud (S3, RDS, SES) và Vietnamese payment gateways (MoMo, ZaloPay).

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  public/*.html  │────▶│   server.js     │────▶│  PostgreSQL/RDS │
│  public/js/*.js │     │   (Express)     │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ AWS S3   │ │ MoMo/    │ │ AWS SES  │
              │ (files)  │ │ ZaloPay  │ │ (email)  │
              └──────────┘ └──────────┘ └──────────┘
```

## Key Patterns

### Database Queries

Luôn dùng parameterized queries với `$1, $2...` - KHÔNG dùng string interpolation:

```javascript
// ✅ Đúng
const result = await db.query(
  "SELECT * FROM users WHERE id = $1 AND plan = $2",
  [userId, "premium"]
);
const user = result.rows[0];

// ❌ Sai - SQL Injection risk
await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### API Response Format

Tất cả endpoints trả về JSON với `success` boolean:

```javascript
// Success
res.json({ success: true, message: 'Thành công!', data: {...} });

// Error - luôn kèm status code phù hợp
res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
res.status(404).json({ success: false, message: 'Không tìm thấy!' });
res.status(500).json({ success: false, message: 'Lỗi server!' });
```

### File Upload Flow

Multer → S3 → Cleanup local. **QUAN TRỌNG**: Luôn xóa file local sau khi upload:

```javascript
const fileBuffer = fs.readFileSync(req.file.path);
const s3Result = await uploadToS3(fileBuffer, req.file.originalname, mimetype);
fs.unlinkSync(req.file.path); // ⚠️ PHẢI cleanup - tránh đầy disk
```

### Frontend Authentication

Không dùng JWT - user data lưu trong `localStorage`:

```javascript
// Lưu sau khi login
localStorage.setItem("user", JSON.stringify(data.user));

// Đọc user hiện tại
const user = JSON.parse(localStorage.getItem("user"));

// Logout
localStorage.removeItem("user");
```

### Async Email Pattern

Gửi email không chặn response - dùng `.then()` fire-and-forget:

```javascript
// ✅ Đúng - không await, không chặn response
emailService
  .sendWelcomeEmail(email, username)
  .then((result) => console.log("✅ Email sent"))
  .catch((err) => console.error("❌ Email failed:", err));

res.json({ success: true }); // Response ngay lập tức
```

## Service Boundaries

| Service      | File                         | Methods                                            |
| ------------ | ---------------------------- | -------------------------------------------------- |
| Database     | `config/database.js`         | `query()`, `transaction()`                         |
| S3 Storage   | `services/uploadS3.js`       | `uploadToS3()`, `deleteFromS3()`, `getSignedUrl()` |
| MoMo Payment | `services/momoService.js`    | `createPayment()`, `verifyIPN()`                   |
| ZaloPay      | `services/zalopayService.js` | `createPayment()`, `verifyIPN()`                   |
| Email        | `services/emailService.js`   | `sendWelcomeEmail()`, `sendPremiumUpgradeEmail()`  |

## Database Schema

```sql
-- Users: plan='free' có quota=5, plan='premium' có quota=-1 (unlimited)
users(id, username, email, password, plan, quota, uploaded_files, premium_activated_at, avatar_url, reset_token, reset_token_expires)

-- Documents: s3_key dùng để download via signed URL
documents(id, user_id, username, title, description, filename, s3_key, url, upload_date, download_count, file_size)

-- Transactions: status = 'pending' | 'success' | 'failed'
payment_transactions(user_id, order_id, payment_method, amount, status, trans_id, extra_data)

-- User stats
user_stats(user_id, total_downloads, total_uploads, last_activity)
```

### Database Migration

Chạy `migrate-to-rds.js` để tạo schema trên RDS:

```bash
node migrate-to-rds.js
```

Script sẽ tạo tất cả tables nếu chưa tồn tại (idempotent - chạy nhiều lần không sao).

## Environment Variables

```env
# Database (RDS tự động detect SSL qua hostname)
DB_HOST=xxx.rds.amazonaws.com  DB_PORT=5432  DB_NAME=DTDM  DB_USER  DB_PASS

# AWS
AWS_ACCESS_KEY_ID  AWS_SECRET_ACCESS_KEY  AWS_REGION  S3_BUCKET_NAME

# MoMo
MOMO_PARTNER_CODE  MOMO_ACCESS_KEY  MOMO_SECRET_KEY  MOMO_API_ENDPOINT  MOMO_IPN_URL  MOMO_REDIRECT_URL

# ZaloPay
ZALOPAY_APPID  ZALOPAY_KEY1  ZALOPAY_KEY2  ZALOPAY_ENDPOINT  ZALOPAY_IPN_URL  ZALOPAY_REDIRECT_URL
```

## API Endpoints Reference

### Authentication

| Method | Endpoint               | Description                          |
| ------ | ---------------------- | ------------------------------------ |
| POST   | `/api/register`        | Đăng ký user mới (gửi welcome email) |
| POST   | `/api/login`           | Đăng nhập, trả về user data          |
| GET    | `/api/user/:userId`    | Lấy thông tin user                   |
| POST   | `/api/forgot-password` | Yêu cầu reset password (gửi email)   |
| POST   | `/api/reset-password`  | Reset password với token             |

### User Profile

| Method | Endpoint                   | Description             |
| ------ | -------------------------- | ----------------------- |
| POST   | `/api/user/:userId/avatar` | Upload avatar (max 2MB) |

### Documents

| Method | Endpoint                              | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| POST   | `/api/upload`                         | Upload file (multipart/form-data, field: `document`) |
| GET    | `/api/documents`                      | Lấy tất cả documents (hỗ trợ ?search=&page=&limit=)  |
| GET    | `/api/documents/search?q=`            | Search documents theo title/description              |
| GET    | `/api/documents/user/:userId`         | Lấy documents của user                               |
| GET    | `/api/documents/download/:documentId` | Lấy signed URL để download (tăng download_count)     |
| DELETE | `/api/documents/:documentId`          | Xóa document (body: `{userId}`)                      |

### Payments

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| POST   | `/api/payment/momo/create`     | Tạo thanh toán MoMo            |
| POST   | `/api/payment/zalopay/create`  | Tạo thanh toán ZaloPay         |
| POST   | `/api/payment/momo-ipn`        | IPN callback từ MoMo           |
| POST   | `/api/payment/zalopay-ipn`     | IPN callback từ ZaloPay        |
| GET    | `/api/payment/status/:orderId` | Kiểm tra trạng thái thanh toán |

## Payment Flow

```
1. Frontend gọi /api/payment/{momo|zalopay}/create
   └── Backend tạo transaction (status='pending'), gọi payment API
       └── Trả về payUrl/orderUrl

2. User thanh toán trên app MoMo/ZaloPay

3. Payment gateway gọi IPN callback
   └── Backend verify signature
       └── Nếu success: UPDATE user SET plan='premium', quota=-1
       └── Gửi email thông báo (fire-and-forget)

4. Frontend poll /api/payment/status/:orderId để check kết quả
```

## Commands

```bash
npm run dev    # Development với nodemon auto-reload
npm start      # Production
```

## Conventions

1. **Language**: UI text và messages bằng tiếng Việt
2. **Quota**: Free = 5 files, Premium = -1 (unlimited). Check: `user.plan === 'free' && user.uploaded_files >= user.quota`
3. **S3 Keys**: Format `documents/{timestamp}_{filename}` - giữ nguyên tiếng Việt có dấu
4. **Logging**: Dùng emoji prefix - `✅` success, `❌` error, `⚠️` warning
5. **File types**: Chỉ accept PDF/DOC/DOCX (check `fileFilter` trong server.js)
6. **File size**: Limit 10MB (config trong multer)

## Common Tasks

### Thêm API endpoint mới

```javascript
app.post("/api/new-endpoint", async (req, res) => {
  const { param1 } = req.body;

  if (!param1) {
    return res.status(400).json({ success: false, message: "Thiếu param1!" });
  }

  try {
    const result = await db.query("SELECT * FROM table WHERE col = $1", [
      param1,
    ]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});
```

### Thêm frontend page mới

1. Tạo `public/newpage.html` (copy structure từ existing page)
2. Tạo `public/js/newpage.js` với API calls
3. Check auth: `const user = JSON.parse(localStorage.getItem('user')); if (!user) redirect to login`

### Frontend JS Pattern

```javascript
const API_URL = "http://localhost:3000/api";
let currentUser = null;

// Loading helpers (có sẵn trong tất cả pages)
function showLoading() {
  document.getElementById("loadingOverlay").classList.add("show");
}
function hideLoading() {
  document.getElementById("loadingOverlay").classList.remove("show");
}

// Auth check - đặt đầu mỗi page (có try-catch)
function checkAuth() {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      window.location.href = "login.html";
      return null;
    }
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Lỗi parse user data:", error);
    localStorage.removeItem("user");
    window.location.href = "login.html";
    return null;
  }
}

// API call pattern với loading
async function fetchData() {
  showLoading();
  try {
    const response = await fetch(`${API_URL}/endpoint`);
    const data = await response.json();
    if (data.success) {
      // Handle success
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Lỗi kết nối server!", "error");
  } finally {
    hideLoading();
  }
}

// Button loading state pattern
const submitBtn = document.getElementById("submitBtn");
submitBtn.disabled = true;
submitBtn.classList.add("loading");
submitBtn.innerHTML =
  '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Đang xử lý...';
// ... sau khi xong:
submitBtn.disabled = false;
submitBtn.classList.remove("loading");
submitBtn.textContent = "Submit";

// Notification helper (có sẵn trong mỗi page)
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification ${type}`;
  setTimeout(() => (notification.className = "notification"), 3000);
}
```

### Upload với FormData

```javascript
const formData = new FormData();
formData.append("document", fileInput.files[0]); // Field name PHẢI là 'document'
formData.append("title", title);
formData.append("userId", currentUser.id);

const response = await fetch(`${API_URL}/upload`, {
  method: "POST",
  body: formData, // KHÔNG set Content-Type header - browser tự set
});
```

## Troubleshooting

| Issue                       | Solution                                                |
| --------------------------- | ------------------------------------------------------- |
| Upload fails silently       | Check `uploads/` folder exists, check file size < 10MB  |
| S3 upload error             | Verify AWS credentials, bucket name, region             |
| Payment IPN not received    | Check IPN URL publicly accessible, check firewall       |
| Database connection timeout | Check RDS security group allows inbound from server IP  |
| Email not sent              | Verify SES sender email is verified, check sandbox mode |

## File Structure Reference

```
DTDM/
├── server.js              # Main Express server - ALL API routes here (~1300 lines)
├── migrate-to-rds.js      # Database schema migration script
├── config/
│   └── database.js        # PostgreSQL pool + query/transaction helpers
├── services/
│   ├── uploadS3.js        # AWS S3 operations
│   ├── momoService.js     # MoMo payment integration
│   ├── zalopayService.js  # ZaloPay payment integration
│   └── emailService.js    # AWS SES email templates (welcome, password reset, premium upgrade)
├── public/
│   ├── manifest.json      # PWA manifest - app name, icons, theme
│   ├── sw.js              # Service Worker - offline caching
│   ├── *.html             # Frontend pages (login, dashboard, documents, payment, profile, reset-password, success)
│   ├── css/styles.css     # Global styles (~1200 lines) - includes theme variables, drag-drop, shortcuts modal
│   └── js/
│       ├── auth.js        # Login/Register logic + password toggle + confirm password + theme
│       ├── dashboard.js   # Upload + drag-drop + PWA + theme toggle + keyboard shortcuts
│       ├── documents.js   # Document listing + download + pagination + share + keyboard shortcuts
│       ├── payment.js     # MoMo/ZaloPay payment flow + theme
│       └── profile.js     # User profile + avatar upload + stats + theme
├── uploads/               # Temp folder for multer (auto-created, files deleted after S3 upload)
└── .env                   # Environment variables (NEVER commit!)
```

## Security Notes

1. **Password Storage**: ✅ Hash với bcrypt (10 rounds)
2. **SQL Injection**: ✅ Parameterized queries (`$1, $2...`)
3. **Input Validation**: ✅ Email format, password strength, XSS prevention
4. **Rate Limiting**: ✅ Auth endpoints (5 req/15min), Upload (20/hour), General (100/15min)
5. **File Validation**: ✅ Chỉ accept PDF/DOC/DOCX, max 10MB
6. **S3 Access**: ✅ Files private, signed URLs (1 hour expiry)
7. **Payment Signature**: ✅ HMAC signature verification
8. **CORS**: ✅ Configurable via ALLOWED_ORIGINS env
9. **HTTP Logging**: ✅ Morgan middleware
10. **Security Headers**: ✅ X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy

## UX/UI Features

1. **Loading States**: ✅ Overlay spinner khi fetch data, button loading states
2. **Pagination**: ✅ Documents page với 10 items/page
3. **File Type Icons**: ✅ PDF/DOC/DOCX icons hiển thị trong document cards
4. **Password Toggle**: ✅ Hiện/ẩn mật khẩu trong login/register forms
5. **Confirm Password**: ✅ Xác nhận mật khẩu khi đăng ký
6. **Empty States**: ✅ Hiển thị message khi không có documents
7. **Search**: ✅ Tìm kiếm realtime trên tất cả pages
8. **File Size Display**: ✅ Hiển thị kích thước file khi chọn và trong danh sách
9. **Download Counter**: ✅ Đếm số lượt download cho mỗi document
10. **Responsive Design**: ✅ Mobile-friendly layout
11. **Scroll to Top**: ✅ Nút cuộn lên đầu trang khi scroll xuống
12. **Relative Time**: ✅ Hiển thị "2 giờ trước" thay vì ngày cụ thể (hover để xem ngày)
13. **Smooth Scrolling**: ✅ Smooth scroll behavior cho toàn trang
14. **Focus States**: ✅ Accessibility với focus-visible outlines
15. **Tooltips**: ✅ CSS tooltips cho thông tin bổ sung
16. **Card Hover Effects**: ✅ Animation khi hover document cards
17. **Skeleton Loading**: ✅ CSS cho skeleton loading placeholders
18. **Badge Styles**: ✅ Badges cho Free/Premium users

## Advanced Web Technologies

### Progressive Web App (PWA)

App có thể cài đặt như native app trên mobile/desktop:

```javascript
// manifest.json - Cấu hình PWA
{
  "name": "DTDM - Quản Lý Tài Liệu",
  "short_name": "DTDM",
  "start_url": "/dashboard.html",
  "display": "standalone",
  "theme_color": "#667eea"
}

// Service Worker (sw.js) - Cache assets và offline support
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // Network-first cho API calls
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  } else {
    // Cache-first cho static assets
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
  }
});

// Đăng ký Service Worker trong dashboard.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

**PWA Files:**

- `public/manifest.json` - App manifest với icons, theme
- `public/sw.js` - Service Worker caching strategy

### Dark/Light Theme Toggle

CSS Custom Properties với localStorage persistence:

```css
/* styles.css - Dark theme (default) */
:root {
  --bg-primary: #0a0a0f;
  --text-primary: #ffffff;
  --card-bg: rgba(255, 255, 255, 0.05);
}

/* Light theme override */
[data-theme="light"] {
  --bg-primary: #f5f7fa;
  --text-primary: #1a1a2e;
  --card-bg: #ffffff;
}
```

```javascript
// Toggle theme
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}

// Load saved theme on page load
function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
}
```

### Drag & Drop File Upload

HTML5 Drag and Drop API với visual feedback:

```javascript
// dashboard.js - Drag & Drop zone
function initDragDrop() {
  const dropZone = document.getElementById("dropZone");

  ["dragenter", "dragover", "dragleave", "drop"].forEach((event) => {
    dropZone.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  dropZone.addEventListener("dragenter", () =>
    dropZone.classList.add("drag-over")
  );
  dropZone.addEventListener("dragleave", () =>
    dropZone.classList.remove("drag-over")
  );

  dropZone.addEventListener("drop", (e) => {
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (validateFile(file)) {
      handleFileDrop(file);
    }
  });
}
```

### Keyboard Shortcuts

Vim-style navigation với key sequences:

```javascript
// Keyboard shortcuts
const shortcuts = {
  "/": () => document.getElementById("searchInput").focus(), // Focus search
  t: () => toggleTheme(), // Toggle theme
  "?": () => toggleShortcutsModal(), // Show help
  "g+d": () => (window.location.href = "documents.html"), // Go to Documents
  "g+t": () => (window.location.href = "dashboard.html"), // Go to Dashboard
  "g+p": () => (window.location.href = "profile.html"), // Go to Profile
  "g+u": () => (window.location.href = "payment.html"), // Go to Upgrade
  Escape: () => closeAllModals(),
};
```

### Web Share API

Native sharing trên mobile với fallback:

```javascript
async function shareDocument(title, url) {
  if (navigator.share) {
    // Native share dialog trên mobile
    await navigator.share({ title, url });
  } else {
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url);
    showNotification("Đã copy link vào clipboard!");
  }
}
```

### Online/Offline Detection

Hiển thị trạng thái kết nối:

```javascript
function updateOnlineStatus() {
  const indicator = document.getElementById("offlineIndicator");
  if (navigator.onLine) {
    indicator.classList.remove("show");
  } else {
    indicator.classList.add("show");
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
```

## Dependencies Quick Reference

```json
{
  "express": "Web framework",
  "multer": "File upload middleware",
  "pg": "PostgreSQL client",
  "aws-sdk": "S3 + SES",
  "axios": "HTTP client for payment APIs",
  "bcrypt": "Password hashing",
  "express-rate-limit": "Rate limiting",
  "morgan": "HTTP request logging",
  "moment": "Date formatting (ZaloPay)",
  "uuid": "Unique ID generation",
  "dotenv": "Environment variables",
  "nodemon": "Dev auto-reload"
}
```

## Quick Start for New Developers

```bash
# 1. Clone và install
npm install

# 2. Tạo .env file với các biến cần thiết (xem Environment Variables section)

# 3. Đảm bảo PostgreSQL running với schema đã tạo

# 4. Chạy development server
npm run dev

# 5. Mở browser: http://localhost:3000
```
