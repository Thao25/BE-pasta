const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    BanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    KhachHangZaloId: { type: String },

    // Chi tiết các món (Nhúng để tối ưu hiệu năng)
    ChiTietMon: [
      {
        FoodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food" },
        TenMon: {
          // Lưu snapshot tên món lúc đặt (đề phòng menu đổi tên)
          vi: String,
          en: String,
        },
        SoLuong: { type: Number, required: true, min: 1 },
        GiaDonVi: { type: Number, required: true }, // Giá gốc + Giá option

        // Lưu các lựa chọn cụ thể (Ví dụ: Size L, 50% Đường)
        TuyChonDaChon: [
          {
            Ten: String,
            Gia: Number,
          },
        ],

        GhiChu: { type: String },
        TrangThaiMon: {
          type: String,
          enum: ["ChoBep", "DangLam", "DaRaMon", "DaHuy"],
          default: "ChoBep",
        },
      },
    ],

    TongTien: { type: Number, required: true, default: 0 },

    // Trạng thái tổng thể của đơn hàng
    TrangThaiOrder: {
      type: String,
      enum: ["ChoXuLy", "DangCheBien", "DaPhucVu", "HoanTat", "DaHuy"],
      default: "ChoXuLy",
    },

    // Thông tin thanh toán
    ThanhToan: {
      TrangThai: {
        type: String,
        enum: ["ChuaThanhToan", "DaThanhToan"],
        default: "ChuaThanhToan",
      },
      PhuongThuc: {
        type: String,
        enum: ["TienMat", "ChuyenKhoan"],
        default: "TienMat",
      },
      GhiChu: String, // Ví dụ: "CK Techcombank 100k"
      ThoiGian: Date,
      PhanTramVAT: { type: Number },
    },

    NhanVienPhucVu: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
