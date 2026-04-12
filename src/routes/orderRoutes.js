const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderHistory,
  cancelOrder,
  updateStaffOrderStatus,
  serverConfirmServed,
  getOrdersForStaff,
  getOrdersToday,
  cancelOrderItem,
} = require("../controllers/orderController");

// GET /api/orders/staff -> Lấy danh sách đơn hàng cho nhan viên
router.route("/staff").get(getOrdersForStaff);

// GET /api/orders/today -> Lấy danh sách đơn hàng hôm nay
router.get("/today", getOrdersToday);

// GET /api/orders/history/:zaloId -> Lấy lịch sử đơn hàng
router.route("/history/:zaloId").get(getOrderHistory);

// POST /api/orders -> Tạo đơn (Khách dùng)
router.route("/").post(createOrder);

// GET /api/orders -> Lấy danh sách (Bếp/Thu ngân dùng)
router.route("/").get(getOrders);

// GET /api/orders/:id -> Xem chi tiết
router.route("/:id").get(getOrderById);

// PUT /api/orders/:id -> Cập nhật trạng thái/Thanh toán
router.route("/:id").put(updateOrderStatus);

// PUT /api/orders/cancel-item/:orderId -> Hủy món trong đơn hàng
router.route("/cancel-item").patch(cancelOrderItem);

// PUT /api/orders/cancel/:id -> Hủy đơn hàng
router.route("/cancel/:id").put(cancelOrder);

// PUT /api/orders/staff/:orderId -> Cập nhật trạng thái bán cho nhan viên
router.route("/staff/:orderId").put(updateStaffOrderStatus);

// PUT /api/orders/serve/:orderId -> Cập nhật trạng thái bán cho nhan viên

router.route("/serve/:orderId").put(serverConfirmServed);

module.exports = router;
