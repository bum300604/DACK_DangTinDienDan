/**
 * Đọc một bài đã duyệt: post.html?id=...
 * Cùng URL cho khách và thành viên đã đăng nhập.
 */
(function () {
  var articleEl = document.getElementById("post-article");
  var titleEl = document.getElementById("post-title");
  var metaEl = document.getElementById("post-meta");
  var contentEl = document.getElementById("post-content");
  var errWrap = document.getElementById("post-error");
  var errMsg = document.getElementById("post-error-msg");
  var backLink = document.getElementById("post-back-link");

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

  var id = getQueryId();
  if (!id) {
    showError("Thiếu tham số id trên URL (ví dụ post.html?id=…).");
  } else {
    if (backLink) {
      try {
        var ref = document.referrer;
        if (ref && ref.indexOf("index.html") !== -1) {
          backLink.href = ref;
        }
      } catch (e) {}
    }

    ForumApi.getPublicPost(id)
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
      })
      .catch(function (err) {
        showError(err.message || "Không tải được bài viết.");
      });
  }
})();
