const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { ensureUploadDir } = require("../utils/messageImages");

const MAX_SIZE = 5 * 1024 * 1024;

function fileFilter(req, file, cb) {
  const m = String(file.mimetype || "");
  if (m.indexOf("image/") === 0 && /^image\/(jpeg|png|gif|webp)$/i.test(m)) {
    return cb(null, true);
  }
  return cb(new Error("Chỉ chấp nhận ảnh JPEG, PNG, GIF hoặc WebP."));
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
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: fileFilter,
});

const uploadSingleImage = upload.single("image");

/**
 * Chạy multer khi client gửi multipart/form-data; bỏ qua JSON.
 */
function uploadMessageImageIfMultipart(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (ct.indexOf("multipart/form-data") === -1) {
    return next();
  }
  uploadSingleImage(req, res, function (err) {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "Ảnh tối đa 5MB."
          : err.message || "Tải ảnh thất bại.";
      return res.status(400).json({ message: msg });
    }
    next();
  });
}

module.exports = {
  uploadMessageImageIfMultipart,
  MAX_SIZE,
};
