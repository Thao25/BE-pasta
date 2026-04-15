const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    KhachHangZaloId: { type: String, required: true, index: true },
    OrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    }, // Liên kết với đơn hàng
    Title: { type: String, required: true },
    Message: { type: String, required: true },
    Type: {
      type: String,
      enum: ["CANCEL", "STATUS", "UPDATE", "SERVICE"],
      default: "UPDATE",
    },
    IsRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "Notification",
  NotificationSchema,
  "Notification",
);
