/**
 * Giống DACK_OnlineLearningWEB: MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOSTS
 * hoặc MONGODB_URI. Có thể thêm MONGODB_REPLICA_SET để thay placeholder THAY_REPLICA_SET trong URI.
 */
require("dotenv").config();

function getMongoUri() {
  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASSWORD;
  const hosts = process.env.MONGODB_HOSTS;

  if (user && pass !== undefined && pass !== "" && hosts) {
    const db = process.env.MONGODB_DB || "dangtin_diendan";
    const rs = process.env.MONGODB_REPLICA_SET;
    const params = new URLSearchParams({
      tls: "true",
      authSource: "admin",
      retryWrites: "true",
      w: "majority",
    });
    if (rs) params.set("replicaSet", rs);
    const appName = process.env.MONGODB_APP_NAME;
    if (appName) params.set("appName", appName);

    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hosts}/${db}?${params.toString()}`;
  }

  let uri = process.env.MONGODB_URI;
  if (uri == null || String(uri).trim() === "") {
    return undefined;
  }
  uri = String(uri).trim();

  const rs = process.env.MONGODB_REPLICA_SET;
  if (rs && uri.includes("THAY_REPLICA_SET")) {
    uri = uri.replace(/THAY_REPLICA_SET/g, String(rs).trim());
  }

  return uri;
}

function assertNonSrvUnlessExplicit(uri) {
  if (!uri || !/^mongodb\+srv:\/\//i.test(uri)) return;
  if (process.env.MONGODB_ALLOW_SRV === "true") return;
  console.error(
    "[MongoDB] MONGODB_URI đang dùng mongodb+srv — trên nhiều máy Windows sẽ lỗi querySrv (DNS SRV).\n\n" +
      "Sửa backend/.env: dùng chuỗi mongodb:// với 3 host :27017 (như backend/.env.example).\n" +
      "Atlas → Connect → Drivers → copy \"standard connection\" / chuỗi có shard-00-00, replicaSet=...\n" +
      "Điền MONGODB_REPLICA_SET nếu URI còn placeholder THAY_REPLICA_SET.\n\n" +
      "Chỉ bật lại SRV nếu chắc mạng hỗ trợ: thêm MONGODB_ALLOW_SRV=true vào .env"
  );
  process.exit(1);
}

function warnIfPlaceholder(uri) {
  if (!uri) return;
  if (uri.includes("THAY_REPLICA_SET")) {
    console.warn(
      "[MongoDB] URI vẫn có THAY_REPLICA_SET — điền MONGODB_REPLICA_SET trong .env hoặc sửa trong MONGODB_URI."
    );
  }
  if (uri.includes(":MAT_KHAU@")) {
    console.warn("[MongoDB] URI vẫn dùng MAT_KHAU — thay bằng mật khẩu user database.");
  }
}

function requireMongoUri() {
  const uri = getMongoUri();
  if (!uri) {
    console.error(
      "Thiếu MongoDB: đặt MONGODB_URI hoặc MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOSTS trong backend/.env"
    );
    process.exit(1);
  }
  assertNonSrvUnlessExplicit(uri);
  warnIfPlaceholder(uri);
  return uri;
}

module.exports = { getMongoUri, requireMongoUri };
