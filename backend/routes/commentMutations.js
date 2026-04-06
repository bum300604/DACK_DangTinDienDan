const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Post = require("../models/posts");
const Comment = require("../models/comments");
const { publicApprovedFilter } = require("../utils/publicPostFilter");
const { checkLogin } = require("../middleware/authHandler");

const router = express.Router();

function formatAuthor(author) {
  if (!author) return { _id: null, username: "", displayName: "" };
  return {
    _id: author._id,
    username: author.username || "",
    displayName: author.displayName || "",
  };
}

function mapComment(doc) {
  return {
    _id: doc._id,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: formatAuthor(doc.author),
  };
}

const patchValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Nội dung bình luận không được để trống.")
    .isLength({ max: 5000 })
    .withMessage("Bình luận tối đa 5000 ký tự."),
];

/**
 * PATCH /api/public/comments/:commentId
 * Sửa bình luận của chính mình.
 */
router.patch("/:commentId", checkLogin, patchValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const commentId = req.params.commentId;
    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ message: "ID bình luận không hợp lệ." });
    }

    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    if (String(comment.author) !== String(req.userId)) {
      return res.status(403).json({ message: "Bạn chỉ được sửa bình luận của chính mình." });
    }

    const postOk = await Post.exists(Object.assign({ _id: comment.post }, publicApprovedFilter));
    if (!postOk) {
      return res.status(400).json({ message: "Bài viết không còn hiển thị công khai." });
    }

    const content = String(req.body.content).trim();
    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $set: { content: content } },
      { new: true }
    )
      .populate({ path: "author", select: "username displayName" })
      .lean();

    res.json(mapComment(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/public/comments/:commentId
 * Xóa bình luận của chính mình.
 */
router.delete("/:commentId", checkLogin, async function (req, res, next) {
  try {
    const commentId = req.params.commentId;
    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ message: "ID bình luận không hợp lệ." });
    }

    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    if (String(comment.author) !== String(req.userId)) {
      return res.status(403).json({ message: "Bạn chỉ được xóa bình luận của chính mình." });
    }

    await Comment.deleteOne({ _id: commentId });
    res.json({ message: "Đã xóa bình luận." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
