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

  validateResult: function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const first = errors.array()[0];
      return res.status(400).json({ message: first.msg || "Dữ liệu không hợp lệ." });
    }
    next();
  },
};
