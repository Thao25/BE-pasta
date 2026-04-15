const Notification = require("../models/Notification");

// @desc    Lấy danh sách thông báo của khách hàng
// @route   GET /api/notifications/:zaloId
const getNotifications = async (req, res) => {
  try {
    const { zaloId } = req.params;
    const notifications = await Notification.find({ KhachHangZaloId: zaloId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Đánh dấu tất cả thông báo là đã đọc khi khách nhấn vào quả chuông
// @route   PUT /api/notifications/read-all/:zaloId
const markAllAsRead = async (req, res) => {
  try {
    const { zaloId } = req.params;
    await Notification.updateMany(
      { KhachHangZaloId: zaloId, IsRead: false },
      { $set: { IsRead: true } },
    );

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu tất cả là đã đọc",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Xóa một thông báo
// @route   DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getNotifications,
  markAllAsRead,
  deleteNotification,
};
