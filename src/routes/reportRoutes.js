const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  exportDetailedReport,
} = require("../controllers/reportController");
const cacheMiddleware = require("../middlewares/cacheMiddleware");

const CACHE_KEYS = require("../redis/cacheKeys");
// GET /api/reports/dashboard?timeframe=week
// timeframe hỗ trợ: 'day', 'week', 'month', 'quarter', 'year'
router.get(
  "/dashboard",
  cacheMiddleware(CACHE_KEYS.DASHBOARD_TODAY, 60),
  getDashboardStats,
);
router.get("/export", exportDetailedReport);
module.exports = router;
