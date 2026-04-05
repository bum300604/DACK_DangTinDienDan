const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Category = require("../models/categories");
const Post = require("../models/posts");
const { checkLogin, checkRole } = require("../middleware/authHandler");

const router = express.Router();

const nameValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Tên chuyên mục không được để trống.")
    .isLength({ min: 1, max: 120 })
    .withMessage("Tên từ 1 đến 120 ký tự."),
];

/**
 * GET /api/admin/categories
 * Tất cả chuyên mục (kể cả đã ẩn) + số bài tham chiếu.
 */
router.get("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const items = await Category.find().sort({ name: 1 }).lean();

    const agg = await Post.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    for (let i = 0; i < agg.length; i++) {
      if (agg[i]._id) countMap[String(agg[i]._id)] = agg[i].count;
    }

    const categories = items.map(function (c) {
      return {
        _id: c._id,
        name: c.name,
        isDeleted: !!c.isDeleted,
        postCount: countMap[String(c._id)] || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    res.json({ categories: categories });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/categories
 */
router.post("/", checkLogin, checkRole("ADMIN"), nameValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const name = String(req.body.name).trim();
    try {
      const doc = await Category.create({ name: name, isDeleted: false });
      res.status(201).json({
        _id: doc._id,
        name: doc.name,
        isDeleted: false,
        postCount: 0,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.indexOf("E11000") !== -1 || msg.indexOf("duplicate") !== -1) {
        return res.status(400).json({ message: "Tên chuyên mục đã tồn tại." });
      }
      throw e;
    }
  } catch (err) {
    next(err);
  }
});

const patchValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Tên chuyên mục không được để trống.")
    .isLength({ min: 1, max: 120 })
    .withMessage("Tên từ 1 đến 120 ký tự."),
  body("isDeleted").optional().isBoolean().withMessage("isDeleted phải là boolean."),
];

/**
 * PATCH /api/admin/categories/:id
 * Đổi tên, ẩn/hiện (isDeleted).
 */
router.patch("/:id", checkLogin, checkRole("ADMIN"), patchValidation, async function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID chuyên mục không hợp lệ." });
    }

    const cat = await Category.findById(id);
    if (!cat) {
      return res.status(404).json({ message: "Không tìm thấy chuyên mục." });
    }

    if (req.body.name === undefined && req.body.isDeleted === undefined) {
      return res.status(400).json({ message: "Cung cấp name hoặc isDeleted." });
    }

    if (req.body.name !== undefined) {
      cat.name = String(req.body.name).trim();
    }
    if (req.body.isDeleted !== undefined) {
      cat.isDeleted = !!req.body.isDeleted;
    }

    try {
      await cat.save();
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.indexOf("E11000") !== -1 || msg.indexOf("duplicate") !== -1) {
        return res.status(400).json({ message: "Tên chuyên mục đã tồn tại." });
      }
      throw e;
    }

    const postCount = await Post.countDocuments({ category: cat._id });

    res.json({
      _id: cat._id,
      name: cat.name,
      isDeleted: !!cat.isDeleted,
      postCount: postCount,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Ẩn chuyên mục (soft delete) — không xóa bài.
 */
router.delete("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID chuyên mục không hợp lệ." });
    }

    const cat = await Category.findById(id);
    if (!cat) {
      return res.status(404).json({ message: "Không tìm thấy chuyên mục." });
    }

    cat.isDeleted = true;
    await cat.save();

    res.json({ message: "Đã ẩn chuyên mục khỏi danh sách lọc công khai.", _id: cat._id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
