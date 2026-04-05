/**
 * family: 4 — ưu tiên IPv4 (Atlas trên một số mạng Windows).
 * serverSelectionTimeoutMS — sau khoảng thời gian này mà không chọn được server → lỗi (xem mongoError trên /api/health).
 */
module.exports = {
  serverSelectionTimeoutMS: 30_000,
  connectTimeoutMS: 20_000,
  socketTimeoutMS: 45_000,
  family: 4,
};
