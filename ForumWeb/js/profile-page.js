/**
 * Trang hồ sơ + đổi mật khẩu (USER / ADMIN cùng giao diện; quyền phía API).
 */
(function () {
  var alertEl = document.getElementById("profile-alert");
  var successEl = document.getElementById("profile-success");
  var profileForm = document.getElementById("profile-form");
  var passwordForm = document.getElementById("password-form");
  var usernameInput = document.getElementById("profile-username");
  var displayInput = document.getElementById("profile-display");
  var emailInput = document.getElementById("profile-email");

  function showAlert(msg) {
    if (successEl) successEl.classList.add("d-none");
    if (alertEl) {
      alertEl.textContent = msg || "";
      alertEl.classList.toggle("d-none", !msg);
    }
  }

  function showSuccess(msg) {
    if (alertEl) alertEl.classList.add("d-none");
    if (successEl) {
      successEl.textContent = msg || "";
      successEl.classList.toggle("d-none", !msg);
    }
  }

  ForumApi.me()
    .then(function (me) {
      if (usernameInput) usernameInput.value = me.username || "";
      if (displayInput) displayInput.value = me.displayName != null ? me.displayName : "";
      if (emailInput) emailInput.value = me.email || "";
    })
    .catch(function () {
      window.location.href = "login.html";
    });

  if (profileForm) {
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      showAlert("");
      showSuccess("");
      var payload = {
        displayName: displayInput ? displayInput.value : "",
        email: emailInput ? emailInput.value.trim() : "",
      };
      ForumApi.updateProfile(payload)
        .then(function (data) {
          showSuccess((data && data.message) || "Đã cập nhật hồ sơ.");
          if (data && data.user && typeof window.refreshAuthNav === "function") {
            window.refreshAuthNav(data.user);
          }
        })
        .catch(function (err) {
          showAlert(err.message || "Không lưu được hồ sơ.");
        });
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", function (e) {
      e.preventDefault();
      showAlert("");
      showSuccess("");
      var current = document.getElementById("pwd-current");
      var neu = document.getElementById("pwd-new");
      var confirm = document.getElementById("pwd-confirm");
      var cp = current ? current.value : "";
      var np = neu ? neu.value : "";
      var c2 = confirm ? confirm.value : "";
      if (np !== c2) {
        showAlert("Mật khẩu mới và xác nhận không khớp.");
        return;
      }
      ForumApi.changePassword(cp, np)
        .then(function (data) {
          showSuccess((data && data.message) || "Đã đổi mật khẩu.");
          passwordForm.reset();
        })
        .catch(function (err) {
          showAlert(err.message || "Đổi mật khẩu thất bại.");
        });
    });
  }
})();
