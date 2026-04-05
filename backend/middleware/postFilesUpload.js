const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { ensureUploadDir } = require("../utils/postAttachments");

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;

function fileFilter(req, file, cb) {
  const m = String(file.mimetype || "");
  if (m.indexOf("image/") === 0) {
    if (/^image\/(jpeg|png|gif|webp)$/i.test(m)) return cb(null, true);
    return cb(new Error("Chỉ chấp nhận ảnh JPEG, PNG, GIF hoặc WebP."));
  }
  const ok =
    m === "application/pdf" ||
    m === "application/zip" ||
    m === "application/x-zip-compressed" ||
    m === "text/plain" ||
    m.indexOf("wordprocessingml") !== -1 ||
    m.indexOf("spreadsheetml") !== -1 ||
    m === "application/msword" ||
    m === "application/vnd.ms-excel";
  if (ok) return cb(null, true);
  return cb(new Error("Định dạng tệp không được hỗ trợ (PDF, ZIP, Office, TXT, ảnh)."));
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, ensureUploadDir());
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").slice(0, 16).toLowerCase();
    const safeExt = /^\.[a-z0-9.]+$/.test(ext) ? ext : "";
    const id = crypto.randomBytes(16).toString("hex");
    cb(null, id + safeExt);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter: fileFilter,
});

const uploadPostFiles = upload.array("files", MAX_FILES);

/**
 * Chỉ chạy multer khi client gửi multipart (có thể không có file).
 */
function uploadIfMultipart(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (ct.indexOf("multipart/form-data") === -1) {
    return next();
  }
  uploadPostFiles(req, res, function (err) {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "Mỗi tệp tối đa 5MB."
          : err.message || "Tải tệp thất bại.";
      return res.status(400).json({ message: msg });
    }
    next();
  });
}

module.exports = {
  uploadPostFiles,
  uploadIfMultipart,
  MAX_FILES,
  MAX_SIZE,
};
