const express = require("express");
const router = express.Router();
const {
  getFoods,
  createFood,
  getFoodById,
  updateFood,
  updateFoodStatus,
  deleteFood,
} = require("../controllers/foodController");
const cacheMiddleware = require("../middlewares/cacheMiddleware");

const CACHE_KEYS = require("../redis/cacheKeys");

// GET /api/foods -> Lấy danh sách
router.route("/").get(cacheMiddleware(CACHE_KEYS.FOODS_ALL, 300), getFoods);

// POST /api/foods -> Tạo mới
router.route("/").post(createFood);

// PUT /api/foods/:id/status -> Cập nhật trạng thái nhanh
router.route("/:id/status").put(updateFoodStatus);

// GET /api/foods/:id -> Lấy chi tiết
router.route("/:id").get(getFoodById);

// PUT /api/foods/:id -> Cập nhật toàn bộ
router.route("/:id").put(updateFood);

// DELETE /api/foods/:id -> Xóa
router.route("/:id").delete(deleteFood);

module.exports = router;
