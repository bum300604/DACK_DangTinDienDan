const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Report = require("../models/reports");
const { checkLogin, checkRole } = require("../middleware/authHandler");

const router = express.Router();

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

function excerpt(s, max) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + "…";
}

/**
 * GET /api/admin/reports/stats
 */
router.get("/stats", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const pending = await Report.countDocuments({ status: "PENDING" });
    res.json({ pending: pending });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports
 */
router.get("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const statusRaw = String(req.query.status || "PENDING").trim().toUpperCase();
    const allowed = ["PENDING", "RESOLVED", "DISMISSED", "ALL"];
    const st = allowed.includes(statusRaw) ? statusRaw : "PENDING";

    const filter = st === "ALL" ? {} : { status: st };

    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "reporter", select: "username displayName" })
        .populate({ path: "targetPost", select: "title" })
        .populate({ path: "targetComment", select: "content" })
        .populate({ path: "handledBy", select: "username displayName" })
        .lean(),
      Report.countDocuments(filter),
    ]);

    const reports = items.map(function (r) {
      const rep = r.reporter;
      return {
        _id: r._id,
        targetType: r.targetType,
        category: r.category,
        categoryLabel: CATEGORY_LABEL[r.category] || r.category,
        detail: r.detail || "",
        status: r.status,
        statusLabel: STATUS_LABEL[r.status] || r.status,
        adminNote: r.adminNote || "",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        handledAt: r.handledAt,
        reporter: rep
          ? {
              _id: rep._id,
              username: rep.username || "",
              displayName: rep.displayName || "",
            }
          : null,
        postTitle:
          r.targetPost && typeof r.targetPost === "object" && r.targetPost.title
            ? r.targetPost.title
            : "",
        postId: r.targetPost
          ? typeof r.targetPost === "object" && r.targetPost._id
            ? r.targetPost._id
            : r.targetPost
          : null,
        commentExcerpt:
          r.targetType === "COMMENT" && r.targetComment && r.targetComment.content
            ? excerpt(r.targetComment.content, 120)
            : "",
        commentId: r.targetComment && r.targetComment._id ? r.targetComment._id : r.targetComment,
        handledBy: r.handledBy
          ? {
              username: r.handledBy.username || "",
              displayName: r.handledBy.displayName || "",
            }
          : null,
      };
    });

    res.json({
      reports: reports,
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      filterStatus: st,
    });
  } catch (err) {
    next(err);
  }
});

const patchValidation = [
  body("status")
    .isIn(["RESOLVED", "DISMISSED"])
    .withMessage("Trạng thái phải là RESOLVED hoặc DISMISSED."),
  body("adminNote")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Ghi chú tối đa 2000 ký tự."),
];

/**
 * PATCH /api/admin/reports/:id
 */
router.patch("/:id", checkLogin, checkRole("ADMIN"), patchValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID báo cáo không hợp lệ." });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo." });
    }

    if (report.status !== "PENDING") {
      return res.status(400).json({ message: "Báo cáo này đã được xử lý." });
    }

    report.status = req.body.status;
    report.adminNote = String(req.body.adminNote || "").trim();
    report.handledBy = req.userId;
    report.handledAt = new Date();
    await report.save();

    res.json({
      message: "Đã cập nhật báo cáo.",
      report: {
        _id: report._id,
        status: report.status,
        adminNote: report.adminNote,
        handledAt: report.handledAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
