/**
 * Danh sách bài của tài khoản — trạng thái duyệt, sửa/xóa khi chờ duyệt hoặc bị từ chối.
 */
(function () {
  var alertEl = document.getElementById("my-posts-alert");
  var emptyEl = document.getElementById("my-posts-empty");
  var tableEl = document.getElementById("my-posts-table");
  var tbody = document.getElementById("my-posts-tbody");

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

  function renderRow(p) {
    var tr = document.createElement("tr");

    var tdThumb = document.createElement("td");
    tdThumb.className = "my-posts-col-thumb";
    if (p.thumbUrl) {
      var im = document.createElement("img");
      im.className = "my-posts-thumb";
      im.src = p.thumbUrl;
      im.alt = "";
      tdThumb.appendChild(im);
    } else {
      tdThumb.innerHTML = '<span class="my-posts-thumb-placeholder" aria-hidden="true"></span>';
    }

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

    var tdCat = document.createElement("td");
    tdCat.textContent = (p.category && p.category.name) || "—";

    var tdSt = document.createElement("td");
    var badge = document.createElement("span");
    badge.className = statusClass(p.status);
    badge.textContent = statusLabel(p.status);
    tdSt.appendChild(badge);

    var tdTime = document.createElement("td");
    tdTime.className = "muted";
    tdTime.textContent = formatWhen(p.updatedAt || p.createdAt);

    var tdAct = document.createElement("td");
    tdAct.className = "my-posts-actions";

    if (p.status === "APPROVED") {
      if (!p.hiddenFromPublic) {
        var aView = document.createElement("a");
        aView.className = "btn btn-outline btn-sm";
        aView.href = "post.html?id=" + encodeURIComponent(p._id);
        aView.textContent = "Xem bài";
        tdAct.appendChild(aView);
      } else {
        var off = document.createElement("span");
        off.className = "muted";
        off.style.fontSize = "0.8125rem";
        off.textContent = "Đã gỡ khỏi công khai";
        tdAct.appendChild(off);
      }
    }

    if (p.canEdit) {
      var aEdit = document.createElement("a");
      aEdit.className = "btn btn-outline btn-sm";
      aEdit.href = "my-post-edit.html?id=" + encodeURIComponent(p._id);
      aEdit.textContent = "Sửa";
      tdAct.appendChild(aEdit);
    }

    if (p.canDelete) {
      var btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-ghost btn-sm my-post-delete";
      btnDel.textContent = "Xóa";
      btnDel.setAttribute("data-id", String(p._id));
      tdAct.appendChild(btnDel);
    }

    tr.appendChild(tdThumb);
    tr.appendChild(tdTitle);
    tr.appendChild(tdCat);
    tr.appendChild(tdSt);
    tr.appendChild(tdTime);
    tr.appendChild(tdAct);

    return tr;
  }

  function loadList() {
    showAlert("");
    return ForumApi.listMyPosts({ page: 1, limit: 50 })
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
    .then(function () {
      return loadList();
    })
    .catch(function () {
      window.location.href = "login.html";
    });

  if (tbody) {
    tbody.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains("my-post-delete")) return;
      var id = t.getAttribute("data-id");
      if (!id) return;
      if (!window.confirm("Xóa bài viết này?")) return;
      ForumApi.deleteMyPost(id)
        .then(function () {
          return loadList();
        })
        .catch(function (err) {
          alert(err.message || "Không xóa được.");
        });
    });
  }
})();
