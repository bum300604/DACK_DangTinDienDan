const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participantLow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    participantHigh: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    /** Bối cảnh bài viết (null = chat chung / quản trị). */
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      default: "",
      maxlength: 200,
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    reads: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        lastReadAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

conversationSchema.index(
  { participantLow: 1, participantHigh: 1, post: 1 },
  { unique: true }
);

module.exports = mongoose.model("conversation", conversationSchema);
