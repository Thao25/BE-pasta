const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");

// GET /api/orders -> Lấy danh sách (Bếp/Thu ngân dùng)
router.route("/").get(getOrders);

// POST /api/orders -> Tạo đơn (Khách dùng)
router.route("/").post(createOrder);

// GET /api/orders/:id -> Xem chi tiết
router.route("/:id").get(getOrderById);

// PUT /api/orders/:id -> Cập nhật trạng thái/Thanh toán
router.route("/:id").put(updateOrderStatus);

module.exports = router;
