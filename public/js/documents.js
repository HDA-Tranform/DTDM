const API_URL = "http://localhost:3000/api";
let currentUser = null;
let searchTimeout = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// ================ NEW FEATURES STATE ================
let isLoading = false;
let hasMoreDocuments = true;
let currentCategory = "all";
let showFavoritesOnly = false;
let allDocuments = [];
let currentPreviewDoc = null;
let currentSort = "newest";
let currentView = localStorage.getItem("documentView") || "list";
let recentlyViewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");

// Loading functions
function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.classList.toggle("active", show);
  }
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
  } catch (e) {
    localStorage.removeItem("user");
    window.location.href = "login.html";
    return null;
  }
}

// Get file icon based on extension
function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (ext === "pdf") return '<div class="file-icon pdf">PDF</div>';
  if (ext === "doc" || ext === "docx")
    return '<div class="file-icon doc">DOC</div>';
  return '<div class="file-icon default">FILE</div>';
}

// Xử lý tìm kiếm
function handleSearch(event) {
  const query = event.target.value.trim();

  // Debounce - chờ người dùng ngừng gõ 300ms
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (query.length >= 2) {
      searchDocuments(query);
    } else if (query.length === 0) {
      loadDocuments();
    }
  }, 300);
}

// Tìm kiếm tài liệu
async function searchDocuments(query) {
  try {
    const response = await fetch(
      `${API_URL}/documents/search?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    if (data.success) {
      displayDocuments(data.documents);
      if (data.documents.length === 0) {
        document.getElementById(
          "documentList"
        ).innerHTML = `<p style="text-align: center; color: #999;">Không tìm thấy tài liệu nào với từ khóa "${escapeHtml(
          query
        )}"</p>`;
      }
    }
  } catch (error) {
    console.error("Lỗi search:", error);
    showNotification("Lỗi tìm kiếm!", "error");
  }
}

// ================ CATEGORIES ================
async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`);
    const data = await response.json();

    if (data.success) {
      const select = document.getElementById("categoryFilter");
      if (select) {
        select.innerHTML = '<option value="all">📁 Tất cả danh mục</option>';
        data.categories.forEach((cat) => {
          select.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name
            } (${cat.document_count || 0})</option>`;
        });
      }
    }
  } catch (error) {
    console.error("Lỗi load categories:", error);
  }
}

function filterByCategory() {
  const select = document.getElementById("categoryFilter");
  currentCategory = select.value;
  currentPage = 1;
  allDocuments = [];
  hasMoreDocuments = true;
  loadDocuments(true); // true = reset
}

// ================ SORT DOCUMENTS ================
function sortDocuments() {
  const select = document.getElementById("sortFilter");
  currentSort = select.value;

  // Sort the current documents
  const sortedDocs = [...allDocuments].sort((a, b) => {
    switch (currentSort) {
      case "newest":
        return new Date(b.upload_date) - new Date(a.upload_date);
      case "oldest":
        return new Date(a.upload_date) - new Date(b.upload_date);
      case "downloads":
        return (b.download_count || 0) - (a.download_count || 0);
      case "size":
        return (b.size || b.file_size || 0) - (a.size || a.file_size || 0);
      case "name":
        return a.title.localeCompare(b.title, "vi");
      default:
        return 0;
    }
  });

  displayDocuments(sortedDocs);
  showNotification(`Đã sắp xếp: ${getSortLabel(currentSort)}`, "info");
}

function getSortLabel(sort) {
  const labels = {
    newest: "Mới nhất",
    oldest: "Cũ nhất",
    downloads: "Lượt tải",
    size: "Kích thước",
    name: "Tên A-Z"
  };
  return labels[sort] || sort;
}

// ================ VIEW TOGGLE ================
function setView(view) {
  currentView = view;
  localStorage.setItem("documentView", view);

  const documentList = document.getElementById("documentList");
  const gridBtn = document.getElementById("viewGrid");
  const listBtn = document.getElementById("viewList");

  if (view === "grid") {
    documentList.classList.add("grid-view");
    gridBtn?.classList.add("active");
    listBtn?.classList.remove("active");
  } else {
    documentList.classList.remove("grid-view");
    gridBtn?.classList.remove("active");
    listBtn?.classList.add("active");
  }

  showNotification(`Chế độ xem: ${view === "grid" ? "Lưới" : "Danh sách"}`, "info");
}

function initViewToggle() {
  // Apply saved view state
  if (currentView === "grid") {
    setView("grid");
  }
}

// ================ RECENTLY VIEWED ================
function addToRecentlyViewed(doc) {
  // Remove if already exists
  recentlyViewed = recentlyViewed.filter(d => d.id !== doc.id);

  // Add to beginning
  recentlyViewed.unshift({
    id: doc.id,
    title: doc.title,
    filename: doc.filename,
    upload_date: doc.upload_date
  });

  // Keep only last 10
  recentlyViewed = recentlyViewed.slice(0, 10);

  // Save to localStorage
  localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed));

  // Re-render
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  const container = document.getElementById("recentlyViewedContainer");
  if (!container) return;

  if (recentlyViewed.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  const list = container.querySelector(".recently-viewed-list");

  list.innerHTML = recentlyViewed.map(doc => {
    const fileIcon = getFileIcon(doc.filename || "file");
    const safeTitle = escapeHtml(doc.title);
    return `
      <div class="recently-viewed-item" onclick="scrollToDocument(${doc.id})">
        ${fileIcon}
        <span class="title">${safeTitle}</span>
      </div>
    `;
  }).join("");
}

function scrollToDocument(docId) {
  const docElement = document.querySelector(`[data-id="${docId}"]`);
  if (docElement) {
    docElement.scrollIntoView({ behavior: "smooth", block: "center" });
    docElement.style.animation = "highlight 1s ease";
    setTimeout(() => docElement.style.animation = "", 1000);
  } else {
    showNotification("Tài liệu không có trong danh sách hiện tại", "info");
  }
}

// ================ FAVORITES ================
function toggleFavoritesFilter() {
  showFavoritesOnly = !showFavoritesOnly;
  const btn = document.getElementById("favoritesFilter");
  if (btn) {
    btn.classList.toggle("active", showFavoritesOnly);
    btn.innerHTML = showFavoritesOnly ? "⭐ Yêu thích" : "☆ Yêu thích";
  }
  currentPage = 1;
  allDocuments = [];
  hasMoreDocuments = true;
  loadDocuments(true);
}

async function toggleFavorite(documentId, button) {
  if (!currentUser) return;

  try {
    const response = await fetch(`${API_URL}/favorites/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, documentId }),
    });

    const data = await response.json();
    if (data.success) {
      button.classList.toggle("active", data.isFavorite);
      button.innerHTML = data.isFavorite ? "⭐" : "☆";
      button.title = data.isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích";
      showNotification(
        data.isFavorite ? "Đã thêm vào yêu thích!" : "Đã bỏ yêu thích!",
        "success"
      );

      // Update local document data
      const doc = allDocuments.find((d) => d.id === documentId);
      if (doc) doc.is_favorite = data.isFavorite;

      // Reload if in favorites-only mode and unfavorited
      if (showFavoritesOnly && !data.isFavorite) {
        allDocuments = [];
        hasMoreDocuments = true;
        loadDocuments(true);
      }
    }
  } catch (error) {
    console.error("Lỗi toggle favorite:", error);
    showNotification("Lỗi kết nối!", "error");
  }
}

// ================ FILE PREVIEW ================
async function openPreviewModal(documentId, title) {
  const modal = document.getElementById("previewModal");
  const iframe = document.getElementById("previewFrame");
  const titleEl = document.getElementById("previewTitle");

  if (!modal || !iframe) return;

  titleEl.textContent = title;
  iframe.src = "";
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  try {
    showNotification("Đang tải preview...", "info");
    const response = await fetch(`${API_URL}/documents/download/${documentId}`);
    const data = await response.json();

    if (data.success && data.downloadUrl) {
      // Use Google Docs Viewer for PDF preview
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
        data.downloadUrl
      )}&embedded=true`;
      iframe.src = viewerUrl;
      currentPreviewDoc = { id: documentId, url: data.downloadUrl, title };

      // Track recently viewed
      const doc = allDocuments.find(d => d.id === documentId);
      if (doc) addToRecentlyViewed(doc);
    } else {
      showNotification("Không thể tải preview!", "error");
      closePreviewModal();
    }
  } catch (error) {
    console.error("Lỗi preview:", error);
    showNotification("Lỗi kết nối!", "error");
    closePreviewModal();
  }
}

function closePreviewModal(e) {
  if (e && e.target !== e.currentTarget) return;
  const modal = document.getElementById("previewModal");
  const iframe = document.getElementById("previewFrame");

  if (modal) modal.classList.remove("show");
  if (iframe) iframe.src = "";
  document.body.style.overflow = "";
  currentPreviewDoc = null;
}

function downloadFromPreview() {
  if (currentPreviewDoc && currentPreviewDoc.url) {
    const link = document.createElement("a");
    link.href = currentPreviewDoc.url;
    link.download = currentPreviewDoc.title;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Đang tải xuống...", "success");
  }
}

// ================ COMMENTS ================
let currentCommentsDocId = null;
let currentRating = 0;
let commentsPage = 1;
let hasMoreComments = false;

function openCommentsModal(documentId, title) {
  currentCommentsDocId = documentId;
  commentsPage = 1;
  currentRating = 0;

  document.getElementById("commentsTitle").textContent = title;
  document.getElementById("commentsModal").classList.add("show");
  document.getElementById("commentInput").value = "";
  document.getElementById("charCount").textContent = "0/1000";
  resetRatingStars();

  document.body.style.overflow = "hidden";
  loadComments(true);
}

function closeCommentsModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("commentsModal").classList.remove("show");
  document.body.style.overflow = "";
  currentCommentsDocId = null;
}

async function loadComments(reset = false) {
  if (!currentCommentsDocId) return;

  if (reset) {
    commentsPage = 1;
    document.getElementById("commentsList").innerHTML = '<p class="loading-comments">Đang tải bình luận...</p>';
  }

  try {
    const response = await fetch(
      `${API_URL}/documents/${currentCommentsDocId}/comments?page=${commentsPage}&limit=10&_t=${Date.now()}`
    );
    const data = await response.json();

    if (data.success) {
      if (reset) {
        renderComments(data.comments);
      } else {
        appendComments(data.comments);
      }

      // Update rating summary
      updateRatingSummary(data.stats.avgRating, data.stats.ratingCount);

      // Show/hide load more button
      hasMoreComments = commentsPage < data.pagination.totalPages;
      document.getElementById("loadMoreComments").style.display = hasMoreComments ? "block" : "none";
    }
  } catch (error) {
    console.error("Load comments error:", error);
    document.getElementById("commentsList").innerHTML = '<p class="error-message">Lỗi tải bình luận!</p>';
  }
}

function renderComments(comments) {
  const container = document.getElementById("commentsList");

  if (comments.length === 0) {
    container.innerHTML = '<p class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
    return;
  }

  container.innerHTML = comments.map(c => renderCommentItem(c)).join("");
}

function appendComments(comments) {
  const container = document.getElementById("commentsList");
  container.innerHTML += comments.map(c => renderCommentItem(c)).join("");
}

function renderCommentItem(comment) {
  const relativeTime = formatRelativeTime(comment.created_at);
  const safeContent = escapeHtml(comment.content);
  const ratingStars = comment.rating ? renderStars(comment.rating) : "";
  const isOwner = currentUser && currentUser.id === comment.user_id;

  return `
    <div class="comment-item" data-comment-id="${comment.id}">
      <div class="comment-header">
        <div class="comment-user">
          <span class="comment-avatar">${comment.avatar_url ? `<img src="${comment.avatar_url}" alt="">` : "👤"}</span>
          <span class="comment-username">${escapeHtml(comment.username)}</span>
          ${ratingStars ? `<span class="comment-rating">${ratingStars}</span>` : ""}
        </div>
        <div class="comment-meta">
          <span class="comment-time">${relativeTime}</span>
          ${isOwner ? `<button onclick="deleteComment(${comment.id})" class="delete-comment-btn" title="Xóa">🗑️</button>` : ""}
        </div>
      </div>
      <div class="comment-content">${safeContent}</div>
    </div>
  `;
}

function renderStars(rating) {
  return "⭐".repeat(rating) + "☆".repeat(5 - rating);
}

function updateRatingSummary(avgRating, ratingCount) {
  const roundedRating = Math.round(avgRating * 10) / 10;
  document.getElementById("avgRatingText").textContent = roundedRating.toFixed(1);
  document.getElementById("ratingCount").textContent = `(${ratingCount} đánh giá)`;
  document.getElementById("avgRatingStars").innerHTML = renderStars(Math.round(avgRating));
}

function setRating(rating) {
  currentRating = rating;
  const stars = document.querySelectorAll("#starRating span");
  stars.forEach((star, index) => {
    star.textContent = index < rating ? "⭐" : "☆";
    star.classList.toggle("active", index < rating);
  });
}

function resetRatingStars() {
  currentRating = 0;
  const stars = document.querySelectorAll("#starRating span");
  stars.forEach(star => {
    star.textContent = "☆";
    star.classList.remove("active");
  });
}

async function submitComment() {
  const content = document.getElementById("commentInput").value.trim();

  if (!content) {
    showNotification("Vui lòng nhập nội dung bình luận!", "error");
    return;
  }

  if (!currentUser) {
    showNotification("Vui lòng đăng nhập để bình luận!", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/documents/${currentCommentsDocId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        content: content,
        rating: currentRating || null
      })
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Đã gửi bình luận!", "success");
      document.getElementById("commentInput").value = "";
      document.getElementById("charCount").textContent = "0/1000";
      resetRatingStars();
      loadComments(true);

      // Update comment count in the list (reliable ID selector)
      const btn = document.getElementById(`comment-btn-${currentCommentsDocId}`);
      if (btn) {
        const currentCount = parseInt(btn.innerText.match(/\d+/) || 0);
        btn.innerText = `💬 ${currentCount + 1}`;
      }
    } else {
      showNotification(data.message || "Lỗi gửi bình luận!", "error");
    }
  } catch (error) {
    console.error("Submit comment error:", error);
    showNotification("Lỗi kết nối!", "error");
  }
}

async function deleteComment(commentId) {
  if (!confirm("Bạn có chắc muốn xóa bình luận này?")) return;

  try {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Đã xóa bình luận!", "success");
      document.querySelector(`[data-comment-id="${commentId}"]`)?.remove();
      loadComments(true);

      // Update comment count in the list (decrement)
      if (currentCommentsDocId) {
        const btn = document.getElementById(`comment-btn-${currentCommentsDocId}`);
        if (btn) {
          const currentCount = parseInt(btn.innerText.match(/\d+/) || 0);
          if (currentCount > 0) {
            btn.innerText = `💬 ${currentCount - 1}`;
          }
        }
      }
    } else {
      showNotification(data.message || "Lỗi xóa bình luận!", "error");
    }
  } catch (error) {
    console.error("Delete comment error:", error);
    showNotification("Lỗi kết nối!", "error");
  }
}

function loadMoreComments() {
  commentsPage++;
  loadComments(false);
}

// Character count for comment input
document.addEventListener("DOMContentLoaded", () => {
  const commentInput = document.getElementById("commentInput");
  if (commentInput) {
    commentInput.addEventListener("input", () => {
      document.getElementById("charCount").textContent = `${commentInput.value.length}/1000`;
    });
  }
});

// ================ INFINITE SCROLL ================
function initInfiniteScroll() {
  const loadingMore = document.getElementById("loadingMore");
  if (!loadingMore) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isLoading && hasMoreDocuments) {
        loadMoreDocuments();
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(loadingMore);
}

async function loadMoreDocuments() {
  if (isLoading || !hasMoreDocuments) return;

  isLoading = true;
  document.getElementById("loadingMore").style.display = "flex";

  currentPage++;

  try {
    let url = `${API_URL}/documents?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
    if (currentCategory !== "all") url += `&category=${currentCategory}`;
    if (showFavoritesOnly && currentUser)
      url += `&userId=${currentUser.id}&favorites=true`;
    else if (currentUser) url += `&userId=${currentUser.id}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      if (data.documents.length === 0) {
        hasMoreDocuments = false;
        document.getElementById("endOfList").style.display = "block";
      } else {
        allDocuments = [...allDocuments, ...data.documents];
        appendDocuments(data.documents);
        hasMoreDocuments = data.documents.length === ITEMS_PER_PAGE;
      }
    }
  } catch (error) {
    console.error("Lỗi load more:", error);
  } finally {
    isLoading = false;
    document.getElementById("loadingMore").style.display = "none";
  }
}

// Load danh sách tài liệu
async function loadDocuments(reset = false) {
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

  // Kiểm tra nếu có search query từ URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("search");

  if (searchQuery && !reset) {
    document.getElementById("searchInput").value = searchQuery;
    searchDocuments(searchQuery);
    return;
  }

  if (reset) {
    currentPage = 1;
    allDocuments = [];
    hasMoreDocuments = true;
    document.getElementById("endOfList").style.display = "none";
  }

  showLoading(true);
  try {
    let url = `${API_URL}/documents?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
    if (currentCategory !== "all") url += `&category=${currentCategory}`;
    if (showFavoritesOnly && currentUser)
      url += `&userId=${currentUser.id}&favorites=true`;
    else if (currentUser) url += `&userId=${currentUser.id}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      allDocuments = data.documents;
      displayDocuments(data.documents);
      hasMoreDocuments = data.documents.length === ITEMS_PER_PAGE;

      if (!hasMoreDocuments && data.documents.length > 0) {
        document.getElementById("endOfList").style.display = "block";
      }
    }
  } catch (error) {
    console.error("Lỗi load documents:", error);
    document.getElementById("documentList").innerHTML =
      '<p style="text-align: center; color: #dc3545;">Lỗi kết nối server!</p>';
  } finally {
    showLoading(false);
  }
}

// Render pagination
function renderPagination(total, page, totalPages) {
  const container = document.getElementById("paginationContainer");
  if (!container || totalPages <= 1) {
    if (container) container.style.display = "none";
    return;
  }

  container.style.display = "flex";
  let html = `
    <button onclick="goToPage(${page - 1})" ${page <= 1 ? "disabled" : ""
    }>◀</button>
  `;

  // Show page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      html += `<button onclick="goToPage(${i})" class="${i === page ? "active" : ""
        }">${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += `<span class="page-info">...</span>`;
    }
  }

  html += `
    <button onclick="goToPage(${page + 1})" ${page >= totalPages ? "disabled" : ""
    }>▶</button>
    <span class="page-info">Trang ${page}/${totalPages} (${total} tài liệu)</span>
  `;

  container.innerHTML = html;
}

// Go to page
function goToPage(page) {
  currentPage = page;
  loadDocuments();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Format relative time (e.g., "2 giờ trước", "3 ngày trước")
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  if (diffWeek < 4) return `${diffWeek} tuần trước`;
  if (diffMonth < 12) return `${diffMonth} tháng trước`;

  return date.toLocaleDateString("vi-VN");
}

// Hiển thị danh sách tài liệu
function displayDocuments(documents) {
  const listContainer = document.getElementById("documentList");

  if (documents.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
        <div class="title">${showFavoritesOnly
        ? "Chưa có tài liệu yêu thích"
        : "Chưa có tài liệu nào"
      }</div>
        <p class="desc">${showFavoritesOnly
        ? "Hãy đánh dấu yêu thích các tài liệu!"
        : "Hãy upload tài liệu đầu tiên của bạn!"
      }</p>
      </div>`;
    return;
  }

  listContainer.innerHTML = documents
    .map((doc) => renderDocumentCard(doc))
    .join("");
}

// Append thêm documents cho infinite scroll
function appendDocuments(documents) {
  const listContainer = document.getElementById("documentList");
  listContainer.innerHTML += documents
    .map((doc) => renderDocumentCard(doc))
    .join("");
}

// Render một document card
function renderDocumentCard(doc) {
  const uploadDate = new Date(doc.upload_date).toLocaleDateString("vi-VN");
  const relativeTime = formatRelativeTime(doc.upload_date);
  const docSize = doc.size || doc.file_size || 0;
  const fileSize = docSize
    ? docSize > 1024 * 1024
      ? (docSize / 1024 / 1024).toFixed(2) + " MB"
      : (docSize / 1024).toFixed(2) + " KB"
    : "N/A";
  const fileExtension = doc.filename
    ? doc.filename.split(".").pop().toUpperCase()
    : "FILE";
  const fileIcon = getFileIcon(doc.filename || "file");
  const isPDF = doc.filename && doc.filename.toLowerCase().endsWith(".pdf");

  // Escape HTML
  const safeTitle = escapeHtml(doc.title);
  const safeDescription = escapeHtml(doc.description || "Không có mô tả");
  const safeUsername = escapeHtml(doc.username);
  const safeFilename = escapeHtml(doc.filename || "file");

  const downloadCount = doc.download_count || 0;
  const isFavorite = doc.is_favorite || false;
  const categoryName = doc.category_name || "Khác";
  const categoryIcon = doc.category_icon || "📁";

  return `
    <div class="document-item" data-id="${doc.id}">
      <div class="document-info" style="display: flex; align-items: flex-start;">
        ${fileIcon}
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <h3 style="font-family: var(--font); word-break: break-word; margin: 0;">${safeTitle}</h3>
            <span class="category-badge">${categoryIcon} ${categoryName}</span>
          </div>
          <p style="font-family: var(--font); word-break: break-word; margin: 8px 0; color: rgba(255,255,255,0.7);">${safeDescription}</p>
          <p style="font-size: 0.85em; color: #999; margin: 0; font-family: var(--font);">
            👤 ${safeUsername} • ${fileExtension} • ${fileSize} • 📥 ${downloadCount} lượt tải
          </p>
        </div>
      </div>
      <div class="document-meta">
        <p style="margin: 0;" data-tooltip="${uploadDate}">📅 ${relativeTime}</p>
        <div class="document-actions">
          <button onclick="toggleFavorite(${doc.id}, this)" 
                  class="favorite-btn ${isFavorite ? "active" : ""}" 
                  title="${isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}">
            ${isFavorite ? "⭐" : "☆"}
          </button>
          ${isPDF
      ? `
          <button onclick="openPreviewModal(${doc.id}, '${safeTitle.replace(
        /'/g,
        "\\'"
      )}')" 
                  class="btn btn-secondary preview-btn" title="Xem trước">
            👁️ Xem
          </button>
          `
      : ""
    }
          <button onclick="downloadDocument(${doc.id}, \`${safeFilename.replace(
      /`/g,
      "\\`"
    )}\`)" 
                  class="btn btn-primary" style="padding: 8px 15px;">
            ⬇️ Tải
          </button>
          <button onclick="shareDocument('${safeTitle}', '${safeDescription}', ${doc.id
    })" 
                  class="share-btn" title="Chia sẻ">
            📤 Chia sẻ
          </button>
          <button id="comment-btn-${doc.id}" onclick="openCommentsModal(${doc.id}, '${safeTitle.replace(/'/g, "\\'")}')" 
                  class="comment-btn" title="Bình luận">
            💬 ${doc.comment_count || 0}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Escape HTML để tránh XSS và lỗi hiển thị
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Tải xuống tài liệu từ S3
async function downloadDocument(documentId, originalName) {
  try {
    showNotification("Đang lấy link tải...", "info");

    const response = await fetch(`${API_URL}/documents/download/${documentId}`);
    const data = await response.json();

    if (data.success && data.downloadUrl) {
      // Tạo thẻ a ẩn để tải file
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = originalName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track recently viewed
      const doc = allDocuments.find(d => d.id === documentId);
      if (doc) addToRecentlyViewed(doc);

      showNotification("Đang tải xuống...", "success");
    } else {
      showNotification("Không thể tải file!", "error");
    }
  } catch (error) {
    console.error("Lỗi download:", error);
    showNotification("Lỗi kết nối server!", "error");
  }
}

// ================ WEB SHARE API ================
async function shareDocument(title, description, documentId) {
  const shareUrl = `${window.location.origin}/documents.html?highlight=${documentId}`;

  // Check if Web Share API is supported
  if (navigator.share) {
    try {
      await navigator.share({
        title: `📄 ${title} - DTDM`,
        text: description || "Xem tài liệu này trên DTDM",
        url: shareUrl,
      });
      showNotification("✅ Đã chia sẻ!", "success");
    } catch (err) {
      if (err.name !== "AbortError") {
        // Fallback to copy
        copyToClipboard(shareUrl, title);
      }
    }
  } else {
    // Fallback for desktop - copy to clipboard
    copyToClipboard(shareUrl, title);
  }
}

// Copy to clipboard helper
async function copyToClipboard(text, title) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification(`📋 Đã copy link "${title}" vào clipboard!`, "success");
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showNotification(`📋 Đã copy link vào clipboard!`, "success");
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

// Scroll to top functionality
function initScrollToTop() {
  // Create scroll button if not exists
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
  loadCategories();
  loadTheme();
  // loadUserInfo removed as it is handled in loadDocuments or not defined
  loadDocuments(); // Load all documents initially
  initKeyboardShortcuts();
  loadSidebarState(); // Load sidebar state
  updateOnlineStatus();
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  // Setup infinite scroll
  window.addEventListener("scroll", handleScroll);

  // Close preview modal on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePreviewModal();
    }
  });
});
