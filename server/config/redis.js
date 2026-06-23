const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const createClient = (name) => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  client.on('error', (error) => {
    console.error(`[redis:${name}] ${error.message}`);
  });

  client.connect().catch((error) => {
    console.error(`[redis:${name}] ${error.message}`);
  });

  return client;
};

const redis = createClient('cache');
const redisPub = createClient('pub');
const redisSub = createClient('sub');

module.exports = {
  REDIS_URL,
  redis,
  redisPub,
  redisSub,
  createRedisClient: createClient,
};
