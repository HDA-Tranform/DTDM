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
        }
    } catch (error) {
        console.error('Lỗi load user info:', error);
    }
}

// Cập nhật giao diện
function updateUI() {
    if (!currentUser) return;

    document.getElementById('userName').textContent = `Xin chào, ${currentUser.username}!`;
    document.getElementById('uploadedCount').textContent = currentUser.uploaded_files;
    document.getElementById('userPlan').textContent = currentUser.plan === 'premium' ? 'Premium ⭐' : 'Free';
    
    const quotaText = currentUser.plan === 'premium' 
        ? 'Không giới hạn ∞' 
        : `${currentUser.quota - currentUser.uploaded_files} / ${currentUser.quota}`;
    document.getElementById('quotaRemaining').textContent = quotaText;
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

// Cập nhật tên file được chọn
function updateFileName() {
    const fileInput = document.getElementById('docFile');
    const fileName = document.getElementById('fileName');
    
    if (fileInput.files.length > 0) {
        fileName.textContent = `📎 ${fileInput.files[0].name}`;
    } else {
        fileName.textContent = '';
    }
}

// Xử lý upload
async function handleUpload(event) {
    event.preventDefault();
    
    const title = document.getElementById('docTitle').value;
    const description = document.getElementById('docDescription').value;
    const fileInput = document.getElementById('docFile');
    
    if (!fileInput.files[0]) {
        showNotification('Vui lòng chọn file!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('document', fileInput.files[0]);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('userId', currentUser.id);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('✅ Upload thành công!', 'success');
            
            // Reset form
            document.getElementById('docTitle').value = '';
            document.getElementById('docDescription').value = '';
            fileInput.value = '';
            document.getElementById('fileName').textContent = '';
            
            // Reload user info để cập nhật quota
            await loadUserInfo();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server!', 'error');
    }
}

// Đăng xuất
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Load khi trang được tải
window.addEventListener('DOMContentLoaded', loadUserInfo);
