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

// Load danh sách tài liệu
async function loadDocuments() {
    currentUser = checkAuth();
    if (!currentUser) return;

    document.getElementById('userName').textContent = `Xin chào, ${currentUser.username}!`;

    try {
        const response = await fetch(`${API_URL}/documents`);
        const data = await response.json();

        if (data.success) {
            displayDocuments(data.documents);
        }
    } catch (error) {
        console.error('Lỗi load documents:', error);
        document.getElementById('documentList').innerHTML = 
            '<p style="text-align: center; color: #dc3545;">Lỗi kết nối server!</p>';
    }
}

// Hiển thị danh sách tài liệu
function displayDocuments(documents) {
    const listContainer = document.getElementById('documentList');
    
    if (documents.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #999;">Chưa có tài liệu nào.</p>';
        return;
    }

    listContainer.innerHTML = documents.map(doc => {
        const uploadDate = new Date(doc.upload_date).toLocaleDateString('vi-VN');
        const fileSize = (doc.size / 1024).toFixed(2); // KB
        const fileExtension = doc.original_name.split('.').pop().toUpperCase();
        
        return `
            <div class="document-item">
                <div class="document-info">
                    <h3>📄 ${doc.title}</h3>
                    <p>${doc.description || 'Không có mô tả'}</p>
                    <p style="font-size: 0.85em; color: #999; margin-top: 5px;">
                        Người đăng: <strong>${doc.username}</strong> | 
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
            // Tạo thẻ a ẩn để tải file
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
window.addEventListener('DOMContentLoaded', loadDocuments);
