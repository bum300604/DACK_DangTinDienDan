const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    /** URL ảnh đính kèm (tĩnh dưới /uploads/message-images/). */
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 512,
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("message", messageSchema);
