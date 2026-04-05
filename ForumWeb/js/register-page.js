(function () {
  var form = document.getElementById("register-form");
  var alertBox = document.getElementById("register-alert");
  if (!form) return;

  function showAlert(type, msg) {
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var username = document.getElementById("reg-username").value.trim();
    var email = document.getElementById("reg-email").value.trim();
    var pw = document.getElementById("reg-password").value;
    var pw2 = document.getElementById("reg-password2").value;

    if (pw !== pw2) {
      showAlert("danger", "Mật khẩu nhập lại không khớp.");
      return;
    }

    ForumApi.register({ username: username, password: pw, email: email })
      .then(function () {
        showAlert("success", "Đăng ký thành công. Chuyển đến trang đăng nhập...");
        setTimeout(function () {
          window.location.href = "login.html";
        }, 900);
      })
      .catch(function (err) {
        showAlert("danger", err.message || "Đăng ký thất bại");
      });
  });
})();
