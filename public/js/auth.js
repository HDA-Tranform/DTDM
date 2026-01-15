const API_URL = "http://localhost:3000/api";

// Toggle password visibility
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "🙈";
  } else {
    input.type = "password";
    button.textContent = "👁️";
  }
}

// Chuyển đổi giữa form đăng nhập và đăng ký
function switchForm(formType) {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (formType === "login") {
    loginForm.classList.add("active");
    registerForm.classList.remove("active");
  } else {
    registerForm.classList.add("active");
    loginForm.classList.remove("active");
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

// Xử lý đăng ký
async function handleRegister(event) {
  event.preventDefault();

  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Validate confirm password
  if (password !== confirmPassword) {
    showNotification("Mật khẩu xác nhận không khớp!", "error");
    return;
  }

  // Validate password strength
  if (password.length < 6) {
    showNotification("Mật khẩu phải có ít nhất 6 ký tự!", "error");
    return;
  }

  const registerBtn = document.getElementById("registerBtn");
  registerBtn.disabled = true;
  registerBtn.classList.add("loading");
  registerBtn.innerHTML =
    '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Đang xử lý...';

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification(data.message, "success");
      setTimeout(() => {
        switchForm("login");
      }, 1500);
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Lỗi kết nối server!", "error");
  } finally {
    registerBtn.disabled = false;
    registerBtn.classList.remove("loading");
    registerBtn.textContent = "Đăng Ký";
  }
}

// Xử lý đăng nhập
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const loginBtn = document.getElementById("loginBtn");
  loginBtn.disabled = true;
  loginBtn.classList.add("loading");
  loginBtn.innerHTML =
    '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Đang xử lý...';

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Lưu thông tin user vào localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      showNotification(data.message, "success");

      // Chuyển đến trang dashboard
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Lỗi kết nối server!", "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.classList.remove("loading");
    loginBtn.textContent = "Đăng Nhập";
  }
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

// ================ KEYBOARD SHORTCUTS ================
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    const key = e.key.toLowerCase();

    // Toggle theme with T key
    if (key === "t") {
      toggleTheme();
    }
  });
}

// Load theme khi trang được tải
window.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  initKeyboardShortcuts();
});
