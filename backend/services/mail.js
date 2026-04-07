const nodemailer = require("nodemailer");

function getAppName() {
  return String(process.env.APP_NAME || "DienDanWeb").trim() || "DienDanWeb";
}

function isConsoleOtpDevMode() {
  const v = process.env.SMTP_CONSOLE_OTP;
  return String(v || "").toLowerCase() === "true" || v === "1";
}

function numEnv(name, defaultVal) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
}

function createTransport() {
  const host = String(process.env.SMTP_HOST || "").trim();
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const hasAuth = process.env.SMTP_USER && process.env.SMTP_PASS;
  /** Mặc định Nodemailer chờ kết nối rất lâu — trên host bị chặn cổng SMTP request sẽ “đơ” không trả JSON. */
  const connectionTimeout = numEnv("SMTP_CONNECTION_TIMEOUT_MS", 20_000);
  const greetingTimeout = numEnv("SMTP_GREETING_TIMEOUT_MS", 20_000);
  const socketTimeout = numEnv("SMTP_SOCKET_TIMEOUT_MS", 30_000);
  const requireTls =
    !secure &&
    port === 587 &&
    String(process.env.SMTP_REQUIRE_TLS || "true").toLowerCase() !== "false";

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
    requireTLS: requireTls,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
  });
}

/**
 * Promise.race với hủy timer khi sendMail xong sớm; đóng transport để cắt socket treo.
 */
async function sendMailWithDeadline(transporter, mailOptions, deadlineMs) {
  let timer;
  const sendPromise = transporter.sendMail(mailOptions);
  const deadline = new Promise(function (_, reject) {
    timer = setTimeout(function () {
      reject(
        new Error(
          "Gửi email quá thời gian (" +
            Math.round(deadlineMs / 1000) +
            "s). Kiểm tra SMTP, firewall (cổng 587 hoặc 465), DNS; hoặc tăng SMTP_SEND_TIMEOUT_MS."
        )
      );
    }, deadlineMs);
  });
  try {
    return await Promise.race([sendPromise, deadline]);
  } finally {
    clearTimeout(timer);
    try {
      transporter.close();
    } catch (e) {
      /* ignore */
    }
    /** Tránh unhandled rejection khi timeout trước nhưng sendMail kết thúc sau. */
    sendPromise.catch(function () {});
  }
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

  const deadlineMs = numEnv("SMTP_SEND_TIMEOUT_MS", 45_000);

  try {
    await sendMailWithDeadline(
      transporter,
      {
        from: '"' + appName + '" <' + from + ">",
        to: toEmail,
        subject,
        text,
      },
      deadlineMs
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

module.exports = {
  getAppName,
  sendPasswordResetOtp,
};
