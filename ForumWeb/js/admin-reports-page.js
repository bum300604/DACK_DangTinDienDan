/**
 * Admin: danh sách báo cáo + xử lý.
 */
(function () {
  var lead = document.getElementById("admin-reports-lead");
  var alertEl = document.getElementById("admin-reports-alert");
  var emptyEl = document.getElementById("admin-reports-empty");
  var tableEl = document.getElementById("admin-reports-table");
  var tbody = document.getElementById("admin-reports-tbody");
  var pendingCountEl = document.getElementById("admin-reports-pending-count");
  var filterWrap = document.querySelector(".admin-posts-filters");

  var currentStatus = "PENDING";

  function showAlert(msg) {
    if (!alertEl) return;
    alertEl.textContent = msg || "";
    alertEl.classList.toggle("d-none", !msg);
  }

  function statusClass(s) {
    if (s === "PENDING") return "post-status post-status--pending";
    if (s === "RESOLVED") return "post-status post-status--ok";
    if (s === "DISMISSED") return "post-status post-status--reject";
    return "post-status";
  }

  function refreshPendingCount() {
    if (!ForumApi.getAdminReportStats) return Promise.resolve();
    return ForumApi.getAdminReportStats()
      .then(function (s) {
        if (pendingCountEl) {
          pendingCountEl.textContent = s && s.pending != null ? String(s.pending) : "0";
        }
      })
      .catch(function () {});
  }

  function setActiveFilter(status) {
    var btns = document.querySelectorAll(".admin-report-filter");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var s = b.getAttribute("data-status");
      b.classList.toggle("is-active", s === status);
    }
  }

  function renderRow(r) {
    var tr = document.createElement("tr");

    var tdRep = document.createElement("td");
    var rep = r.reporter || {};
    tdRep.textContent = (rep.displayName && String(rep.displayName).trim()) || rep.username || "—";

    var tdObj = document.createElement("td");
    tdObj.className = "my-posts-col-title";
    var line1 = document.createElement("div");
    line1.className = "my-posts-title-cell";
    line1.textContent = r.targetType === "COMMENT" ? "Bình luận" : "Bài viết";
    tdObj.appendChild(line1);
    if (r.postTitle) {
      var line2 = document.createElement("div");
      line2.className = "admin-post-excerpt muted";
      line2.textContent = r.postTitle;
      tdObj.appendChild(line2);
    }
    if (r.targetType === "COMMENT" && r.commentExcerpt) {
      var ex = document.createElement("div");
      ex.className = "admin-post-excerpt muted";
      ex.textContent = r.commentExcerpt;
      tdObj.appendChild(ex);
    }

    var tdCat = document.createElement("td");
    tdCat.textContent = r.categoryLabel || r.category || "";

    var tdDet = document.createElement("td");
    tdDet.className = "muted";
    tdDet.style.fontSize = "0.875rem";
    tdDet.style.maxWidth = "200px";
    tdDet.textContent = r.detail || "—";

    var tdSt = document.createElement("td");
    var badge = document.createElement("span");
    badge.className = statusClass(r.status);
    badge.textContent = r.statusLabel || r.status || "";
    tdSt.appendChild(badge);

    var tdAct = document.createElement("td");
    tdAct.className = "my-posts-actions";

    if (r.status === "PENDING") {
      var btnOk = document.createElement("button");
      btnOk.type = "button";
      btnOk.className = "btn btn-primary btn-sm admin-report-resolve-btn";
      btnOk.textContent = "Đã xử lý";
      btnOk.setAttribute("data-id", String(r._id));
      var btnNo = document.createElement("button");
      btnNo.type = "button";
      btnNo.className = "btn btn-outline btn-sm admin-report-dismiss-btn";
      btnNo.textContent = "Bác bỏ";
      btnNo.setAttribute("data-id", String(r._id));
      tdAct.appendChild(btnOk);
      tdAct.appendChild(btnNo);
    }

    if (r.postId) {
      var a = document.createElement("a");
      a.className = "btn btn-outline btn-sm";
      a.href = "post.html?id=" + encodeURIComponent(r.postId);
      a.textContent = "Mở bài";
      a.target = "_blank";
      a.rel = "noopener";
      tdAct.appendChild(a);
    }

    tr.appendChild(tdRep);
    tr.appendChild(tdObj);
    tr.appendChild(tdCat);
    tr.appendChild(tdDet);
    tr.appendChild(tdSt);
    tr.appendChild(tdAct);

    return tr;
  }

  function loadList() {
    showAlert("");
    return ForumApi.listAdminReports({ status: currentStatus, page: 1, limit: 50 })
      .then(function (data) {
        var rows = (data && data.reports) || [];
        if (!tbody) return;

        tbody.innerHTML = "";
        if (!rows.length) {
          if (emptyEl) emptyEl.classList.remove("d-none");
          if (tableEl) tableEl.hidden = true;
          return refreshPendingCount();
        }
        if (emptyEl) emptyEl.classList.add("d-none");
        if (tableEl) tableEl.hidden = false;

        for (var i = 0; i < rows.length; i++) {
          tbody.appendChild(renderRow(rows[i]));
        }
        return refreshPendingCount();
      })
      .catch(function (err) {
        showAlert(err.message || "Không tải được danh sách.");
      });
  }

  function promptNote() {
    var n = window.prompt("Ghi chú nội bộ gửi người báo cáo (tùy chọn, có thể để trống):", "");
    if (n === null) return null;
    return String(n).trim();
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
      return refreshPendingCount().then(function () {
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
      if (!t || !t.classList || !t.classList.contains("admin-report-filter")) return;
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
      if (!id || !ForumApi.patchAdminReport) return;

      if (t.classList.contains("admin-report-resolve-btn")) {
        var note1 = promptNote();
        if (note1 === null) return;
        ForumApi.patchAdminReport(id, { status: "RESOLVED", adminNote: note1 })
          .then(function () {
            return loadList();
          })
          .catch(function (err) {
            alert(err.message || "Thao tác thất bại.");
          });
        return;
      }
      if (t.classList.contains("admin-report-dismiss-btn")) {
        var note2 = promptNote();
        if (note2 === null) return;
        ForumApi.patchAdminReport(id, { status: "DISMISSED", adminNote: note2 })
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
