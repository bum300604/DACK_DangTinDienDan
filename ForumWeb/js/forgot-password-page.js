(function () {
  var form = document.getElementById("fp-form");
  var alertBox = document.getElementById("fp-alert");
  var sendBtn = document.getElementById("fp-send-otp");
  if (!form || !alertBox) return;

  function showAlert(type, msg) {
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  function hideAlert() {
    alertBox.classList.add("d-none");
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", function () {
      hideAlert();
      var email = document.getElementById("fp-email");
      var raw = email ? email.value.trim() : "";
      if (!raw) {
        showAlert("danger", "Vui lòng nhập email.");
        return;
      }
      sendBtn.disabled = true;
      ForumApi.forgotPassword(raw)
        .then(function (data) {
          showAlert("success", (data && data.message) || "Đã gửi mã OTP.");
        })
        .catch(function (err) {
          showAlert("danger", err.message || "Gửi OTP thất bại");
        })
        .then(function () {
          sendBtn.disabled = false;
        });
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideAlert();
    var email = document.getElementById("fp-email").value.trim();
    var otp = document.getElementById("fp-otp").value.trim();
    var pw = document.getElementById("fp-newpw").value;
    var pw2 = document.getElementById("fp-newpw2").value;

    if (!/^\d{6}$/.test(otp)) {
      showAlert("danger", "Mã OTP phải gồm đúng 6 chữ số.");
      return;
    }
    if (!pw || pw.length < 8) {
      showAlert("danger", "Mật khẩu mới tối thiểu 8 ký tự.");
      return;
    }
    if (pw !== pw2) {
      showAlert("danger", "Hai lần nhập mật khẩu mới không khớp.");
      return;
    }

    ForumApi.resetPasswordWithOtp(email, otp, pw)
      .then(function (data) {
        showAlert("success", (data && data.message) || "Đã đặt lại mật khẩu.");
        setTimeout(function () {
          window.location.href = "login.html";
        }, 800);
      })
      .catch(function (err) {
        showAlert("danger", err.message || "Đặt lại mật khẩu thất bại");
      });
  });
})();
