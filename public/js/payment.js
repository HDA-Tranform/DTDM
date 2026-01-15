const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let selectedPayment = null;

// Kiểm tra đăng nhập
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(userStr);
}

// Load thông tin user
async function loadUserInfo() {
    currentUser = checkAuth();
    if (!currentUser) return;

    document.getElementById('userName').textContent = `Xin chào, ${currentUser.username}!`;
    
    try {
        const response = await fetch(`${API_URL}/user/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateUI();
        }
    } catch (error) {
        console.error('Lỗi load user info:', error);
    }
}

// Cập nhật giao diện
function updateUI() {
    const planText = currentUser.plan === 'premium' ? 'Premium ⭐' : 'Free';
    document.getElementById('currentPlan').textContent = planText;
    
    if (currentUser.plan === 'premium') {
        document.getElementById('paymentCard').style.display = 'none';
        document.getElementById('currentPlanInfo').innerHTML = `
            <p style="color: #28a745; margin: 0; font-size: 1.2em;">
                ✅ Bạn đã là thành viên Premium!
            </p>
        `;
    }
}

// Chọn phương thức thanh toán
function selectPayment(method) {
    if (currentUser && currentUser.plan === 'premium') {
        showNotification('Bạn đã là Premium!', 'error');
        return;
    }

    selectedPayment = method;
    
    // Remove selected class from all options
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    document.getElementById(`${method}-option`).classList.add('selected');

    // Toggle ATM panel
    const atmPanel = document.getElementById('atmPanel');
    if (atmPanel) {
        atmPanel.style.display = method === 'atm' ? 'block' : 'none';
    }
    
    // Enable payment button
    document.getElementById('paymentBtn').disabled = false;
}

// Xử lý thanh toán
async function processPayment() {
    if (!selectedPayment) {
        showNotification('Vui lòng chọn phương thức thanh toán!', 'error');
        return;
    }

    if (currentUser.plan === 'premium') {
        showNotification('Bạn đã là Premium!', 'error');
        return;
    }

    const amount = 199000; // 199.000đ
    
    // Disable button để tránh click nhiều lần
    const paymentBtn = document.getElementById('paymentBtn');
    paymentBtn.disabled = true;
    paymentBtn.textContent = 'Đang xử lý...';

    try {
        let endpoint = '';
        let requestBody = {
            userId: currentUser.id,
            amount: amount
        };

        if (selectedPayment === 'momo') {
            endpoint = `${API_URL}/payment/momo/create`;
            requestBody.orderInfo = `Nâng cấp Premium - ${currentUser.username}`;
        } else if (selectedPayment === 'zalopay') {
            endpoint = `${API_URL}/payment/zalopay/create`;
            requestBody.description = `Nâng cấp Premium - ${currentUser.username}`;
        } else if (selectedPayment === 'atm') {
            endpoint = `${API_URL}/payment/atm/test`;
            const scenarioEl = document.getElementById('atmScenario');
            requestBody.scenario = scenarioEl ? scenarioEl.value : 'success';
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.success) {
            // Redirect đến trang thanh toán
            if (selectedPayment === 'momo') {
                // MoMo có thể dùng payUrl hoặc deeplink
                window.location.href = data.payUrl;
            } else if (selectedPayment === 'zalopay') {
                // ZaloPay dùng orderUrl
                window.location.href = data.orderUrl;
            } else if (selectedPayment === 'atm') {
                window.location.href = data.redirectUrl || 'success.html';
            }
        } else {
            showNotification(data.message || 'Có lỗi xảy ra khi tạo thanh toán!', 'error');
            paymentBtn.disabled = false;
            paymentBtn.textContent = 'Thanh Toán 199.000đ';
        }
    } catch (error) {
        console.error('Payment Error:', error);
        showNotification('Lỗi kết nối server!', 'error');
        paymentBtn.disabled = false;
        paymentBtn.textContent = 'Thanh Toán 199.000đ';
    }
}

// Hiển thị thông báo
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Load khi trang được tải
window.addEventListener('DOMContentLoaded', loadUserInfo);
