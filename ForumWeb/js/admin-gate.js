/**
 * Chỉ ADMIN được xem; thiếu quyền hoặc chưa đăng nhập thì chuyển hướng.
 */
(function () {
  var msg = document.getElementById("admin-msg");

  function setMsg(text) {
    if (msg) msg.textContent = text;
  }

  if (!window.ForumApi || !ForumApi.getToken()) {
    setMsg("Đang chuyển đến trang đăng nhập…");
    setTimeout(function () {
      window.location.href = "login.html";
    }, 800);
    return;
  }

  ForumApi.me()
    .then(function (me) {
      var role =
        (me && me.roleName) ||
        (me && me.role && (typeof me.role === "object" ? me.role.name : me.role)) ||
        "";
      if (String(role).toUpperCase() !== "ADMIN") {
        setMsg("Bạn không có quyền quản trị.");
        setTimeout(function () {
          window.location.href = "index.html";
        }, 1000);
        return;
      }
      var name = me.displayName || me.username || "Quản trị viên";
      setMsg(
        "Chào " + name + ". Khu vực duyệt bài, báo cáo và quản lý thành viên sẽ được tích hợp tại đây."
      );
    })
    .catch(function () {
      setMsg("Phiên đăng nhập không hợp lệ.");
      setTimeout(function () {
        window.location.href = "login.html";
      }, 900);
    });
})();
