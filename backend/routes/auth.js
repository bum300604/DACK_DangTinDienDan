const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const userController = require("../controllers/users");
const roleModel = require("../models/roles");
const { checkLogin, signToken } = require("../middleware/authHandler");
const { registerValidation, validateResult } = require("../middleware/validationHandler");

async function ensureRolePopulated(user) {
  if (!user) return user;
  const lean = user.toObject ? user.toObject() : user;
  const r = lean.role;
  if (r && typeof r === "object" && r.name) return user;
  const rid = r && r._id ? r._id : r;
  if (!rid) return user;
  const roleDoc = await roleModel.findOne({ _id: rid, isDeleted: false }).select("name").lean();
  if (roleDoc) {
    user.role = { _id: roleDoc._id, name: roleDoc.name };
  }
  return user;
}

function withRoleName(rest) {
  if (!rest || typeof rest !== "object") return rest;
  const name =
    rest.role && typeof rest.role === "object" && rest.role.name ? String(rest.role.name) : "";
  rest.roleName = name;
  return rest;
}

function safeUser(user) {
  if (!user) return null;
  const o = user.toObject ? user.toObject() : user;
  const { password: _p, ...rest } = o;
  return rest;
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });
}

// POST /api/auth/register — mặc định role USER
router.post("/register", registerValidation, validateResult, async function (req, res) {
  try {
    const { username, password, email } = req.body;

    const userRole = await roleModel.findOneAndUpdate(
      { name: "USER" },
      {
        $set: { isDeleted: false },
        $setOnInsert: { name: "USER", description: "Thành viên diễn đàn" },
      },
      { new: true, upsert: true }
    );

    await userController.createUser(
      String(username).trim(),
      password,
      String(email).trim().toLowerCase(),
      userRole._id,
      ""
    );

    res.status(201).json({ message: "Đăng ký thành công." });
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.indexOf("E11000") !== -1 || msg.indexOf("duplicate key") !== -1) {
      if (msg.indexOf("username") !== -1) {
        return res.status(400).json({ message: "Tên đăng nhập đã tồn tại." });
      }
      if (msg.indexOf("email") !== -1) {
        return res.status(400).json({ message: "Email đã được đăng ký." });
      }
      return res.status(400).json({ message: "Thông tin trùng với tài khoản khác." });
    }
    res.status(400).json({ message: msg });
  }
});

// POST /api/auth/login
router.post("/login", async function (req, res) {
  try {
    const { username, password } = req.body;
    const raw = username != null ? String(username).trim() : "";
    if (!raw) {
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập hoặc email." });
    }
    if (!password) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu." });
    }

    let getUser = null;
    if (raw.indexOf("@") !== -1) {
      getUser = await userController.findByEmail(raw.toLowerCase());
    } else {
      getUser = await userController.findByUsername(raw);
    }

    if (!getUser) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng." });
    }

    if (getUser.isLocked) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa." });
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, getUser.password);
    } catch (e) {
      ok = false;
    }
    if (!ok && getUser.password === password) {
      getUser.password = password;
      await getUser.save();
      ok = true;
    }

    if (!ok) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng." });
    }

    const token = signToken(getUser._id);
    setAuthCookie(res, token);

    let populated = await userController.findById(getUser._id);
    populated = await ensureRolePopulated(populated);
    res.json({ token, user: withRoleName(safeUser(populated)) });
  } catch (e) {
    res.status(500).json({ message: String(e.message || e) });
  }
});

// GET /api/auth/me
router.get("/me", checkLogin, async function (req, res) {
  let user = await userController.findById(req.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });
  user = await ensureRolePopulated(user);
  res.json(withRoleName(safeUser(user)));
});

// POST /api/auth/logout — xóa cookie; không bắt buộc token hợp lệ
router.post("/logout", function (req, res) {
  res.cookie("token", "", { httpOnly: true, maxAge: 0, sameSite: "lax" });
  res.json({ ok: true });
});

module.exports = router;
