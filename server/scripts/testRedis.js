require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { redis, redisPub, redisSub } = require('../config/redis');
const cache = require('../services/cacheService');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  // Give ioredis a moment to connect
  await sleep(500);

  // 1. Basic ping
  const pong = await redis.ping();
  if (pong !== 'PONG') throw new Error(`Expected PONG, got ${pong}`);
  console.log('✅ Redis connection: OK');

  // 2. cacheService.set / get
  await cache.set('test:hello', { message: 'CreatorSync cache works!' }, 10);
  const value = await cache.get('test:hello');
  if (!value || value.message !== 'CreatorSync cache works!') {
    throw new Error(`Cache get returned unexpected value: ${JSON.stringify(value)}`);
  }
  console.log('✅ cacheService.set / get: OK');

  // 3. cacheService.del
  await cache.del('test:hello');
  const deleted = await cache.get('test:hello');
  if (deleted !== null) throw new Error('Expected null after del');
  console.log('✅ cacheService.del: OK');

  // 4. cacheService.delPattern
  await cache.set('test:pattern:a', 1, 10);
  await cache.set('test:pattern:b', 2, 10);
  await cache.delPattern('test:pattern:*');
  const a = await cache.get('test:pattern:a');
  const b = await cache.get('test:pattern:b');
  if (a !== null || b !== null) throw new Error('delPattern did not clear all keys');
  console.log('✅ cacheService.delPattern: OK');

  // 5. cacheService.getOrSet
  let called = 0;
  const result1 = await cache.getOrSet('test:getorset', 10, async () => { called++; return { val: 42 }; });
  const result2 = await cache.getOrSet('test:getorset', 10, async () => { called++; return { val: 99 }; });
  if (result1.val !== 42 || result2.val !== 42 || called !== 1) {
    throw new Error(`getOrSet failed: fn called ${called} times, result=${JSON.stringify(result2)}`);
  }
  await cache.del('test:getorset');
  console.log('✅ cacheService.getOrSet: OK');

  // 6. Pub/Sub round-trip
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Pub/Sub timed out after 3s')), 3000);
    redisSub.subscribe('test:pubsub:channel').then(() => {
      redisSub.once('message', (ch, msg) => {
        clearTimeout(timeout);
        if (ch !== 'test:pubsub:channel' || msg !== 'hello-pubsub') {
          return reject(new Error(`Unexpected pub/sub message: ch=${ch} msg=${msg}`));
        }
        redisSub.unsubscribe('test:pubsub:channel').then(resolve);
      });
      redisPub.publish('test:pubsub:channel', 'hello-pubsub');
    }).catch(reject);
  });
  console.log('✅ Redis Pub/Sub: OK');

  console.log('\n🎉 All Redis cache layer checks passed!');
  process.exit(0);
};

run().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
