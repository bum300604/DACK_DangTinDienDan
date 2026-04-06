/**
 * Trang chủ: danh sách bài đã duyệt, tìm kiếm, lọc theo categoryId, phân trang.
 * Query: ?q=&categoryId=&page= — chuyên mục lấy từ API (không hardcode tên trong DB).
 */
(function () {
  var searchInput = document.querySelector('.forum-search-inner input[name="q"]');
  var searchBtn = document.querySelector(".forum-search-inner .btn-primary");
  var listEl = document.getElementById("post-list");
  var emptyEl = document.getElementById("post-list-empty");
  var pagEl = document.getElementById("forum-pagination");
  var catBar = document.getElementById("forum-cats-inner");
  var featuredBlock = document.getElementById("featured-block");

  var loadedCategories = [];

  var state = {
    q: "",
    categoryId: "all",
    page: 1,
    limit: 6,
  };

  function getParamsFromUrl() {
    try {
      var u = new URL(window.location.href);
      state.q = (u.searchParams.get("q") || "").trim();
      state.categoryId = (u.searchParams.get("categoryId") || "all").trim() || "all";
      state.page = Math.max(1, parseInt(u.searchParams.get("page"), 10) || 1);
    } catch (e) {
      state.q = "";
      state.categoryId = "all";
      state.page = 1;
    }
  }

  function validateCategoryId() {
    if (state.categoryId === "all") return;
    var ok = false;
    for (var i = 0; i < loadedCategories.length; i++) {
      if (String(loadedCategories[i]._id) === state.categoryId) {
        ok = true;
        break;
      }
    }
    if (!ok) state.categoryId = "all";
  }

  function pushUrl() {
    var u = new URL(window.location.href);
    u.search = "";
    if (state.q) u.searchParams.set("q", state.q);
    if (state.categoryId && state.categoryId !== "all") u.searchParams.set("categoryId", state.categoryId);
    if (state.page > 1) u.searchParams.set("page", String(state.page));
    window.history.replaceState({}, "", u.pathname + u.search);
  }

  function syncSearchInput() {
    if (searchInput) searchInput.value = state.q;
  }

  function buildCategoryPills(categories) {
    loadedCategories = categories || [];
    if (!catBar) return;
    catBar.innerHTML = "";

    function addPill(id, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cat-pill cat-pill--btn";
      b.setAttribute("data-category-id", id);
      b.textContent = label;
      catBar.appendChild(b);
    }

    addPill("all", "Tất cả");
    for (var i = 0; i < loadedCategories.length; i++) {
      var c = loadedCategories[i];
      addPill(String(c._id), c.name || "");
    }
  }

  function syncCatPills() {
    if (!catBar) return;
    var pills = catBar.querySelectorAll("[data-category-id]");
    for (var i = 0; i < pills.length; i++) {
      var v = pills[i].getAttribute("data-category-id") || "all";
      pills[i].classList.toggle("is-active", v === state.categoryId);
    }
  }

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

  function categoryLabel(p) {
    if (p.category && p.category.name) return p.category.name;
    return "";
  }

  function renderPagination(total, totalPages) {
    if (!pagEl) return;
    pagEl.innerHTML = "";
    if (totalPages <= 1) {
      pagEl.classList.add("d-none");
      return;
    }
    pagEl.classList.remove("d-none");

    var info = document.createElement("span");
    info.className = "forum-pagination__info muted";
    info.textContent =
      "Trang " + state.page + " / " + totalPages + " · " + total + " bài";
    pagEl.appendChild(info);

    var nav = document.createElement("div");
    nav.className = "forum-pagination__nav";

    function addBtn(label, disabled, delta) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-outline btn-sm";
      b.textContent = label;
      b.disabled = !!disabled;
      b.addEventListener("click", function () {
        state.page = state.page + delta;
        if (state.page < 1) state.page = 1;
        pushUrl();
        load();
      });
      nav.appendChild(b);
    }

    addBtn("← Trước", state.page <= 1, -1);
    addBtn("Sau →", state.page >= totalPages, 1);

    pagEl.appendChild(nav);
  }

  function renderList(posts) {
    if (!listEl) return;
    listEl.innerHTML = "";

    if (!posts || !posts.length) {
      if (emptyEl) emptyEl.classList.remove("d-none");
      return;
    }
    if (emptyEl) emptyEl.classList.add("d-none");

    var ul = document.createElement("ul");
    ul.className = "post-list";

    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var li = document.createElement("li");
      li.className = "post-row";

      var thumb = document.createElement("div");
      thumb.className = "post-thumb";
      thumb.setAttribute("aria-hidden", "true");
      if (p.thumbUrl) {
        var img = document.createElement("img");
        img.className = "post-thumb__img";
        img.src = p.thumbUrl;
        img.alt = "";
        thumb.appendChild(img);
      }

      var body = document.createElement("div");
      body.className = "post-body";

      var h3 = document.createElement("h3");
      h3.className = "post-title";

      var a = document.createElement("a");
      a.href = "post.html?id=" + encodeURIComponent(p._id);
      a.textContent = p.title || "(Không tiêu đề)";
      h3.appendChild(a);

      var meta = document.createElement("div");
      meta.className = "post-meta";
      var authorName = (p.author && (p.author.displayName || p.author.username)) || "Thành viên";
      function metaSpan(text) {
        var s = document.createElement("span");
        s.textContent = text;
        meta.appendChild(s);
      }
      metaSpan(authorName);
      metaSpan(categoryLabel(p));
      metaSpan(formatWhen(p.createdAt));

      var ex = document.createElement("p");
      ex.className = "post-excerpt muted";
      ex.style.margin = "0.35rem 0 0";
      ex.style.fontSize = "0.875rem";
      ex.style.lineHeight = "1.45";
      ex.textContent = p.excerpt || "";

      body.appendChild(h3);
      body.appendChild(meta);
      body.appendChild(ex);

      li.appendChild(thumb);
      li.appendChild(body);
      ul.appendChild(li);
    }

    listEl.appendChild(ul);
  }

  function renderFeatured(posts) {
    if (!featuredBlock) return;
    featuredBlock.innerHTML = "";

    if (!posts || !posts.length) {
      var empty = document.createElement("p");
      empty.className = "card-muted featured-block__hint";
      empty.textContent = "Chưa có tin đăng đã duyệt.";
      featuredBlock.appendChild(empty);
      return;
    }

    var ul = document.createElement("ul");
    ul.className = "featured-list";
    ul.setAttribute("aria-label", "Tin nổi bật gần đây");

    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var li = document.createElement("li");
      li.className = "featured-list__item";

      var a = document.createElement("a");
      a.href = "post.html?id=" + encodeURIComponent(p._id);
      a.textContent = p.title || "(Không tiêu đề)";

      var meta = document.createElement("span");
      meta.className = "featured-list__meta";
      var bits = [];
      if (p.category && p.category.name) bits.push(p.category.name);
      var when = formatWhen(p.createdAt);
      if (when) bits.push(when);
      meta.textContent = bits.join(" · ");

      li.appendChild(a);
      li.appendChild(meta);
      ul.appendChild(li);
    }

    featuredBlock.appendChild(ul);
  }

  function loadFeatured() {
    if (!featuredBlock || !window.ForumApi || !ForumApi.listPublicPosts) return;
    ForumApi.listPublicPosts({ page: 1, limit: 5 })
      .then(function (data) {
        renderFeatured((data && data.posts) || []);
      })
      .catch(function () {
        featuredBlock.innerHTML =
          '<p class="card-muted featured-block__hint">Không tải được mục nổi bật.</p>';
      });
  }

  function escapeHtml(s) {
    var t = document.createElement("div");
    t.textContent = s == null ? "" : String(s);
    return t.innerHTML;
  }

  function load() {
    if (!window.ForumApi) return;

    if (listEl) {
      listEl.innerHTML =
        '<p class="card-muted" style="padding:1rem 1.125rem;margin:0">Đang tải…</p>';
    }

    ForumApi.listPublicPosts({
      q: state.q,
      categoryId: state.categoryId,
      page: state.page,
      limit: state.limit,
    })
      .then(function (data) {
        renderList(data.posts);
        renderPagination(data.total, data.totalPages);
      })
      .catch(function (err) {
        if (listEl) {
          listEl.innerHTML =
            '<p class="alert alert-danger" style="margin:1rem 1.125rem">' +
            escapeHtml(err.message || "Không tải được danh sách.") +
            "</p>";
        }
        if (pagEl) {
          pagEl.innerHTML = "";
          pagEl.classList.add("d-none");
        }
      });
  }

  function onSearch() {
    state.q = searchInput ? searchInput.value.trim() : "";
    state.page = 1;
    pushUrl();
    load();
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", onSearch);
  }
  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch();
      }
    });
  }

  if (catBar) {
    catBar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-category-id]");
      if (!btn) return;
      var cid = btn.getAttribute("data-category-id");
      if (cid == null) return;
      state.categoryId = cid || "all";
      state.page = 1;
      syncCatPills();
      pushUrl();
      load();
    });
  }

  function start() {
    getParamsFromUrl();
    syncSearchInput();

    if (!ForumApi.listPublicCategories) {
      if (catBar) {
        catBar.innerHTML =
          '<span class="muted" style="padding:0.35rem 0.85rem">Thiếu API chuyên mục.</span>';
      }
      return;
    }

    ForumApi.listPublicCategories()
      .then(function (data) {
        buildCategoryPills(data.categories);
        getParamsFromUrl();
        validateCategoryId();
        syncSearchInput();
        syncCatPills();
        load();
        loadFeatured();
      })
      .catch(function (err) {
        if (catBar) {
          catBar.innerHTML =
            '<span class="muted" style="padding:0.35rem 0.85rem;font-size:0.8125rem">' +
            escapeHtml(err.message || "Không tải được chuyên mục.") +
            "</span>";
        }
      });
  }

  start();
})();
