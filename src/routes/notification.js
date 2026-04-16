const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getNotificationsForStaff,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controllers/notification");

router.get("/:zaloId", getNotifications);
router.get("/staff", getNotificationsForStaff);
router.put("/read-all/:zaloId", markAllAsRead);
router.delete("/:id", deleteNotification);
router.delete("/clear-all/:zaloId", clearAllNotifications);

module.exports = router;
