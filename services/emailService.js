const AWS = require("aws-sdk");

// Cấu hình AWS SES
const ses = new AWS.SES({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_SES_REGION || "ap-southeast-1", // Singapore region
});
=======
let _ses = null;
function getSesClient() {
  if (_ses) return _ses;

  const region = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-southeast-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // If credentials are not configured in the environment, don't crash at import time.
  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  _ses = new AWS.SES({
    accessKeyId,
    secretAccessKey,
    region
  });
  return _ses;
}
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841

let _ses = null;
function getSesClient() {
  if (_ses) return _ses;
  const region = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-southeast-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    return null;
  }
  _ses = new AWS.SES({ accessKeyId, secretAccessKey, region });
  return _ses;
}
/**
 * @param {String} toEmail - Email người nhận
 * @param {String} username - Tên người dùng
 * @returns {Promise<Object>}
 */
const sendWelcomeEmail = async (toEmail, username) => {
<<<<<<< HEAD
  const fromEmail = process.env.SES_FROM_EMAIL || "noreply@dtdmedu.com";

=======
  const ses = getSesClient();
  if (!ses) {
    return {
      success: false,
      error: 'AWS SES chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
    };
  }

  const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@dtdmedu.com';
  
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: "🎉 Chào mừng bạn đến với DTDM Edu!",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎓 DTDM Edu</h1>
                  <p>Hệ thống quản lý tài liệu học tập</p>
                </div>
                <div class="content">
                  <h2>Xin chào ${username}! 👋</h2>
                  <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>DTDM Edu</strong>.</p>
                  
                  <p><strong>Thông tin tài khoản của bạn:</strong></p>
                  <ul>
                    <li>📧 Email: ${toEmail}</li>
                    <li>👤 Tên: ${username}</li>
                    <li>📦 Gói: Free (5 tài liệu)</li>
                  </ul>
                  
                  <p>Bạn có thể bắt đầu tải lên tài liệu ngay bây giờ!</p>
                  
                  <center>
                    <a href="http://localhost:3000/dashboard.html" class="button">
                      🚀 Truy cập Dashboard
                    </a>
                  </center>
                  
                  <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <strong>💎 Nâng cấp Premium để:</strong><br>
                    ✓ Upload không giới hạn<br>
                    ✓ Lưu trữ mãi mãi trên AWS S3<br>
                    ✓ Hỗ trợ ưu tiên
                  </p>
                </div>
                <div class="footer">
                  <p>© 2026 DTDM Edu - Powered by AWS RDS & S3</p>

  const ses = getSesClient();
  if (!ses) {
    return {
      success: false,
      error: 'AWS SES chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
    };
  }
  const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@dtdmedu.com';
                  <p>Email này được gửi từ AWS SES</p>
                </div>
              </div>
            </body>
            </html>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: `
Xin chào ${username}!

Cảm ơn bạn đã đăng ký tài khoản tại DTDM Edu.

Thông tin tài khoản:
- Email: ${toEmail}
- Tên: ${username}
- Gói: Free (5 tài liệu)

Truy cập: http://localhost:3000/dashboard.html

Nâng cấp Premium để upload không giới hạn!

© 2026 DTDM Edu - Powered by AWS
          `,
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log("✅ Đã gửi email welcome tới:", toEmail);
    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error("❌ Lỗi gửi email SES:", error);
    // Không throw error để không làm gián đoạn quá trình đăng ký
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Gửi email thông báo nâng cấp Premium
 * @param {String} toEmail - Email người nhận
 * @param {String} username - Tên người dùng
 * @returns {Promise<Object>}
 */
const sendPremiumUpgradeEmail = async (toEmail, username) => {
<<<<<<< HEAD
  const fromEmail = process.env.SES_FROM_EMAIL || "noreply@dtdmedu.com";

=======
  const ses = getSesClient();
  if (!ses) {
    return {
      success: false,
      error: 'AWS SES chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
    };
  }

  const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@dtdmedu.com';
  
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: "⭐ Chúc mừng! Bạn đã nâng cấp Premium",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .badge { display: inline-block; padding: 10px 20px; background: gold; color: #333; font-weight: bold; border-radius: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Chúc mừng ${username}!</h1>
                  <div class="badge">⭐ PREMIUM MEMBER</div>
                </div>
                <div class="content">
                  <h2>Bạn đã nâng cấp thành công!</h2>
                  
                  <p><strong>Quyền lợi Premium của bạn:</strong></p>
                  <ul>
                    <li>✅ Upload <strong>KHÔNG GIỚI HẠN</strong> tài liệu</li>
                    <li>✅ Lưu trữ mãi mãi trên AWS S3</li>
                    <li>✅ Tốc độ download nhanh</li>
                    <li>✅ Hỗ trợ ưu tiên 24/7</li>
                  </ul>
                  
                  <p>Cảm ơn bạn đã tin tưởng và ủng hộ DTDM Edu! 💖</p>
                </div>
              </div>
            </body>
            </html>
          `,
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log("✅ Đã gửi email Premium tới:", toEmail);
    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error("❌ Lỗi gửi email SES:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Gửi email reset password
 * @param {String} toEmail - Email người nhận
 * @param {String} username - Tên người dùng
 * @param {String} resetUrl - URL để reset password
 * @returns {Promise<Object>}
 */
<<<<<<< HEAD
const sendPasswordResetEmail = async (toEmail, username, resetUrl) => {
  const fromEmail = process.env.SES_FROM_EMAIL || "noreply@dtdmedu.com";

  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: "🔐 Yêu cầu đặt lại mật khẩu - DTDM Edu",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 15px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Đặt Lại Mật Khẩu</h1>
                </div>
                <div class="content">
                  <h2>Xin chào ${username}!</h2>
                  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                  
                  <p>Click vào nút bên dưới để đặt mật khẩu mới:</p>
                  
                  <center>
                    <a href="${resetUrl}" class="button">
                      🔑 Đặt Lại Mật Khẩu
                    </a>
                  </center>
                  
                  <div class="warning">
                    <strong>⚠️ Lưu ý:</strong><br>
                    • Link này chỉ có hiệu lực trong <strong>1 giờ</strong><br>
                    • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này<br>
                    • Không chia sẻ link này với bất kỳ ai
                  </div>
                  
                  <p style="color: #666; font-size: 12px;">
                    Nếu nút không hoạt động, copy link sau vào trình duyệt:<br>
                    <a href="${resetUrl}">${resetUrl}</a>
                  </p>
                </div>
                <div class="footer">
                  <p>© 2026 DTDM Edu - Hệ thống quản lý tài liệu</p>
                </div>
              </div>
            </body>
            </html>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: `
Xin chào ${username}!

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

Click vào link sau để đặt mật khẩu mới:
${resetUrl}

⚠️ Lưu ý:
- Link này chỉ có hiệu lực trong 1 giờ
- Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này

© 2026 DTDM Edu
          `,
          Charset: "UTF-8",
        },
      },
    },
  };
=======
const verifyEmail = async (email) => {
  const ses = getSesClient();
  if (!ses) {
    return {
      success: false,
      error: 'AWS SES chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
    };
  }
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(`📧 Đã gửi email reset password tới: ${toEmail}`);
    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error("❌ Lỗi gửi email reset password:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPremiumUpgradeEmail,
  sendPasswordResetEmail,
};
