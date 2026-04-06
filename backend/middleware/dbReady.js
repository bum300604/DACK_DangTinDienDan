const mongoose = require("mongoose");
const mongoStatus = require("../config/mongoStatus");
const { getMongoUri } = require("../config/mongoUri");
const mongoConnectOptions = require("../config/mongoConnectOptions");

const WAIT_MS = 25_000;

function waitForConnected(timeoutMs) {
  return new Promise(function (resolve, reject) {
    if (mongoose.connection.readyState === 1) {
      return resolve();
    }
    var timer = setTimeout(function () {
      mongoose.connection.removeListener("connected", onConn);
      reject(new Error("MongoDB: timeout chờ kết nối lại"));
    }, timeoutMs);
    function onConn() {
      clearTimeout(timer);
      mongoose.connection.removeListener("connected", onConn);
      resolve();
    }
    mongoose.connection.once("connected", onConn);
  });
}

/**
 * Đảm bảo có kết nối (kể cả sau khi driver báo disconnected — thử connect lại / chờ reconnect).
 */
async function ensureDbReady() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  var uri = getMongoUri();
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI");
  }

  if (mongoose.connection.readyState === 2) {
    await waitForConnected(WAIT_MS);
    if (mongoose.connection.readyState === 1) return;
    throw new Error("MongoDB vẫn đang kết nối");
  }

  try {
    await mongoose.connect(uri, mongoConnectOptions);
  } catch (err) {
    if (mongoose.connection.readyState === 1) return;
    if (mongoose.connection.readyState === 2) {
      await waitForConnected(WAIT_MS);
      if (mongoose.connection.readyState === 1) return;
    }
    throw err;
  }

  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await waitForConnected(WAIT_MS);
    if (mongoose.connection.readyState === 1) return;
  }
  throw new Error("Không kết nối được MongoDB");
}

function send503(res) {
  var lastErr = mongoStatus.getLastError();
  var message = lastErr
    ? "Không thể kết nối MongoDB: " + lastErr
    : "Chưa kết nối MongoDB. Kiểm tra backend/.env (MONGODB_URI dạng mongodb:// như backend/.env.example — không dùng mongodb+srv nếu lỗi DNS). Chi tiết: GET /api/health";

  return res.status(503).json({
    message: message,
    mongoState: mongoose.connection.readyState,
    mongoError: lastErr || null,
  });
}

module.exports = function requireDb(req, res, next) {
  ensureDbReady()
    .then(function () {
      next();
    })
    .catch(function (err) {
      console.warn("[dbReady]", err.message || err);
      send503(res);
    });
};
