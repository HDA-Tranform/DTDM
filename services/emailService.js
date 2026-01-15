const AWS = require('aws-sdk');

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

/**
 * Gửi email xác nhận đăng ký
 * @param {String} toEmail - Email người nhận
 * @param {String} username - Tên người dùng
 * @returns {Promise<Object>}
 */
const sendWelcomeEmail = async (toEmail, username) => {
  const ses = getSesClient();
  if (!ses) {
    return {
      success: false,
      error: 'AWS SES chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
    };
  }

  const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@dtdmedu.com';
  
  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [toEmail]
    },
    Message: {
      Subject: {
        Data: '🎉 Chào mừng bạn đến với DTDM Edu!',
        Charset: 'UTF-8'
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
                  <p>Email này được gửi từ AWS SES</p>
                </div>
              </div>
            </body>
            </html>
          `,
          Charset: 'UTF-8'
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
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log('✅ Đã gửi email welcome tới:', toEmail);
    return {
      success: true,
      messageId: result.MessageId
    };
  } catch (error) {
    console.error('❌ Lỗi gửi email SES:', error);
    // Không throw error để không làm gián đoạn quá trình đăng ký
    return {
      success: false,
      error: error.message
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
  const ses = getSesClient();
  if (!ses) {
    return {
      success: false,
      error: 'AWS SES chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
    };
  }

  const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@dtdmedu.com';
  
  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [toEmail]
    },
    Message: {
      Subject: {
        Data: '⭐ Chúc mừng! Bạn đã nâng cấp Premium',
        Charset: 'UTF-8'
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
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log('✅ Đã gửi email Premium tới:', toEmail);
    return {
      success: true,
      messageId: result.MessageId
    };
  } catch (error) {
    console.error('❌ Lỗi gửi email SES:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify email trong AWS SES (cần verify trước khi gửi)
 * @param {String} email - Email cần verify
 */
const verifyEmail = async (email) => {
  const ses = getSesClient();
  if (!ses) {
    return {
      success: false,
      error: 'AWS SES chưa được cấu hình (thiếu AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
    };
  }

  try {
    const result = await ses.verifyEmailIdentity({ EmailAddress: email }).promise();
    console.log(`📧 Đã gửi email verify tới: ${email}`);
    return {
      success: true,
      message: 'Vui lòng check email để verify'
    };
  } catch (error) {
    console.error('❌ Lỗi verify email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPremiumUpgradeEmail,
  verifyEmail
};
