const redisClient = require("../redis/redisClient");

const cacheMiddleware = (key, ttl = 300) => {
  return async (req, res, next) => {
    try {
      const cacheData = await redisClient.get(key);

      if (cacheData) {
        console.log("CACHE HIT");

        return res.json(JSON.parse(cacheData));
      }

      console.log("CACHE MISS");

      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        await redisClient.set(key, JSON.stringify(body), {
          EX: ttl,
        });

        originalJson(body);
      };

      next();
    } catch (error) {
      console.log(error);
      next();
    }
  };
};

module.exports = cacheMiddleware;
