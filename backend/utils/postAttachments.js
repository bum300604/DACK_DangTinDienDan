const path = require("path");
const fs = require("fs");

const UPLOAD_SUBDIR = path.join("uploads", "post-attachments");

/** Thư mục gốc: ForumWeb (cùng cấp với backend). */
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

/**
 * Chỉ chấp nhận URL dạng /uploads/post-attachments/<tên-file>.
 */
function urlToDiskPath(url) {
  const s = String(url || "").trim();
  const m = s.match(/^\/uploads\/post-attachments\/([^/]+)$/);
  if (!m) return null;
  const base = m[1];
  if (!base || base.indexOf("..") !== -1 || base.indexOf("/") !== -1) return null;
  return path.join(getUploadAbsoluteDir(), base);
}

function unlinkUrl(url, logErr) {
  const p = urlToDiskPath(url);
  if (!p) return;
  fs.unlink(p, function (err) {
    if (err && logErr && err.code !== "ENOENT") logErr(err);
  });
}

function deleteFilesForUrls(urls) {
  if (!urls || !urls.length) return;
  for (let i = 0; i < urls.length; i++) {
    unlinkUrl(urls[i], null);
  }
}

function classifyKind(mimetype) {
  const m = String(mimetype || "");
  if (m.indexOf("image/") === 0) return "image";
  return "file";
}

function buildAttachmentsFromMulterFiles(files) {
  if (!files || !files.length) return [];
  return files.map(function (f) {
    const filename = f.filename || path.basename(f.path || "");
    return {
      url: "/uploads/post-attachments/" + filename,
      originalName: f.originalname || filename,
      mimeType: f.mimetype || "",
      kind: classifyKind(f.mimetype),
    };
  });
}

function firstImageThumbUrl(attachments) {
  if (!attachments || !attachments.length) return null;
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    if (!a || !a.url) continue;
    if (a.kind === "image") return a.url;
    const m = String(a.mimeType || "");
    if (m.indexOf("image/") === 0) return a.url;
  }
  return null;
}

module.exports = {
  UPLOAD_SUBDIR,
  getUploadAbsoluteDir,
  ensureUploadDir,
  urlToDiskPath,
  deleteFilesForUrls,
  buildAttachmentsFromMulterFiles,
  firstImageThumbUrl,
};
