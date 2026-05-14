const Food = require("../models/Food");
const redisClient = require("../redis/redisClient");

const CACHE_KEYS = require("../redis/cacheKeys");
// @desc    Lấy danh sách tất cả món ăn
// @route   GET /api/foods
async function clearAICache() {
  const chatKeys = await redisClient.keys("ai:chat:*");
  const recommendKeys = await redisClient.keys("ai:recommend:*");

  const allKeys = [...chatKeys, ...recommendKeys];

  if (allKeys.length > 0) {
    await redisClient.del(...allKeys);
  }
}
const getFoods = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};

    if (category) {
      query.LoaiMon = category;
    }

    const foods = await Food.find(query).sort({ createdAt: -1 });
    res.json({ message: 0, data: foods });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// @desc    Tạo món ăn mới (FULL FIELDS)
// @route   POST /api/foods
const createFood = async (req, res) => {
  try {
    const newFood = new Food(req.body);
    const savedFood = await newFood.save();
    await redisClient.del(CACHE_KEYS.FOODS_ALL);
    await clearAICache();
    res.status(201).json({ message: 0, data: savedFood });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Dữ liệu không hợp lệ", error: error.message });
  }
};

// @desc    Lấy chi tiết 1 món ăn
// @route   GET /api/foods/:id
const getFoodById = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (food) {
      res.json({ message: 0, data: food });
    } else {
      res.status(404).json({ message: "Không tìm thấy món ăn" });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Cập nhật toàn bộ món ăn
// @route   PUT /api/foods/:id
const updateFood = async (req, res) => {
  try {
    const updatedFood = await Food.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (updatedFood) {
      await redisClient.del(CACHE_KEYS.FOODS_ALL);

      await clearAICache();

      res.json({ message: 0, data: updatedFood });
    } else {
      res.status(404).json({ message: "Không tìm thấy món ăn" });
    }
  } catch (error) {
    res.status(400).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// @desc    Cập nhật TRẠNG THÁI món ăn nhanh (Đang bán/Hết hàng/Tạm ngưng)
// @route   PUT /api/foods/:id/status
const updateFoodStatus = async (req, res) => {
  try {
    const { TrangThai } = req.body;
    const updatedFood = await Food.findByIdAndUpdate(
      req.params.id,
      { TrangThai },
      { new: true, runValidators: true },
    );

    if (updatedFood) {
      await redisClient.del(CACHE_KEYS.FOODS_ALL);
      await clearAICache();
      res.json({ message: 0, data: updatedFood });
    } else {
      res.status(404).json({ message: "Không tìm thấy món ăn" });
    }
  } catch (error) {
    res
      .status(400)
      .json({ message: "Lỗi cập nhật trạng thái", error: error.message });
  }
};

// @desc    Xóa món ăn (Soft delete)
// @route   DELETE /api/foods/:id
const deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (food) {
      food.TrangThai = "TamNgung";
      await food.save();
      await redisClient.del(CACHE_KEYS.FOODS_ALL);
      await clearAICache();
      res.json({
        message: 0,
        data: { message: "Đã chuyển trạng thái món sang Tạm ngưng" },
      });
    } else {
      res.status(404).json({ message: "Không tìm thấy món ăn" });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getFoods,
  createFood,
  getFoodById,
  updateFood,
  updateFoodStatus,
  deleteFood,
};
