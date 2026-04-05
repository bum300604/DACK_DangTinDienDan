const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên chuyên mục là bắt buộc"],
      unique: true,
      trim: true,
      maxlength: 120,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("category", categorySchema);
