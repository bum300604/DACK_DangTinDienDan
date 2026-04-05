const mongoose = require("mongoose");
const mongoStatus = require("../config/mongoStatus");

module.exports = function requireDb(req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  const lastErr = mongoStatus.getLastError();
  const message = lastErr
    ? "Không thể kết nối MongoDB: " + lastErr
    : "Chưa kết nối MongoDB. Kiểm tra backend/.env (MONGODB_URI dạng mongodb:// như backend/.env.example — không dùng mongodb+srv nếu lỗi DNS). Chi tiết: GET /api/health";

  return res.status(503).json({
    message: message,
    mongoState: mongoose.connection.readyState,
    mongoError: lastErr || null,
  });
};
