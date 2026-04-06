/**
 * Admin: quản lý chuyên mục (tạo, đổi tên, ẩn/hiện). Trang chủ lọc theo GET /api/public/categories.
 */
(function () {
  var lead = document.getElementById("admin-cats-lead");
  var alertEl = document.getElementById("admin-cats-alert");
  var emptyEl = document.getElementById("admin-cats-empty");
  var tableEl = document.getElementById("admin-cats-table");
  var tbody = document.getElementById("admin-cats-tbody");
  var form = document.getElementById("admin-cats-form");
  var nameInput = document.getElementById("admin-cat-name");

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

  function loadList() {
    showAlert("");
    return ForumApi.listAdminCategories()
      .then(function (data) {
        var rows = (data && data.categories) || [];
        if (!tbody) return;

        tbody.innerHTML = "";
        if (rows.length === 0) {
          if (emptyEl) emptyEl.classList.remove("d-none");
          if (tableEl) tableEl.hidden = true;
          return;
        }
        if (emptyEl) emptyEl.classList.add("d-none");
        if (tableEl) tableEl.hidden = false;

        for (var i = 0; i < rows.length; i++) {
          var c = rows[i];
          var tr = document.createElement("tr");
          var id = String(c._id || "");
          var deleted = !!c.isDeleted;
          var pc = typeof c.postCount === "number" ? c.postCount : 0;

          tr.innerHTML =
            "<td><strong>" +
            escapeHtml(c.name || "") +
            "</strong></td>" +
            "<td>" +
            pc +
            "</td>" +
            "<td>" +
            (deleted
              ? '<span class="post-status post-status--reject">Đã ẩn</span>'
              : '<span class="post-status post-status--ok">Đang dùng</span>') +
            "</td>" +
            "<td class=" +
            '"muted"' +
            ">" +
            escapeHtml(formatWhen(c.updatedAt || c.createdAt)) +
            "</td>" +
            "<td class=" +
            '"admin-cats-actions"' +
            "></td>";

          var actions = tr.querySelector(".admin-cats-actions");
          if (actions) {
            var btnRename = document.createElement("button");
            btnRename.type = "button";
            btnRename.className = "btn btn-outline btn-sm";
            btnRename.textContent = "Đổi tên";
            btnRename.setAttribute("data-id", id);
            btnRename.setAttribute("data-action", "rename");

            var btnToggle = document.createElement("button");
            btnToggle.type = "button";
            btnToggle.className = "btn btn-outline btn-sm";
            btnToggle.setAttribute("data-id", id);
            btnToggle.setAttribute("data-action", deleted ? "restore" : "hide");
            btnToggle.textContent = deleted ? "Hiện lại" : "Ẩn";

            actions.appendChild(btnRename);
            actions.appendChild(document.createTextNode(" "));
            actions.appendChild(btnToggle);
          }

          tbody.appendChild(tr);
        }
      })
      .catch(function (err) {
        showAlert(err.message || "Không tải được danh sách.");
        if (emptyEl) emptyEl.classList.remove("d-none");
        if (tableEl) tableEl.hidden = true;
      });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  if (form && nameInput) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = String(nameInput.value || "").trim();
      if (!name) {
        showAlert("Nhập tên chuyên mục.");
        return;
      }
      ForumApi.createAdminCategory(name)
        .then(function () {
          nameInput.value = "";
          showAlert("");
          return loadList();
        })
        .catch(function (err) {
          showAlert(err.message || "Không tạo được.");
        });
    });
  }

  if (tbody) {
    tbody.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var id = t.getAttribute("data-id");
      var action = t.getAttribute("data-action");
      if (!id || !action) return;

      if (action === "rename") {
        var row = t.closest("tr");
        var current = "";
        if (row) {
          var strong = row.querySelector("strong");
          if (strong) current = (strong.textContent || "").trim();
        }
        var next = window.prompt("Tên chuyên mục mới:", current);
        if (next === null) return;
        next = String(next).trim();
        if (!next || next === current) return;
        ForumApi.patchAdminCategory(id, { name: next })
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Không đổi được tên.");
          });
        return;
      }

      if (action === "hide") {
        if (!window.confirm("Ẩn chuyên mục này? Chuyên mục sẽ biến mất khỏi bộ lọc trang chủ; bài vẫn giữ category cũ."))
          return;
        ForumApi.deleteAdminCategory(id)
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Thao tác thất bại.");
          });
        return;
      }

      if (action === "restore") {
        ForumApi.patchAdminCategory(id, { isDeleted: false })
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Thao tác thất bại.");
          });
      }
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
      return loadList();
    })
    .catch(function () {
      window.location.href = "login.html";
    });
})();
