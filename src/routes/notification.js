const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notification");

router.get("/:zaloId", getNotifications);
router.put("/read-all/:zaloId", markAllAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
