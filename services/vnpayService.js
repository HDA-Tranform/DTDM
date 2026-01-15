const crypto = require('crypto');

function sortObject(obj) {
    const sorted = {};
    Object.keys(obj)
        .sort()
        .forEach((key) => {
            sorted[key] = obj[key];
        });
    return sorted;
}

function buildQueryString(params) {
    return Object.entries(params)
        .map(([key, value]) => {
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(String(value));
            return `${encodedKey}=${encodedValue}`;
        })
        .join('&');
}

function formatVnpDate(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
        date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}

class VNPayService {
    constructor() {
        this.tmnCode = process.env.VNPAY_TMN_CODE;
        this.hashSecret = process.env.VNPAY_HASH_SECRET;
        this.vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        this.returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payment/vnpay/return';

        console.log('VNPay Config:', {
            tmnCode: this.tmnCode ? '***set***' : undefined,
            vnpUrl: this.vnpUrl,
            returnUrl: this.returnUrl
        });
    }

    validateConfig() {
        if (!this.tmnCode) return 'Thiếu cấu hình VNPAY_TMN_CODE';
        if (!this.hashSecret) return 'Thiếu cấu hình VNPAY_HASH_SECRET';
        return null;
    }

    createPaymentUrl({ orderId, amount, orderInfo, ipAddr }) {
        const configError = this.validateConfig();
        if (configError) {
            return { success: false, message: configError };
        }

        const vnpParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: this.tmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: String(Math.round(Number(amount)) * 100),
            vnp_ReturnUrl: this.returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: formatVnpDate(new Date())
        };

        const sortedParams = sortObject(vnpParams);
        const signData = buildQueryString(sortedParams);

        const secureHash = crypto
            .createHmac('sha512', this.hashSecret)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        const paymentUrl = `${this.vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

        return {
            success: true,
            paymentUrl,
            orderId
        };
    }

    verifyReturn(query) {
        const configError = this.validateConfig();
        if (configError) {
            return { valid: false, message: configError };
        }

        const vnpParams = { ...query };
        const secureHash = vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHashType;

        const sortedParams = sortObject(vnpParams);
        const signData = buildQueryString(sortedParams);

        const calculatedHash = crypto
            .createHmac('sha512', this.hashSecret)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        if (!secureHash || calculatedHash !== secureHash) {
            return { valid: false, message: 'VNPay: Chữ ký không hợp lệ' };
        }

        return {
            valid: true,
            orderId: vnpParams.vnp_TxnRef,
            responseCode: vnpParams.vnp_ResponseCode,
            transactionNo: vnpParams.vnp_TransactionNo,
            amount: vnpParams.vnp_Amount,
            raw: vnpParams
        };
    }
}

module.exports = new VNPayService();
