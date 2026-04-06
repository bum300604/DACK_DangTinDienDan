/**
 * family: 4 — ưu tiên IPv4 (Atlas trên một số mạng Windows).
 * serverSelectionTimeoutMS — sau khoảng thời gian này mà không chọn được server → lỗi (xem mongoError trên /api/health).
 * socketTimeoutMS: 0 — không đóng socket vì “im lặng” (tránh ngắt kết nối giữa các request).
 * heartbeatFrequencyMS — giữ heartbeat với cluster.
 */
module.exports = {
  serverSelectionTimeoutMS: 30_000,
  connectTimeoutMS: 20_000,
  socketTimeoutMS: 0,
  family: 4,
  heartbeatFrequencyMS: 10_000,
};
