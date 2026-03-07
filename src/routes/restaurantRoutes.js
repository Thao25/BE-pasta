const express = require("express");
const router = express.Router();
const {
  getRestaurantInfo,
  updateRestaurantConfig,
} = require("../controllers/restaurantController");

// GET /api/restaurant -> Lấy thông tin
// PUT /api/restaurant -> Cập nhật
router.route("/").get(getRestaurantInfo);
router.route("/").put(updateRestaurantConfig);

module.exports = router;
