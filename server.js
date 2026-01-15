require('dotenv').config();
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
// Import database
const db = require("./config/database");

// Import AWS S3 service
const {
  uploadToS3,
  deleteFromS3,
  getSignedUrl,
} = require("./services/uploadS3");

// Import payment services
const momoService = require("./services/momoService");
const zalopayService = require("./services/zalopayService");

// Import email service (AWS SES)
const emailService = require("./services/emailService");

// Import SNS service (AWS SNS)
const snsService = require('./services/snsService');

const PORT = process.env.PORT || 3000;

// 1. Gzip Compression (Hiệu suất)
app.use(compression());

// 2. Helmet Security Headers (Bảo mật)
app.use(
  helmet({
    contentSecurityPolicy: false, // Tắt CSP để tránh lỗi với script inline/external hiện tại
    crossOriginEmbedderPolicy: false,
  })
);

// 3. CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware
app.use(bodyParser.json());
// Static folders
app.use(express.static('public'));
const UPLOAD_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/image', express.static('image'));

// HTTP Request Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ================ RATE LIMITING ================
// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // 100 requests per 15 min
  message: {
    success: false,
    message: 'Quá nhiều request! Vui lòng thử lại sau.',
  },
});
// Strict limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // 5 attempts per 15 min
  message: {
    success: false,
    message: 'Quá nhiều lần thử! Vui lòng đợi 15 phút.',
  },
});
// Upload rate limit
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Bạn đã upload quá nhiều! Vui lòng thử lại sau.',
  },
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Bạn đã upload quá nhiều! Vui lòng thử lại sau.',
  },
});
// Apply general limiter to all API routes
app.use('/api/', generalLimiter);
    success: false,
    message: "Bạn đã upload quá nhiều! Vui lòng thử lại sau.",
  },
});

// Apply general limiter to all API routes
app.use("/api/", generalLimiter);

// Tạo thư mục uploads nếu chưa tồn tại
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
=======
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
// In serverless (Vercel), only /tmp is writable.
const UPLOAD_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/image', express.static('image'));

// Tạo thư mục uploads nếu chưa tồn tại
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
} catch (err) {
    console.warn('⚠️  Cannot create upload dir:', UPLOAD_DIR, err.message);
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
}

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
=======
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
});

// Cấu hình lưu file upload đúng thư mục, tương thích server thường và serverless
// (UPLOAD_DIR đã được xác định ở trên)

// Không filter file type - chấp nhận mọi loại file như Google Drive
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file PDF hoặc DOC!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
=======
    // Chỉ block các file nguy hiểm
    const blockedTypes = ['application/x-msdownload', 'application/x-msdos-program', 'application/x-executable'];
    if (blockedTypes.includes(file.mimetype)) {
        cb(new Error('Loại file này không được phép upload vì lý do bảo mật!'), false);
    } else {
        cb(null, true); // Chấp nhận tất cả file khác
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
        fileSize: 50 * 1024 * 1024 // 50MB cho Free, Premium có thể tăng
    }
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
});

// Chỉ accept PDF/DOC/DOCX, max 10MB (chuẩn DTDM)
const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const strictFileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file PDF hoặc DOC!'), false);
  }
};
const uploadStrict = multer({
  storage: storage,
  fileFilter: strictFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ================ INPUT VALIDATION HELPERS ================
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Tối thiểu 6 ký tự, có ít nhất 1 chữ và 1 số
  if (password.length < 6) {
    return { valid: false, message: "Mật khẩu phải có ít nhất 6 ký tự!" };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Mật khẩu phải có ít nhất 1 chữ cái!" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Mật khẩu phải có ít nhất 1 số!" };
  }
  return { valid: true };
};

const sanitizeInput = (str) => {
  if (typeof str !== "string") return str;
  return str.trim().replace(/[<>]/g, ""); // Basic XSS prevention
};

// API: Đăng ký (với rate limit)
app.post("/api/register", authLimiter, async (req, res) => {
  let { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng điền đầy đủ thông tin!" });
  }

  // Sanitize inputs
  username = sanitizeInput(username);
  email = sanitizeInput(email).toLowerCase();

  // Validate email format
  if (!validateEmail(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Email không hợp lệ!" });
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res
      .status(400)
      .json({ success: false, message: passwordValidation.message });
  }

  // Validate username length
  if (username.length < 2 || username.length > 50) {
    return res
      .status(400)
      .json({ success: false, message: "Tên phải từ 2-50 ký tự!" });
  }

  try {
    // Kiểm tra email đã tồn tại
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Email đã được sử dụng!" });
    }

    // Hash password với bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const result = await db.query(
      `INSERT INTO users (username, email, password, plan, quota, uploaded_files) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, username, email, plan, quota, uploaded_files, created_at`,
      [username, email, hashedPassword, "free", 5, 0]
    );

    const newUser = result.rows[0];

    // Gửi email welcome (không chặn response)
    emailService
      .sendWelcomeEmail(email, username)
      .then((emailResult) => {
        if (emailResult.success) {
          console.log("✅ Đã gửi email welcome tới:", email);
        } else {
          console.log("⚠️  Không gửi được email:", emailResult.error);
        }
      })
      .catch((err) => console.error("Email error:", err));

    res.json({
      success: true,
      message: "Đăng ký thành công!",
      user: newUser,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Đăng nhập (với rate limit chống brute force)
app.post("/api/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng điền đầy đủ thông tin!" });
  }

  try {
    // Lấy user bằng email (bao gồm password hash)
    const result = await db.query(
      "SELECT id, username, email, password, plan, quota, uploaded_files, created_at FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Email hoặc mật khẩu không đúng!" });
    }

    const user = result.rows[0];

    // So sánh password với hash
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Email hoặc mật khẩu không đúng!" });
    }

    // Trả về user data (không bao gồm password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      message: "Đăng nhập thành công!",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// ================ FORGOT PASSWORD ================
const crypto = require("crypto");

// API: Yêu cầu reset password
app.post("/api/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng nhập email!" });
  }

  try {
    // Kiểm tra email tồn tại
    const result = await db.query(
      "SELECT id, username, email FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Không tiết lộ email không tồn tại (security)
      return res.json({
        success: true,
        message: "Nếu email tồn tại, bạn sẽ nhận được link reset password.",
      });
    }

    const user = result.rows[0];

    // Tạo reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Lưu token vào database
    await db.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [resetToken, resetTokenExpires, user.id]
    );

    // Gửi email reset password (không chặn response)
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"
      }/reset-password.html?token=${resetToken}`;

    emailService
      .sendPasswordResetEmail(user.email, user.username, resetUrl)
      .then((result) => {
        if (result.success) {
          console.log("✅ Đã gửi email reset password tới:", user.email);
        }
      })
      .catch((err) => console.error("Email error:", err));

    res.json({
      success: true,
      message: "Nếu email tồn tại, bạn sẽ nhận được link reset password.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Reset password với token
app.post("/api/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin!" });
  }

  // Validate password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res
      .status(400)
      .json({ success: false, message: passwordValidation.message });
  }

  try {
    // Tìm user với token hợp lệ và chưa hết hạn
    const result = await db.query(
      "SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn!",
      });
    }

    const user = result.rows[0];

    // Hash password mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật password và xóa token
    await db.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [hashedPassword, user.id]
    );

    console.log("✅ Password reset thành công cho:", user.email);
    res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Lấy thông tin user
app.get("/api/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      "SELECT id, username, email, plan, quota, uploaded_files, premium_activated_at, created_at, avatar_url FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy user!" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Lấy thống kê user (download, upload)
app.get("/api/user/:userId/stats", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        COALESCE(us.total_downloads, 0) as total_downloads,
        COALESCE(us.total_uploads, 0) as total_uploads,
        us.last_activity,
        u.uploaded_files,
        (SELECT COUNT(*) FROM documents WHERE user_id = $1) as document_count,
        (SELECT COALESCE(SUM(download_count), 0) FROM documents WHERE user_id = $1) as total_doc_downloads
       FROM users u
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User không tồn tại!" });
    }

    res.json({ success: true, stats: result.rows[0] });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// ================ AVATAR UPLOAD ================
// Cấu hình multer cho avatar (chỉ nhận ảnh)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});

const avatarFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)!"), false);
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max cho avatar
});

// API: Upload avatar
app.post(
  "/api/user/:userId/avatar",
  avatarUpload.single("avatar"),
  async (req, res) => {
    const { userId } = req.params;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ảnh!" });
    }

    try {
      // Upload lên S3
      const fileBuffer = fs.readFileSync(req.file.path);
      const s3Result = await uploadToS3(
        fileBuffer,
        `avatar_${userId}_${Date.now()}.${req.file.mimetype.split("/")[1]}`,
        req.file.mimetype
      );

      // Cleanup local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (!s3Result.success) {
        return res
          .status(500)
          .json({ success: false, message: "Không thể upload avatar!" });
      }

      // Lấy signed URL cho avatar (dài hạn 7 ngày)
      const avatarUrl = getSignedUrl(s3Result.s3Key, 7 * 24 * 3600);

<<<<<<< HEAD
      // Cập nhật avatar URL trong database
      await db.query(
        "UPDATE users SET avatar_url = $1, avatar_s3_key = $2 WHERE id = $3",
        [avatarUrl, s3Result.s3Key, userId]
      );
=======
        // Kiểm tra file size theo gói
        const maxSize = user.plan === 'premium' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // Premium: 50MB, Free: 10MB
        if (req.file.size > maxSize) {
            // Xóa file đã upload
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            const maxSizeMB = user.plan === 'premium' ? '50MB' : '10MB';
            return res.status(413).json({ 
                success: false, 
                message: `File quá lớn! Gói ${user.plan} chỉ cho phép file tối đa ${maxSizeMB}.` 
            });
        }

        // Upload file lên S3
        const fileBuffer = fs.readFileSync(req.file.path);
        const s3Result = await uploadToS3(fileBuffer, req.file.originalname, req.file.mimetype);
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841

      res.json({
        success: true,
        message: "Upload avatar thành công!",
        avatarUrl: avatarUrl,
      });
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      // Cleanup local file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, message: "Lỗi server!" });
    }
  }
);

// API: Upload tài liệu lên S3 (với rate limit)
app.post(
  "/api/upload",
  uploadLimiter,
  upload.single("document"),
  async (req, res) => {
    const { userId, title, description, categoryId } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn file!" });
    }

    try {
      // Lấy thông tin user
      const userResult = await db.query(
        "SELECT id, username, plan, quota, uploaded_files FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy user!" });
      }

      const user = userResult.rows[0];

      // Kiểm tra quota (trừ khi là premium)
      if (user.plan === "free" && user.uploaded_files >= user.quota) {
        return res.status(403).json({
          success: false,
          message: "Bạn đã hết quota! Vui lòng nâng cấp Premium.",
        });
      }

      // Upload file lên S3
      const fileBuffer = fs.readFileSync(req.file.path);

      // Fix encoding lỗi font tiếng Việt: Multer đôi khi decode sai thành latin1
      const fixedFileName = Buffer.from(req.file.originalname, "latin1").toString(
        "utf8"
      );

      const s3Result = await uploadToS3(
        fileBuffer,
        fixedFileName,
        req.file.mimetype
      );

      if (!s3Result.success) {
        // Xóa file local nếu upload S3 thất bại
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res
          .status(500)
          .json({ success: false, message: "Không thể upload file lên S3!" });
      }

      // Lưu thông tin vào Database với category_id
      const docResult = await db.query(
        `INSERT INTO documents (user_id, username, title, description, filename, original_name, mimetype, size, s3_key, url, category_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING *`,
        [
          user.id,
          user.username,
          title || req.file.originalname,
          description || "",
          req.file.filename,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          s3Result.s3Key,
          s3Result.location,
          categoryId || null,
        ]
      );

      // Cập nhật số file đã upload
      await db.query(
        "UPDATE users SET uploaded_files = uploaded_files + 1 WHERE id = $1",
        [userId]
      );

      // Cập nhật category document_count nếu có
      if (categoryId) {
        await db.query(
          "UPDATE categories SET document_count = document_count + 1 WHERE id = $1",
          [categoryId]
        );
      }

      // Cập nhật user_stats - sử dụng INSERT OR UPDATE an toàn
      try {
        // Kiểm tra xem user_stats đã tồn tại chưa
        const statsCheck = await db.query(
          "SELECT id FROM user_stats WHERE user_id = $1",
          [userId]
        );

        if (statsCheck.rows.length > 0) {
          // Update nếu đã tồn tại
          await db.query(
            `UPDATE user_stats SET total_uploads = total_uploads + 1, last_activity = NOW() WHERE user_id = $1`,
            [userId]
          );
        } else {
          // Insert nếu chưa tồn tại
          await db.query(
            `INSERT INTO user_stats (user_id, total_uploads, last_activity) VALUES ($1, 1, NOW())`,
            [userId]
          );
        }
      } catch (statsError) {
        console.log("⚠️ Warning: Could not update user_stats:", statsError.message);
        // Không throw error - user_stats là optional
      }

      // Xóa file local sau khi upload S3 thành công
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.log("✅ Upload thành công:", s3Result.s3Key);
      res.json({
        success: true,
        message: "Upload thành công!",
        document: docResult.rows[0],
        s3Info: {
          key: s3Result.s3Key,
          url: s3Result.location,
        },
      });
    } catch (error) {
      console.error("❌ Upload error:", error);
      // Xóa file local nếu có lỗi
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res
        .status(500)
        .json({ success: false, message: "Lỗi server: " + error.message });
    }
  }
);

// ================ CATEGORIES API ================

// API: Lấy tất cả categories
app.get("/api/categories", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM categories ORDER BY name ASC");
    res.json({ success: true, categories: result.rows });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// ================ FAVORITES API ================

// API: Toggle favorite (thêm/xóa yêu thích)
app.post("/api/favorites/toggle", async (req, res) => {
  const { userId, documentId } = req.body;

  if (!userId || !documentId) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin!" });
  }

  try {
    // Kiểm tra đã favorite chưa
    const existing = await db.query(
      "SELECT id FROM favorites WHERE user_id = $1 AND document_id = $2",
      [userId, documentId]
    );

    if (existing.rows.length > 0) {
      // Đã favorite -> Xóa
      await db.query(
        "DELETE FROM favorites WHERE user_id = $1 AND document_id = $2",
        [userId, documentId]
      );
      res.json({
        success: true,
        isFavorite: false,
        message: "Đã bỏ yêu thích!",
      });
    } else {
      // Chưa favorite -> Thêm
      await db.query(
        "INSERT INTO favorites (user_id, document_id) VALUES ($1, $2)",
        [userId, documentId]
      );
      res.json({
        success: true,
        isFavorite: true,
        message: "Đã thêm vào yêu thích!",
      });
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Lấy danh sách favorites của user
app.get("/api/favorites/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      `SELECT d.*, true as is_favorite 
       FROM documents d 
       INNER JOIN favorites f ON d.id = f.document_id 
       WHERE f.user_id = $1 
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Kiểm tra document có được favorite không
app.get("/api/favorites/check/:userId/:documentId", async (req, res) => {
  const { userId, documentId } = req.params;

  try {
    const result = await db.query(
      "SELECT id FROM favorites WHERE user_id = $1 AND document_id = $2",
      [userId, documentId]
    );
    res.json({ success: true, isFavorite: result.rows.length > 0 });
  } catch (error) {
    console.error("Check favorite error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Lấy danh sách tất cả tài liệu (hỗ trợ search, category, favorites)
app.get("/api/documents", async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 20,
      category,
      userId,
      favorites,
    } = req.query;
    const offset = (page - 1) * limit;
    const userIdNum = userId ? parseInt(userId) : 0;

    let query = "";
    let countQuery = "";
    let params = [];
    let countParams = [];

    // Base query với is_favorite flag
    if (favorites === "true" && userId) {
      // Query chỉ lấy favorites của user
      query = `
        SELECT d.*, c.name as category_name, c.icon as category_icon, true as is_favorite
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        INNER JOIN favorites f ON d.id = f.document_id AND f.user_id = $1
      `;
      countQuery = `
        SELECT COUNT(*) FROM documents d
        INNER JOIN favorites f ON d.id = f.document_id AND f.user_id = $1
      `;
      params.push(userIdNum);
      countParams.push(userIdNum);

      // Filter by category
      if (category && category !== "all") {
        query += ` WHERE d.category_id = $2`;
        countQuery += ` WHERE d.category_id = $2`;
        params.push(parseInt(category));
        countParams.push(parseInt(category));
      }

      query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1
        } OFFSET $${params.length + 2}`;
      params.push(parseInt(limit), parseInt(offset));
    } else {
      // Query tất cả documents với is_favorite flag
      query = `
        SELECT d.*, c.name as category_name, c.icon as category_icon,
               EXISTS(SELECT 1 FROM favorites f WHERE f.document_id = d.id AND f.user_id = $1) as is_favorite
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
      `;
      countQuery = `SELECT COUNT(*) FROM documents d`;
      params.push(userIdNum);

      let conditions = [];
      let countConditions = [];

      // Filter by search
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          `(d.title ILIKE $${params.length + 1} OR d.description ILIKE $${params.length + 1
          } OR d.username ILIKE $${params.length + 1})`
        );
        countConditions.push(
          `(d.title ILIKE $${countParams.length + 1} OR d.description ILIKE $${countParams.length + 1
          } OR d.username ILIKE $${countParams.length + 1})`
        );
        params.push(searchTerm);
        countParams.push(searchTerm);
      }

      // Filter by category
      if (category && category !== "all") {
        conditions.push(`d.category_id = $${params.length + 1}`);
        countConditions.push(`d.category_id = $${countParams.length + 1}`);
        params.push(parseInt(category));
        countParams.push(parseInt(category));
      }

      // Build WHERE clause
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
        countQuery += " WHERE " + countConditions.join(" AND ");
      }

      query += ` ORDER BY d.upload_date DESC LIMIT $${params.length + 1
        } OFFSET $${params.length + 2}`;
      params.push(parseInt(limit), parseInt(offset));
    }

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      success: true,
      documents: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Search documents (dedicated endpoint)
app.get("/api/documents/search", async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || !q.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập từ khóa tìm kiếm!" });
    }

    const searchTerm = `%${q.trim()}%`;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT * FROM documents 
       WHERE title ILIKE $1 OR description ILIKE $1 OR username ILIKE $1
       ORDER BY upload_date DESC 
       LIMIT $2 OFFSET $3`,
      [searchTerm, parseInt(limit), parseInt(offset)]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM documents 
       WHERE title ILIKE $1 OR description ILIKE $1 OR username ILIKE $1`,
      [searchTerm]
    );

    res.json({
      success: true,
      query: q,
      documents: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error("Search documents error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Lấy tài liệu của user
app.get("/api/documents/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM documents WHERE user_id = $1 ORDER BY upload_date DESC",
      [userId]
    );
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    console.error("Get user documents error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Lấy URL download từ S3 (signed URL) + đếm download
app.get("/api/documents/download/:documentId", async (req, res) => {
  const { documentId } = req.params;
  const { userId } = req.query; // Optional: track who downloaded

  try {
    const result = await db.query("SELECT * FROM documents WHERE id = $1", [
      documentId,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tài liệu!" });
    }

    const document = result.rows[0];

    // Tăng download count
    await db.query(
      "UPDATE documents SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1",
      [documentId]
    );

    // Cập nhật user stats nếu có userId
    if (userId) {
      try {
        const statsCheck = await db.query(
          "SELECT id FROM user_stats WHERE user_id = $1",
          [userId]
        );

        if (statsCheck.rows.length > 0) {
          await db.query(
            `UPDATE user_stats SET total_downloads = total_downloads + 1, last_activity = CURRENT_TIMESTAMP WHERE user_id = $1`,
            [userId]
          );
        } else {
          await db.query(
            `INSERT INTO user_stats (user_id, total_downloads, last_activity) VALUES ($1, 1, CURRENT_TIMESTAMP)`,
            [userId]
          );
        }
<<<<<<< HEAD
      } catch (statsError) {
        console.log("⚠️ Warning: Could not update user_stats:", statsError.message);
      }
=======

        const document = result.rows[0];
        
        // Tạo Presigned URL để download (có thời hạn 15 phút - 900 giây)
        // Người dùng KHÔNG CẦN tài khoản AWS, chỉ cần click link này
        const downloadUrl = await getSignedUrl(document.s3_key, 900);
        
        res.json({ 
            success: true, 
            downloadUrl: downloadUrl,
            document: {
                id: document.id,
                title: document.title,
                original_name: document.original_name,
                size: document.size
            }
        });
    } catch (error) {
        console.error('Get download URL error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
    }

    // Tạo signed URL để download (có thời hạn 1 giờ)
    const downloadUrl = getSignedUrl(document.s3_key, 3600);

    res.json({
      success: true,
      downloadUrl: downloadUrl,
      document: {
        id: document.id,
        title: document.title,
        original_name: document.original_name,
        size: document.size,
        download_count: (document.download_count || 0) + 1,
      },
    });
  } catch (error) {
    console.error("Get download URL error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// ===================== HEALTH CHECK UPDATE API =====================
app.get("/api/health", async (req, res) => {
  try {
    const dbStart = Date.now();
    await db.query("SELECT 1");
    const dbLatency = Date.now() - dbStart;

    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: "connected",
        latency: `${dbLatency}ms`,
      },
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// ===================== COMMENTS API =====================

// API: Lấy danh sách comments của một document
app.get("/api/documents/:documentId/comments", async (req, res) => {
  const { documentId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Lấy comments
    const commentsResult = await db.query(
      `SELECT c.*, u.avatar_url 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.document_id = $1 
       ORDER BY c.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [documentId, parseInt(limit), offset]
    );

    // Đếm tổng comments
    const countResult = await db.query(
      "SELECT COUNT(*) FROM comments WHERE document_id = $1",
      [documentId]
    );

    // Tính rating trung bình
    const avgRatingResult = await db.query(
      "SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(rating) as rating_count FROM comments WHERE document_id = $1 AND rating IS NOT NULL",
      [documentId]
    );

    res.json({
      success: true,
      comments: commentsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
      stats: {
        avgRating: parseFloat(avgRatingResult.rows[0].avg_rating) || 0,
        ratingCount: parseInt(avgRatingResult.rows[0].rating_count) || 0,
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Thêm comment mới
app.post("/api/documents/:documentId/comments", async (req, res) => {
  const { documentId } = req.params;
  const { userId, content, rating } = req.body;

  // Validate
  if (!userId || !content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập nội dung bình luận!",
    });
  }

  if (content.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Bình luận không được quá 1000 ký tự!",
    });
  }

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({
      success: false,
      message: "Đánh giá phải từ 1-5 sao!",
    });
  }

  try {
    // Kiểm tra document tồn tại
    const docCheck = await db.query("SELECT id FROM documents WHERE id = $1", [
      documentId,
    ]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài liệu!",
      });
    }

    // Lấy thông tin user
    const userResult = await db.query(
      "SELECT username, avatar_url FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng!",
      });
    }

    const username = userResult.rows[0].username;

    // Thêm comment
    const result = await db.query(
      `INSERT INTO comments (document_id, user_id, username, content, rating) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [documentId, userId, username, content.trim(), rating || null]
    );

    const newComment = result.rows[0];
    newComment.avatar_url = userResult.rows[0].avatar_url;

    console.log(`💬 Comment mới từ ${username} cho document #${documentId}`);

    res.status(201).json({
      success: true,
      message: "Đã thêm bình luận!",
      comment: newComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Xóa comment (chỉ owner hoặc admin)
app.delete("/api/comments/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.body;

  try {
    // Kiểm tra comment tồn tại và quyền xóa
    const commentCheck = await db.query(
      "SELECT * FROM comments WHERE id = $1",
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bình luận!",
      });
    }

    const comment = commentCheck.rows[0];

    // Kiểm tra quyền (chỉ người tạo mới được xóa)
    if (comment.user_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bình luận này!",
      });
    }

    // Xóa comment
    await db.query("DELETE FROM comments WHERE id = $1", [commentId]);

    console.log(`🗑️ Comment #${commentId} đã bị xóa bởi user #${userId}`);

    res.json({
      success: true,
      message: "Đã xóa bình luận!",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Lấy rating tổng hợp của document
app.get("/api/documents/:documentId/rating", async (req, res) => {
  const { documentId } = req.params;

  try {
    const result = await db.query(
      `SELECT 
         AVG(rating)::numeric(3,2) as avg_rating,
         COUNT(rating) as total_ratings,
         COUNT(*) FILTER (WHERE rating = 5) as five_star,
         COUNT(*) FILTER (WHERE rating = 4) as four_star,
         COUNT(*) FILTER (WHERE rating = 3) as three_star,
         COUNT(*) FILTER (WHERE rating = 2) as two_star,
         COUNT(*) FILTER (WHERE rating = 1) as one_star
       FROM comments 
       WHERE document_id = $1 AND rating IS NOT NULL`,
      [documentId]
    );

    res.json({
      success: true,
      rating: {
        average: parseFloat(result.rows[0].avg_rating) || 0,
        total: parseInt(result.rows[0].total_ratings) || 0,
        breakdown: {
          5: parseInt(result.rows[0].five_star) || 0,
          4: parseInt(result.rows[0].four_star) || 0,
          3: parseInt(result.rows[0].three_star) || 0,
          2: parseInt(result.rows[0].two_star) || 0,
          1: parseInt(result.rows[0].one_star) || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get rating error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
});

// API: Xóa tài liệu (xóa cả trên S3 và database)
app.delete("/api/documents/:documentId", async (req, res) => {
  const { documentId } = req.params;
  const { userId } = req.body;

  try {
    // Lấy thông tin document
    const docResult = await db.query("SELECT * FROM documents WHERE id = $1", [
      documentId,
    ]);

    if (docResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tài liệu!" });
    }

    const document = docResult.rows[0];

    // Kiểm tra quyền xóa (chỉ owner mới được xóa)
    if (document.user_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa tài liệu này!",
      });
    }

    // Xóa file trên S3
    if (document.s3_key) {
      await deleteFromS3(document.s3_key);
    }

    // Xóa trong database
    await db.query("DELETE FROM documents WHERE id = $1", [documentId]);

    // Giảm số file đã upload
    await db.query(
      "UPDATE users SET uploaded_files = uploaded_files - 1 WHERE id = $1",
      [userId]
    );

    res.json({ success: true, message: "Xóa tài liệu thành công!" });
  } catch (error) {
    console.error("Delete document error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
});

// ================ PAYMENT APIs ================

// API: Tạo yêu cầu thanh toán MoMo
app.post("/api/payment/momo/create", async (req, res) => {
  try {
    const { userId, amount, orderInfo } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin userId hoặc amount",
      });
    }

    // Lấy thông tin user từ database
    const userResult = await db.query(
      "SELECT id, username, email, plan FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user!",
      });
    }

    const user = userResult.rows[0];

    if (user.plan === "premium") {
      return res.status(400).json({
        success: false,
        message: "Bạn đã là Premium!",
      });
    }

    // Tạo orderId unique
    const orderId = `ORDER_${userId}_${Date.now()}`;

    // Extra data chứa thông tin user
    const extraData = {
      userId: userId,
      username: user.username,
      email: user.email,
      plan: "premium",
    };

    // Lưu transaction vào database
    await db.query(
      `INSERT INTO payment_transactions (user_id, order_id, payment_method, amount, status, extra_data) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, orderId, "momo", amount, "pending", JSON.stringify(extraData)]
    );

    // Gọi service MoMo
    const result = await momoService.createPayment(
      orderId,
      amount,
      orderInfo || "Nâng cấp gói Premium",
      extraData
    );

    if (result.success) {
      res.json({
        success: true,
        payUrl: result.payUrl,
        deeplink: result.deeplink,
        qrCodeUrl: result.qrCodeUrl,
        orderId: orderId,
      });
    } else {
      // Cập nhật trạng thái failed
      await db.query(
        "UPDATE payment_transactions SET status = $1 WHERE order_id = $2",
        ["failed", orderId]
      );
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("MoMo Create Payment Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
});

// API: IPN Callback từ MoMo
app.post("/api/payment/momo-ipn", async (req, res) => {
  try {
    console.log("MoMo IPN received:", req.body);

    const verifyResult = momoService.verifyIPN(req.body);

    if (!verifyResult.valid) {
      return res.status(400).json({
        success: false,
        message: "Chữ ký không hợp lệ",
      });
    }

    // Nếu thanh toán thành công (resultCode = 0)
    if (verifyResult.resultCode === 0) {
      const { userId } = verifyResult.extraData;

      // Lấy thông tin user để gửi email
      const userResult = await db.query(
        "SELECT username, email FROM users WHERE id = $1",
        [userId]
      );

      // Cập nhật user lên Premium
      await db.query(
        `UPDATE users 
                 SET plan = $1, quota = $2, premium_activated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3 AND plan != 'premium'`,
        ["premium", -1, userId]
      );

      // Cập nhật trạng thái transaction
      await db.query(
        `UPDATE payment_transactions 
                 SET status = $1, trans_id = $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE order_id = $3`,
        ["success", verifyResult.transId, verifyResult.orderId]
      );

<<<<<<< HEAD
      console.log(`User ${userId} upgraded to Premium via MoMo`);

      // Gửi email thông báo Premium (không chặn response)
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        emailService
          .sendPremiumUpgradeEmail(user.email, user.username)
          .then((emailResult) => {
            if (emailResult.success) {
              console.log("✅ Đã gửi email Premium tới:", user.email);
=======
            console.log(`User ${userId} upgraded to Premium via MoMo`);
            
            // Gửi email thông báo Premium (không chặn response)
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                
                // Gửi email qua SES
                emailService.sendPremiumUpgradeEmail(user.email, user.username)
                    .then(emailResult => {
                        if (emailResult.success) {
                            console.log('✅ Đã gửi email Premium tới:', user.email);
                        }
                    })
                    .catch(err => console.error('Email error:', err));
                
                // Gửi thông báo hóa đơn qua SNS
                snsService.sendPaymentNotification({
                    username: user.username,
                    email: user.email,
                    amount: verifyResult.amount || 199000,
                    paymentMethod: 'momo',
                    orderId: verifyResult.orderId,
                    transactionTime: new Date().toLocaleString('vi-VN')
                }).catch(err => console.error('SNS error:', err));
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
            }
          })
          .catch((err) => console.error("Email error:", err));
      }
    } else {
      // Cập nhật trạng thái failed
      await db.query(
        `UPDATE payment_transactions 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE order_id = $2`,
        ["failed", verifyResult.orderId]
      );
    }

    // Trả về cho MoMo biết đã nhận được IPN
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("MoMo IPN Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// API: Tạo yêu cầu thanh toán ZaloPay
app.post("/api/payment/zalopay/create", async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin userId hoặc amount",
      });
    }

    // Lấy thông tin user từ database
    const userResult = await db.query(
      "SELECT id, username, email, plan FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user!",
      });
    }

    const user = userResult.rows[0];

    if (user.plan === "premium") {
      return res.status(400).json({
        success: false,
        message: "Bạn đã là Premium!",
      });
    }

    // Tạo orderId unique
    const orderId = `${Date.now()}_${userId}`;

    // Embed data chứa thông tin user
    const embedData = {
      userId: userId,
      username: user.username,
      email: user.email,
      plan: "premium",
      redirecturl: process.env.ZALOPAY_REDIRECT_URL,
    };

    // Lưu transaction vào database
    await db.query(
      `INSERT INTO payment_transactions (user_id, order_id, payment_method, amount, status, extra_data) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, orderId, "zalopay", amount, "pending", JSON.stringify(embedData)]
    );

    // Gọi service ZaloPay
    const result = await zalopayService.createPayment(
      orderId,
      amount,
      description || "Nâng cấp gói Premium",
      embedData
    );

    if (result.success) {
      res.json({
        success: true,
        orderUrl: result.orderUrl,
        zpTransToken: result.zpTransToken,
        appTransId: result.appTransId,
      });
    } else {
      // Cập nhật trạng thái failed
      await db.query(
        "UPDATE payment_transactions SET status = $1 WHERE order_id = $2",
        ["failed", orderId]
      );
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("ZaloPay Create Payment Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
});

// API: ATM Sandbox (Demo) - KHÔNG thu thập số thẻ/CVV
app.post('/api/payment/atm/test', async (req, res) => {
    try {
        const { userId, amount, scenario } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin userId hoặc amount'
            });
        }

        const scenarioValue = String(scenario || 'success');
        const allowedScenarios = new Set(['success', 'insufficient_funds', 'stolen', 'timeout']);
        if (!allowedScenarios.has(scenarioValue)) {
            return res.status(400).json({
                success: false,
                message: 'Kịch bản test ATM không hợp lệ'
            });
        }

        // Lấy thông tin user từ database
        const userResult = await db.query(
            'SELECT id, username, email, plan FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user!'
            });
        }

        const user = userResult.rows[0];

        if (user.plan === 'premium') {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã là Premium!'
            });
        }

        const orderId = `${Date.now()}_${userId}`;
        const extraData = {
            userId: userId,
            username: user.username,
            email: user.email,
            plan: 'premium',
            scenario: scenarioValue,
            note: 'ATM sandbox (demo) - no card data collected'
        };

        await db.query(
            `INSERT INTO payment_transactions (user_id, order_id, payment_method, amount, status, extra_data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, orderId, 'atm_test', amount, 'pending', JSON.stringify(extraData)]
        );

        const scenarioMessages = {
            insufficient_funds: 'ATM sandbox: Không đủ tiền',
            stolen: 'ATM sandbox: Thẻ bị khóa/mất',
            timeout: 'ATM sandbox: Timeout khi xử lý giao dịch'
        };

        if (scenarioValue === 'success') {
            await db.query(
                `UPDATE users
                 SET plan = $1, quota = $2, premium_activated_at = CURRENT_TIMESTAMP
                 WHERE id = $3 AND plan != 'premium'`,
                ['premium', -1, userId]
            );

            await db.query(
                `UPDATE payment_transactions
                 SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE order_id = $2`,
                ['success', orderId]
            );

            // Gửi email Premium (không chặn response)
            emailService.sendPremiumUpgradeEmail(user.email, user.username)
                .then(emailResult => {
                    if (emailResult.success) {
                        console.log('✅ Đã gửi email Premium tới:', user.email);
                    }
                })
                .catch(err => console.error('Email error:', err));

            // Gửi thông báo hóa đơn qua SNS
            snsService.sendPaymentNotification({
                username: user.username,
                email: user.email,
                amount: amount,
                paymentMethod: 'atm_test',
                orderId: orderId,
                transactionTime: new Date().toLocaleString('vi-VN')
            }).catch(err => console.error('SNS error:', err));

            return res.json({
                success: true,
                redirectUrl: 'success.html',
                orderId
            });
        }

        // Failure scenarios
        await db.query(
            'UPDATE payment_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2',
            ['failed', orderId]
        );

        return res.status(400).json({
            success: false,
            message: scenarioMessages[scenarioValue] || 'ATM sandbox: Giao dịch thất bại',
            orderId
        });
    } catch (error) {
        console.error('ATM Sandbox Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
});


// API: IPN Callback từ ZaloPay
app.post("/api/payment/zalopay-ipn", async (req, res) => {
  try {
    console.log("ZaloPay IPN received:", req.body);

    const verifyResult = zalopayService.verifyIPN(req.body);

    if (!verifyResult.valid) {
      return res.json({
        return_code: -1,
        return_message: "MAC không hợp lệ",
      });
    }

    // Nếu thanh toán thành công (status = 1)
    if (verifyResult.status === 1) {
      const { userId } = verifyResult.embedData;

      // Lấy thông tin user để gửi email
      const userResult = await db.query(
        "SELECT username, email FROM users WHERE id = $1",
        [userId]
      );

      // Cập nhật user lên Premium
      await db.query(
        `UPDATE users 
                 SET plan = $1, quota = $2, premium_activated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3 AND plan != 'premium'`,
        ["premium", -1, userId]
      );

      // Cập nhật trạng thái transaction (tìm bằng userId và appTransId trong extra_data)
      await db.query(
        `UPDATE payment_transactions 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $2 AND payment_method = 'zalopay' AND status = 'pending'`,
        ["success", userId]
      );

<<<<<<< HEAD
      console.log(`User ${userId} upgraded to Premium via ZaloPay`);

      // Gửi email thông báo Premium (không chặn response)
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        emailService
          .sendPremiumUpgradeEmail(user.email, user.username)
          .then((emailResult) => {
            if (emailResult.success) {
              console.log("✅ Đã gửi email Premium tới:", user.email);
=======
            console.log(`User ${userId} upgraded to Premium via ZaloPay`);
            
            // Gửi email thông báo Premium (không chặn response)
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                
                // Gửi email qua SES
                emailService.sendPremiumUpgradeEmail(user.email, user.username)
                    .then(emailResult => {
                        if (emailResult.success) {
                            console.log('✅ Đã gửi email Premium tới:', user.email);
                        }
                    })
                    .catch(err => console.error('Email error:', err));
                
                // Gửi thông báo hóa đơn qua SNS
                snsService.sendPaymentNotification({
                    username: user.username,
                    email: user.email,
                    amount: verifyResult.amount || 199000,
                    paymentMethod: 'zalopay',
                    orderId: verifyResult.appTransId,
                    transactionTime: new Date().toLocaleString('vi-VN')
                }).catch(err => console.error('SNS error:', err));
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
            }
          })
          .catch((err) => console.error("Email error:", err));
      }
    }

    // Trả về cho ZaloPay biết đã nhận được IPN
    res.json({
      return_code: 1,
      return_message: "success",
    });
  } catch (error) {
    console.error("ZaloPay IPN Error:", error);
    res.json({
      return_code: -1,
      return_message: error.message,
    });
  }
});

// API: Kiểm tra trạng thái thanh toán
app.get("/api/payment/status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Kiểm tra transaction trong database
    const result = await db.query(
      `SELECT pt.*, u.id as user_id, u.username, u.email, u.plan 
             FROM payment_transactions pt
             JOIN users u ON pt.user_id = u.id
             WHERE pt.order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        status: "not_found",
        message: "Không tìm thấy giao dịch",
      });
    }

    const transaction = result.rows[0];

    // Nếu đang pending và là ZaloPay, query trực tiếp từ ZaloPay
    if (
      transaction.status === "pending" &&
      transaction.payment_method === "zalopay"
    ) {
      const zalopayResult = await zalopayService.queryOrder(orderId);
      console.log("ZaloPay Query Result:", zalopayResult);

      // return_code = 1 nghĩa là thành công
      if (zalopayResult.return_code === 1) {
        // Cập nhật database
        await db.query(
          "UPDATE payment_transactions SET status = 'success', trans_id = $1 WHERE order_id = $2",
          [zalopayResult.zp_trans_id, orderId]
        );
        await db.query(
          "UPDATE users SET plan = 'premium', quota = -1, premium_activated_at = NOW() WHERE id = $1",
          [transaction.user_id]
        );

        return res.json({
          success: true,
          status: "success",
          message: "Thanh toán thành công",
          user: {
            id: transaction.user_id,
            username: transaction.username,
            email: transaction.email,
            plan: "premium",
          },
        });
      }
    }

    if (transaction.status === "success" && transaction.plan === "premium") {
      res.json({
        success: true,
        status: "success",
        message: "Thanh toán thành công",
        user: {
          id: transaction.user_id,
          username: transaction.username,
          email: transaction.email,
          plan: transaction.plan,
        },
      });
    } else if (transaction.status === "pending") {
      res.json({
        success: false,
        status: "pending",
        message: "Đang chờ xác nhận thanh toán",
      });
    } else {
      res.json({
        success: false,
        status: transaction.status,
        message: "Giao dịch thất bại",
      });
    }
  } catch (error) {
    console.error("Check payment status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

<<<<<<< HEAD
// Test database connection on startup
db.query("SELECT NOW() as time")
  .then(() => {
    console.log("✅ PostgreSQL database connected successfully!");
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err.message);
  });

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 Database: PostgreSQL (${process.env.DB_NAME})`);
  console.log(`💳 Payment: MoMo & ZaloPay integrated`);
});
=======
// Only start listening when running locally (not in serverless).
if (require.main === module) {
    // Test database connection on startup
    db.query('SELECT NOW() as time')
        .then(() => {
            console.log('✅ PostgreSQL database connected successfully!');
        })
        .catch(err => {
            console.error('❌ Database connection error:', err.message);
        });

    app.listen(PORT, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
        console.log(`📊 Database: PostgreSQL (${process.env.DB_NAME})`);
        console.log(`💳 Payment: MoMo & ZaloPay integrated`);
    });
} else {
    module.exports = app;
}
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
