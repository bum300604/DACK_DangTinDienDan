const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["POST", "COMMENT"],
      required: true,
      index: true,
    },
    /** Luôn có — bài bị báo cáo hoặc bài chứa comment bị báo cáo. */
    targetPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
      required: true,
      index: true,
    },
    /** Chỉ khi targetType = COMMENT */
    targetComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    category: {
      type: String,
      enum: ["SPAM", "HARASSMENT", "INAPPROPRIATE", "SCAM", "OTHER"],
      required: true,
    },
    detail: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["PENDING", "RESOLVED", "DISMISSED"],
      default: "PENDING",
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    handledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, targetPost: 1, targetType: 1, targetComment: 1 });

module.exports = mongoose.model("report", reportSchema);
