const express = require("express");
const mongoose = require("mongoose");
const Comment = require("../models/comments");
const { checkLogin, checkRole } = require("../middleware/authHandler");

const router = express.Router();

/**
 * DELETE /api/admin/comments/:commentId
 * Xóa bình luận (quản trị — Task 7).
 */
router.delete("/:commentId", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const commentId = req.params.commentId;
    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ message: "ID bình luận không hợp lệ." });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    await Comment.deleteOne({ _id: commentId });
    res.json({ message: "Đã xóa bình luận." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
