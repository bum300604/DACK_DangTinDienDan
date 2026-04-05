const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Report = require("../models/reports");
const Post = require("../models/posts");
const Comment = require("../models/comments");
const { checkLogin } = require("../middleware/authHandler");
const { publicApprovedFilter } = require("../utils/publicPostFilter");

const router = express.Router();

const createValidation = [
  body("targetType").isIn(["POST", "COMMENT"]).withMessage("Loại báo cáo không hợp lệ."),
  body("targetPostId")
    .trim()
    .notEmpty()
    .withMessage("Thiếu bài viết.")
    .custom((v) => mongoose.isValidObjectId(v))
    .withMessage("ID bài không hợp lệ."),
  body("targetCommentId")
    .optional({ nullable: true, checkFalsy: true })
    .custom((v) => !v || mongoose.isValidObjectId(v))
    .withMessage("ID bình luận không hợp lệ."),
  body("category")
    .isIn(["SPAM", "HARASSMENT", "INAPPROPRIATE", "SCAM", "OTHER"])
    .withMessage("Danh mục báo cáo không hợp lệ."),
  body("detail")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Mô tả tối đa 2000 ký tự."),
];

const CATEGORY_LABEL = {
  SPAM: "Spam / quảng cáo",
  HARASSMENT: "Quấy rối / xúc phạm",
  INAPPROPRIATE: "Nội dung không phù hợp",
  SCAM: "Lừa đảo / gian lận",
  OTHER: "Khác",
};

const STATUS_LABEL = {
  PENDING: "Chờ xử lý",
  RESOLVED: "Đã xử lý",
  DISMISSED: "Đã bác bỏ",
};

function mapMyReport(doc) {
  return {
    _id: doc._id,
    targetType: doc.targetType,
    targetPost: doc.targetPost,
    targetComment: doc.targetComment || null,
    category: doc.category,
    categoryLabel: CATEGORY_LABEL[doc.category] || doc.category,
    detail: doc.detail || "",
    status: doc.status,
    statusLabel: STATUS_LABEL[doc.status] || doc.status,
    adminNote: doc.adminNote || "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    handledAt: doc.handledAt,
  };
}

/**
 * GET /api/me/reports
 * Danh sách báo cáo của tài khoản hiện tại.
 */
router.get("/", checkLogin, async function (req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { reporter: req.userId };

    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      reports: items.map(mapMyReport),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/me/reports
 * Gửi báo cáo (bài hoặc bình luận công khai).
 */
router.post("/", checkLogin, createValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const targetType = req.body.targetType;
    const postId = String(req.body.targetPostId).trim();
    const commentIdRaw = req.body.targetCommentId;
    const commentId =
      commentIdRaw && String(commentIdRaw).trim() && mongoose.isValidObjectId(String(commentIdRaw).trim())
        ? String(commentIdRaw).trim()
        : null;

    if (targetType === "COMMENT" && !commentId) {
      return res.status(400).json({ message: "Báo cáo bình luận cần có ID bình luận." });
    }
    if (targetType === "POST" && commentId) {
      return res.status(400).json({ message: "Báo cáo bài không gửi kèm ID bình luận." });
    }

    const postVisible = await Post.exists(Object.assign({ _id: postId }, publicApprovedFilter));
    if (!postVisible) {
      return res.status(400).json({ message: "Bài viết không tồn tại hoặc không còn hiển thị công khai." });
    }

    if (targetType === "COMMENT") {
      const c = await Comment.findById(commentId).lean();
      if (!c || String(c.post) !== String(postId)) {
        return res.status(400).json({ message: "Bình luận không tồn tại hoặc không thuộc bài này." });
      }
    }

    const dup = await Report.findOne(
      targetType === "COMMENT"
        ? {
            reporter: req.userId,
            targetPost: postId,
            targetType: "COMMENT",
            targetComment: commentId,
            status: "PENDING",
          }
        : {
            reporter: req.userId,
            targetPost: postId,
            targetType: "POST",
            status: "PENDING",
            $or: [{ targetComment: null }, { targetComment: { $exists: false } }],
          }
    );
    if (dup) {
      return res.status(400).json({ message: "Bạn đã có báo cáo đang chờ xử lý cho mục tiêu này." });
    }

    const doc = await Report.create({
      reporter: req.userId,
      targetType: targetType,
      targetPost: postId,
      targetComment: targetType === "COMMENT" ? commentId : null,
      category: req.body.category,
      detail: String(req.body.detail || "").trim(),
      status: "PENDING",
    });

    res.status(201).json(mapMyReport(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
