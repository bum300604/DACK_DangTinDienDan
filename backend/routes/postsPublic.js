const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/posts");
const Category = require("../models/categories");
const { publicApprovedFilter } = require("../utils/publicPostFilter");
const { firstImageThumbUrl } = require("../utils/postAttachments");

const router = express.Router();

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerptFrom(content, maxLen) {
  const t = String(content || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

function formatAuthor(authorDoc) {
  if (!authorDoc) return { displayName: "Thành viên", username: "" };
  const displayName = (authorDoc.displayName && String(authorDoc.displayName).trim()) || "";
  const username = authorDoc.username || "";
  return {
    displayName: displayName || username || "Thành viên",
    username: username,
  };
}

function formatCategory(catDoc) {
  if (!catDoc || !catDoc._id) return null;
  return { _id: catDoc._id, name: catDoc.name || "" };
}

/**
 * GET /api/public/posts
 * Query: q, categoryId (ObjectId chuyên mục; bỏ qua hoặc "all" = tất cả), page, limit
 * Chỉ trả bài đã duyệt (APPROVED). Không cần đăng nhập.
 */
router.get("/", async function (req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const q = String(req.query.q || "").trim();
    const categoryIdRaw = String(req.query.categoryId || "").trim();

    const filter = Object.assign({}, publicApprovedFilter);

    if (categoryIdRaw && categoryIdRaw !== "all") {
      if (!mongoose.isValidObjectId(categoryIdRaw)) {
        return res.status(400).json({ message: "categoryId không hợp lệ." });
      }
      const catExists = await Category.exists({ _id: categoryIdRaw, isDeleted: false });
      if (!catExists) {
        return res.status(400).json({ message: "Không tìm thấy chuyên mục." });
      }
      filter.category = categoryIdRaw;
    }

    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { title: { $regex: safe, $options: "i" } },
        { content: { $regex: safe, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "author", select: "username displayName" })
        .populate({ path: "category", select: "name" })
        .lean(),
      Post.countDocuments(filter),
    ]);

    const posts = items.map(function (p) {
      const at = p.attachments || [];
      return {
        _id: p._id,
        title: p.title,
        excerpt: excerptFrom(p.content, 220),
        category: formatCategory(p.category),
        createdAt: p.createdAt,
        author: formatAuthor(p.author),
        thumbUrl: firstImageThumbUrl(at),
        attachmentCount: at.length,
      };
    });

    res.json({
      posts: posts,
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/posts/:id
 * Một bài đã duyệt. Không cần đăng nhập.
 */
router.get("/:id", async function (req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ." });
    }

    const post = await Post.findOne(Object.assign({ _id: id }, publicApprovedFilter))
      .populate({ path: "author", select: "username displayName" })
      .populate({ path: "category", select: "name" })
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết hoặc bài chưa được duyệt." });
    }

    const at = post.attachments || [];
    res.json({
      _id: post._id,
      title: post.title,
      content: post.content,
      category: formatCategory(post.category),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: formatAuthor(post.author),
      attachments: at,
      thumbUrl: firstImageThumbUrl(at),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
