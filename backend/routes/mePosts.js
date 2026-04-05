const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/posts");
const Category = require("../models/categories");
const Comment = require("../models/comments");
const { checkLogin } = require("../middleware/authHandler");
const { uploadIfMultipart } = require("../middleware/postFilesUpload");
const {
  buildAttachmentsFromMulterFiles,
  deleteFilesForUrls,
  firstImageThumbUrl,
} = require("../utils/postAttachments");

const router = express.Router();

function excerptFrom(content, maxLen) {
  const t = String(content || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

function formatCategory(catDoc) {
  if (!catDoc || !catDoc._id) return null;
  return { _id: catDoc._id, name: catDoc.name || "" };
}

function canAuthorEditOrDelete(status) {
  return status === "PENDING" || status === "REJECTED";
}

function validatePostBody(body) {
  const title = body.title != null ? String(body.title).trim() : "";
  const content = body.content != null ? String(body.content).trim() : "";
  const categoryId = body.categoryId != null ? String(body.categoryId).trim() : "";
  if (!title) {
    return { ok: false, message: "Tiêu đề không được để trống." };
  }
  if (title.length > 200) {
    return { ok: false, message: "Tiêu đề tối đa 200 ký tự." };
  }
  if (!content) {
    return { ok: false, message: "Nội dung không được để trống." };
  }
  if (content.length > 50000) {
    return { ok: false, message: "Nội dung tối đa 50000 ký tự." };
  }
  if (!categoryId) {
    return { ok: false, message: "Chọn chuyên mục." };
  }
  if (!mongoose.isValidObjectId(categoryId)) {
    return { ok: false, message: "Chuyên mục không hợp lệ." };
  }
  return { ok: true, title: title, content: content, categoryId: categoryId };
}

/** @returns {"OMIT"|"INVALID"|string[]} */
function parseKeepUrlsField(body) {
  if (body.keepUrls === undefined || body.keepUrls === "") {
    return "OMIT";
  }
  const raw = body.keepUrls;
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  try {
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(j)) return "INVALID";
    return j.map(String);
  } catch (e) {
    return "INVALID";
  }
}

function formatPostResponse(populated) {
  const at = populated.attachments || [];
  return {
    _id: populated._id,
    title: populated.title,
    content: populated.content,
    status: populated.status,
    rejectionReason: populated.rejectionReason || "",
    hiddenFromPublic: !!populated.hiddenFromPublic,
    category: formatCategory(populated.category),
    categoryId: populated.category ? populated.category._id : null,
    attachments: at,
    thumbUrl: firstImageThumbUrl(at),
    createdAt: populated.createdAt,
    updatedAt: populated.updatedAt,
    canEdit: canAuthorEditOrDelete(populated.status),
    canDelete: canAuthorEditOrDelete(populated.status),
  };
}

/**
 * GET /api/me/posts
 * Danh sách bài của tài khoản đang đăng nhập.
 */
router.get("/", checkLogin, async function (req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { author: req.userId };

    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "category", select: "name" })
        .lean(),
      Post.countDocuments(filter),
    ]);

    const posts = items.map(function (p) {
      const at = p.attachments || [];
      return {
        _id: p._id,
        title: p.title,
        excerpt: excerptFrom(p.content, 160),
        status: p.status,
        rejectionReason: p.rejectionReason || "",
        hiddenFromPublic: !!p.hiddenFromPublic,
        category: formatCategory(p.category),
        thumbUrl: firstImageThumbUrl(at),
        attachmentCount: at.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        canEdit: canAuthorEditOrDelete(p.status),
        canDelete: canAuthorEditOrDelete(p.status),
      };
    });

    res.json({
      posts: posts,
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/me/posts
 * JSON hoặc multipart (fields: title, content, categoryId; files[] tùy chọn).
 */
router.post("/", checkLogin, uploadIfMultipart, async function (req, res, next) {
  try {
    const v = validatePostBody(req.body);
    if (!v.ok) {
      return res.status(400).json({ message: v.message });
    }

    const catOk = await Category.exists({ _id: v.categoryId, isDeleted: false });
    if (!catOk) {
      return res.status(400).json({ message: "Chuyên mục không tồn tại." });
    }

    const newFiles = buildAttachmentsFromMulterFiles(req.files || []);

    const doc = await Post.create({
      title: v.title,
      content: v.content,
      category: v.categoryId,
      author: req.userId,
      status: "PENDING",
      rejectionReason: "",
      hiddenFromPublic: false,
      attachments: newFiles,
    });

    const populated = await Post.findById(doc._id)
      .populate({ path: "category", select: "name" })
      .lean();

    res.status(201).json(formatPostResponse(populated));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/me/posts/:id
 * Chi tiết bài của chính mình (để sửa).
 */
router.get("/:id", checkLogin, async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const post = await Post.findOne({ _id: id, author: req.userId })
      .populate({ path: "category", select: "name" })
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    res.json(formatPostResponse(post));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/me/posts/:id
 * JSON hoặc multipart; keepUrls = mảng URL giữ lại (bắt buộc khi gửi multipart để tránh mất tệp cũ).
 */
router.patch("/:id", checkLogin, uploadIfMultipart, async function (req, res, next) {
  try {
    const v = validatePostBody(req.body);
    if (!v.ok) {
      return res.status(400).json({ message: v.message });
    }

    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const existing = await Post.findOne({ _id: id, author: req.userId });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    if (!canAuthorEditOrDelete(existing.status)) {
      return res.status(400).json({
        message: "Chỉ sửa được bài đang chờ duyệt hoặc bị từ chối.",
      });
    }

    const catOk = await Category.exists({ _id: v.categoryId, isDeleted: false });
    if (!catOk) {
      return res.status(400).json({ message: "Chuyên mục không tồn tại." });
    }

    const oldAttachments = existing.attachments || [];
    const oldUrls = oldAttachments.map(function (a) {
      return a.url;
    });

    const parsed = parseKeepUrlsField(req.body);
    let keepUrls;
    if (parsed === "INVALID") {
      return res.status(400).json({ message: "keepUrls không hợp lệ (cần mảng URL)." });
    }
    if (parsed === "OMIT") {
      keepUrls = oldUrls.slice();
    } else {
      keepUrls = parsed;
    }

    for (let i = 0; i < keepUrls.length; i++) {
      if (oldUrls.indexOf(keepUrls[i]) === -1) {
        return res.status(400).json({ message: "Danh sách giữ tệp không khớp bài hiện tại." });
      }
    }

    const removed = oldUrls.filter(function (u) {
      return keepUrls.indexOf(u) === -1;
    });
    deleteFilesForUrls(removed);

    const keptOrdered = keepUrls
      .map(function (url) {
        return oldAttachments.find(function (a) {
          return a.url === url;
        });
      })
      .filter(Boolean);

    const newFromUpload = buildAttachmentsFromMulterFiles(req.files || []);
    existing.attachments = keptOrdered.concat(newFromUpload);
    existing.title = v.title;
    existing.content = v.content;
    existing.category = v.categoryId;
    existing.status = "PENDING";
    existing.rejectionReason = "";
    await existing.save();

    const populated = await Post.findById(existing._id)
      .populate({ path: "category", select: "name" })
      .lean();

    res.json(formatPostResponse(populated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/me/posts/:id
 * Xóa bài chờ duyệt hoặc bị từ chối.
 */
router.delete("/:id", checkLogin, async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const existing = await Post.findOne({ _id: id, author: req.userId });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    if (!canAuthorEditOrDelete(existing.status)) {
      return res.status(400).json({
        message: "Chỉ xóa được bài đang chờ duyệt hoặc bị từ chối.",
      });
    }

    const urls = (existing.attachments || []).map(function (a) {
      return a.url;
    });
    deleteFilesForUrls(urls);

    await Comment.deleteMany({ post: id });
    await Post.deleteOne({ _id: id });

    res.json({ message: "Đã xóa bài viết." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
