require('dotenv').config();
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Import database
const db = require('./config/database');

// Import AWS S3 service
const { uploadToS3, deleteFromS3, getSignedUrl } = require('./services/uploadS3');

// Import payment services
const momoService = require('./services/momoService');
const zalopayService = require('./services/zalopayService');

// Import email service (AWS SES)
const emailService = require('./services/emailService');

// Import SNS service (AWS SNS)
const snsService = require('./services/snsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/image', express.static('image'));

// Tạo thư mục uploads nếu chưa tồn tại
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Cấu hình multer để upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Không filter file type - chấp nhận mọi loại file như Google Drive
const fileFilter = (req, file, cb) => {
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
});

// API: Đăng ký
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin!' });
    }

    try {
        // Kiểm tra email đã tồn tại
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email đã được sử dụng!' });
        }

        // Tạo user mới
        const result = await db.query(
            `INSERT INTO users (username, email, password, plan, quota, uploaded_files) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, username, email, plan, quota, uploaded_files, created_at`,
            [username, email, password, 'free', 5, 0]
        );

        const newUser = result.rows[0];
        
        // Gửi email welcome (không chặn response)
        emailService.sendWelcomeEmail(email, username)
            .then(emailResult => {
                if (emailResult.success) {
                    console.log('✅ Đã gửi email welcome tới:', email);
                } else {
                    console.log('⚠️  Không gửi được email:', emailResult.error);
                }
            })
            .catch(err => console.error('Email error:', err));
        
        res.json({ 
            success: true, 
            message: 'Đăng ký thành công!', 
            user: newUser 
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// API: Đăng nhập
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin!' });
    }

    try {
        const result = await db.query(
            'SELECT id, username, email, plan, quota, uploaded_files, created_at FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng!' });
        }

        const user = result.rows[0];
        res.json({ success: true, message: 'Đăng nhập thành công!', user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// API: Lấy thông tin user
app.get('/api/user/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const result = await db.query(
            'SELECT id, username, email, plan, quota, uploaded_files, premium_activated_at, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy user!' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// API: Upload tài liệu lên S3
app.post('/api/upload', upload.single('document'), async (req, res) => {
    const { userId, title, description } = req.body;

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file!' });
    }

    try {
        // Lấy thông tin user
        const userResult = await db.query(
            'SELECT id, username, plan, quota, uploaded_files FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy user!' });
        }

        const user = userResult.rows[0];

        // Kiểm tra quota (trừ khi là premium)
        if (user.plan === 'free' && user.uploaded_files >= user.quota) {
            return res.status(403).json({ success: false, message: 'Bạn đã hết quota! Vui lòng nâng cấp Premium.' });
        }

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

        if (!s3Result.success) {
            // Xóa file local nếu upload S3 thất bại
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(500).json({ success: false, message: 'Không thể upload file lên S3!' });
        }

        // Lưu thông tin vào Database
        const docResult = await db.query(
            `INSERT INTO documents (user_id, username, title, description, filename, original_name, mimetype, size, s3_key, url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [
                user.id,
                user.username,
                title || req.file.originalname,
                description || '',
                req.file.filename,
                req.file.originalname,
                req.file.mimetype,
                req.file.size,
                s3Result.s3Key,
                s3Result.location
            ]
        );

        // Cập nhật số file đã upload
        await db.query(
            'UPDATE users SET uploaded_files = uploaded_files + 1 WHERE id = $1',
            [userId]
        );

        // Xóa file local sau khi upload S3 thành công
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.log('✅ Upload thành công:', s3Result.s3Key);
        res.json({ 
            success: true, 
            message: 'Upload thành công!', 
            document: docResult.rows[0],
            s3Info: {
                key: s3Result.s3Key,
                url: s3Result.location
            }
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        // Xóa file local nếu có lỗi
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// API: Lấy danh sách tất cả tài liệu
app.get('/api/documents', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM documents ORDER BY upload_date DESC'
        );
        res.json({ success: true, documents: result.rows });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// API: Lấy tài liệu của user
app.get('/api/documents/user/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const result = await db.query(
            'SELECT * FROM documents WHERE user_id = $1 ORDER BY upload_date DESC',
            [userId]
        );
        res.json({ success: true, documents: result.rows });
    } catch (error) {
        console.error('Get user documents error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// API: Lấy URL download từ S3 (signed URL)
app.get('/api/documents/download/:documentId', async (req, res) => {
    const { documentId } = req.params;
    
    try {
        const result = await db.query(
            'SELECT * FROM documents WHERE id = $1',
            [documentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu!' });
        }

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
    }
});

// API: Xóa tài liệu (xóa cả trên S3 và database)
app.delete('/api/documents/:documentId', async (req, res) => {
    const { documentId } = req.params;
    const { userId } = req.body;
    
    try {
        // Lấy thông tin document
        const docResult = await db.query(
            'SELECT * FROM documents WHERE id = $1',
            [documentId]
        );

        if (docResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu!' });
        }

        const document = docResult.rows[0];

        // Kiểm tra quyền xóa (chỉ owner mới được xóa)
        if (document.user_id !== parseInt(userId)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa tài liệu này!' });
        }

        // Xóa file trên S3
        if (document.s3_key) {
            await deleteFromS3(document.s3_key);
        }

        // Xóa trong database
        await db.query('DELETE FROM documents WHERE id = $1', [documentId]);

        // Giảm số file đã upload
        await db.query(
            'UPDATE users SET uploaded_files = uploaded_files - 1 WHERE id = $1',
            [userId]
        );

        res.json({ success: true, message: 'Xóa tài liệu thành công!' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// API: Nâng cấp Premium (Deprecated - Use payment APIs)
app.post('/api/upgrade', (req, res) => {
    const { userId, paymentMethod } = req.body;

    const db = readDB();
    const user = db.users.find(u => u.id == userId);

    if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy user!' });
    }

    if (user.plan === 'premium') {
        return res.status(400).json({ success: false, message: 'Bạn đã là Premium!' });
    }

    // Giả lập thanh toán thành công
    user.plan = 'premium';
    user.quota = -1; // Unlimited
    writeDB(db);

    res.json({ 
        success: true, 
        message: `Thanh toán qua ${paymentMethod} thành công! Bạn đã nâng cấp Premium.`,
        user: { ...user, password: undefined }
    });
});

// ================ PAYMENT APIs ================

// API: Tạo yêu cầu thanh toán MoMo
app.post('/api/payment/momo/create', async (req, res) => {
    try {
        const { userId, amount, orderInfo } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin userId hoặc amount' 
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

        // Tạo orderId unique
        const orderId = `ORDER_${userId}_${Date.now()}`;
        
        // Extra data chứa thông tin user
        const extraData = {
            userId: userId,
            username: user.username,
            email: user.email,
            plan: 'premium'
        };

        // Lưu transaction vào database
        await db.query(
            `INSERT INTO payment_transactions (user_id, order_id, payment_method, amount, status, extra_data) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, orderId, 'momo', amount, 'pending', JSON.stringify(extraData)]
        );

        // Gọi service MoMo
        const result = await momoService.createPayment(
            orderId,
            amount,
            orderInfo || 'Nâng cấp gói Premium',
            extraData
        );

        if (result.success) {
            res.json({
                success: true,
                payUrl: result.payUrl,
                deeplink: result.deeplink,
                qrCodeUrl: result.qrCodeUrl,
                orderId: orderId
            });
        } else {
            // Cập nhật trạng thái failed
            await db.query(
                'UPDATE payment_transactions SET status = $1 WHERE order_id = $2',
                ['failed', orderId]
            );
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('MoMo Create Payment Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
});

// API: IPN Callback từ MoMo
app.post('/api/payment/momo-ipn', async (req, res) => {
    try {
        console.log('MoMo IPN received:', req.body);
        
        const verifyResult = momoService.verifyIPN(req.body);

        if (!verifyResult.valid) {
            return res.status(400).json({
                success: false,
                message: 'Chữ ký không hợp lệ'
            });
        }

        // Nếu thanh toán thành công (resultCode = 0)
        if (verifyResult.resultCode === 0) {
            const { userId } = verifyResult.extraData;
            
            // Lấy thông tin user để gửi email
            const userResult = await db.query(
                'SELECT username, email FROM users WHERE id = $1',
                [userId]
            );
            
            // Cập nhật user lên Premium
            await db.query(
                `UPDATE users 
                 SET plan = $1, quota = $2, premium_activated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3 AND plan != 'premium'`,
                ['premium', -1, userId]
            );

            // Cập nhật trạng thái transaction
            await db.query(
                `UPDATE payment_transactions 
                 SET status = $1, trans_id = $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE order_id = $3`,
                ['success', verifyResult.transId, verifyResult.orderId]
            );

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
            }
        } else {
            // Cập nhật trạng thái failed
            await db.query(
                `UPDATE payment_transactions 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE order_id = $2`,
                ['failed', verifyResult.orderId]
            );
        }

        // Trả về cho MoMo biết đã nhận được IPN
        res.status(200).json({
            success: true
        });
    } catch (error) {
        console.error('MoMo IPN Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API: Tạo yêu cầu thanh toán ZaloPay
app.post('/api/payment/zalopay/create', async (req, res) => {
    try {
        const { userId, amount, description } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin userId hoặc amount' 
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

        // Tạo orderId unique
        const orderId = `${Date.now()}_${userId}`;
        
        // Embed data chứa thông tin user
        const embedData = {
            userId: userId,
            username: user.username,
            email: user.email,
            plan: 'premium',
            redirecturl: process.env.ZALOPAY_REDIRECT_URL
        };

        // Lưu transaction vào database
        await db.query(
            `INSERT INTO payment_transactions (user_id, order_id, payment_method, amount, status, extra_data) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, orderId, 'zalopay', amount, 'pending', JSON.stringify(embedData)]
        );

        // Gọi service ZaloPay
        const result = await zalopayService.createPayment(
            orderId,
            amount,
            description || 'Nâng cấp gói Premium',
            embedData
        );

        if (result.success) {
            res.json({
                success: true,
                orderUrl: result.orderUrl,
                zpTransToken: result.zpTransToken,
                appTransId: result.appTransId
            });
        } else {
            // Cập nhật trạng thái failed
            await db.query(
                'UPDATE payment_transactions SET status = $1 WHERE order_id = $2',
                ['failed', orderId]
            );
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('ZaloPay Create Payment Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
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
app.post('/api/payment/zalopay-ipn', async (req, res) => {
    try {
        console.log('ZaloPay IPN received:', req.body);
        
        const verifyResult = zalopayService.verifyIPN(req.body);

        if (!verifyResult.valid) {
            return res.json({
                return_code: -1,
                return_message: 'MAC không hợp lệ'
            });
        }

        // Nếu thanh toán thành công (status = 1)
        if (verifyResult.status === 1) {
            const { userId } = verifyResult.embedData;
            
            // Lấy thông tin user để gửi email
            const userResult = await db.query(
                'SELECT username, email FROM users WHERE id = $1',
                [userId]
            );
            
            // Cập nhật user lên Premium
            await db.query(
                `UPDATE users 
                 SET plan = $1, quota = $2, premium_activated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3 AND plan != 'premium'`,
                ['premium', -1, userId]
            );

            // Cập nhật trạng thái transaction (tìm bằng userId và appTransId trong extra_data)
            await db.query(
                `UPDATE payment_transactions 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $2 AND payment_method = 'zalopay' AND status = 'pending'`,
                ['success', userId]
            );

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
            }
        }

        // Trả về cho ZaloPay biết đã nhận được IPN
        res.json({
            return_code: 1,
            return_message: 'success'
        });
    } catch (error) {
        console.error('ZaloPay IPN Error:', error);
        res.json({
            return_code: -1,
            return_message: error.message
        });
    }
});

// API: Kiểm tra trạng thái thanh toán
app.get('/api/payment/status/:orderId', async (req, res) => {
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
                status: 'not_found',
                message: 'Không tìm thấy giao dịch'
            });
        }

        const transaction = result.rows[0];
        
        if (transaction.status === 'success' && transaction.plan === 'premium') {
            res.json({
                success: true,
                status: 'success',
                message: 'Thanh toán thành công',
                user: {
                    id: transaction.user_id,
                    username: transaction.username,
                    email: transaction.email,
                    plan: transaction.plan
                }
            });
        } else if (transaction.status === 'pending') {
            res.json({
                success: false,
                status: 'pending',
                message: 'Đang chờ xác nhận thanh toán'
            });
        } else {
            res.json({
                success: false,
                status: transaction.status,
                message: 'Giao dịch thất bại'
            });
        }
    } catch (error) {
        console.error('Check payment status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

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
