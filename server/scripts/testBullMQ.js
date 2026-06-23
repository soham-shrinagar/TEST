require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Queue, Worker, QueueEvents } = require('bullmq');
const { REDIS_URL } = require('../config/redis');

const connection = { url: REDIS_URL, maxRetriesPerRequest: null };
const QUEUES = ['instagram', 'analytics', 'recommendations', 'notifications'];
const TIMEOUT_MS = 8000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const testQueue = async (queueName) => {
  const queue = new Queue(queueName, { connection });
  const queueEvents = new QueueEvents(queueName, { connection });

  const worker = new Worker(
    queueName,
    async (job) => {
      return { echo: job.data, worker: queueName };
    },
    { connection },
  );

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out after ${TIMEOUT_MS}ms waiting for job completion`));
    }, TIMEOUT_MS);

    worker.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Worker error: ${err.message}`));
    });

    const job = await queue.add('test-ping', { hello: queueName });

    queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      if (jobId !== job.id) return;
      clearTimeout(timeout);
      const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
      if (!result || result.echo?.hello !== queueName) {
        return reject(new Error(`Unexpected result: ${JSON.stringify(result)}`));
      }
      await worker.close();
      await queueEvents.close();
      await queue.close();
      resolve();
    });

    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      if (jobId !== job.id) return;
      clearTimeout(timeout);
      await worker.close();
      await queueEvents.close();
      await queue.close();
      reject(new Error(`Job failed: ${failedReason}`));
    });
  });
};

(async () => {
  await sleep(500); // let connections settle
  let allPassed = true;

  for (const queueName of QUEUES) {
    try {
      await testQueue(queueName);
      console.log(`✅ Queue "${queueName}": enqueue → worker → complete OK`);
    } catch (err) {
      console.error(`❌ Queue "${queueName}": ${err.message}`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('\n🎉 All BullMQ queues are working end-to-end!');
  } else {
    console.log('\n⚠️  Some queues had issues — see above.');
    process.exit(1);
  }
  process.exit(0);
})();
