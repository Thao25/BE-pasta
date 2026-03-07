const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  exportDetailedReport,
} = require("../controllers/reportController");

// GET /api/reports/dashboard?timeframe=week
// timeframe hỗ trợ: 'day', 'week', 'month', 'quarter', 'year'
router.get("/dashboard", getDashboardStats);
router.get("/export", exportDetailedReport);
module.exports = router;
