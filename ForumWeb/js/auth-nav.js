/**
 * Header: hiển thị Đăng nhập/Đăng ký hoặc user + Đăng xuất.
 */
(function () {
  var guestEl = document.getElementById("nav-guest");
  var userEl = document.getElementById("nav-user");
  var userLabel = document.getElementById("nav-user-label");
  var roleBadge = document.getElementById("nav-role-badge");
  var btnLogout = document.getElementById("nav-logout");

  function showGuest() {
    if (guestEl) guestEl.classList.remove("d-none");
    if (userEl) userEl.classList.add("d-none");
  }

  function showUser(me) {
    if (guestEl) guestEl.classList.add("d-none");
    if (userEl) userEl.classList.remove("d-none");
    var name =
      (me && (me.displayName || me.username)) ||
      (me && me.email) ||
      "Đã đăng nhập";
    if (userLabel) userLabel.textContent = name;
    if (roleBadge) {
      var r = (me && me.roleName) || (me && me.role && me.role.name) || "";
      r = String(r).toUpperCase();
      roleBadge.textContent = r === "ADMIN" ? "Admin" : "User";
      roleBadge.className = "badge " + (r === "ADMIN" ? "badge-admin" : "badge-user");
    }
  }

  function refresh() {
    if (!window.ForumApi || !ForumApi.getToken()) {
      showGuest();
      return;
    }
    ForumApi.me()
      .then(function (me) {
        showUser(me);
      })
      .catch(function () {
        showGuest();
      });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      ForumApi.logout()
        .catch(function () {})
        .then(function () {
          window.location.href = "index.html";
        });
    });
  }

  refresh();
})();
