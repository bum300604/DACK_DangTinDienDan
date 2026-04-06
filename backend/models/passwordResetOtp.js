const mongoose = require("mongoose");

const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("passwordResetOtp", passwordResetOtpSchema);
