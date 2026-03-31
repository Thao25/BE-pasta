const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    HoTen: { type: String, required: true },

    // Dành cho Nhân viên
    Username: { type: String, unique: true, sparse: true },
    Password: {
      type: String,
      required: function () {
        return this.Role !== "KhachHang";
      },
    },
    Role: {
      type: String,
      enum: ["QuanLy", "ThuNgan", "PhucVu", "Bep", "Bar", "KhachHang"],
      default: "KhachHang",
    },

    // Dành cho Khách hàng Zalo
    ZaloId: { type: String, unique: true, sparse: true },
    Avatar: { type: String },

    // Dữ liệu phục vụ AI Gợi ý (cho Khách)
    SoThich: {
      MonYeuThich: [{ type: mongoose.Schema.Types.ObjectId, ref: "Food" }],
      LichSuGoiMon: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    },

    // Cấu hình sinh trắc học (cho Nhân viên)
    BaoMat: {
      SuDungVanTay: { type: Boolean, default: false },
      DeviceId: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
module.exports = User;
