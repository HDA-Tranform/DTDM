const API_URL = 'http://localhost:3000/api';
let currentUser = null;

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

    try {
        const response = await fetch(`${API_URL}/user/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUI();
            loadMyDocuments();
        }
    } catch (error) {
        console.error('Lỗi load user info:', error);
    }
}

// Cập nhật giao diện
function updateUI() {
    if (!currentUser) return;

    document.getElementById('userName').textContent = `Xin chào, ${currentUser.username}!`;
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;
    
    const createdDate = new Date(currentUser.created_at).toLocaleDateString('vi-VN');
    document.getElementById('profileCreatedAt').textContent = createdDate;

    // Thông tin gói
    const isPremium = currentUser.plan === 'premium';
    document.getElementById('profilePlan').textContent = isPremium ? 'Premium ⭐' : 'Free';
    document.getElementById('planDescription').textContent = isPremium 
        ? 'Bạn đang sử dụng gói Premium với quyền lợi không giới hạn!' 
        : 'Gói miễn phí với giới hạn 5 tài liệu';

    // Quota
    document.getElementById('profileUploaded').textContent = currentUser.uploaded_files;
    
    if (isPremium) {
        document.getElementById('profileQuota').textContent = '∞';
        document.getElementById('quotaProgress').style.width = '100%';
        document.getElementById('upgradeBtn').style.display = 'none';
    } else {
        document.getElementById('profileQuota').textContent = currentUser.quota;
        const percentage = (currentUser.uploaded_files / currentUser.quota) * 100;
        document.getElementById('quotaProgress').style.width = percentage + '%';
        
        if (currentUser.uploaded_files >= currentUser.quota) {
            document.getElementById('quotaProgress').style.background = '#dc3545';
        }
    }
}

// Load tài liệu của user
async function loadMyDocuments() {
    try {
        const response = await fetch(`${API_URL}/documents/user/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            displayMyDocuments(data.documents);
        }
    } catch (error) {
        console.error('Lỗi load documents:', error);
        document.getElementById('myDocuments').innerHTML = 
            '<p style="text-align: center; color: #dc3545;">Lỗi kết nối server!</p>';
    }
}

// Hiển thị tài liệu
function displayMyDocuments(documents) {
    const listContainer = document.getElementById('myDocuments');
    
    if (documents.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #999;">Bạn chưa upload tài liệu nào.</p>';
        return;
    }

    listContainer.innerHTML = documents.map(doc => {
        const uploadDate = new Date(doc.upload_date).toLocaleDateString('vi-VN');
        const fileSize = (doc.size / 1024).toFixed(2);
        const fileExtension = doc.original_name.split('.').pop().toUpperCase();
        
        return `
            <div class="document-item">
                <div class="document-info">
                    <h3>📄 ${doc.title}</h3>
                    <p>${doc.description || 'Không có mô tả'}</p>
                    <p style="font-size: 0.85em; color: #999; margin-top: 5px;">
                        Loại: <strong>${fileExtension}</strong> | 
                        Kích thước: <strong>${fileSize} KB</strong>
                    </p>
                </div>
                <div class="document-meta">
                    <p>Ngày tải lên</p>
                    <p><strong>${uploadDate}</strong></p>
                    <button onclick="downloadDocument(${doc.id}, '${doc.original_name}')" 
                            class="btn btn-primary" style="margin-top: 10px; padding: 8px 15px;">
                        Tải xuống
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Tải xuống tài liệu từ S3
async function downloadDocument(documentId, originalName) {
    try {
        showNotification('Đang lấy link tải...', 'info');
        
        const response = await fetch(`${API_URL}/documents/download/${documentId}`);
        const data = await response.json();
        
        if (data.success && data.downloadUrl) {
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = originalName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('Đang tải xuống...', 'success');
        } else {
            showNotification('Không thể tải file!', 'error');
        }
    } catch (error) {
        console.error('Lỗi download:', error);
        showNotification('Lỗi kết nối server!', 'error');
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
