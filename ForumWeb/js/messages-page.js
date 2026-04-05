/**
 * Trang tin nhắn: danh sách hội thoại + luồng chat (polling).
 */
(function () {
  var listEl = document.getElementById("chat-list");
  var listEmpty = document.getElementById("chat-list-empty");
  var placeholder = document.getElementById("chat-placeholder");
  var activeWrap = document.getElementById("chat-active");
  var peerTitle = document.getElementById("chat-peer-title");
  var postContext = document.getElementById("chat-post-context");
  var threadEl = document.getElementById("chat-thread");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  var alertEl = document.getElementById("chat-alert");
  var btnAdmin = document.getElementById("chat-btn-admin");

  var activeId = null;
  var pollTimer = null;
  var conversationsCache = [];

  function showAlert(msg) {
    if (!alertEl) return;
    alertEl.textContent = msg || "";
    alertEl.classList.toggle("d-none", !msg);
  }

  function getQueryC() {
    try {
      var u = new URL(window.location.href);
      return (u.searchParams.get("c") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setQueryC(id) {
    try {
      var u = new URL(window.location.href);
      if (id) u.searchParams.set("c", id);
      else u.searchParams.delete("c");
      window.history.replaceState({}, "", u.pathname + u.search);
    } catch (e) {}
  }

  function formatWhen(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function scrollThreadBottom() {
    if (!threadEl) return;
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  function renderThread(messages) {
    if (!threadEl) return;
    threadEl.innerHTML = "";
    var list = messages || [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      var row = document.createElement("div");
      row.className = "chat-msg" + (m.isMine ? " chat-msg--mine" : "");
      var meta = document.createElement("div");
      meta.className = "chat-msg__meta";
      var who = (m.sender && m.sender.displayName) || "Thành viên";
      meta.textContent = (m.isMine ? "Bạn" : who) + " · " + formatWhen(m.createdAt);
      var body = document.createElement("div");
      body.className = "chat-msg__body";
      body.textContent = m.body || "";
      row.appendChild(meta);
      row.appendChild(body);
      threadEl.appendChild(row);
    }
    scrollThreadBottom();
  }

  function loadMessages(convId, silent) {
    if (!convId) return Promise.resolve();
    return ForumApi.listConversationMessages(convId, { page: 1, limit: 100 })
      .then(function (data) {
        renderThread((data && data.messages) || []);
        if (!silent) {
          return ForumApi.markConversationRead(convId).then(function () {
            return refreshList();
          });
        }
        return refreshList();
      })
      .catch(function (err) {
        if (!silent) showAlert(err.message || "Không tải được tin nhắn.");
      });
  }

  function openChat(convSummary) {
    if (!convSummary || !convSummary._id) return;
    activeId = String(convSummary._id);
    setQueryC(activeId);
    if (placeholder) placeholder.classList.add("d-none");
    if (activeWrap) activeWrap.classList.remove("d-none");
    var ou = convSummary.otherUser || {};
    if (peerTitle) {
      peerTitle.textContent = ou.displayName || ou.username || "Hội thoại";
    }
    if (postContext) {
      if (convSummary.post && convSummary.post.title) {
        postContext.textContent = "Bài: " + convSummary.post.title;
        postContext.classList.remove("d-none");
      } else {
        postContext.textContent = "";
        postContext.classList.add("d-none");
      }
    }
    stopPoll();
    loadMessages(activeId, false).then(function () {
      if (input) input.focus();
    });
    pollTimer = setInterval(function () {
      if (activeId) loadMessages(activeId, true);
    }, 5000);
  }

  function closeChatUi() {
    activeId = null;
    stopPoll();
    if (placeholder) placeholder.classList.remove("d-none");
    if (activeWrap) activeWrap.classList.add("d-none");
    setQueryC("");
  }

  function refreshList() {
    return ForumApi.listConversations()
      .then(function (data) {
        conversationsCache = (data && data.conversations) || [];
        renderList(conversationsCache);
        return conversationsCache;
      })
      .catch(function (err) {
        showAlert(err.message || "Không tải danh sách.");
        conversationsCache = [];
        return conversationsCache;
      });
  }

  function renderList(items) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items || !items.length) {
      if (listEmpty) listEmpty.classList.remove("d-none");
      return;
    }
    if (listEmpty) listEmpty.classList.add("d-none");

    for (var i = 0; i < items.length; i++) {
      (function (c) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chat-list__item";
        if (activeId && String(c._id) === activeId) btn.classList.add("is-active");

        var title = document.createElement("span");
        title.className = "chat-list__name";
        title.textContent = (c.otherUser && c.otherUser.displayName) || "Thành viên";

        var prev = document.createElement("span");
        prev.className = "chat-list__preview muted";
        prev.textContent = c.lastMessagePreview || "—";

        var badge = document.createElement("span");
        if (c.unreadCount > 0) {
          badge.className = "chat-list__badge";
          badge.textContent = String(c.unreadCount);
        }

        btn.appendChild(title);
        if (c.unreadCount > 0) btn.appendChild(badge);
        btn.appendChild(prev);

        btn.addEventListener("click", function () {
          openChat(c);
          renderList(conversationsCache);
        });

        listEl.appendChild(btn);
      })(items[i]);
    }
  }

  if (!window.ForumApi || !ForumApi.getToken()) {
    window.location.href = "login.html";
    return;
  }

  ForumApi.me()
    .then(function () {
      return refreshList();
    })
    .then(function () {
      var qc = getQueryC();
      if (!qc) return;
      var found = null;
      for (var i = 0; i < conversationsCache.length; i++) {
        if (String(conversationsCache[i]._id) === qc) {
          found = conversationsCache[i];
          break;
        }
      }
      if (found) {
        openChat(found);
        return;
      }
      return ForumApi.getConversation(qc)
        .then(function (c) {
          openChat(c);
        })
        .catch(function (err) {
          showAlert(err.message || "Không tìm thấy hội thoại.");
        });
    })
    .catch(function () {
      window.location.href = "login.html";
    });

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!activeId || !input) return;
      var text = String(input.value || "").trim();
      if (!text) return;
      showAlert("");
      ForumApi.sendConversationMessage(activeId, text)
        .then(function () {
          input.value = "";
          return loadMessages(activeId, true);
        })
        .catch(function (err) {
          showAlert(err.message || "Không gửi được.");
        });
    });
  }

  if (btnAdmin) {
    btnAdmin.addEventListener("click", function () {
      showAlert("");
      ForumApi.openConversation({ withAdmin: true })
        .then(function (data) {
          var c = data && data.conversation;
          if (!c) return;
          return refreshList().then(function () {
            openChat(c);
          });
        })
        .catch(function (err) {
          showAlert(err.message || "Không mở được chat quản trị.");
        });
    });
  }
})();
