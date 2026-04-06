/**
 * Tạo tài khoản ADMIN để test (chạy sau seed:roles).
 * Biến môi trường: SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, SEED_ADMIN_EMAIL
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { requireMongoUri } = require("../config/mongoUri");
const mongoConnectOptions = require("../config/mongoConnectOptions");
const roleModel = require("../models/roles");
const userModel = require("../models/users");

const username = process.env.SEED_ADMIN_USERNAME || "admin";
const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";
const email = (process.env.SEED_ADMIN_EMAIL || "admin@forum.local").toLowerCase();

async function main() {
  await mongoose.connect(requireMongoUri(), mongoConnectOptions);

  const adminRole = await roleModel.findOne({ name: "ADMIN", isDeleted: false });
  if (!adminRole) {
    console.error("Chưa có role ADMIN. Chạy: npm run seed:roles");
    process.exit(1);
  }

  const existing = await userModel.findOne({
    $or: [{ username }, { email }],
    isDeleted: false,
  });
  if (existing) {
    console.log("Đã tồn tại user trùng username hoặc email. Bỏ qua tạo mới.");
    console.log("  username:", username, "| email:", email);
    await mongoose.disconnect();
    return;
  }

  const u = new userModel({
    username,
    password,
    email,
    displayName: "Quản trị",
    role: adminRole._id,
  });
  await u.save();
  console.log("Đã tạo tài khoản ADMIN:");
  console.log("  username:", username);
  console.log("  email:", email);
  console.log("  password: (theo SEED_ADMIN_PASSWORD hoặc mặc định Admin@123456)");

  await mongoose.disconnect();
  console.log("seed:admin done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
