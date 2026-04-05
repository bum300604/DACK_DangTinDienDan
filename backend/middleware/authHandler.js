const jwt = require("jsonwebtoken");
const userController = require("../controllers/users");

function getJwtSecret() {
  return process.env.JWT_SECRET || "DACK_DANGTIN_DEV";
}

function signToken(userId) {
  return jwt.sign({ id: String(userId) }, getJwtSecret(), { expiresIn: "7d" });
}

module.exports = {
  getJwtSecret,
  signToken,

  checkLogin: async function (req, res, next) {
    try {
      let token;
      if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      } else {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith("Bearer ")) {
          return res.status(403).json({ message: "Bạn chưa đăng nhập." });
        }
        token = auth.slice(7);
      }

      const result = jwt.verify(token, getJwtSecret());
      req.userId = result.id;
      return next();
    } catch (e) {
      return res.status(403).json({ message: "Bạn chưa đăng nhập hoặc phiên hết hạn." });
    }
  },

  checkRole: function (...requiredNames) {
    const upper = requiredNames.map((n) => String(n).toUpperCase());
    return async function (req, res, next) {
      const user = await userController.findById(req.userId);
      if (!user || !user.role || !user.role.name) {
        return res.status(403).json({ message: "Không có quyền truy cập." });
      }
      const name = String(user.role.name).toUpperCase();
      if (upper.includes(name)) return next();
      return res.status(403).json({ message: "Không có quyền truy cập." });
    };
  },
};
