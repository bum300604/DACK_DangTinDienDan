const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const User = require("../models/users");
const { checkLogin, checkRole } = require("../middleware/authHandler");

const router = express.Router();

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/admin/users?q=&page=&limit=
 */
router.get("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    var page = Math.max(1, parseInt(req.query.page, 10) || 1);
    var limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    var q = (req.query.q != null ? String(req.query.q) : "").trim();

    var filter = { isDeleted: false };
    if (q) {
      var rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ username: rx }, { email: rx }, { displayName: rx }];
    }

    var total = await User.countDocuments(filter);
    var items = await User.find(filter)
      .populate({ path: "role", select: "name" })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("username email displayName isLocked createdAt")
      .lean();

    var users = items.map(function (u) {
      var roleName =
        u.role && typeof u.role === "object" && u.role.name ? String(u.role.name) : "";
      return {
        _id: u._id,
        username: u.username,
        email: u.email,
        displayName: u.displayName || "",
        isLocked: !!u.isLocked,
        roleName: roleName,
        createdAt: u.createdAt,
      };
    });

    res.json({
      users: users,
      page: page,
      limit: limit,
      total: total,
    });
  } catch (err) {
    next(err);
  }
});

var patchValidation = [body("isLocked").isBoolean().withMessage("isLocked phải là true hoặc false.")];

/**
 * PATCH /api/admin/users/:id
 * { "isLocked": true | false }
 */
router.patch("/:id", checkLogin, checkRole("ADMIN"), patchValidation, async function (req, res, next) {
  try {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    var id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    if (String(req.userId) === String(id) && req.body.isLocked === true) {
      return res.status(400).json({ message: "Không thể khóa chính tài khoản đang đăng nhập." });
    }

    var user = await User.findOne({ _id: id, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    user.isLocked = !!req.body.isLocked;
    await user.save();

    await user.populate({ path: "role", select: "name" });
    var o = user.toObject();
    var roleName = o.role && o.role.name ? String(o.role.name) : "";
    res.json({
      _id: o._id,
      username: o.username,
      email: o.email,
      displayName: o.displayName || "",
      isLocked: !!o.isLocked,
      roleName: roleName,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
