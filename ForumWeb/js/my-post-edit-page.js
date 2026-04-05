/**
 * Soạn bài mới hoặc sửa bài (chờ duyệt / bị từ chối).
 */
(function () {
  var heading = document.getElementById("post-edit-heading");
  var lead = document.getElementById("post-edit-lead");
  var alertEl = document.getElementById("post-edit-alert");
  var rejectWrap = document.getElementById("post-edit-reject");
  var rejectText = document.getElementById("post-edit-reject-text");
  var form = document.getElementById("post-edit-form");
  var titleInput = document.getElementById("post-title");
  var catSelect = document.getElementById("post-category");
  var contentInput = document.getElementById("post-content");
  var submitBtn = document.getElementById("post-edit-submit");

  var editId = null;

  function showAlert(msg) {
    if (!alertEl) return;
    alertEl.textContent = msg || "";
    alertEl.classList.toggle("d-none", !msg);
  }

  function getQueryId() {
    try {
      var u = new URL(window.location.href);
      return (u.searchParams.get("id") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function fillCategories(selectedId) {
    return ForumApi.listPublicCategories().then(function (data) {
      var cats = (data && data.categories) || [];
      if (!catSelect) return;
      catSelect.innerHTML = '<option value="">— Chọn chuyên mục —</option>';
      for (var i = 0; i < cats.length; i++) {
        var c = cats[i];
        var opt = document.createElement("option");
        opt.value = String(c._id);
        opt.textContent = c.name || "";
        if (selectedId && String(selectedId) === String(c._id)) {
          opt.selected = true;
        }
        catSelect.appendChild(opt);
      }
    });
  }

  if (!window.ForumApi || !ForumApi.getToken()) {
    window.location.href = "login.html";
    return;
  }

  var qid = getQueryId();
  editId = qid || null;

  ForumApi.me()
    .then(function () {
      if (editId) {
        if (heading) heading.textContent = "Sửa bài";
        if (lead) {
          lead.innerHTML =
            "Sửa nội dung rồi gửi lại — bài sẽ về trạng thái <strong>chờ duyệt</strong> (lý do từ chối trước đó sẽ được xóa).";
        }
        if (submitBtn) submitBtn.textContent = "Lưu và gửi duyệt lại";
        document.title = "Sửa bài — ĐăngTin Diễn đàn";

        return ForumApi.getMyPost(editId)
          .then(function (post) {
            if (!post.canEdit) {
              showAlert("Bài đã được duyệt — không sửa được từ đây.");
              if (form) form.classList.add("d-none");
              return fillCategories();
            }
            return fillCategories(post.categoryId || (post.category && post.category._id)).then(function () {
              if (titleInput) titleInput.value = post.title || "";
              if (contentInput) contentInput.value = post.content || "";
              if (post.status === "REJECTED" && post.rejectionReason && rejectWrap && rejectText) {
                rejectText.textContent = post.rejectionReason;
                rejectWrap.classList.remove("d-none");
              }
            });
          })
          .catch(function (err) {
            showAlert(err.message || "Không tải được bài.");
          });
      }

      document.title = "Đăng tin mới — ĐăngTin Diễn đàn";
      return fillCategories();
    })
    .catch(function () {
      window.location.href = "login.html";
    });

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showAlert("");
      var title = (titleInput && titleInput.value) || "";
      var content = (contentInput && contentInput.value) || "";
      var categoryId = (catSelect && catSelect.value) || "";
      var payload = {
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId,
      };

      var p = editId
        ? ForumApi.updateMyPost(editId, payload)
        : ForumApi.createMyPost(payload);

      p.then(function () {
        window.location.href = "my-posts.html";
      }).catch(function (err) {
        showAlert(err.message || "Không lưu được.");
      });
    });
  }
})();
