/**
 * Danh sách báo cáo của người dùng đã gửi.
 */
(function () {
  var alertEl = document.getElementById("my-reports-alert");
  var emptyEl = document.getElementById("my-reports-empty");
  var tableEl = document.getElementById("my-reports-table");
  var tbody = document.getElementById("my-reports-tbody");

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

  function statusClass(s) {
    if (s === "PENDING") return "post-status post-status--pending";
    if (s === "RESOLVED") return "post-status post-status--ok";
    if (s === "DISMISSED") return "post-status post-status--reject";
    return "post-status";
  }

  function loadList() {
    showAlert("");
    return ForumApi.listMyReports({ page: 1 })
      .then(function (data) {
        var rows = (data && data.reports) || [];
        if (!tbody) return;
        tbody.innerHTML = "";
        if (!rows.length) {
          if (emptyEl) emptyEl.classList.remove("d-none");
          if (tableEl) tableEl.hidden = true;
          return;
        }
        if (emptyEl) emptyEl.classList.add("d-none");
        if (tableEl) tableEl.hidden = false;

        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          var tr = document.createElement("tr");

          var tdObj = document.createElement("td");
          tdObj.textContent =
            r.targetType === "COMMENT" ? "Bình luận" : "Bài viết";

          var tdCat = document.createElement("td");
          tdCat.textContent = r.categoryLabel || r.category || "";

          var tdSt = document.createElement("td");
          var badge = document.createElement("span");
          badge.className = statusClass(r.status);
          badge.textContent = r.statusLabel || r.status || "";
          tdSt.appendChild(badge);

          var tdTime = document.createElement("td");
          tdTime.className = "muted";
          tdTime.textContent = formatWhen(r.createdAt);

          var tdNote = document.createElement("td");
          tdNote.className = "muted";
          tdNote.style.fontSize = "0.875rem";
          tdNote.style.maxWidth = "240px";
          tdNote.textContent = r.adminNote || (r.status === "PENDING" ? "—" : "");

          tr.appendChild(tdObj);
          tr.appendChild(tdCat);
          tr.appendChild(tdSt);
          tr.appendChild(tdTime);
          tr.appendChild(tdNote);
          tbody.appendChild(tr);
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
    .then(function () {
      return loadList();
    })
    .catch(function () {
      window.location.href = "login.html";
    });
})();
