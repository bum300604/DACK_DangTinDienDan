const { body, validationResult } = require("express-validator");

module.exports = {
  registerValidation: [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Tên đăng nhập không được để trống.")
      .isLength({ min: 3, max: 64 })
      .withMessage("Tên đăng nhập từ 3 đến 64 ký tự."),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email không được để trống.")
      .isEmail()
      .withMessage("Email không hợp lệ."),
    body("password")
      .notEmpty()
      .withMessage("Mật khẩu không được để trống.")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu tối thiểu 8 ký tự."),
  ],

  profilePatchValidation: [
    body("displayName")
      .trim()
      .isLength({ max: 128 })
      .withMessage("Tên hiển thị tối đa 128 ký tự."),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email không được để trống.")
      .isEmail()
      .withMessage("Email không hợp lệ."),
  ],

  changePasswordValidation: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Vui lòng nhập mật khẩu hiện tại."),
    body("newPassword")
      .notEmpty()
      .withMessage("Vui lòng nhập mật khẩu mới.")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu mới tối thiểu 8 ký tự."),
  ],

  forgotPasswordValidation: [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email không được để trống.")
      .isEmail()
      .withMessage("Email không hợp lệ."),
  ],

  resetPasswordWithOtpValidation: [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email không được để trống.")
      .isEmail()
      .withMessage("Email không hợp lệ."),
    body("otp")
      .trim()
      .notEmpty()
      .withMessage("Vui lòng nhập mã OTP.")
      .matches(/^\d{6}$/)
      .withMessage("Mã OTP gồm đúng 6 chữ số."),
    body("newPassword")
      .notEmpty()
      .withMessage("Vui lòng nhập mật khẩu mới.")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu mới tối thiểu 8 ký tự."),
  ],

  validateResult: function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const first = errors.array()[0];
      return res.status(400).json({ message: first.msg || "Dữ liệu không hợp lệ." });
    }
    next();
  },
};
