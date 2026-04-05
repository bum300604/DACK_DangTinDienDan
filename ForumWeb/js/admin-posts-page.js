/**
 * Admin: duyệt / từ chối bài chờ duyệt.
 */
(function () {
  var lead = document.getElementById("admin-posts-lead");
  var alertEl = document.getElementById("admin-posts-alert");
  var emptyEl = document.getElementById("admin-posts-empty");
  var tableEl = document.getElementById("admin-posts-table");
  var tbody = document.getElementById("admin-posts-tbody");
  var filterWrap = document.querySelector(".admin-posts-filters");

  var currentStatus = "PENDING";

  function showAlert(msg) {
    if (!alertEl) return;
    alertEl.textContent = msg || "";
    alertEl.classList.toggle("d-none", !msg);
  }

  function statusLabel(s) {
    if (s === "PENDING") return "Chờ duyệt";
    if (s === "APPROVED") return "Đã đăng";
    if (s === "REJECTED") return "Từ chối";
    return s || "";
  }

  function statusClass(s) {
    if (s === "PENDING") return "post-status post-status--pending";
    if (s === "APPROVED") return "post-status post-status--ok";
    if (s === "REJECTED") return "post-status post-status--reject";
    return "post-status";
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

  function authorLabel(p) {
    var a = p.author || {};
    return (a.displayName && String(a.displayName).trim()) || a.username || "—";
  }

  function renderRow(p) {
    var tr = document.createElement("tr");

    var tdTitle = document.createElement("td");
    tdTitle.className = "my-posts-col-title";
    var titleText = document.createElement("div");
    titleText.className = "my-posts-title-cell";
    titleText.textContent = p.title || "";
    tdTitle.appendChild(titleText);
    if (p.status === "REJECTED" && p.rejectionReason) {
      var reason = document.createElement("p");
      reason.className = "my-posts-reject-reason";
      reason.textContent = "Lý do: " + p.rejectionReason;
      tdTitle.appendChild(reason);
    }

    var tdAuthor = document.createElement("td");
    tdAuthor.textContent = authorLabel(p);

    var tdCat = document.createElement("td");
    tdCat.textContent = (p.category && p.category.name) || "—";

    var tdSt = document.createElement("td");
    var badge = document.createElement("span");
    badge.className = statusClass(p.status);
    badge.textContent = statusLabel(p.status);
    tdSt.appendChild(badge);

    var tdTime = document.createElement("td");
    tdTime.className = "muted";
    tdTime.textContent = formatWhen(p.createdAt);

    var tdAct = document.createElement("td");
    tdAct.className = "my-posts-actions";

    if (p.status === "APPROVED") {
      var aView = document.createElement("a");
      aView.className = "btn btn-outline btn-sm";
      aView.href = "post.html?id=" + encodeURIComponent(p._id);
      aView.textContent = "Xem";
      aView.target = "_blank";
      aView.rel = "noopener";
      tdAct.appendChild(aView);
    }

    if (p.status === "PENDING") {
      var btnOk = document.createElement("button");
      btnOk.type = "button";
      btnOk.className = "btn btn-primary btn-sm admin-approve-btn";
      btnOk.textContent = "Duyệt";
      btnOk.setAttribute("data-id", String(p._id));
      var btnNo = document.createElement("button");
      btnNo.type = "button";
      btnNo.className = "btn btn-outline btn-sm admin-reject-btn";
      btnNo.textContent = "Từ chối";
      btnNo.setAttribute("data-id", String(p._id));
      tdAct.appendChild(btnOk);
      tdAct.appendChild(btnNo);
    }

    tr.appendChild(tdTitle);
    tr.appendChild(tdAuthor);
    tr.appendChild(tdCat);
    tr.appendChild(tdSt);
    tr.appendChild(tdTime);
    tr.appendChild(tdAct);

    return tr;
  }

  function setActiveFilter(status) {
    var btns = document.querySelectorAll(".admin-filter-btn");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var s = b.getAttribute("data-status");
      b.classList.toggle("is-active", s === status);
    }
  }

  function loadList() {
    showAlert("");
    return ForumApi.listAdminPosts({ status: currentStatus, page: 1, limit: 50 })
      .then(function (data) {
        var posts = (data && data.posts) || [];
        if (!tbody) return;

        tbody.innerHTML = "";
        if (!posts.length) {
          if (emptyEl) emptyEl.classList.remove("d-none");
          if (tableEl) tableEl.hidden = true;
          return;
        }
        if (emptyEl) emptyEl.classList.add("d-none");
        if (tableEl) tableEl.hidden = false;

        for (var i = 0; i < posts.length; i++) {
          tbody.appendChild(renderRow(posts[i]));
        }
      })
      .catch(function (err) {
        showAlert(err.message || "Không tải được danh sách.");
      });
  }

  if (!window.ForumApi || !ForumApi.getToken()) {
    window.location.href = "login.html";
    return;
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

  if (filterWrap) {
    filterWrap.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.getAttribute || t.tagName !== "BUTTON") return;
      var st = t.getAttribute("data-status");
      if (!st) return;
      currentStatus = st;
      setActiveFilter(st);
      loadList();
    });
  }

  if (tbody) {
    tbody.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var id = t.getAttribute("data-id");
      if (!id) return;

      if (t.classList.contains("admin-approve-btn")) {
        if (!window.confirm("Duyệt và đăng bài này?")) return;
        ForumApi.approveAdminPost(id)
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Thao tác thất bại.");
          });
        return;
      }

      if (t.classList.contains("admin-reject-btn")) {
        var reason = window.prompt("Lý do từ chối (bắt buộc):", "");
        if (reason === null) return;
        reason = String(reason).trim();
        if (!reason) {
          alert("Vui lòng nhập lý do từ chối.");
          return;
        }
        ForumApi.rejectAdminPost(id, reason)
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Thao tác thất bại.");
          });
      }
    });
  }
})();
