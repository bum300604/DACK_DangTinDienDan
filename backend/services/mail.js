const nodemailer = require("nodemailer");

function getAppName() {
  return String(process.env.APP_NAME || "DienDanWeb").trim() || "DienDanWeb";
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
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
    console.warn(
      "[" + appName + "] SMTP_HOST chưa cấu hình — OTP gửi tới",
      toEmail,
      ":",
      plainOtp
    );
    return { ok: true, skipped: true };
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
