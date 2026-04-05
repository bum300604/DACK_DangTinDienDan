const path = require("path");
const fs = require("fs");

const UPLOAD_SUBDIR = path.join("uploads", "message-images");

function getUploadAbsoluteDir() {
  return path.join(__dirname, "..", "..", "ForumWeb", UPLOAD_SUBDIR);
}

function ensureUploadDir() {
  const dir = getUploadAbsoluteDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Chỉ chấp nhận URL do server phát hành: /uploads/message-images/<tên-file>. */
function isAllowedImageUrl(url) {
  const s = String(url || "").trim();
  const m = s.match(/^\/uploads\/message-images\/([^/]+)$/);
  if (!m) return false;
  const base = m[1];
  return !!(base && base.indexOf("..") === -1 && base.indexOf("/") === -1);
}

function publicUrlForFilename(filename) {
  return "/uploads/message-images/" + filename;
}

module.exports = {
  UPLOAD_SUBDIR,
  ensureUploadDir,
  isAllowedImageUrl,
  publicUrlForFilename,
};
