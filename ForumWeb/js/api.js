/**
 * Gọi API cùng origin; credentials để gửi cookie httpOnly (token).
 */
(function (window) {
  var TOKEN_KEY = "dd_token";

  function getApiBase() {
    return "";
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  function apiFetch(path, options) {
    options = options || {};
    var headers = options.headers || {};
    var token = getToken();
    if (token && !headers.Authorization) {
      headers.Authorization = "Bearer " + token;
    }
    var method = options.method || "GET";
    var isFormData =
      typeof FormData !== "undefined" && options.body && options.body instanceof FormData;
    if (!isFormData && method !== "GET" && method !== "HEAD" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(getApiBase() + path, {
      method: method,
      headers: headers,
      body: options.body,
      credentials: "include",
    }).then(function (res) {
      var ct = res.headers.get("content-type") || "";
      var p =
        ct.indexOf("application/json") !== -1
          ? res.json()
          : res.text().then(function (t) {
              return { message: t };
            });
      return p.then(function (data) {
        if (!res.ok) {
          var msg =
            (data && data.message) ||
            (typeof data === "string" ? data : "") ||
            "Yêu cầu thất bại (" + res.status + ")";
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  var ForumApi = {
    getToken: getToken,
    setToken: setToken,

    register: function (payload) {
      return apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    login: function (username, password) {
      return apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username, password: password }),
      }).then(function (data) {
        if (data && data.token) setToken(data.token);
        return data;
      });
    },

    logout: function () {
      return apiFetch("/api/auth/logout", { method: "POST" }).then(function (data) {
        setToken("");
        return data;
      });
    },

    me: function () {
      return apiFetch("/api/auth/me");
    },

    updateProfile: function (payload) {
      return apiFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    changePassword: function (currentPassword, newPassword) {
      return apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword }),
      });
    },

    /** Danh sách chuyên mục (id dùng làm categoryId khi lọc). */
    listPublicCategories: function () {
      return apiFetch("/api/public/categories");
    },

    /** Danh sách bài đã duyệt (công khai). params: { q, categoryId, page, limit } */
    listPublicPosts: function (params) {
      params = params || {};
      var q = new URLSearchParams();
      if (params.q) q.set("q", params.q);
      if (params.categoryId && params.categoryId !== "all") q.set("categoryId", params.categoryId);
      if (params.page) q.set("page", String(params.page));
      if (params.limit) q.set("limit", String(params.limit));
      var qs = q.toString();
      return apiFetch("/api/public/posts" + (qs ? "?" + qs : ""));
    },

    /** Một bài đã duyệt theo id */
    getPublicPost: function (id) {
      return apiFetch("/api/public/posts/" + encodeURIComponent(id));
    },

    /** Danh sách bình luận của bài (công khai) */
    listPostComments: function (postId) {
      return apiFetch("/api/public/posts/" + encodeURIComponent(postId) + "/comments");
    },

    /** Thêm bình luận — cần đăng nhập */
    createPostComment: function (postId, content) {
      return apiFetch("/api/public/posts/" + encodeURIComponent(postId) + "/comments", {
        method: "POST",
        body: JSON.stringify({ content: content }),
      });
    },

    /** Sửa bình luận của chính mình */
    updateComment: function (commentId, content) {
      return apiFetch("/api/public/comments/" + encodeURIComponent(commentId), {
        method: "PATCH",
        body: JSON.stringify({ content: content }),
      });
    },

    /** Xóa bình luận của chính mình */
    deleteComment: function (commentId) {
      return apiFetch("/api/public/comments/" + encodeURIComponent(commentId), {
        method: "DELETE",
      });
    },

    /** Bài viết của tôi — cần đăng nhập */
    listMyPosts: function (params) {
      params = params || {};
      var q = new URLSearchParams();
      if (params.page) q.set("page", String(params.page));
      if (params.limit) q.set("limit", String(params.limit));
      var qs = q.toString();
      return apiFetch("/api/me/posts" + (qs ? "?" + qs : ""));
    },

    getMyPost: function (id) {
      return apiFetch("/api/me/posts/" + encodeURIComponent(id));
    },

    createMyPost: function (payload) {
      return apiFetch("/api/me/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    updateMyPost: function (id, payload) {
      return apiFetch("/api/me/posts/" + encodeURIComponent(id), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    deleteMyPost: function (id) {
      return apiFetch("/api/me/posts/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },

    /** Quản trị: danh sách bài theo trạng thái — ADMIN */
    listAdminPosts: function (params) {
      params = params || {};
      var q = new URLSearchParams();
      if (params.status) q.set("status", params.status);
      if (params.page) q.set("page", String(params.page));
      if (params.limit) q.set("limit", String(params.limit));
      var qs = q.toString();
      return apiFetch("/api/admin/posts" + (qs ? "?" + qs : ""));
    },

    /** Số bài PENDING / APPROVED / REJECTED — ADMIN */
    getAdminPostQueueStats: function () {
      return apiFetch("/api/admin/posts/queue-stats");
    },

    approveAdminPost: function (id) {
      return apiFetch("/api/admin/posts/" + encodeURIComponent(id) + "/approve", {
        method: "POST",
        body: JSON.stringify({}),
      });
    },

    rejectAdminPost: function (id, reason) {
      return apiFetch("/api/admin/posts/" + encodeURIComponent(id) + "/reject", {
        method: "POST",
        body: JSON.stringify({ reason: reason }),
      });
    },

    /** Gỡ bài đã đăng khỏi công khai (APPROVED) — ADMIN */
    unpublishAdminPost: function (id) {
      return apiFetch("/api/admin/posts/" + encodeURIComponent(id) + "/unpublish", {
        method: "POST",
        body: JSON.stringify({}),
      });
    },

    /** Hiển thị lại bài đã gỡ — ADMIN */
    republishAdminPost: function (id) {
      return apiFetch("/api/admin/posts/" + encodeURIComponent(id) + "/republish", {
        method: "POST",
        body: JSON.stringify({}),
      });
    },

    /** Xóa hẳn bài (và comment) — ADMIN */
    deleteAdminPost: function (id) {
      return apiFetch("/api/admin/posts/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },

    /** Xóa bình luận — ADMIN */
    adminDeleteComment: function (commentId) {
      return apiFetch("/api/admin/comments/" + encodeURIComponent(commentId), {
        method: "DELETE",
      });
    },

    /** Báo cáo vi phạm — cần đăng nhập */
    listMyReports: function (params) {
      params = params || {};
      var q = new URLSearchParams();
      if (params.page) q.set("page", String(params.page));
      var qs = q.toString();
      return apiFetch("/api/me/reports" + (qs ? "?" + qs : ""));
    },

    createReport: function (payload) {
      return apiFetch("/api/me/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    /** Báo cáo — ADMIN */
    getAdminReportStats: function () {
      return apiFetch("/api/admin/reports/stats");
    },

    listAdminReports: function (params) {
      params = params || {};
      var q = new URLSearchParams();
      if (params.status) q.set("status", params.status);
      if (params.page) q.set("page", String(params.page));
      if (params.limit) q.set("limit", String(params.limit));
      var qs = q.toString();
      return apiFetch("/api/admin/reports" + (qs ? "?" + qs : ""));
    },

    patchAdminReport: function (id, payload) {
      return apiFetch("/api/admin/reports/" + encodeURIComponent(id), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
  };

  window.ForumApi = ForumApi;
})(window);
