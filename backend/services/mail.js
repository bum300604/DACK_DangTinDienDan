const nodemailer = require("nodemailer");

function getAppName() {
  return String(process.env.APP_NAME || "DienDanWeb").trim() || "DienDanWeb";
}

function isConsoleOtpDevMode() {
  const v = process.env.SMTP_CONSOLE_OTP;
  return String(v || "").toLowerCase() === "true" || v === "1";
}

function createTransport() {
  const host = String(process.env.SMTP_HOST || "").trim();
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const hasAuth = process.env.SMTP_USER && process.env.SMTP_PASS;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: hasAuth
      ? {
          user: String(process.env.SMTP_USER).trim(),
          pass: String(process.env.SMTP_PASS).trim(),
        }
      : undefined,
    /** Cổng 587 (STARTTLS) — tránh lỗi kết nối với một số máy chủ SMTP. */
    requireTLS: !secure && port === 587,
  });
}

/**
 * Gửi mã OTP đặt lại mật khẩu.
 * @returns {{ ok: boolean, skipped?: boolean, error?: string }}
 */
async function sendPasswordResetOtp(toEmail, plainOtp) {
  const appName = getAppName();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@localhost";
  const subject = appName + " — Mã xác nhận đặt lại mật khẩu";
  const text =
    "Xin chào,\n\n" +
    "Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu trên " +
    appName +
    ".\n" +
    "Mã OTP của bạn: " +
    plainOtp +
    "\n\n" +
    "Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.\n\n" +
    "— " +
    appName;

  const transporter = createTransport();
  if (!transporter) {
    if (isConsoleOtpDevMode()) {
      console.warn(
        "[" + appName + "] SMTP_CONSOLE_OTP — không gửi email, OTP cho",
        toEmail,
        ":",
        plainOtp
      );
      return { ok: true, skipped: true };
    }
    return {
      ok: false,
      error:
        "Chưa cấu hình gửi email (SMTP_HOST trong .env). Thêm SMTP_HOST, SMTP_USER, SMTP_PASS (Gmail cần mật khẩu ứng dụng).",
    };
  }

  try {
    await transporter.sendMail({
      from: '"' + appName + '" <' + from + ">",
      to: toEmail,
      subject,
      text,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

module.exports = {
  getAppName,
  sendPasswordResetOtp,
};
