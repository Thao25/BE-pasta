const express = require("express");
const router = express.Router();
const {
  getTables,
  getTableById,
  createTable,
  updateTableInfo,
  updateTableStatus,
} = require("../controllers/tableController");

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

module.exports = router;
