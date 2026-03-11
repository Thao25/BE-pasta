const Restaurant = require("../models/restaurant");

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

    res.json({ message: 0, data: restaurant });
  } catch (error) {
    res.status(500).json({ message: 1, error: error.message });
  }
};

// @desc    Cập nhật thông tin quán
// @route   PUT /api/restaurant
// @access  Private (Chỉ Admin mới được sửa)
const updateRestaurantConfig = async (req, res) => {
  try {
    const updateData = req.body;

    // Tìm bản ghi đầu tiên và cập nhật nội dung mới
    // upsert: true -> Nếu database hoàn toàn trống thì nó sẽ tạo mới
    const restaurant = await Restaurant.findOneAndUpdate({}, updateData, {
      new: true,
      upsert: true,
      runValidators: true,
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
