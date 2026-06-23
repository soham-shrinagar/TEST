const { Queue } = require('bullmq');
const { REDIS_URL } = require('./redis');

const connection = { url: REDIS_URL, maxRetriesPerRequest: null };

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 100,
};

const instagramQueue = new Queue('instagram', { connection, defaultJobOptions });
const analyticsQueue = new Queue('analytics', { connection, defaultJobOptions });
const recommendationsQueue = new Queue('recommendations', { connection, defaultJobOptions });
const notificationsQueue = new Queue('notifications', { connection, defaultJobOptions });

[
  instagramQueue,
  analyticsQueue,
  recommendationsQueue,
  notificationsQueue,
].forEach((queue) => {
  queue.on('error', (error) => {
    console.error(`[queue:${queue.name}] ${error.message}`);
  });
});

const addJob = async (queue, name, data = {}, options = {}) => {
  try {
    return await queue.add(name, data, { ...defaultJobOptions, ...options });
  } catch (error) {
    console.error(`[queue:${queue.name}] ${name}: ${error.message}`);
    return null;
  }
};

module.exports = {
  connection,
  defaultJobOptions,
  instagramQueue,
  analyticsQueue,
  recommendationsQueue,
  notificationsQueue,
  addJob,
};
