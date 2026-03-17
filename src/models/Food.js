const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    TenMon: {
      vi: { type: String, required: true },
      en: { type: String, required: true },
    },
    MoTa: {
      vi: { type: String },
      en: { type: String },
    },
    Gia: { type: Number, required: true, min: 0 },
    AnhMinhHoa: { type: String },
    LoaiMon: {
      type: String,
    },
    Tags: [{ type: String }], // ["ngot", "lanh", "ca-phe"]

    // Cấu hình Option (Size, Topping, Đường, Đá..)
    TuyChon: [
      {
        TenNhom: {
          vi: { type: String },
          en: { type: String },
        },
        BatBuoc: { type: Boolean, default: false },
        LuaChon: [
          {
            Ten: { type: String, required: true },
            GiaThem: { type: Number, default: 0 },
          },
        ],
      },
    ],

    TrangThai: {
      type: String,
      enum: ["DangBan", "HetHang", "TamNgung"],
      default: "DangBan",
    },
    KhuVucCheBien: {
      type: String,
      enum: ["Bep", "Bar"],
      default: "Bep",
    },
  },
  {
    timestamps: true,
  },
);

const Food = mongoose.model("Food", foodSchema);
module.exports = Food;
