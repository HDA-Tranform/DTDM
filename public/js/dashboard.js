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

// ================ CATEGORIES ================
async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`);
    const data = await response.json();

    if (data.success) {
      const select = document.getElementById("docCategory");
      if (select) {
        select.innerHTML = '<option value="">📁 Chọn danh mục...</option>';
        data.categories.forEach((cat) => {
          select.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        });
      }
    }
  } catch (error) {
    console.error("Lỗi load categories:", error);
  }
}

// Xử lý tìm kiếm - chuyển đến trang documents với query
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

  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}`);
    const data = await response.json();

    if (data.success) {
      currentUser = data.user;
      localStorage.setItem("user", JSON.stringify(currentUser));
      updateUI();
    }
  } catch (error) {
    console.error("Lỗi load user info:", error);
  }
}

// Cập nhật giao diện
function updateUI() {
  if (!currentUser) return;

  document.getElementById(
    "userName"
  ).textContent = `Xin chào, ${currentUser.username}!`;

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
  document.getElementById("uploadedCount").textContent =
    currentUser.uploaded_files;
  document.getElementById("userPlan").textContent =
    currentUser.plan === "premium" ? "Premium ⭐" : "Free";

  const quotaText =
    currentUser.plan === "premium"
      ? "Không giới hạn ∞"
      : `${currentUser.quota - currentUser.uploaded_files} / ${currentUser.quota
      }`;
  document.getElementById("quotaRemaining").textContent = quotaText;
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

// Cập nhật tên file được chọn
function updateFileName() {
  const fileInput = document.getElementById("docFile");
  const fileName = document.getElementById("fileName");

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    fileName.textContent = `📎 ${file.name} (${sizeMB} MB)`;
  } else {
    fileName.textContent = "";
  }
}

// Xử lý upload
async function handleUpload(event) {
  event.preventDefault();

  const title = document.getElementById("docTitle").value.trim();
  const description = document.getElementById("docDescription").value.trim();
  const categoryId = document.getElementById("docCategory").value;
  const fileInput = document.getElementById("docFile");

  if (!fileInput.files[0]) {
    showNotification("Vui lòng chọn file!", "error");
    return;
  }

  // Validate file size (10MB)
  if (fileInput.files[0].size > 10 * 1024 * 1024) {
    showNotification("File vượt quá 10MB!", "error");
    return;
  }

  const uploadBtn = document.getElementById("uploadBtn");
  uploadBtn.disabled = true;
  uploadBtn.classList.add("loading");
  uploadBtn.innerHTML =
    '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Đang upload...';

  const formData = new FormData();
  formData.append("document", fileInput.files[0]);
  formData.append("title", title);
  formData.append("description", description);
  formData.append("userId", currentUser.id);
  if (categoryId) formData.append("categoryId", categoryId);

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showNotification("✅ Upload thành công!", "success");

      // Reset form
      document.getElementById("docTitle").value = "";
      document.getElementById("docDescription").value = "";
      document.getElementById("docCategory").value = "";
      fileInput.value = "";
      document.getElementById("fileName").textContent = "";

      // Reload user info để cập nhật quota
      await loadUserInfo();
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Lỗi kết nối server!", "error");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.classList.remove("loading");
    uploadBtn.textContent = "Upload";
  }
}

// Đăng xuất
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

<<<<<<< HEAD
// ================ PROGRESSIVE WEB APP (PWA) ================
let deferredPrompt;

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("✅ Service Worker registered"))
      .catch((err) => console.log("❌ SW registration failed:", err));
  });
}

// PWA Install Prompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install prompt after 30 seconds
  setTimeout(() => {
    if (deferredPrompt && !localStorage.getItem("pwaPromptDismissed")) {
      document.getElementById("pwaInstallPrompt").classList.add("show");
    }
  }, 30000);
});

function installPwa() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        showNotification("🎉 Ứng dụng đã được cài đặt!", "success");
      }
      deferredPrompt = null;
      document.getElementById("pwaInstallPrompt").classList.remove("show");
    });
  }
}

function dismissPwaPrompt() {
  document.getElementById("pwaInstallPrompt").classList.remove("show");
  localStorage.setItem("pwaPromptDismissed", "true");
}

// ================ ONLINE/OFFLINE DETECTION ================
function updateOnlineStatus() {
  const indicator = document.getElementById("offlineIndicator");
  if (!navigator.onLine) {
    indicator.classList.add("show");
  } else {
    indicator.classList.remove("show");
  }
}

window.addEventListener("online", () => {
  updateOnlineStatus();
  showNotification("🌐 Đã kết nối lại mạng!", "success");
});

window.addEventListener("offline", () => {
  updateOnlineStatus();
  showNotification("📴 Mất kết nối mạng!", "error");
});

// ================ THEME TOGGLE ================
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  // Update toggle button icon
  const toggleBtn = document.getElementById("themeToggle");
  toggleBtn.textContent = newTheme === "light" ? "☀️" : "🌙";

  showNotification(
    `Đã chuyển sang giao diện ${newTheme === "light" ? "sáng" : "tối"}`,
    "success"
  );
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.textContent = savedTheme === "light" ? "☀️" : "🌙";
  }
}

// ================ DRAG & DROP UPLOAD ================
function initDragDrop() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("docFile");

  if (!dropZone) return;

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove("dragover");
    });
  });

  dropZone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!validTypes.includes(file.type)) {
        showNotification("❌ Chỉ chấp nhận file PDF hoặc DOC!", "error");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showNotification("❌ File vượt quá 10MB!", "error");
        return;
      }

      // Create a DataTransfer to set the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      updateFileName();
      showNotification("✅ Đã chọn file: " + file.name, "success");
    }
  });
}

// ================ KEYBOARD SHORTCUTS ================
let keySequence = "";
let keyTimeout;

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ignore if typing in input/textarea
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      // Exception: Escape still works
      if (e.key === "Escape") {
        e.target.blur();
        closeShortcutsModal();
      }
      return;
    }

    // Clear sequence after 1 second
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

    if (key === "l" && keySequence === "l") {
      logout();
      return;
    }

    if (key === "escape") {
      closeShortcutsModal();
      return;
    }

    // Two-key shortcuts (g + letter)
    if (keySequence === "gd") {
      window.location.href = "dashboard.html";
    } else if (keySequence === "gt") {
      window.location.href = "documents.html";
    } else if (keySequence === "gp") {
      window.location.href = "profile.html";
    } else if (keySequence === "gu") {
      window.location.href = "payment.html";
    }
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

// ================ INITIALIZATION ================
window.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadUserInfo();
  loadCategories();
  initDragDrop();
  initKeyboardShortcuts();
  loadSidebarState(); // Load sidebar state
  updateOnlineStatus();
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
});
=======
// Load khi trang được tải
window.addEventListener('DOMContentLoaded', loadUserInfo);
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
