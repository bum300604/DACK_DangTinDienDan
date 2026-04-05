const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Post = require("../models/posts");
const Comment = require("../models/comments");
const { checkLogin, checkRole } = require("../middleware/authHandler");

const router = express.Router();

function formatCategory(catDoc) {
  if (!catDoc || !catDoc._id) return null;
  return { _id: catDoc._id, name: catDoc.name || "" };
}

function formatAuthor(authorDoc) {
  if (!authorDoc) return { displayName: "Thành viên", username: "" };
  const displayName = (authorDoc.displayName && String(authorDoc.displayName).trim()) || "";
  const username = authorDoc.username || "";
  return {
    displayName: displayName || username || "Thành viên",
    username: username,
  };
}

function excerptFrom(content, maxLen) {
  const t = String(content || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

/**
 * GET /api/admin/posts/queue-stats
 * Số lượng bài theo trạng thái (badge hàng đợi).
 */
router.get("/queue-stats", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const [pending, approved, rejected] = await Promise.all([
      Post.countDocuments({ status: "PENDING" }),
      Post.countDocuments({ status: "APPROVED" }),
      Post.countDocuments({ status: "REJECTED" }),
    ]);
    res.json({
      pending: pending,
      approved: approved,
      rejected: rejected,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/posts
 * Query: status (PENDING | APPROVED | REJECTED), page, limit
 */
router.get(
  "/",
  checkLogin,
  checkRole("ADMIN"),
  async function (req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
      const skip = (page - 1) * limit;

      const statusRaw = String(req.query.status || "PENDING").trim().toUpperCase();
      const allowed = ["PENDING", "APPROVED", "REJECTED"];
      const status = allowed.includes(statusRaw) ? statusRaw : "PENDING";

      const filter = { status: status };

      const [items, total] = await Promise.all([
        Post.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate({ path: "author", select: "username displayName" })
          .populate({ path: "category", select: "name" })
          .lean(),
        Post.countDocuments(filter),
      ]);

      const posts = items.map(function (p) {
        return {
          _id: p._id,
          title: p.title,
          excerpt: excerptFrom(p.content, 200),
          status: p.status,
          rejectionReason: p.rejectionReason || "",
          hiddenFromPublic: p.status === "APPROVED" ? !!p.hiddenFromPublic : false,
          category: formatCategory(p.category),
          author: formatAuthor(p.author),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });

      res.json({
        posts: posts,
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filterStatus: status,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/posts/:id/approve
 */
router.post("/:id/approve", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    if (post.status !== "PENDING") {
      return res.status(400).json({ message: "Chỉ duyệt được bài đang chờ duyệt." });
    }

    post.status = "APPROVED";
    post.rejectionReason = "";
    post.hiddenFromPublic = false;
    await post.save();

    const populated = await Post.findById(post._id)
      .populate({ path: "author", select: "username displayName" })
      .populate({ path: "category", select: "name" })
      .lean();

    res.json({
      message: "Đã duyệt bài.",
      post: {
        _id: populated._id,
        title: populated.title,
        status: populated.status,
        category: formatCategory(populated.category),
        author: formatAuthor(populated.author),
      },
    });
  } catch (err) {
    next(err);
  }
});

const rejectValidation = [
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Vui lòng nhập lý do từ chối.")
    .isLength({ max: 2000 })
    .withMessage("Lý do tối đa 2000 ký tự."),
];

/**
 * POST /api/admin/posts/:id/reject
 */
router.post(
  "/:id/reject",
  checkLogin,
  checkRole("ADMIN"),
  rejectValidation,
  async function (req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const id = req.params.id;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "ID bài viết không hợp lệ." });
      }

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ message: "Không tìm thấy bài viết." });
      }

      if (post.status !== "PENDING") {
        return res.status(400).json({ message: "Chỉ từ chối được bài đang chờ duyệt." });
      }

      post.status = "REJECTED";
      post.rejectionReason = String(req.body.reason).trim();
      await post.save();

      res.json({
        message: "Đã từ chối bài.",
        post: {
          _id: post._id,
          title: post.title,
          status: post.status,
          rejectionReason: post.rejectionReason,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/posts/:id/unpublish
 * Gỡ bài đã đăng khỏi kênh công khai (ẩn — Task 7).
 */
router.post("/:id/unpublish", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    if (post.status !== "APPROVED") {
      return res.status(400).json({ message: "Chỉ gỡ được bài đã duyệt và đang đăng." });
    }

    post.hiddenFromPublic = true;
    await post.save();

    res.json({
      message: "Đã gỡ bài khỏi trang công khai.",
      post: { _id: post._id, title: post.title, hiddenFromPublic: true },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/posts/:id/republish
 * Hiển thị lại bài đã gỡ (công khai trở lại).
 */
router.post("/:id/republish", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    if (post.status !== "APPROVED") {
      return res.status(400).json({ message: "Chỉ khôi phục hiển thị cho bài đã duyệt." });
    }

    post.hiddenFromPublic = false;
    await post.save();

    res.json({
      message: "Đã hiển thị lại bài công khai.",
      post: { _id: post._id, title: post.title, hiddenFromPublic: false },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/posts/:id
 * Xóa hẳn bài (và bình luận) — quản trị.
 */
router.delete("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    await Comment.deleteMany({ post: id });
    await Post.deleteOne({ _id: id });

    res.json({ message: "Đã xóa bài viết." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
