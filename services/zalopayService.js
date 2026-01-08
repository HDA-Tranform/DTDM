const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class ZaloPayService {
    constructor() {
        this.appId = parseInt(process.env.ZALOPAY_APPID) || 554;
        this.key1 = process.env.ZALOPAY_KEY1;
        this.key2 = process.env.ZALOPAY_KEY2;
        this.endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
        this.redirectUrl = process.env.ZALOPAY_REDIRECT_URL;
        this.ipnUrl = process.env.ZALOPAY_IPN_URL;
        
        console.log('ZaloPay Config:', {
            appId: this.appId,
            endpoint: this.endpoint,
            redirectUrl: this.redirectUrl
        });
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
            const transID = Date.now();
            const appTransId = `${moment().format('YYMMDD')}_${transID}`;

            // Embed data cho redirect
            const embedDataObj = {
                redirecturl: this.redirectUrl,
                ...embedData
            };

            // Tạo order theo format ZaloPay TPE (Third Party Ecommerce)
            const order = {
                app_id: this.appId,
                app_user: String(embedData.userId || 'user'),
                app_trans_id: appTransId,
                app_time: Date.now(),
                amount: amount,
                item: JSON.stringify([{
                    itemid: "premium",
                    itemname: "Gói Premium DTDM",
                    itemprice: amount,
                    itemquantity: 1
                }]),
                embed_data: JSON.stringify(embedDataObj),
                description: description,
                bank_code: "zalopayapp"
            };

            // Tạo MAC theo format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
            const data = `${order.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
            
            order.mac = crypto
                .createHmac('sha256', this.key1)
                .update(data)
                .digest('hex');

            console.log('ZaloPay MAC Data:', data);
            console.log('ZaloPay Request:', JSON.stringify(order, null, 2));

            // Gọi API ZaloPay
            const response = await axios.post(this.endpoint, null, {
                params: order
            });

            console.log('ZaloPay Response:', response.data);

            if (response.data.return_code === 1 || response.data.returncode === 1) {
                return {
                    success: true,
                    orderUrl: response.data.order_url || response.data.orderurl,
                    zpTransToken: response.data.zp_trans_token || response.data.zptranstoken,
                    appTransId: appTransId
                };
            } else {
                const returnCode = response.data.return_code || response.data.returncode;
                const returnMsg = response.data.return_message || response.data.returnmessage || 'Không xác định';
                return {
                    success: false,
                    message: `Lỗi ZaloPay (${returnCode}): ${returnMsg}`
                };
            }
        } catch (error) {
            console.error('ZaloPay Error:', error.response?.data || error.message);
            return {
                success: false,
                message: 'Lỗi kết nối ZaloPay: ' + (error.response?.data?.return_message || error.message)
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
