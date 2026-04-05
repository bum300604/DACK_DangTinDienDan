const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Post = require("../models/posts");
const Comment = require("../models/comments");
const { publicApprovedFilter } = require("../utils/publicPostFilter");
const { checkLogin } = require("../middleware/authHandler");

const router = express.Router({ mergeParams: true });

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

/**
 * GET /api/public/posts/:postId/comments
 * Danh sách bình luận (bài phải đã duyệt). Không cần đăng nhập.
 */
router.get("/", async function (req, res, next) {
  try {
    const postId = req.params.postId;
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const approved = await Post.exists(Object.assign({ _id: postId }, publicApprovedFilter));
    if (!approved) {
      return res.status(404).json({ message: "Không tìm thấy bài viết hoặc bài chưa được duyệt." });
    }

    const items = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate({ path: "author", select: "username displayName" })
      .lean();

    res.json({
      comments: items.map(mapComment),
    });
  } catch (err) {
    next(err);
  }
});

const createCommentValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Nội dung bình luận không được để trống.")
    .isLength({ max: 5000 })
    .withMessage("Bình luận tối đa 5000 ký tự."),
];

/**
 * POST /api/public/posts/:postId/comments
 * Tạo bình luận — cần đăng nhập.
 */
router.post("/", checkLogin, createCommentValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const postId = req.params.postId;
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const approved = await Post.exists(Object.assign({ _id: postId }, publicApprovedFilter));
    if (!approved) {
      return res.status(404).json({ message: "Không tìm thấy bài viết hoặc bài chưa được duyệt." });
    }

    const content = String(req.body.content).trim();
    const doc = await Comment.create({
      post: postId,
      author: req.userId,
      content: content,
    });

    const populated = await Comment.findById(doc._id)
      .populate({ path: "author", select: "username displayName" })
      .lean();

    res.status(201).json(mapComment(populated));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
