const crypto = require("crypto");
const bcrypt = require("bcrypt");
const userController = require("../controllers/users");
const PasswordResetOtp = require("../models/passwordResetOtp");
const { sendPasswordResetOtp } = require("./mail");

const OTP_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function generateSixDigitOtp() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

const GENERIC_FORGOT_MSG =
  "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mã OTP (hiệu lực 10 phút).";

/**
 * Xóa OTP cũ, tạo OTP mới, gửi email.
 */
async function requestPasswordReset(emailRaw) {
  const email = normalizeEmail(emailRaw);
  const user = await userController.findByEmail(email);

  if (!user || user.isLocked) {
    return { ok: true, message: GENERIC_FORGOT_MSG };
  }

  await PasswordResetOtp.deleteMany({ email });

  const plainOtp = generateSixDigitOtp();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(plainOtp, salt);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await PasswordResetOtp.create({ email, otpHash, expiresAt });

  const sent = await sendPasswordResetOtp(email, plainOtp);
  if (!sent.ok) {
    await PasswordResetOtp.deleteMany({ email });
    return {
      ok: false,
      status: 502,
      message: `Không gửi được email: ${sent.error || "lỗi không xác định"}.`,
    };
  }

  return { ok: true, message: GENERIC_FORGOT_MSG };
}

/**
 * Xác minh OTP và đặt mật khẩu mới.
 */
async function confirmPasswordResetWithOtp(emailRaw, otpRaw, newPassword) {
  const email = normalizeEmail(emailRaw);
  const otp = String(otpRaw || "").trim();

  const user = await userController.findByEmail(email);
  if (!user || user.isLocked) {
    return { ok: false, status: 400, message: "Mã OTP không đúng hoặc đã hết hạn." };
  }

  const record = await PasswordResetOtp.findOne({ email }).sort({ createdAt: -1 });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 400, message: "Mã OTP không đúng hoặc đã hết hạn." };
  }

  let match = false;
  try {
    match = await bcrypt.compare(otp, record.otpHash);
  } catch (e) {
    match = false;
  }
  if (!match) {
    return { ok: false, status: 400, message: "Mã OTP không đúng hoặc đã hết hạn." };
  }

  const result = await userController.setPassword(user._id, newPassword);
  if (!result.ok) {
    return { ok: false, status: result.status || 400, message: result.message };
  }

  await PasswordResetOtp.deleteMany({ email });
  return { ok: true, message: "Đã đặt lại mật khẩu thành công." };
}

module.exports = {
  requestPasswordReset,
  confirmPasswordResetWithOtp,
  normalizeEmail,
};
