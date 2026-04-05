const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề là bắt buộc"],
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: [true, "Nội dung là bắt buộc"],
      maxlength: 50000,
    },
    /** Tham chiếu bảng category — không lưu tự do chuỗi chuyên mục. */
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model("post", postSchema);
