const redisClient = require("../redis/redisClient");
const CACHE_KEYS = require("../redis/cacheKeys");

const cacheMiddleware = (key, ttl = 300) => {
  return async (req, res, next) => {
    try {
      const cacheData = await redisClient.get(key);

      if (cacheData) {
        const parsedData = JSON.parse(cacheData);

        // 🌟 CHỈ KÍCH HOẠT LOGIC NÀY NẾU ĐÚNG LÀ KEY CỦA RESTAURANT
        if (key === CACHE_KEYS.RESTAURANT_INFO) {
          if (
            parsedData?.data &&
            parsedData.data.TrangThaiHoatDong === false &&
            parsedData.data.TamNgungDen
          ) {
            const reopenTime = new Date(parsedData.data.TamNgungDen);
            if (new Date() >= reopenTime) {
              console.log("CACHE EXPIRED DUE TO AUTO-REOPEN TIME:", key);
              await redisClient.del(key);
              return next();
            }
          }
        }

        console.log("CACHE HIT 🚀", key);
        return res.json(parsedData);
      }

      console.log("CACHE MISS 👥", key);

      const originalJson = res.json;
      res.json = function (body) {
        if (res.statusCode === 200 && body && body.message === 0) {
          redisClient
            .setEx(key, ttl, JSON.stringify(body))
            .catch((err) => console.error("CACHE SAVE ERROR:", err));
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error("CACHE SYSTEM ERROR:", key, error);
      next();
    }
  };
};

module.exports = cacheMiddleware;
