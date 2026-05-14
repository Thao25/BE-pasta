const crypto = require("crypto");
function createChatCacheKey(message, zaloId) {
  const normalizedMessage = (message || "").trim().toLowerCase();

  const hash = crypto.createHash("md5").update(normalizedMessage).digest("hex");

  return `ai:chat:${zaloId || "guest"}:${hash}`;
}
function getTimeBucket() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) return "morning";

  if (hour >= 11 && hour < 14) return "noon";

  if (hour >= 14 && hour < 18) return "afternoon";

  return "night";
}
function createRecommendCacheKey(zaloId) {
  const bucket = getTimeBucket();

  return `ai:recommend:${zaloId || "guest"}:${bucket}`;
}
module.exports = {
  FOODS_ALL: "foods:all",
  DASHBOARD_TODAY: "dashboard:today",
  RESTAURANT_INFO: "restaurant:info",
  RESTAURANT_ALL: "restaurant:all",
  FOODS_RECOMMEND: "foods:recommend",
  AI_CHAT: createChatCacheKey,

  AI_RECOMMEND: createRecommendCacheKey,
};
