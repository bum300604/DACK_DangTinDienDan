/**
 * Đọc một bài đã duyệt: post.html?id=...
 * Bình luận: xem (mọi người), thêm / sửa / xóa bình luận của chính mình (đã đăng nhập).
 */
(function () {
  var articleEl = document.getElementById("post-article");
  var titleEl = document.getElementById("post-title");
  var metaEl = document.getElementById("post-meta");
  var contentEl = document.getElementById("post-content");
  var errWrap = document.getElementById("post-error");
  var errMsg = document.getElementById("post-error-msg");
  var backLink = document.getElementById("post-back-link");

  var commentsSection = document.getElementById("comments-section");
  var commentsList = document.getElementById("comments-list");
  var commentsLoadErr = document.getElementById("comments-load-error");
  var commentForm = document.getElementById("comment-form");
  var commentInput = document.getElementById("comment-input");
  var loginHint = document.getElementById("comments-login-hint");

  var postId = null;
  var currentUserId = null;
  var editingCommentId = null;

  function formatWhen(d) {
    if (!d) return "";
    try {
      var dt = new Date(d);
      return dt.toLocaleString("vi-VN", {
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

  function showError(msg) {
    if (articleEl) articleEl.hidden = true;
    if (commentsSection) commentsSection.hidden = true;
    if (errWrap) errWrap.classList.remove("d-none");
    if (errMsg) errMsg.textContent = msg || "Không tải được bài viết.";
  }

  function getQueryId() {
    try {
      var u = new URL(window.location.href);
      return (u.searchParams.get("id") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function authorLabel(c) {
    if (!c || !c.author) return "Thành viên";
    var a = c.author;
    return (a.displayName && String(a.displayName).trim()) || a.username || "Thành viên";
  }

  function isOwnComment(c) {
    if (!currentUserId || !c || !c.author || !c.author._id) return false;
    return String(c.author._id) === String(currentUserId);
  }

  function setCommentFormVisible(loggedIn) {
    if (!commentForm || !loginHint) return;
    if (loggedIn) {
      commentForm.classList.remove("d-none");
      loginHint.classList.add("d-none");
    } else {
      commentForm.classList.add("d-none");
      loginHint.classList.remove("d-none");
    }
  }

  function resolveCurrentUser() {
    if (!window.ForumApi || !ForumApi.getToken()) {
      currentUserId = null;
      setCommentFormVisible(false);
      return Promise.resolve();
    }
    return ForumApi.me()
      .then(function (me) {
        currentUserId = me && me._id ? String(me._id) : null;
        setCommentFormVisible(!!currentUserId);
      })
      .catch(function () {
        currentUserId = null;
        setCommentFormVisible(false);
      });
  }

  function renderComments(comments) {
    if (!commentsList) return;
    commentsList.innerHTML = "";
    if (!comments || !comments.length) {
      var empty = document.createElement("li");
      empty.className = "comments-empty muted";
      empty.textContent = "Chưa có bình luận. Hãy là người đầu tiên!";
      commentsList.appendChild(empty);
      return;
    }

    for (var i = 0; i < comments.length; i++) {
      commentsList.appendChild(buildCommentNode(comments[i]));
    }
  }

  function buildCommentNode(c) {
    var li = document.createElement("li");
    li.className = "comment-card";
    li.setAttribute("data-comment-id", String(c._id));

    var head = document.createElement("div");
    head.className = "comment-card__head";

    var nameEl = document.createElement("span");
    nameEl.className = "comment-card__author";
    nameEl.textContent = authorLabel(c);

    var timeEl = document.createElement("time");
    timeEl.className = "comment-card__time muted";
    timeEl.setAttribute("datetime", c.createdAt || "");
    timeEl.textContent = formatWhen(c.createdAt);

    head.appendChild(nameEl);
    head.appendChild(timeEl);

    var body = document.createElement("div");
    body.className = "comment-card__body";
    body.id = "comment-body-" + String(c._id);

    var p = document.createElement("p");
    p.className = "comment-card__text";
    p.textContent = c.content || "";
    body.appendChild(p);

    li.appendChild(head);
    li.appendChild(body);

    if (isOwnComment(c)) {
      var actions = document.createElement("div");
      actions.className = "comment-card__actions";
      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-ghost btn-sm comment-edit-btn";
      btnEdit.textContent = "Sửa";
      btnEdit.setAttribute("data-id", String(c._id));
      var btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-ghost btn-sm comment-delete-btn";
      btnDel.textContent = "Xóa";
      btnDel.setAttribute("data-id", String(c._id));
      actions.appendChild(btnEdit);
      actions.appendChild(btnDel);
      li.appendChild(actions);
    }

    return li;
  }

  function loadComments() {
    if (!postId || !commentsList) return;
    if (commentsLoadErr) {
      commentsLoadErr.classList.add("d-none");
      commentsLoadErr.textContent = "";
    }
    return ForumApi.listPostComments(postId)
      .then(function (data) {
        var list = (data && data.comments) || [];
        renderComments(list);
      })
      .catch(function (err) {
        if (commentsLoadErr) {
          commentsLoadErr.textContent = err.message || "Không tải được bình luận.";
          commentsLoadErr.classList.remove("d-none");
        }
      });
  }

  function enterEditMode(commentId, currentText) {
    editingCommentId = commentId;
    var body = document.getElementById("comment-body-" + commentId);
    if (!body) return;
    body.innerHTML = "";
    var ta = document.createElement("textarea");
    ta.className = "comment-card__edit-textarea";
    ta.rows = 3;
    ta.maxLength = 5000;
    ta.value = currentText || "";
    var row = document.createElement("div");
    row.className = "comment-card__edit-actions";
    var save = document.createElement("button");
    save.type = "button";
    save.className = "btn btn-primary btn-sm";
    save.textContent = "Lưu";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-outline btn-sm";
    cancel.textContent = "Hủy";
    row.appendChild(save);
    row.appendChild(cancel);
    body.appendChild(ta);
    body.appendChild(row);

    save.addEventListener("click", function () {
      var next = (ta.value || "").trim();
      if (!next) {
        alert("Nội dung không được để trống.");
        return;
      }
      ForumApi.updateComment(commentId, next)
        .then(function () {
          editingCommentId = null;
          return loadComments();
        })
        .catch(function (e) {
          alert(e.message || "Không lưu được.");
        });
    });
    cancel.addEventListener("click", function () {
      editingCommentId = null;
      loadComments();
    });
  }

  function onCommentsListClick(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var editId = t.getAttribute("data-id");
    if (t.classList.contains("comment-edit-btn") && editId) {
      var card = t.closest(".comment-card");
      var textEl = card ? card.querySelector(".comment-card__text") : null;
      enterEditMode(editId, textEl ? textEl.textContent : "");
      return;
    }
    if (t.classList.contains("comment-delete-btn") && editId) {
      if (!window.confirm("Xóa bình luận này?")) return;
      ForumApi.deleteComment(editId)
        .then(function () {
          return loadComments();
        })
        .catch(function (err) {
          alert(err.message || "Không xóa được.");
        });
    }
  }

  var queryId = getQueryId();
  if (!queryId) {
    showError("Thiếu tham số id trên URL (ví dụ post.html?id=…).");
  } else {
    postId = queryId;
    if (backLink) {
      try {
        var ref = document.referrer;
        if (ref && ref.indexOf("index.html") !== -1) {
          backLink.href = ref;
        }
      } catch (e) {}
    }

    resolveCurrentUser().then(function () {
      return ForumApi.getPublicPost(queryId);
    })
      .then(function (post) {
        if (!articleEl || !titleEl || !metaEl || !contentEl) return;

        document.title = (post.title || "Bài viết") + " — ĐăngTin Diễn đàn";

        titleEl.textContent = post.title || "";

        metaEl.innerHTML = "";
        var authorName =
          (post.author && (post.author.displayName || post.author.username)) || "Thành viên";
        function addSpan(text) {
          var s = document.createElement("span");
          s.textContent = text;
          metaEl.appendChild(s);
        }
        addSpan(authorName);
        var catName =
          post.category && post.category.name ? post.category.name : "";
        addSpan(catName);
        addSpan(formatWhen(post.createdAt));

        contentEl.textContent = post.content || "";

        articleEl.hidden = false;
        if (errWrap) errWrap.classList.add("d-none");

        if (commentsSection) commentsSection.hidden = false;
        return loadComments();
      })
      .catch(function (err) {
        showError(err.message || "Không tải được bài viết.");
      });

    if (commentForm) {
      commentForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!postId || !commentInput) return;
        var text = (commentInput.value || "").trim();
        if (!text) return;
        ForumApi.createPostComment(postId, text)
          .then(function () {
            commentInput.value = "";
            return loadComments();
          })
          .catch(function (err) {
            alert(err.message || "Không gửi được bình luận.");
          });
      });
    }

    if (commentsList) {
      commentsList.addEventListener("click", onCommentsListClick);
    }
  }
})();
