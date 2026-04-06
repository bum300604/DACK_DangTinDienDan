/**
 * Admin: danh sách thành viên, khóa / mở đăng nhập (isLocked).
 */
(function () {
  var lead = document.getElementById("admin-users-lead");
  var alertEl = document.getElementById("admin-users-alert");
  var emptyEl = document.getElementById("admin-users-empty");
  var tableEl = document.getElementById("admin-users-table");
  var tbody = document.getElementById("admin-users-tbody");
  var searchForm = document.getElementById("admin-users-search");
  var searchInput = document.getElementById("admin-users-q");
  var pagEl = document.getElementById("admin-users-pagination");
  var pagLabel = document.getElementById("admin-users-page-label");
  var btnPrev = document.getElementById("admin-users-prev");
  var btnNext = document.getElementById("admin-users-next");

  var state = { q: "", page: 1, limit: 20, total: 0 };
  var myUserId = "";

  function showAlert(msg) {
    if (!alertEl) return;
    alertEl.textContent = msg || "";
    alertEl.classList.toggle("d-none", !msg);
  }

  function formatWhen(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function updatePagination() {
    if (!pagEl || !pagLabel) return;
    var totalPages = Math.max(1, Math.ceil(state.total / state.limit) || 1);
    if (state.total === 0) {
      pagEl.classList.add("d-none");
      return;
    }
    pagEl.classList.remove("d-none");
    pagLabel.textContent = "Trang " + state.page + " / " + totalPages + " (" + state.total + " tài khoản)";
    if (btnPrev) btnPrev.disabled = state.page <= 1;
    if (btnNext) btnNext.disabled = state.page >= totalPages;
  }

  function loadList() {
    showAlert("");
    return ForumApi.listAdminUsers({ q: state.q, page: state.page, limit: state.limit })
      .then(function (data) {
        state.total = typeof data.total === "number" ? data.total : 0;
        var rows = (data && data.users) || [];
        if (!tbody) return;

        tbody.innerHTML = "";
        updatePagination();

        if (rows.length === 0) {
          if (emptyEl) emptyEl.classList.remove("d-none");
          if (tableEl) tableEl.hidden = true;
          return;
        }
        if (emptyEl) emptyEl.classList.add("d-none");
        if (tableEl) tableEl.hidden = false;

        for (var i = 0; i < rows.length; i++) {
          var u = rows[i];
          var id = String(u._id || "");
          var locked = !!u.isLocked;
          var tr = document.createElement("tr");
          var role = (u.roleName || "").toString();
          var isSelf = myUserId && id === myUserId;

          tr.innerHTML =
            "<td><strong>" +
            escapeHtml(u.username || "") +
            "</strong></td>" +
            "<td>" +
            escapeHtml(u.email || "") +
            "</td>" +
            "<td>" +
            escapeHtml(u.displayName || "") +
            "</td>" +
            "<td>" +
            escapeHtml(role) +
            "</td>" +
            "<td>" +
            (locked
              ? '<span class="post-status post-status--reject">Đã khóa</span>'
              : '<span class="post-status post-status--ok">Hoạt động</span>') +
            "</td>" +
            "<td class=\"muted\">" +
            escapeHtml(formatWhen(u.createdAt)) +
            "</td>" +
            '<td class="admin-users-actions"></td>';

          var actions = tr.querySelector(".admin-users-actions");
          if (actions) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-outline btn-sm";
            btn.setAttribute("data-id", id);
            btn.setAttribute("data-locked", locked ? "1" : "0");
            if (isSelf) {
              btn.disabled = true;
              btn.title = "Không thể khóa chính mình khi đang đăng nhập.";
              btn.textContent = locked ? "Đã khóa" : "Khóa";
            } else {
              btn.textContent = locked ? "Mở khóa" : "Khóa";
            }
            actions.appendChild(btn);
          }

          tbody.appendChild(tr);
        }
      })
      .catch(function (err) {
        showAlert(err.message || "Không tải được danh sách.");
        if (emptyEl) emptyEl.classList.remove("d-none");
        if (tableEl) tableEl.hidden = true;
        if (pagEl) pagEl.classList.add("d-none");
      });
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      state.q = String(searchInput.value || "").trim();
      state.page = 1;
      loadList();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      if (state.page <= 1) return;
      state.page -= 1;
      loadList();
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", function () {
      var totalPages = Math.max(1, Math.ceil(state.total / state.limit) || 1);
      if (state.page >= totalPages) return;
      state.page += 1;
      loadList();
    });
  }

  if (tbody) {
    tbody.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || t.tagName !== "BUTTON" || t.disabled) return;
      var id = t.getAttribute("data-id");
      var locked = t.getAttribute("data-locked") === "1";
      if (!id) return;
      var nextLocked = !locked;
      var msg = nextLocked
        ? "Khóa tài khoản này? Người dùng không đăng nhập hoặc gọi API được nữa."
        : "Mở khóa tài khoản này?";
      if (!window.confirm(msg)) return;
      ForumApi.patchAdminUserLock(id, nextLocked)
        .then(function () {
          return loadList();
        })
        .catch(function (err) {
          alert(err.message || "Thao tác thất bại.");
        });
    });
  }

  ForumApi.me()
    .then(function (me) {
      var role =
        (me && me.roleName) ||
        (me && me.role && (typeof me.role === "object" ? me.role.name : me.role)) ||
        "";
      if (String(role).toUpperCase() !== "ADMIN") {
        if (lead) lead.textContent = "Bạn không có quyền truy cập.";
        setTimeout(function () {
          window.location.href = "index.html";
        }, 900);
        return;
      }
      myUserId = me && me._id != null ? String(me._id) : "";
      return loadList();
    })
    .catch(function () {
      window.location.href = "login.html";
    });
})();
