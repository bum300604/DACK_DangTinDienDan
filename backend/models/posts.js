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
    /** Ghi chú khi từ chối (chỉ có nghĩa khi status = REJECTED). */
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    /** Admin gỡ khỏi trang công khai (bài vẫn APPROVED, không hiện ở Task 3). */
    hiddenFromPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Ảnh / tệp đính kèm (URL tĩnh dưới /uploads/post-attachments/). */
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          originalName: { type: String, default: "" },
          mimeType: { type: String, default: "" },
          kind: { type: String, enum: ["image", "file"], default: "file" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model("post", postSchema);
