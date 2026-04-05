/**
 * Thêm vài bài viết đã duyệt để kiểm tra trang danh sách / đọc bài (Task 3).
 * Chạy sau seed:roles và seed:admin (cần ít nhất một user trong DB).
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { requireMongoUri } = require("../config/mongoUri");
const mongoConnectOptions = require("../config/mongoConnectOptions");
const userModel = require("../models/users");
const Category = require("../models/categories");
const Post = require("../models/posts");
const { ensureDefaultForumCategories } = require("../utils/forumCategorySetup");

const SAMPLES = [
  {
    title: "Bán laptop cũ dùng văn phòng, còn tốt",
    category: "Điện tử",
    content:
      "Mình cần bán chiếc laptop đời 2019, RAM 8GB, SSD 256GB. Máy dùng ổn định, pin còn khoảng 3 giờ.\n\nAi cần xem máy trực tiếp inbox nhé. Giá thương lượng nhẹ.",
  },
  {
    title: "Tuyển nhân viên bán hàng ca chiều — TP.HCM",
    category: "Việc làm",
    content:
      "Cửa hàng đang tuyển 2 bạn làm ca chiều (13h–21h). Ưu tiên có kinh nghiệm bán lẻ.\n\nLương cơ bản + hoa hồng. Gửi CV qua email trong hồ sơ.",
  },
  {
    title: "Cho thuê phòng trọ gần trường — an ninh tốt",
    category: "Nhà đất",
    content:
      "Phòng 20m2, có gác, wifi, điều hòa. Giờ giấc tự do, giữ xe trong nhà.\n\nHợp đồng tối thiểu 6 tháng. Liên hệ xem phòng cuối tuần.",
  },
  {
    title: "Xe máy tay ga 125cc — đi ít, bảo dưỡng định kỳ",
    category: "Xe cộ",
    content:
      "Bán xe tay ga đi làm hàng ngày, odo thật. Giấy tờ đầy đủ, sang tên trong ngày.\n\nXem xe tại Q.12, vui lòng báo trước.",
  },
  {
    title: "Dịch vụ sửa điện nước tại nhà — phản hồi nhanh",
    category: "Dịch vụ",
    content:
      "Nhận sửa chữa nhỏ: điện, nước, thiết bị vệ sinh. Có mặt trong 60 phút nội thành.\n\nBáo giá trước khi làm — không phát sinh ẩn.",
  },
  {
    title: "Thanh lý đồ gia dụng — chuyển nhà",
    category: "Mua bán",
    content:
      "Mình chuyển nhà nên thanh lý tủ lạnh, máy giặt, bàn ghế. Ai cần chụp hình chi tiết qua Zalo.\n\nƯu tiên lấy cả combo.",
  },
];

async function main() {
  await mongoose.connect(requireMongoUri(), mongoConnectOptions);

  await ensureDefaultForumCategories();

  const author =
    (await userModel.findOne({ isDeleted: false }).sort({ createdAt: 1 })) ||
    (await userModel.findOne({ isDeleted: false }));

  if (!author) {
    console.error("Không có user nào trong DB. Chạy seed:admin hoặc đăng ký tài khoản trước.");
    await mongoose.disconnect();
    process.exit(1);
  }

  let created = 0;
  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i];
    const exists = await Post.findOne({ title: s.title });
    if (exists) continue;
    const catDoc = await Category.findOne({ name: s.category, isDeleted: false });
    if (!catDoc) {
      console.warn("Bỏ qua (không có category):", s.title);
      continue;
    }
    await Post.create({
      title: s.title,
      content: s.content,
      category: catDoc._id,
      status: "APPROVED",
      author: author._id,
    });
    created++;
  }

  console.log("seed:demo-posts — đã thêm", created, "bài (bỏ qua trùng tiêu đề).");
  console.log("  Tác giả mẫu:", author.username, "| id:", String(author._id));

  await mongoose.disconnect();
  console.log("seed:demo-posts done.");
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
