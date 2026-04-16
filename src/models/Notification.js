const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    KhachHangZaloId: { type: String, index: true },
    OrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    Title: { type: String, required: true },
    Message: { type: String, required: true },
    Type: {
      type: String,
      enum: ["CANCEL", "STATUS", "UPDATE", "SERVICE"],
      default: "UPDATE",
    },
    isStaff: {
      type: Boolean,

      default: false,
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
