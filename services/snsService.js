const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

let _snsClient = null;
function getSnsClient() {
    if (_snsClient) return _snsClient;

    const region = process.env.AWS_REGION || "ap-southeast-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // If credentials are not configured, don't create a broken client.
    if (!accessKeyId || !secretAccessKey) {
        return null;
    }

    _snsClient = new SNSClient({
        region,
        credentials: { accessKeyId, secretAccessKey }
    });
    return _snsClient;
}

// Topic ARN từ AWS Console
const TOPIC_ARN = "arn:aws:sns:ap-southeast-1:371016420099:dtdm";

/**
 * Gửi thông báo thanh toán thành công
 * @param {Object} paymentInfo - Thông tin thanh toán
 * @returns {Promise<Object>}
 */
async function sendPaymentNotification(paymentInfo) {
    const { username, email, amount, paymentMethod, orderId, transactionTime } = paymentInfo;
    
    const subject = `🎉 Thanh toán Premium thành công - DTDM`;
    
    const message = `
╔═══════════════════════════════════════╗
║   HÓA ĐƠN THANH TOÁN PREMIUM - DTDM   ║
╚═══════════════════════════════════════╝

Khách hàng: ${username}
Email: ${email}

─────────────────────────────────────────
Gói dịch vụ: Premium ⭐
Số tiền: ${amount.toLocaleString('vi-VN')} VNĐ
Phương thức: ${paymentMethod === 'momo' ? 'MoMo Wallet' : 'ZaloPay'}
Mã giao dịch: ${orderId}
Thời gian: ${transactionTime}
Trạng thái: ✅ THÀNH CÔNG
─────────────────────────────────────────

🎁 Quyền lợi Premium:
✓ Upload không giới hạn
✓ Lưu trữ vĩnh viễn trên AWS S3
✓ File tối đa 50MB
✓ Hỗ trợ ưu tiên

📧 Email xác nhận đã được gửi đến: ${email}

Cảm ơn bạn đã tin tưởng sử dụng dịch vụ DTDM!
Truy cập: http://localhost:3000

─────────────────────────────────────────
© 2026 DTDM Edu - Powered by AWS
📞 Liên hệ: support@dtdmedu.com
    `.trim();

    try {
        const snsClient = getSnsClient();
        if (!snsClient) {
            return {
                success: false,
                error: 'AWS SNS chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
            };
        }

        const params = {
            Subject: subject,
            Message: message,
            TopicArn: TOPIC_ARN,
        };

        const result = await snsClient.send(new PublishCommand(params));
        
        console.log('📢 SNS Notification sent successfully, MessageId:', result.MessageId);
        
        return {
            success: true,
            messageId: result.MessageId
        };
    } catch (error) {
        console.error('❌ SNS Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Gửi thông báo đăng ký tài khoản mới
 * @param {string} username - Tên người dùng
 * @param {string} email - Email người dùng
 * @returns {Promise<Object>}
 */
async function sendWelcomeNotification(username, email) {
    const subject = `Chào mừng ${username} đến với DTDM!`;
    
    const message = `
╔═══════════════════════════════════════╗
║     TÀI KHOẢN MỚI - DTDM EDU          ║
╚═══════════════════════════════════════╝

Tài khoản mới vừa được đăng ký:

Tên: ${username}
Email: ${email}
Gói: Free (5 file upload)
Thời gian: ${new Date().toLocaleString('vi-VN')}

─────────────────────────────────────────
Tài khoản Free bao gồm:
✓ 5 lượt upload miễn phí
✓ Xem tài liệu không giới hạn
✓ File tối đa 10MB

💡 Nâng cấp Premium để không giới hạn!

─────────────────────────────────────────
© 2026 DTDM Edu
    `.trim();

    try {
        const snsClient = getSnsClient();
        if (!snsClient) {
            return {
                success: false,
                error: 'AWS SNS chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
            };
        }

        const params = {
            Subject: subject,
            Message: message,
            TopicArn: TOPIC_ARN,
        };

        const result = await snsClient.send(new PublishCommand(params));
        
        console.log('📢 Welcome notification sent, MessageId:', result.MessageId);
        
        return {
            success: true,
            messageId: result.MessageId
        };
    } catch (error) {
        console.error('❌ SNS Welcome Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    sendPaymentNotification,
    sendWelcomeNotification
};
