const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Post = require("../models/posts");
const Category = require("../models/categories");
const Comment = require("../models/comments");
const { checkLogin } = require("../middleware/authHandler");

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

const writeValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Tiêu đề không được để trống.")
    .isLength({ max: 200 })
    .withMessage("Tiêu đề tối đa 200 ký tự."),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Nội dung không được để trống.")
    .isLength({ max: 50000 })
    .withMessage("Nội dung tối đa 50000 ký tự."),
  body("categoryId")
    .trim()
    .notEmpty()
    .withMessage("Chọn chuyên mục.")
    .custom(function (v) {
      return mongoose.isValidObjectId(v);
    })
    .withMessage("Chuyên mục không hợp lệ."),
];

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
      return {
        _id: p._id,
        title: p.title,
        excerpt: excerptFrom(p.content, 160),
        status: p.status,
        rejectionReason: p.rejectionReason || "",
        category: formatCategory(p.category),
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
 * Gửi bài mới — trạng thái chờ duyệt.
 */
router.post("/", checkLogin, writeValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const categoryId = String(req.body.categoryId).trim();
    const catOk = await Category.exists({ _id: categoryId, isDeleted: false });
    if (!catOk) {
      return res.status(400).json({ message: "Chuyên mục không tồn tại." });
    }

    const doc = await Post.create({
      title: String(req.body.title).trim(),
      content: String(req.body.content).trim(),
      category: categoryId,
      author: req.userId,
      status: "PENDING",
      rejectionReason: "",
    });

    const populated = await Post.findById(doc._id)
      .populate({ path: "category", select: "name" })
      .lean();

    res.status(201).json({
      _id: populated._id,
      title: populated.title,
      content: populated.content,
      status: populated.status,
      rejectionReason: "",
      category: formatCategory(populated.category),
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
      canEdit: true,
      canDelete: true,
    });
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

    res.json({
      _id: post._id,
      title: post.title,
      content: post.content,
      status: post.status,
      rejectionReason: post.rejectionReason || "",
      category: formatCategory(post.category),
      categoryId: post.category ? post.category._id : null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      canEdit: canAuthorEditOrDelete(post.status),
      canDelete: canAuthorEditOrDelete(post.status),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/me/posts/:id
 * Sửa bài ở trạng thái chờ duyệt hoặc bị từ chối (gửi lại duyệt).
 */
router.patch("/:id", checkLogin, writeValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
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

    const categoryId = String(req.body.categoryId).trim();
    const catOk = await Category.exists({ _id: categoryId, isDeleted: false });
    if (!catOk) {
      return res.status(400).json({ message: "Chuyên mục không tồn tại." });
    }

    existing.title = String(req.body.title).trim();
    existing.content = String(req.body.content).trim();
    existing.category = categoryId;
    existing.status = "PENDING";
    existing.rejectionReason = "";
    await existing.save();

    const populated = await Post.findById(existing._id)
      .populate({ path: "category", select: "name" })
      .lean();

    res.json({
      _id: populated._id,
      title: populated.title,
      content: populated.content,
      status: populated.status,
      rejectionReason: populated.rejectionReason || "",
      category: formatCategory(populated.category),
      categoryId: populated.category ? populated.category._id : null,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
      canEdit: true,
      canDelete: true,
    });
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

    await Comment.deleteMany({ post: id });
    await Post.deleteOne({ _id: id });

    res.json({ message: "Đã xóa bài viết." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
