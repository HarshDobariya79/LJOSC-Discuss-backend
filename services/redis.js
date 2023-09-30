const Redis = require("ioredis");

const { REDIS_HOST, REDIS_PORT } = process.env;

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

// Event handler for successful connection
redis.on("connect", () => {
  console.log("Connected to Redis server");
});

// Event handler for errors
redis.on("error", (err) => {
  console.error("Error connecting to Redis:", err);
});

module.exports = redis;
