/**
 * Bài hiển thị công khai (Task 3–4): đã duyệt và chưa bị admin gỡ.
 */
module.exports = {
  /** Dùng trong Post.find / exists / findOne */
  publicApprovedFilter: {
    status: "APPROVED",
    hiddenFromPublic: { $ne: true },
  },
};
