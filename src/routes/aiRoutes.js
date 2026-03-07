const express = require("express");
const router = express.Router();
const { chatWithAI, recommendFood } = require("../controllers/aiController");

router.post("/chat", chatWithAI);
router.get("/recommend", recommendFood);

module.exports = router;
