const express = require("express");
const router = express.Router();
const {
  getRestaurantInfo,
  updateRestaurantConfig,
} = require("../controllers/restaurantController");
const cacheMiddleware = require("../middlewares/cacheMiddleware");

const CACHE_KEYS = require("../redis/cacheKeys");

// GET /api/restaurant -> Lấy thông tin
// PUT /api/restaurant -> Cập nhật
router
  .route("/")
  .get(cacheMiddleware(CACHE_KEYS.RESTAURANT_INFO, 3600), getRestaurantInfo);
router.route("/").put(updateRestaurantConfig);

module.exports = router;
