const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const createError = require("http-errors");
const mongoose = require("mongoose");
const mongoStatus = require("./config/mongoStatus");
const mongoConnectOptions = require("./config/mongoConnectOptions");

require("dotenv").config();

const app = express();

app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));
app.use(cookieParser());

const STATE_LABELS = ["disconnected", "connected", "connecting", "disconnecting"];

app.get("/api/health", (req, res) => {
  const st = mongoose.connection.readyState;
  const err = mongoStatus.getLastError();
  const body = {
    ok: true,
    mongo: st === 1,
    mongoState: st,
    mongoStateLabel: STATE_LABELS[st] || "unknown",
    mongoError: err,
  };
  if (st === 2 && !err) {
    const sec = Math.round(mongoConnectOptions.serverSelectionTimeoutMS / 1000);
    body.hint =
      "Đang kết nối MongoDB (tối đa khoảng " +
      sec +
      "s). Đợi rồi gọi lại — nếu sau đó mongoError có nội dung: sửa MONGODB_URI (mongodb://, đúng replicaSet), Atlas Network Access. Đã bật IPv4 (family:4 + dns ipv4first).";
  }
  res.json(body);
});

app.use("/api/auth", require("./middleware/dbReady"), require("./routes/auth"));

app.use(
  "/api/public/categories",
  require("./middleware/dbReady"),
  require("./routes/categoriesPublic")
);

app.use(
  "/api/public/posts",
  require("./middleware/dbReady"),
  require("./routes/postsPublic")
);

app.use(express.static(path.join(__dirname, "..", "ForumWeb")));

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({
    message: err.message || "Lỗi máy chủ",
  });
});

module.exports = app;
