const Restaurant = require("../models/restaurant");
const Food = require("../models/Food");
const Table = require("../models/table");
const redisClient = require("../redis/redisClient");
const CACHE_KEYS = require("../redis/cacheKeys");
// @desc    Lấy thông tin cấu hình nhà hàng
// @route   GET /api/restaurant
// @access  Public
const getRestaurantInfo = async (req, res) => {
  try {
    // Luôn lấy bản ghi đầu tiên trong Database
    let restaurant = await Restaurant.findOne();

    // Lần đầu hệ thống chạy, nếu chưa có data thì tự tạo 1 bản ghi mặc định
    if (!restaurant) {
      restaurant = await Restaurant.create({
        TenNhaHang: "Nhà Hàng Pasta",
        DiaChi: "Hà Nội, Việt Nam",
        ToaDo: { Lat: 21.028511, Lng: 105.854165 }, // Mặc định ở HN
        CauHinh: {
          PhanTramVAT: 0,
          BanKinhChoPhep: 100,
          WifiPassword: "Chưa cập nhật",
        },
      });
    }
    const activeCategories = await Food.distinct("LoaiMon");
    const activeAreas = await Table.distinct("KhuVuc");

    res.json({
      message: 0,
      data: {
        ...restaurant.toObject(),
        KhuVucDangDung: activeAreas,
        LoaiMonDangDung: activeCategories,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 1, error: error.message });
  }
};

// @desc    Cập nhật thông tin quán
// @route   PUT /api/restaurant
// @access  Private (Chỉ Admin mới được sửa)
const updateRestaurantConfig = async (req, res) => {
  try {
    const { TrangThaiHoatDong, KieuDongCua, ...otherData } = req.body;

    let updatePayload = { ...otherData };

    // Nếu có yêu cầu thay đổi trạng thái hoạt động (Đóng cửa)
    if (TrangThaiHoatDong === false) {
      updatePayload.TrangThaiHoatDong = false;
      const now = new Date();

      switch (KieuDongCua) {
        case "30p":
          updatePayload.TamNgungDen = new Date(now.getTime() + 30 * 60000);
          break;
        case "1h":
          updatePayload.TamNgungDen = new Date(now.getTime() + 60 * 60000);
          break;

        case "Today":
          // Đóng đến giờ mở cửa ngày mai
          const restaurant = await Restaurant.findOne();
          const gioMoCua = restaurant.CauHinh.GioMoCua || "08:00";
          const [hours, minutes] = gioMoCua.split(":");

          let reopenTime = new Date();
          reopenTime.setDate(reopenTime.getDate() + 1);
          reopenTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          updatePayload.TamNgungDen = reopenTime;
          break;
        default:
          // Đóng thủ công (không có thời gian mở lại tự động)
          updatePayload.TamNgungDen = null;
      }
    } else if (TrangThaiHoatDong === true) {
      updatePayload.TrangThaiHoatDong = true;
      updatePayload.TamNgungDen = null;
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      {},
      { $set: updatePayload },
      { new: true, upsert: true, runValidators: true },
    );
    // CLEAR CACHE
    await redisClient.del(CACHE_KEYS.RESTAURANT_INFO);
    await redisClient.del(CACHE_KEYS.RESTAURANT_ALL);

    const aiKeys = await redisClient.keys("ai:chat:*");

    if (aiKeys.length > 0) {
      await redisClient.del(aiKeys);
    }

    if (global.io)
      global.io.emit("restaurant_status_changed", {
        isOpen: restaurant.TrangThaiHoatDong,
        reopenAt: restaurant.TamNgungDen,
      });

    res.json({ message: 0, data: restaurant });
  } catch (error) {
    res.status(400).json({ message: 1, error: error.message });
  }
};
module.exports = {
  getRestaurantInfo,
  updateRestaurantConfig,
};
