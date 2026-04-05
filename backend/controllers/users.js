const bcrypt = require("bcrypt");
const userModel = require("../models/users");

module.exports = {
  createUser: async function (username, password, email, roleId, displayName) {
    const doc = new userModel({
      username,
      password,
      email,
      role: roleId,
      displayName: displayName || "",
    });
    await doc.save();
    return doc;
  },

  findById: async function (id) {
    return userModel
      .findOne({ _id: id, isDeleted: false })
      .populate({ path: "role", select: "name" });
  },

  findByUsername: async function (username) {
    return userModel.findOne({ username, isDeleted: false });
  },

  findByEmail: async function (email) {
    return userModel.findOne({ email: String(email).toLowerCase(), isDeleted: false });
  },

  /**
   * Cập nhật tên hiển thị & email (chính chủ). Username không đổi qua API này.
   */
  updateProfile: async function (userId, { displayName, email }) {
    const user = await userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) return { ok: false, status: 404, message: "Không tìm thấy người dùng." };

    if (email != null && String(email).trim() !== "") {
      const normalized = String(email).trim().toLowerCase();
      const dup = await userModel.findOne({
        email: normalized,
        _id: { $ne: userId },
        isDeleted: false,
      });
      if (dup) {
        return { ok: false, status: 400, message: "Email đã được sử dụng bởi tài khoản khác." };
      }
      user.email = normalized;
    }

    if (displayName != null) {
      user.displayName = String(displayName).trim().slice(0, 128);
    }

    await user.save();
    return { ok: true };
  },

  /**
   * Đổi mật khẩu (xác minh mật khẩu hiện tại).
   */
  changePassword: async function (userId, currentPassword, newPassword) {
    const user = await userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) return { ok: false, status: 404, message: "Không tìm thấy người dùng." };

    let ok = false;
    try {
      ok = await bcrypt.compare(String(currentPassword), user.password);
    } catch (e) {
      ok = false;
    }
    if (!ok && user.password === String(currentPassword)) {
      ok = true;
    }
    if (!ok) {
      return { ok: false, status: 400, message: "Mật khẩu hiện tại không đúng." };
    }

    user.password = String(newPassword);
    await user.save();
    return { ok: true };
  },
};
