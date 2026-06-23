const { redis } = require('../config/redis');

const get = async (key) => {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`[cache:get] ${key}: ${error.message}`);
    return null;
  }
};

const set = async (key, value, ttlSeconds = 60) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (error) {
    console.error(`[cache:set] ${key}: ${error.message}`);
    return false;
  }
};

const del = async (key) => {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`[cache:del] ${key}: ${error.message}`);
    return false;
  }
};

const delPattern = async (pattern) => {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length) await redis.del(keys);
    } while (cursor !== '0');
    return true;
  } catch (error) {
    console.error(`[cache:delPattern] ${pattern}: ${error.message}`);
    return false;
  }
};

const getOrSet = async (key, ttlSeconds, fn) => {
  const cached = await get(key);
  if (cached !== null) return cached;

  const value = await fn();
  await set(key, value, ttlSeconds);
  return value;
};

module.exports = {
  get,
  set,
  del,
  delPattern,
  getOrSet,
};
