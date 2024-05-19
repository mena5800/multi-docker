const keys = require("./keys");
const Redis = require("ioredis");

// Create a new Redis client using ioredis
const redisClient = new Redis({
  host: keys.redisHost,
  port: keys.redisPort,
  retryStrategy: (times) => Math.min(times * 100, 1000),
});

// Duplicate the Redis client for subscription
const sub = new Redis({
  host: keys.redisHost,
  port: keys.redisPort,
  retryStrategy: (times) => Math.min(times * 100, 1000),
});

// Fibonacci function
function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

// Handle incoming messages
sub.on("message", async (channel, message) => {
  const result = fib(parseInt(message));
  await redisClient.hset("values", message, result);
});

// Subscribe to the 'insert' channel
sub.subscribe("insert");

// Error handling (optional but recommended)
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

sub.on("error", (err) => {
  console.error("Redis Subscriber Error:", err);
});
