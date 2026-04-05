(function () {
  var form = document.getElementById("login-form");
  var alertBox = document.getElementById("login-alert");
  if (!form) return;

  function showAlert(type, msg) {
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var u = document.getElementById("login-username").value.trim();
    var p = document.getElementById("login-password").value;
    ForumApi.login(u, p)
      .then(function () {
        return ForumApi.me();
      })
      .then(function (me) {
        var roleName =
          (me && me.roleName) ||
          (me && me.role && (typeof me.role === "object" ? me.role.name : me.role)) ||
          "";
        var isAdmin = String(roleName || "").toUpperCase() === "ADMIN";
        showAlert("success", isAdmin ? "Đăng nhập thành công." : "Đăng nhập thành công.");
        setTimeout(function () {
          window.location.href = isAdmin ? "admin.html" : "index.html";
        }, 450);
      })
      .catch(function (err) {
        showAlert("danger", err.message || "Đăng nhập thất bại");
      });
  });
})();
