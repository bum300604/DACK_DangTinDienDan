const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/conversations");
const Message = require("../models/messages");
const Post = require("../models/posts");
const User = require("../models/users");
const Role = require("../models/roles");
const { checkLogin } = require("../middleware/authHandler");
const { uploadMessageImageIfMultipart } = require("../middleware/messageImageUpload");
const { publicUrlForFilename } = require("../utils/messageImages");
const { publicApprovedFilter } = require("../utils/publicPostFilter");

const router = express.Router();

function sortPair(idA, idB) {
  const sa = String(idA);
  const sb = String(idB);
  return sa < sb ? [idA, idB] : [idB, idA];
}

function otherParticipant(conv, meId) {
  const me = String(meId);
  if (String(conv.participantLow) === me) return conv.participantHigh;
  if (String(conv.participantHigh) === me) return conv.participantLow;
  return null;
}

function upsertRead(conv, userId) {
  const uid = String(userId);
  for (let i = 0; i < conv.reads.length; i++) {
    if (String(conv.reads[i].user) === uid) {
      conv.reads[i].lastReadAt = new Date();
      return;
    }
  }
  conv.reads.push({ user: userId, lastReadAt: new Date() });
}

function getLastReadAt(conv, userId) {
  const uid = String(userId);
  for (let i = 0; i < conv.reads.length; i++) {
    if (String(conv.reads[i].user) === uid) {
      return conv.reads[i].lastReadAt || new Date(0);
    }
  }
  return new Date(0);
}

async function findAdminUserIdExcluding(excludeId) {
  const adminRole = await Role.findOne({ name: "ADMIN", isDeleted: false }).lean();
  if (!adminRole) return null;
  const q = {
    role: adminRole._id,
    isDeleted: false,
    isLocked: { $ne: true },
  };
  if (excludeId) q._id = { $ne: excludeId };
  const u = await User.findOne(q).select("_id").lean();
  return u ? u._id : null;
}

function formatUserMini(u) {
  if (!u || !u._id) return null;
  const dn = (u.displayName && String(u.displayName).trim()) || "";
  return {
    _id: u._id,
    username: u.username || "",
    displayName: dn || u.username || "Thành viên",
  };
}

/**
 * POST /api/me/conversations
 * { postId } — chat với tác giả bài (bài công khai); hoặc { withAdmin: true } — chat với quản trị viên.
 */
router.post("/", checkLogin, async function (req, res, next) {
  try {
    const postIdRaw = req.body.postId != null ? String(req.body.postId).trim() : "";
    const withAdmin = req.body.withAdmin === true || req.body.withAdmin === "true";

    if (!postIdRaw && !withAdmin) {
      return res.status(400).json({ message: "Gửi postId hoặc withAdmin: true." });
    }
    if (postIdRaw && withAdmin) {
      return res.status(400).json({ message: "Chỉ chọn một: postId hoặc withAdmin." });
    }

    let otherId = null;
    let postId = null;

    if (withAdmin) {
      otherId = await findAdminUserIdExcluding(req.userId);
      if (!otherId) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản quản trị viên." });
      }
      if (String(otherId) === String(req.userId)) {
        return res.status(400).json({ message: "Không thể mở kênh chat quản trị với chính mình." });
      }
    } else {
      if (!mongoose.isValidObjectId(postIdRaw)) {
        return res.status(400).json({ message: "postId không hợp lệ." });
      }
      const post = await Post.findOne(Object.assign({ _id: postIdRaw }, publicApprovedFilter)).lean();
      if (!post) {
        return res.status(404).json({ message: "Không tìm thấy bài viết công khai." });
      }
      const authorId = post.author;
      if (String(authorId) === String(req.userId)) {
        return res.status(400).json({ message: "Bạn là tác giả bài này — không thể chat với chính mình." });
      }
      otherId = authorId;
      postId = post._id;
    }

    const [low, high] = sortPair(req.userId, otherId);

    let conv = await Conversation.findOne({
      participantLow: low,
      participantHigh: high,
      post: postId || null,
    });

    if (!conv) {
      try {
        conv = await Conversation.create({
          participantLow: low,
          participantHigh: high,
          post: postId,
          lastMessageAt: new Date(0),
          lastMessagePreview: "",
          reads: [],
        });
      } catch (e) {
        const msg = String(e.message || e);
        if (msg.indexOf("duplicate") !== -1 || msg.indexOf("E11000") !== -1) {
          conv = await Conversation.findOne({
            participantLow: low,
            participantHigh: high,
            post: postId || null,
          });
        } else {
          throw e;
        }
      }
    }

    const populated = await Conversation.findById(conv._id)
      .populate({ path: "post", select: "title" })
      .lean();

    const other = await User.findById(otherId).select("username displayName").lean();
    const unread = await countUnread(conv._id, req.userId, getLastReadAt(populated, req.userId));

    res.json({
      conversation: formatConversationResponse(populated, req.userId, other, unread),
    });
  } catch (err) {
    next(err);
  }
});

function formatConversationResponse(conv, meId, otherUser, unreadCount) {
  const oid = otherParticipant(conv, meId);
  return {
    _id: conv._id,
    otherUser: formatUserMini(otherUser) || { _id: oid, username: "", displayName: "Thành viên" },
    post: conv.post
      ? { _id: conv.post._id || conv.post, title: conv.post.title || "" }
      : null,
    lastMessageAt: conv.lastMessageAt,
    lastMessagePreview: conv.lastMessagePreview || "",
    unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
    updatedAt: conv.updatedAt,
  };
}

async function countUnread(conversationId, meId, lastReadAt) {
  return Message.countDocuments({
    conversation: conversationId,
    sender: { $ne: meId },
    createdAt: { $gt: lastReadAt },
  });
}

/**
 * GET /api/me/conversations
 */
router.get("/", checkLogin, async function (req, res, next) {
  try {
    const me = req.userId;
    const items = await Conversation.find({
      $or: [{ participantLow: me }, { participantHigh: me }],
    })
      .sort({ lastMessageAt: -1 })
      .populate({ path: "post", select: "title" })
      .lean();

    const out = [];
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      const oid = otherParticipant(c, me);
      if (!oid) continue;
      const other = await User.findById(oid).select("username displayName").lean();
      const lr = getLastReadAt(c, me);
      const unread = await countUnread(c._id, me, lr);
      out.push(formatConversationResponse(c, me, other, unread));
    }

    res.json({ conversations: out });
  } catch (err) {
    next(err);
  }
});

function messagePreview(text, imageUrl) {
  const t = String(text || "").trim();
  if (imageUrl && !t) return "Ảnh";
  if (imageUrl && t) {
    var prefix = "Ảnh · ";
    var max = 160 - prefix.length;
    if (max < 8) max = 8;
    return t.length > max ? prefix + t.slice(0, max) + "…" : prefix + t;
  }
  return t.length > 160 ? t.slice(0, 160) + "…" : t;
}

async function loadConversationForMember(convId, userId) {
  if (!mongoose.isValidObjectId(convId)) return null;
  const c = await Conversation.findById(convId).lean();
  if (!c) return null;
  const me = String(userId);
  if (String(c.participantLow) !== me && String(c.participantHigh) !== me) {
    return null;
  }
  return c;
}

/**
 * GET /api/me/conversations/:id/messages?page=&limit=
 */
router.get("/:id/messages", checkLogin, async function (req, res, next) {
  try {
    const convId = req.params.id;
    const c = await loadConversationForMember(convId, req.userId);
    if (!c) {
      return res.status(404).json({ message: "Không tìm thấy hội thoại." });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Message.find({ conversation: convId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "sender", select: "username displayName" })
        .lean(),
      Message.countDocuments({ conversation: convId }),
    ]);

    const messages = items.reverse().map(function (m) {
      var sid = (m.sender && m.sender._id) || m.sender;
      return {
        _id: m._id,
        body: m.body,
        imageUrl: m.imageUrl || null,
        createdAt: m.createdAt,
        sender: formatUserMini(m.sender) || { _id: sid, displayName: "Thành viên" },
        isMine: String(sid) === String(req.userId),
      };
    });

    res.json({
      messages: messages,
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
 * POST /api/me/conversations/:id/messages
 * JSON: { body } — chỉ chữ (body bắt buộc).
 * multipart/form-data: body (tùy chọn) + image (file ảnh) — cần ít nhất chữ hoặc ảnh.
 */
router.post("/:id/messages", checkLogin, uploadMessageImageIfMultipart, async function (req, res, next) {
  try {
    const convId = req.params.id;
    const conv = await Conversation.findById(convId);
    if (!conv) {
      return res.status(404).json({ message: "Không tìm thấy hội thoại." });
    }
    const me = String(req.userId);
    if (String(conv.participantLow) !== me && String(conv.participantHigh) !== me) {
      return res.status(403).json({ message: "Bạn không tham gia hội thoại này." });
    }

    const isMultipart = String(req.headers["content-type"] || "").indexOf("multipart/form-data") !== -1;
    const text = String(req.body.body != null ? req.body.body : "").trim();
    var imageUrl = null;
    if (req.file && req.file.filename) {
      imageUrl = publicUrlForFilename(req.file.filename);
    }

    if (isMultipart) {
      if (!text && !imageUrl) {
        return res.status(400).json({ message: "Cần nội dung chữ hoặc ảnh." });
      }
    } else {
      if (!text) {
        return res.status(400).json({ message: "Nội dung tin nhắn không được để trống." });
      }
    }

    if (text.length > 4000) {
      return res.status(400).json({ message: "Tối đa 4000 ký tự." });
    }

    const msg = await Message.create({
      conversation: conv._id,
      sender: req.userId,
      body: text,
      imageUrl: imageUrl || null,
    });

    const preview = messagePreview(text, imageUrl);
    conv.lastMessageAt = msg.createdAt || new Date();
    conv.lastMessagePreview = preview;
    conv.lastMessageSender = req.userId;
    upsertRead(conv, req.userId);
    await conv.save();

    const populated = await Message.findById(msg._id)
      .populate({ path: "sender", select: "username displayName" })
      .lean();

    res.status(201).json({
      message: {
        _id: populated._id,
        body: populated.body,
        imageUrl: populated.imageUrl || null,
        createdAt: populated.createdAt,
        sender: formatUserMini(populated.sender),
        isMine: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/me/conversations/:id/read
 */
router.post("/:id/read", checkLogin, async function (req, res, next) {
  try {
    const convId = req.params.id;
    const conv = await Conversation.findById(convId);
    if (!conv) {
      return res.status(404).json({ message: "Không tìm thấy hội thoại." });
    }
    const me = String(req.userId);
    if (String(conv.participantLow) !== me && String(conv.participantHigh) !== me) {
      return res.status(403).json({ message: "Bạn không tham gia hội thoại này." });
    }
    upsertRead(conv, req.userId);
    await conv.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/me/conversations/:id
 */
router.get("/:id", checkLogin, async function (req, res, next) {
  try {
    const convId = req.params.id;
    const c = await loadConversationForMember(convId, req.userId);
    if (!c) {
      return res.status(404).json({ message: "Không tìm thấy hội thoại." });
    }

    const populated = await Conversation.findById(convId)
      .populate({ path: "post", select: "title" })
      .lean();

    const oid = otherParticipant(populated, req.userId);
    const other = await User.findById(oid).select("username displayName").lean();
    const lr = getLastReadAt(populated, req.userId);
    const unread = await countUnread(populated._id, req.userId, lr);

    res.json(formatConversationResponse(populated, req.userId, other, unread));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
