const Category = require("../models/categories");

/** Danh mục mặc định (đồng bộ tên để seed / migration). */
const DEFAULT_CATEGORY_NAMES = ["Mua bán", "Việc làm", "Nhà đất", "Điện tử", "Xe cộ", "Dịch vụ"];

/**
 * Đảm bảo có đủ bản ghi category trong DB (upsert theo name).
 */
async function ensureDefaultForumCategories() {
  for (let i = 0; i < DEFAULT_CATEGORY_NAMES.length; i++) {
    const name = DEFAULT_CATEGORY_NAMES[i];
    await Category.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, isDeleted: false } },
      { upsert: true }
    );
  }
}

/**
 * Bài cũ lưu category dạng chuỗi → chuyển sang ObjectId ref category.
 */
async function migratePostCategoryFromStringToRef() {
  const Post = require("../models/posts");
  const categories = await Category.find({ isDeleted: false }).lean();
  const nameToId = {};
  for (let i = 0; i < categories.length; i++) {
    nameToId[categories[i].name] = categories[i]._id;
  }

  const coll = Post.collection;
  const cursor = coll.find({ category: { $type: "string" } });
  const ops = [];

  for await (const doc of cursor) {
    const oid = nameToId[doc.category];
    if (oid) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { category: oid } },
        },
      });
    }
  }

  if (ops.length > 0) {
    await coll.bulkWrite(ops);
    console.log("migratePostCategoryFromStringToRef: updated", ops.length, "document(s).");
  }
}

/**
 * Gọi khi server khởi động (sau khi MongoDB connected).
 */
module.exports = async function forumCategorySetup() {
  await ensureDefaultForumCategories();
  await migratePostCategoryFromStringToRef();
};

module.exports.ensureDefaultForumCategories = ensureDefaultForumCategories;
module.exports.DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORY_NAMES;
