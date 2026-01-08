const axios = require('axios');
const crypto = require('crypto');

class MomoService {
    constructor() {
        this.partnerCode = process.env.MOMO_PARTNER_CODE;
        this.accessKey = process.env.MOMO_ACCESS_KEY;
        this.secretKey = process.env.MOMO_SECRET_KEY;
        this.endpoint = process.env.MOMO_API_ENDPOINT;
        this.redirectUrl = process.env.MOMO_REDIRECT_URL;
        this.ipnUrl = process.env.MOMO_IPN_URL;
        
        console.log('MoMo Config:', {
            partnerCode: this.partnerCode,
            endpoint: this.endpoint,
            redirectUrl: this.redirectUrl
        });
    }

    /**
     * Tạo yêu cầu thanh toán MoMo
     * @param {string} orderId - Mã đơn hàng
     * @param {number} amount - Số tiền
     * @param {string} orderInfo - Thông tin đơn hàng
     * @param {object} extraData - Dữ liệu bổ sung (userId, plan, etc.)
     */
    async createPayment(orderId, amount, orderInfo, extraData = {}) {
        try {
            const requestId = orderId;
            const extraDataString = JSON.stringify(extraData);
            const requestType = "captureWallet";
            
            // Tạo chữ ký (signature)
            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraDataString}&ipnUrl=${this.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
            
            const signature = crypto
                .createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            // Request body
            const requestBody = {
                partnerCode: this.partnerCode,
                accessKey: this.accessKey,
                requestId: requestId,
                amount: amount.toString(),
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: this.redirectUrl,
                ipnUrl: this.ipnUrl,
                extraData: extraDataString,
                requestType: requestType,
                signature: signature,
                lang: 'vi'
            };

            console.log('MoMo Request Body:', JSON.stringify(requestBody, null, 2));

            // Gọi API MoMo
            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('MoMo Response:', response.data);

            if (response.data.resultCode === 0) {
                return {
                    success: true,
                    payUrl: response.data.payUrl,
                    deeplink: response.data.deeplink,
                    qrCodeUrl: response.data.qrCodeUrl
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || 'Lỗi tạo thanh toán MoMo'
                };
            }
        } catch (error) {
            console.error('MoMo Error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Xác thực IPN callback từ MoMo
     * @param {object} data - Dữ liệu IPN từ MoMo
     */
    verifyIPN(data) {
        try {
            const {
                partnerCode,
                orderId,
                requestId,
                amount,
                orderInfo,
                orderType,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                signature
            } = data;

            // Tạo chữ ký để xác thực
            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
            
            const calculatedSignature = crypto
                .createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            if (calculatedSignature === signature) {
                return {
                    valid: true,
                    resultCode: resultCode,
                    extraData: extraData ? JSON.parse(extraData) : {},
                    orderId: orderId,
                    transId: transId
                };
            } else {
                return {
                    valid: false,
                    message: 'Chữ ký không hợp lệ'
                };
            }
        } catch (error) {
            console.error('Verify IPN Error:', error);
            return {
                valid: false,
                message: error.message
            };
        }
    }
}

module.exports = new MomoService();
