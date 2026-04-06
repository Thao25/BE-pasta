const express = require("express");
const router = express.Router();
const {
  getTables,
  getTableById,
  createTable,
  updateTableInfo,
  updateTableStatus,
  resetTableCall,
  getCallingTables,
} = require("../controllers/tableController");

// GET /api/tables/calling -> Lấy danh sách bàn đang gọi nhân viên
router.route("/calling").get(getCallingTables);

// GET /api/tables -> Lấy danh sách
router.route("/").get(getTables);

// GET /api/tables/:id -> Lấy thông tin bàn theo ID
router.route("/:id").get(getTableById);

// POST /api/tables -> Tạo bàn mới
router.route("/").post(createTable);

// PUT /api/tables/:id -> Cập nhật thông tin bàn
router.route("/:id").put(updateTableInfo);

// PUT /api/tables/status/:id -> Cập nhật trạng thái bàn
router.route("/status/:id").put(updateTableStatus);

// PUT /api/tables/:id/reset-call -> Reset trạng thái gọi nhân viên
router.route("/:id/reset-call").put(resetTableCall);

module.exports = router;
