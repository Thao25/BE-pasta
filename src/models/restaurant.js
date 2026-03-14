const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    TenNhaHang: {
      type: String,
      required: true,
      default: "Nhà hàng Pasta",
    },
    DiaChi: {
      type: String,
      required: true,
    },
    ToaDo: {
      Lat: { type: Number, required: true },
      Lng: { type: Number, required: true },
    },
    CauHinh: {
      PhanTramVAT: { type: Number, default: 0 }, // Ví dụ 0.08 = 8%
      BanKinhChoPhep: { type: Number, default: 50 }, // Đơn vị: mét
      WifiPassword: { type: String, default: "" },
      GioMoCua: { type: String, default: "08:00" },
      GioDongCua: { type: String, default: "22:00" },
    },
    // THÊM: Thời điểm tự động mở cửa lại
    TamNgungDen: {
      type: Date,
      default: null,
    },

    ThongTinNganHang: {
      BankId: { type: String, default: "" },
      AccountNo: { type: String, default: "" },
      AccountName: { type: String, default: "" },
    },
    DanhSachKhuVuc: {
      type: [String],
      default: ["Tầng 1", "Tầng 2", "Sân Vườn", "Phòng VIP", "Ban Công"],
    },
    DanhSachLoaiMon: {
      type: [String],
      default: ["Món Chính", "Đồ Uống", "Tráng Miệng", "Ăn Vặt", "Khác"],
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;
