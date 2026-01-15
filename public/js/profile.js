const API_URL = "http://localhost:3000/api";
let currentUser = null;

// Loading helpers
function showLoading() {
  document.getElementById("loadingOverlay").classList.add("active");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.remove("active");
}

// Kiểm tra đăng nhập
function checkAuth() {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      window.location.href = "login.html";
      return null;
    }
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Lỗi parse user data:", error);
    localStorage.removeItem("user");
    window.location.href = "login.html";
    return null;
  }
}

// Xử lý tìm kiếm - chuyển đến trang documents
function handleSearch(event) {
  if (event.key === "Enter") {
    const query = event.target.value.trim();
    if (query.length >= 2) {
      window.location.href = `documents.html?search=${encodeURIComponent(
        query
      )}`;
    }
  }
}

// Load thông tin user
async function loadUserInfo() {
  currentUser = checkAuth();
  if (!currentUser) return;

  showLoading();
  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}`);
    const data = await response.json();

    if (data.success) {
      currentUser = data.user;
      localStorage.setItem("user", JSON.stringify(currentUser));
      updateUI();
      loadMyDocuments();
      loadUserStats();
    }
  } catch (error) {
    console.error("Lỗi load user info:", error);
  } finally {
    hideLoading();
  }
}

// Load thống kê user
async function loadUserStats() {
  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}/stats`);
    const data = await response.json();

    if (data.success && data.stats) {
      const statsContainer = document.getElementById("userStatsContainer");
      if (statsContainer) {
        const downloads = parseInt(data.stats.total_doc_downloads || data.stats.total_downloads || 0);
        const uploads = parseInt(data.stats.document_count || data.stats.total_uploads || 0);

        // Tính rank dựa trên hoạt động
        let rank = "Thành viên mới";
        let rankIcon = "🌱";
        if (downloads > 100 || uploads > 20) { rank = "Thành viên tích cực"; rankIcon = "🔥"; }
        if (downloads > 500 || uploads > 50) { rank = "Chuyên gia tài liệu"; rankIcon = "💎"; }
        if (downloads > 1000 || uploads > 100) { rank = "Huyền thoại"; rankIcon = "👑"; }

        statsContainer.innerHTML = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
            <div class="stat-box" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2);">
              <p style="margin: 0; color: #60a5fa; font-size: 0.8rem; text-transform: uppercase;">
                📥 Lượt người khác tải
              </p>
              <h3 style="margin-top: 8px; color: #93c5fd;">${downloads}</h3>
            </div>
            
            <div class="stat-box" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);">
              <p style="margin: 0; color: #34d399; font-size: 0.8rem; text-transform: uppercase;">
                📤 Tổng tài liệu upload
              </p>
              <h3 style="margin-top: 8px; color: #6ee7b7;">${uploads}</h3>
            </div>

            <div class="stat-box" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2);">
              <p style="margin: 0; color: #fbbf24; font-size: 0.8rem; text-transform: uppercase;">
                🏆 Cấp độ thành viên
              </p>
              <div style="margin-top: 8px; font-weight: bold; color: #fcd34d; font-size: 1.1rem;">
                ${rankIcon} ${rank}
              </div>
            </div>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error("Lỗi load user stats:", error);
  }
}

// Cập nhật giao diện
function updateUI() {
  if (!currentUser) return;

  document.getElementById(
    "userName"
  ).textContent = `Xin chào, ${currentUser.username}!`;
  document.getElementById("profileUsername").textContent = currentUser.username;
  document.getElementById("profileEmail").textContent = currentUser.email;

  // Update Header Avatar
  const avatarImg = document.getElementById("headerAvatar");
  const userDot = document.getElementById("headerUserDot");
  if (avatarImg && currentUser.avatar_url) {
    avatarImg.src = currentUser.avatar_url.includes("?")
      ? `${currentUser.avatar_url}&_t=${Date.now()}`
      : `${currentUser.avatar_url}?_t=${Date.now()}`;
    avatarImg.style.display = "block";
    if (userDot) userDot.style.display = "none";
  } else {
    if (avatarImg) avatarImg.style.display = "none";
    if (userDot) userDot.style.display = "block";
  }

  const createdDate = new Date(currentUser.created_at).toLocaleDateString(
    "vi-VN"
  );
  document.getElementById("profileCreatedAt").textContent = createdDate;

  // Thông tin gói
  const isPremium = currentUser.plan === "premium";
  document.getElementById("profilePlan").textContent = isPremium
    ? "Premium ⭐"
    : "Free";
  document.getElementById("planDescription").textContent = isPremium
    ? "Bạn đang sử dụng gói Premium với quyền lợi không giới hạn!"
    : "Gói miễn phí với giới hạn 5 tài liệu";

  // Quota
  document.getElementById("profileUploaded").textContent =
    currentUser.uploaded_files;

  if (isPremium) {
    document.getElementById("profileQuota").textContent = "∞";
    document.getElementById("quotaProgress").style.width = "100%";
    document.getElementById("upgradeBtn").style.display = "none";
  } else {
    document.getElementById("profileQuota").textContent = currentUser.quota;
    const percentage = (currentUser.uploaded_files / currentUser.quota) * 100;
    document.getElementById("quotaProgress").style.width = percentage + "%";

    if (currentUser.uploaded_files >= currentUser.quota) {
      document.getElementById("quotaProgress").style.background = "#dc3545";
    }
  }

  // Update Main Avatar
  initAvatar();
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
    console.error("Lỗi load documents:", error);
    document.getElementById("myDocuments").innerHTML =
      '<p style="text-align: center; color: #dc3545;">Lỗi kết nối server!</p>';
  }
}

// Hiển thị tài liệu
function displayMyDocuments(documents) {
  const listContainer = document.getElementById("myDocuments");

  if (documents.length === 0) {
    listContainer.innerHTML =
      '<p style="text-align: center; color: #999;">Bạn chưa upload tài liệu nào.</p>';
    return;
  }

  listContainer.innerHTML = documents
    .map((doc) => {
      const uploadDate = new Date(doc.upload_date).toLocaleDateString("vi-VN");
      const fileSize = (doc.size / 1024).toFixed(2);
      const fileExtension = doc.original_name.split(".").pop().toUpperCase();
      const downloadCount = doc.download_count || 0;
      const safeOriginalName = escapeHtml(doc.original_name);

      return `
            <div class="document-item" id="doc-${doc.id}">
                <div class="document-info">
                    <h3>📄 ${escapeHtml(doc.title)}</h3>
                    <p>${escapeHtml(doc.description || "Không có mô tả")}</p>
                    <p style="font-size: 0.85em; color: #999; margin-top: 5px;">
                        Loại: <strong>${fileExtension}</strong> | 
                        Kích thước: <strong>${fileSize} KB</strong> |
                        📥 <strong>${downloadCount}</strong> lượt tải
                    </p>
                </div>
                <div class="document-meta">
                    <p>Ngày tải lên</p>
                    <p><strong>${uploadDate}</strong></p>
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <button onclick="downloadDocument(${doc.id
        }, '${safeOriginalName.replace(/'/g, "\\'")}')" 
                                class="btn btn-primary" style="padding: 8px 15px;">
                            ⬇️ Tải xuống
                        </button>
                        <button onclick="deleteDocument(${doc.id})" 
                                class="btn btn-danger" style="padding: 8px 15px; background: #dc3545;">
                            🗑️ Xóa
                        </button>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Xóa tài liệu
async function deleteDocument(documentId) {
  if (!confirm("Bạn có chắc muốn xóa tài liệu này?")) return;

  try {
    const response = await fetch(`${API_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Đã xóa tài liệu!", "success");
      // Xóa element khỏi DOM
      const docElement = document.getElementById(`doc-${documentId}`);
      if (docElement) docElement.remove();
      // Cập nhật lại thông tin user
      loadUserInfo();
    } else {
      showNotification(data.message || "Không thể xóa!", "error");
    }
  } catch (error) {
    console.error("Lỗi xóa document:", error);
    showNotification("Lỗi kết nối server!", "error");
  }
}

// Tải xuống tài liệu từ S3
async function downloadDocument(documentId, originalName) {
  try {
    showNotification("Đang lấy link tải...", "info");

    const response = await fetch(`${API_URL}/documents/download/${documentId}`);
    const data = await response.json();

    if (data.success && data.downloadUrl) {
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = originalName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification("Đang tải xuống...", "success");
    } else {
      showNotification("Không thể tải file!", "error");
    }
  } catch (error) {
    console.error("Lỗi download:", error);
    showNotification("Lỗi kết nối server!", "error");
  }
}

// Hiển thị thông báo
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification ${type}`;

  setTimeout(() => {
    notification.className = "notification";
  }, 3000);
}

// ================ AVATAR FUNCTIONS ================

// Khởi tạo avatar hiển thị
function initAvatar() {
  if (!currentUser) return;

  const initial = currentUser.username
    ? currentUser.username.charAt(0).toUpperCase()
    : "?";
  document.getElementById("avatarInitial").textContent = initial;

  // Nếu có avatar_url thì hiển thị ảnh
  if (currentUser.avatar_url) {
    // Thêm timestamp để tránh cache
    const separator = currentUser.avatar_url.includes("?") ? "&" : "?";
    const avatarUrlWithCache = `${currentUser.avatar_url}${separator}_t=${Date.now()}`;

    document.getElementById("avatarImage").src = avatarUrlWithCache;
    document.getElementById("avatarImage").style.display = "block";
    document.getElementById("avatarInitial").style.display = "none";
  }
}

// Preview avatar trước khi upload
function previewAvatar(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // Kiểm tra size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification("Ảnh quá lớn! Tối đa 2MB.", "error");
      input.value = "";
      return;
    }

    // Kiểm tra loại file
    if (!file.type.startsWith("image/")) {
      showNotification("Chỉ chấp nhận file ảnh!", "error");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("avatarImage").src = e.target.result;
      document.getElementById("avatarImage").style.display = "block";
      document.getElementById("avatarInitial").style.display = "none";
      document.getElementById("uploadAvatarBtn").style.display = "inline-block";
    };
    reader.readAsDataURL(file);
  }
}

// Upload avatar lên server
async function uploadAvatar() {
  const fileInput = document.getElementById("avatarInput");
  if (!fileInput.files || !fileInput.files[0]) {
    showNotification("Vui lòng chọn ảnh!", "error");
    return;
  }

  const formData = new FormData();
  formData.append("avatar", fileInput.files[0]);

  const btn = document.getElementById("uploadAvatarBtn");
  btn.disabled = true;
  btn.textContent = "⏳ Đang tải...";

  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}/avatar`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Cập nhật avatar thành công!", "success");
      // Cập nhật user trong localStorage
      currentUser.avatar_url = data.avatarUrl;
      localStorage.setItem("user", JSON.stringify(currentUser));
      btn.style.display = "none";
      fileInput.value = "";
    } else {
      showNotification(data.message || "Lỗi upload avatar!", "error");
    }
  } catch (error) {
    console.error("Lỗi upload avatar:", error);
    showNotification("Lỗi kết nối server!", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "✅ Lưu Avatar";
  }
}

// Đăng xuất
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Scroll to top functionality
function initScrollToTop() {
  if (!document.getElementById("scrollTopBtn")) {
    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.className = "scroll-top-btn";
    btn.innerHTML = "⬆️";
    btn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
    document.body.appendChild(btn);
  }

  const scrollBtn = document.getElementById("scrollTopBtn");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.add("visible");
    } else {
      scrollBtn.classList.remove("visible");
    }
  });
}

// ================ THEME SUPPORT ================
function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButton();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById("themeToggle");
  if (btn) {
    const theme = document.documentElement.getAttribute("data-theme");
    btn.textContent = theme === "light" ? "☀️" : "🌙";
  }
}

// ================ ONLINE/OFFLINE DETECTION ================
function updateOnlineStatus() {
  const indicator = document.getElementById("offlineIndicator");
  if (indicator) {
    if (navigator.onLine) {
      indicator.classList.remove("show");
    } else {
      indicator.classList.add("show");
    }
  }
}

// ================ KEYBOARD SHORTCUTS ================
function initKeyboardShortcuts() {
  let keySequence = "";
  let keyTimeout;

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      if (e.key === "Escape") {
        e.target.blur();
        closeShortcutsModal();
      }
      return;
    }

    clearTimeout(keyTimeout);
    keyTimeout = setTimeout(() => (keySequence = ""), 1000);

    const key = e.key.toLowerCase();
    keySequence += key;

    // Single key shortcuts
    if (key === "/" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById("searchInput")?.focus();
      return;
    }

    if (key === "t" && keySequence === "t") {
      toggleTheme();
      keySequence = "";
      return;
    }

    if (key === "?" || (e.shiftKey && key === "/")) {
      e.preventDefault();
      openShortcutsModal();
      return;
    }

    if (key === "e" && keySequence === "e") {
      // Focus vào input upload avatar
      document.getElementById("avatarInput")?.click();
      keySequence = "";
      return;
    }

    if (key === "l" && keySequence === "l") {
      logout();
      return;
    }

    if (key === "escape") {
      closeShortcutsModal();
      return;
    }

    // Two-key shortcuts (g + letter)
    if (keySequence === "gd") window.location.href = "dashboard.html";
    else if (keySequence === "gt") window.location.href = "documents.html";
    else if (keySequence === "gp") window.location.href = "profile.html";
    else if (keySequence === "gu") window.location.href = "payment.html";
  });
}

function openShortcutsModal() {
  document.getElementById("shortcutsModal")?.classList.add("show");
}

function closeShortcutsModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("shortcutsModal")?.classList.remove("show");
}

// ================ SIDEBAR TOGGLE ================
function toggleSidebar() {
  const app = document.querySelector(".app");
  app.classList.toggle("collapsed");
  const isCollapsed = app.classList.contains("collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);
}

function loadSidebarState() {
  const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (isCollapsed) {
    document.querySelector(".app").classList.add("collapsed");
  }
}

// Load khi trang được tải
window.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadUserInfo();
  initKeyboardShortcuts();
  loadSidebarState(); // Load sidebar state
  updateOnlineStatus();
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
});
