// import { Redis } from '@upstash/redis'
const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

redisClient.on("error", (err) => {
  console.log("Redis Error:", err);
});

(async () => {
  await redisClient.connect();
  console.log("Redis Connected");
})();

module.exports = redisClient;
