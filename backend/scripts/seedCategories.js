/**
 * Tạo các chuyên mục mặc định trong DB (id cố định theo name — upsert).
 * Chạy trước seed:demo-posts nếu cần tách bước.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { requireMongoUri } = require("../config/mongoUri");
const mongoConnectOptions = require("../config/mongoConnectOptions");
const { ensureDefaultForumCategories } = require("../utils/forumCategorySetup");

async function main() {
  await mongoose.connect(requireMongoUri(), mongoConnectOptions);
  await ensureDefaultForumCategories();
  console.log("seed:categories — đã đồng bộ danh mục mặc định.");
  await mongoose.disconnect();
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
