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
};
