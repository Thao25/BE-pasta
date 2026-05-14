const redisClient = require("../redis/redisClient");

const cacheMiddleware = (key, ttl = 300) => {
  return async (req, res, next) => {
    try {
      const cacheData = await redisClient.get(key);

      if (cacheData) {
        console.log("CACHE HIT", key);

        return res.json(JSON.parse(cacheData));
      }

      console.log("CACHE MISS", key);

      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        await redisClient.set(key, JSON.stringify(body), {
          EX: ttl,
        });

        originalJson(body);
      };

      next();
    } catch (error) {
      console.log("CACHE ERROR", key, error);
      next();
    }
  };
};

module.exports = cacheMiddleware;
