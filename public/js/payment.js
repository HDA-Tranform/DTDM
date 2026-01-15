const API_URL = "http://localhost:3000/api";
let currentUser = null;
let selectedPayment = null;

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

// Đăng xuất
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Load thông tin user
async function loadUserInfo() {
  currentUser = checkAuth();
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

  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}`);
    const data = await response.json();

    if (data.success) {
      currentUser = data.user;
      updateUI();
    }
  } catch (error) {
    console.error("Lỗi load user info:", error);
  }
}

// Cập nhật giao diện
function updateUI() {
  const planText = currentUser.plan === "premium" ? "Premium ⭐" : "Free";
  document.getElementById("currentPlan").textContent = planText;

  if (currentUser.plan === "premium") {
    document.getElementById("paymentCard").style.display = "none";
    document.getElementById("currentPlanInfo").innerHTML = `
            <p style="color: #28a745; margin: 0; font-size: 1.2em;">
                ✅ Bạn đã là thành viên Premium!
            </p>
        `;
  }
}

// Chọn phương thức thanh toán
function selectPayment(method) {
  if (currentUser && currentUser.plan === "premium") {
    showNotification("Bạn đã là Premium!", "error");
    return;
  }

// Conflict marker removed: HEAD
  selectedPayment = method;

  // Remove selected class from all options
  document.querySelectorAll(".payment-option").forEach((option) => {
    option.classList.remove("selected");
  });

  // Add selected class to clicked option
  document.getElementById(`${method}-option`).classList.add("selected");

  // Enable payment button
  document.getElementById("paymentBtn").disabled = false;
// Conflict marker removed: =======
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
// Conflict marker removed: >>>>>>>
}

// Xử lý thanh toán
async function processPayment() {
  if (!selectedPayment) {
    showNotification("Vui lòng chọn phương thức thanh toán!", "error");
    return;
  }

  if (currentUser.plan === "premium") {
    showNotification("Bạn đã là Premium!", "error");
    return;
  }

  const paymentName = selectedPayment === "momo" ? "MoMo" : "ZaloPay";
  const amount = 199000; // 199.000đ

  // Disable button và show loading
  const paymentBtn = document.getElementById("paymentBtn");
  paymentBtn.disabled = true;
  paymentBtn.classList.add("loading");
  paymentBtn.innerHTML =
    '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Đang xử lý...';
  showLoading();

  try {
    let endpoint = "";
    let requestBody = {
      userId: currentUser.id,
      amount: amount,
    };

    if (selectedPayment === "momo") {
      endpoint = `${API_URL}/payment/momo/create`;
      requestBody.orderInfo = `Nâng cấp Premium - ${currentUser.username}`;
    } else if (selectedPayment === "zalopay") {
      endpoint = `${API_URL}/payment/zalopay/create`;
      requestBody.description = `Nâng cấp Premium - ${currentUser.username}`;
    }

<<<<<<< HEAD
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.success) {
      // Redirect đến trang thanh toán
      if (selectedPayment === "momo") {
        // MoMo có thể dùng payUrl hoặc deeplink
        window.location.href = data.payUrl;
      } else if (selectedPayment === "zalopay") {
        // ZaloPay dùng orderUrl
        window.location.href = data.orderUrl;
      }
    } else {
      showNotification(
        data.message || "Có lỗi xảy ra khi tạo thanh toán!",
        "error"
      );
      paymentBtn.disabled = false;
      paymentBtn.classList.remove("loading");
      paymentBtn.textContent = "💰 Thanh Toán 199.000đ";
      hideLoading();
=======
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
>>>>>>> 1e0c40a5a44adf1ef48a6096de83509bd9eeb841
    }
  } catch (error) {
    console.error("Payment Error:", error);
    showNotification("Lỗi kết nối server!", "error");
    paymentBtn.disabled = false;
    paymentBtn.classList.remove("loading");
    paymentBtn.textContent = "💰 Thanh Toán 199.000đ";
    hideLoading();
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

// Đăng xuất
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
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
