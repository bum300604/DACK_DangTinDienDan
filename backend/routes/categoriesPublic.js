const express = require("express");
const Category = require("../models/categories");

const router = express.Router();

/**
 * GET /api/public/categories
 * Danh sách chuyên mục (không xóa) — dùng cho lọc / hiển thị pill; id là categoryId hợp lệ.
 */
router.get("/", async function (req, res, next) {
  try {
    const items = await Category.find({ isDeleted: false })
      .sort({ name: 1 })
      .select("_id name")
      .lean();

    res.json({
      categories: items.map(function (c) {
        return { _id: c._id, name: c.name };
      }),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
