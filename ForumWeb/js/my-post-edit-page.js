/**
 * Soạn bài mới hoặc sửa bài — FormData + ảnh/tệp đính kèm, preview.
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
  var fileInput = document.getElementById("post-files");
  var previewEl = document.getElementById("post-file-preview");

  var editId = null;
  var MAX_FILES = 10;
  var MAX_BYTES = 5 * 1024 * 1024;

  /** @type {{url:string,originalName:string,kind:string,mimeType:string}[]} */
  var existingAttachments = [];
  /** @type {string[]} */
  var keepUrls = [];
  /** @type {{file: File, url: string}[]} */
  var pending = [];

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

  function totalAttachmentCount() {
    return keepUrls.length + pending.length;
  }

  function revokePending() {
    for (var i = 0; i < pending.length; i++) {
      try {
        URL.revokeObjectURL(pending[i].url);
      } catch (e) {}
    }
    pending = [];
  }

  function removePendingAt(index) {
    if (index < 0 || index >= pending.length) return;
    try {
      URL.revokeObjectURL(pending[index].url);
    } catch (e) {}
    pending.splice(index, 1);
    renderPreview();
  }

  function removeKeepUrl(url) {
    keepUrls = keepUrls.filter(function (u) {
      return u !== url;
    });
    renderPreview();
  }

  function findExistingMeta(url) {
    for (var i = 0; i < existingAttachments.length; i++) {
      if (existingAttachments[i].url === url) return existingAttachments[i];
    }
    return null;
  }

  function renderPreview() {
    if (!previewEl) return;
    previewEl.innerHTML = "";
    if (!keepUrls.length && !pending.length) {
      previewEl.classList.add("is-empty");
      return;
    }
    previewEl.classList.remove("is-empty");

    var grid = document.createElement("div");
    grid.className = "post-file-preview__grid";

    for (var i = 0; i < keepUrls.length; i++) {
      (function (url) {
        var meta = findExistingMeta(url);
        var isImg = meta && (meta.kind === "image" || (meta.mimeType && meta.mimeType.indexOf("image/") === 0));
        var card = document.createElement("div");
        card.className = "post-file-preview__card";

        if (isImg) {
          var img = document.createElement("img");
          img.className = "post-file-preview__thumb";
          img.src = url;
          img.alt = "";
          card.appendChild(img);
        } else {
          var doc = document.createElement("div");
          doc.className = "post-file-preview__doc";
          doc.textContent = "📎";
          card.appendChild(doc);
        }

        var name = document.createElement("div");
        name.className = "post-file-preview__name";
        name.textContent = (meta && meta.originalName) || "Tệp";
        card.appendChild(name);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "post-file-preview__remove";
        btn.setAttribute("aria-label", "Bỏ");
        btn.textContent = "×";
        btn.addEventListener("click", function () {
          removeKeepUrl(url);
        });
        card.appendChild(btn);

        grid.appendChild(card);
      })(keepUrls[i]);
    }

    for (var j = 0; j < pending.length; j++) {
      (function (idx) {
        var item = pending[idx];
        var f = item.file;
        var isImg = f.type.indexOf("image/") === 0;
        var card = document.createElement("div");
        card.className = "post-file-preview__card post-file-preview__card--pending";

        if (isImg) {
          var img = document.createElement("img");
          img.className = "post-file-preview__thumb";
          img.src = item.url;
          img.alt = "";
          card.appendChild(img);
        } else {
          var doc = document.createElement("div");
          doc.className = "post-file-preview__doc";
          doc.textContent = "📎";
          card.appendChild(doc);
        }

        var name = document.createElement("div");
        name.className = "post-file-preview__name";
        name.textContent = f.name || "Tệp";
        card.appendChild(name);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "post-file-preview__remove";
        btn.textContent = "×";
        btn.addEventListener("click", function () {
          removePendingAt(idx);
        });
        card.appendChild(btn);

        grid.appendChild(card);
      })(j);
    }

    previewEl.appendChild(grid);
  }

  function addFilesFromInput(fileList) {
    if (!fileList || !fileList.length) return;
    var err = "";
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      if (f.size > MAX_BYTES) {
        err = "Mỗi tệp tối đa 5MB.";
        break;
      }
      if (totalAttachmentCount() >= MAX_FILES) {
        err = "Tối đa " + MAX_FILES + " tệp.";
        break;
      }
      pending.push({
        file: f,
        url: URL.createObjectURL(f),
      });
    }
    if (err) showAlert(err);
    renderPreview();
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      showAlert("");
      addFilesFromInput(fileInput.files);
      fileInput.value = "";
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
            existingAttachments = post.attachments || [];
            keepUrls = existingAttachments.map(function (a) {
              return a.url;
            });
            renderPreview();
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

      var fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      fd.append("categoryId", categoryId);

      if (editId) {
        fd.append("keepUrls", JSON.stringify(keepUrls));
      }

      for (var i = 0; i < pending.length; i++) {
        fd.append("files", pending[i].file);
      }

      var req = editId ? ForumApi.updateMyPost(editId, fd) : ForumApi.createMyPost(fd);

      req
        .then(function () {
          revokePending();
          window.location.href = "my-posts.html";
        })
        .catch(function (err) {
          showAlert(err.message || "Không lưu được.");
        });
    });
  }
})();
