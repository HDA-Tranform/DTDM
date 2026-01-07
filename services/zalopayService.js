const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class ZaloPayService {
    constructor() {
        this.appId = parseInt(process.env.ZALOPAY_APPID);
        this.key1 = process.env.ZALOPAY_KEY1;
        this.key2 = process.env.ZALOPAY_KEY2;
        this.endpoint = 'https://sb-openapi.zalopay.vn/v2/create';
        this.redirectUrl = process.env.ZALOPAY_REDIRECT_URL;
        this.ipnUrl = process.env.ZALOPAY_IPN_URL;
    }

    /**
     * Tạo yêu cầu thanh toán ZaloPay
     * @param {string} orderId - Mã đơn hàng
     * @param {number} amount - Số tiền
     * @param {string} description - Mô tả đơn hàng
     * @param {object} embedData - Dữ liệu bổ sung (userId, plan, etc.)
     */
    async createPayment(orderId, amount, description, embedData = {}) {
        try {
            const appTransId = `${moment().format('YYMMDD')}_${orderId}`;
            const appTime = Date.now();

            // Embed data
            const embedDataObj = {
                redirecturl: this.redirectUrl,
                ...embedData
            };
            const embedDataString = JSON.stringify(embedDataObj);
            
            // Items
            const items = [{
                itemid: "premium",
                itemname: "Gói Premium",
                itemprice: amount,
                itemquantity: 1
            }];
            const itemString = JSON.stringify(items);

            // Tạo data để tính MAC theo format ZaloPay v2
            // Format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
            const data = `${this.appId}|${appTransId}|${embedData.userId}|${amount}|${appTime}|${embedDataString}|${itemString}`;
            
            const mac = crypto
                .createHmac('sha256', this.key1)
                .update(data)
                .digest('hex');

            // Request body
            const requestBody = {
                app_id: this.appId,
                app_trans_id: appTransId,
                app_user: String(embedData.userId),
                app_time: appTime,
                amount: amount,
                item: itemString,
                embed_data: embedDataString,
                description: description,
                bank_code: "",
                mac: mac
            };

            console.log('ZaloPay Data for MAC:', data);
            console.log('ZaloPay Request Body:', JSON.stringify(requestBody, null, 2));

            // Gọi API ZaloPay với form-urlencoded
            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                transformRequest: [(data) => {
                    return Object.keys(data)
                        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                        .join('&');
                }]
            });

            console.log('ZaloPay Response:', response.data);

            if (response.data.return_code === 1) {
                return {
                    success: true,
                    orderUrl: response.data.order_url,
                    zpTransToken: response.data.zp_trans_token,
                    appTransId: appTransId
                };
            } else {
                return {
                    success: false,
                    message: response.data.return_message || `Lỗi ZaloPay: ${response.data.return_code}`
                };
            }
        } catch (error) {
            console.error('ZaloPay Error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Xác thực IPN callback từ ZaloPay
     * @param {object} data - Dữ liệu IPN từ ZaloPay
     */
    verifyIPN(data) {
        try {
            const { data: dataStr, mac } = data;
            
            // Tạo MAC để xác thực
            const calculatedMac = crypto
                .createHmac('sha256', this.key2)
                .update(dataStr)
                .digest('hex');

            if (calculatedMac === mac) {
                const jsonData = JSON.parse(dataStr);
                return {
                    valid: true,
                    appTransId: jsonData.app_trans_id,
                    embedData: JSON.parse(jsonData.embed_data),
                    amount: jsonData.amount,
                    status: jsonData.status
                };
            } else {
                return {
                    valid: false,
                    message: 'MAC không hợp lệ'
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

    /**
     * Kiểm tra trạng thái đơn hàng
     * @param {string} appTransId - Mã giao dịch
     */
    async queryOrder(appTransId) {
        try {
            const data = `${this.appId}|${appTransId}|${this.key1}`;
            const mac = crypto
                .createHmac('sha256', this.key1)
                .update(data)
                .digest('hex');

            const queryEndpoint = 'https://sb-openapi.zalopay.vn/v2/query';
            const response = await axios.post(queryEndpoint, null, {
                params: {
                    app_id: this.appId,
                    app_trans_id: appTransId,
                    mac: mac
                }
            });

            return response.data;
        } catch (error) {
            console.error('Query Order Error:', error);
            return {
                return_code: -1,
                return_message: error.message
            };
        }
    }
}

module.exports = new ZaloPayService();
