const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    SoBan: { type: String, required: true },
    KhuVuc: { type: String },
    MaQR: { type: String, unique: true },

    TrangThai: {
      type: String,
      enum: ["Trống", "Có Khách", "Chờ thanh toán"],
      default: "Trống",
    },
    ThoiGianCho: {
      type: Date,
      default: null,
    },
    // Liên kết đến đơn hàng đang mở (nếu có)
    OrderHienTaiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Table = mongoose.model("Table", tableSchema);
module.exports = Table;
