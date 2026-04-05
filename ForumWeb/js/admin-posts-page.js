/**
 * Admin: kiểm duyệt hàng đợi — duyệt / từ chối có lý do (modal).
 */
(function () {
  var lead = document.getElementById("admin-posts-lead");
  var alertEl = document.getElementById("admin-posts-alert");
  var emptyEl = document.getElementById("admin-posts-empty");
  var tableEl = document.getElementById("admin-posts-table");
  var tbody = document.getElementById("admin-posts-tbody");
  var filterWrap = document.querySelector(".admin-posts-filters");

  var statPending = document.getElementById("stat-pending");
  var statApproved = document.getElementById("stat-approved");
  var statRejected = document.getElementById("stat-rejected");

  var rejectModal = document.getElementById("reject-modal");
  var rejectReasonInput = document.getElementById("reject-reason-input");
  var rejectModalCancel = document.getElementById("reject-modal-cancel");
  var rejectModalSubmit = document.getElementById("reject-modal-submit");

  var currentStatus = "PENDING";
  var pendingRejectId = null;

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

  function openRejectModal(postId) {
    pendingRejectId = postId;
    if (rejectReasonInput) rejectReasonInput.value = "";
    if (rejectModal) {
      rejectModal.classList.remove("d-none");
      rejectModal.removeAttribute("hidden");
    }
    if (rejectReasonInput) rejectReasonInput.focus();
  }

  function closeRejectModal() {
    pendingRejectId = null;
    if (rejectModal) {
      rejectModal.classList.add("d-none");
      rejectModal.setAttribute("hidden", "hidden");
    }
    if (rejectReasonInput) rejectReasonInput.value = "";
  }

  function refreshStats() {
    if (!ForumApi.getAdminPostQueueStats) return Promise.resolve();
    return ForumApi.getAdminPostQueueStats()
      .then(function (s) {
        if (statPending) statPending.textContent = s && s.pending != null ? String(s.pending) : "0";
        if (statApproved) statApproved.textContent = s && s.approved != null ? String(s.approved) : "0";
        if (statRejected) statRejected.textContent = s && s.rejected != null ? String(s.rejected) : "0";

        var map = {
          PENDING: s && s.pending,
          APPROVED: s && s.approved,
          REJECTED: s && s.rejected,
        };
        var badges = document.querySelectorAll(".admin-filter-count");
        for (var i = 0; i < badges.length; i++) {
          var el = badges[i];
          var key = el.getAttribute("data-count-for");
          if (!key || map[key] === undefined || map[key] === null) {
            el.textContent = "";
            continue;
          }
          el.textContent = "(" + map[key] + ")";
        }
      })
      .catch(function () {});
  }

  function renderRow(p) {
    var tr = document.createElement("tr");
    tr.setAttribute("data-post-id", String(p._id));

    var tdTitle = document.createElement("td");
    tdTitle.className = "my-posts-col-title";
    var titleText = document.createElement("div");
    titleText.className = "my-posts-title-cell";
    titleText.textContent = p.title || "";
    tdTitle.appendChild(titleText);

    if (p.excerpt) {
      var ex = document.createElement("p");
      ex.className = "admin-post-excerpt muted";
      ex.textContent = p.excerpt;
      tdTitle.appendChild(ex);
    }

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
    if (p.status === "APPROVED" && p.hiddenFromPublic) {
      var hidNote = document.createElement("div");
      hidNote.className = "admin-hidden-note muted";
      hidNote.textContent = "Đã gỡ công khai";
      tdSt.appendChild(hidNote);
    }

    var tdTime = document.createElement("td");
    tdTime.className = "muted";
    tdTime.textContent = formatWhen(p.createdAt);

    var tdAct = document.createElement("td");
    tdAct.className = "my-posts-actions";

    if (p.status === "APPROVED") {
      if (!p.hiddenFromPublic) {
        var aView = document.createElement("a");
        aView.className = "btn btn-outline btn-sm";
        aView.href = "post.html?id=" + encodeURIComponent(p._id);
        aView.textContent = "Xem bài";
        aView.target = "_blank";
        aView.rel = "noopener";
        tdAct.appendChild(aView);
        var btnUn = document.createElement("button");
        btnUn.type = "button";
        btnUn.className = "btn btn-outline btn-sm admin-unpublish-btn";
        btnUn.textContent = "Gỡ công khai";
        btnUn.setAttribute("data-id", String(p._id));
        tdAct.appendChild(btnUn);
      } else {
        var btnRep = document.createElement("button");
        btnRep.type = "button";
        btnRep.className = "btn btn-primary btn-sm admin-republish-btn";
        btnRep.textContent = "Hiển thị lại";
        btnRep.setAttribute("data-id", String(p._id));
        tdAct.appendChild(btnRep);
      }
      var btnDelPost = document.createElement("button");
      btnDelPost.type = "button";
      btnDelPost.className = "btn btn-ghost btn-sm admin-delete-post-btn";
      btnDelPost.textContent = "Xóa bài";
      btnDelPost.setAttribute("data-id", String(p._id));
      tdAct.appendChild(btnDelPost);
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
          return refreshStats();
        }
        if (emptyEl) emptyEl.classList.add("d-none");
        if (tableEl) tableEl.hidden = false;

        for (var i = 0; i < posts.length; i++) {
          tbody.appendChild(renderRow(posts[i]));
        }
        return refreshStats();
      })
      .catch(function (err) {
        showAlert(err.message || "Không tải được danh sách.");
      });
  }

  if (!window.ForumApi || !ForumApi.getToken()) {
    window.location.href = "login.html";
    return;
  }

  if (rejectModalCancel) {
    rejectModalCancel.addEventListener("click", closeRejectModal);
  }
  if (rejectModal) {
    rejectModal.addEventListener("click", function (e) {
      if (e.target === rejectModal) closeRejectModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!rejectModal || rejectModal.classList.contains("d-none")) return;
    closeRejectModal();
  });

  if (rejectModalSubmit) {
    rejectModalSubmit.addEventListener("click", function () {
      var reason = (rejectReasonInput && rejectReasonInput.value) || "";
      reason = String(reason).trim();
      if (!reason) {
        alert("Vui lòng nhập lý do từ chối.");
        return;
      }
      if (!pendingRejectId) return;
      var id = pendingRejectId;
      ForumApi.rejectAdminPost(id, reason)
        .then(function () {
          closeRejectModal();
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
      return refreshStats().then(function () {
        return loadList();
      });
    })
    .catch(function () {
      window.location.href = "login.html";
    });

  if (filterWrap) {
    filterWrap.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t !== filterWrap && t.tagName !== "BUTTON") {
        t = t.parentNode;
      }
      if (!t || t.tagName !== "BUTTON") return;
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
        if (!window.confirm("Duyệt và đăng bài này công khai?")) return;
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
        openRejectModal(id);
        return;
      }

      if (t.classList.contains("admin-unpublish-btn")) {
        if (!window.confirm("Gỡ bài này khỏi trang chủ / trang bài? Người dùng sẽ không mở được link công khai.")) return;
        ForumApi.unpublishAdminPost(id)
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Thao tác thất bại.");
          });
        return;
      }

      if (t.classList.contains("admin-republish-btn")) {
        if (!window.confirm("Hiển thị lại bài này trên diễn đàn?")) return;
        ForumApi.republishAdminPost(id)
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Thao tác thất bại.");
          });
        return;
      }

      if (t.classList.contains("admin-delete-post-btn")) {
        if (
          !window.confirm(
            "Xóa hẳn bài này và mọi bình luận? Hành động không hoàn tác."
          )
        )
          return;
        ForumApi.deleteAdminPost(id)
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
