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
  };

  window.ForumApi = ForumApi;
})(window);
