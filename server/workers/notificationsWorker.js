const { Worker } = require('bullmq');
const { connection } = require('../config/queues');
const { delPattern } = require('../services/cacheService');
const Notification = require('../models/Notification');
const { notifyUser } = require('../services/messengerSocket');

const worker = new Worker('notifications', async (job) => {
  try {
    if (job.name === 'deliver') {
      const notification = await Notification.findById(job.data.notificationId);
      if (notification) {
        notifyUser(notification.user, { type: 'notification', notification });
        await delPattern(`notifications:${notification.user}:*`);
      }
      return { success: true };
    }

    throw new Error(`Unknown notifications job: ${job.name}`);
  } catch (error) {
    console.error(`[worker:notifications] ${job.name}: ${error.message}`);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => console.log(`[worker:notifications] completed ${job.name}`));
worker.on('failed', (job, error) => console.error(`[worker:notifications] failed ${job?.name}: ${error.message}`));
worker.on('error', (error) => console.error(`[worker:notifications] ${error.message}`));

module.exports = worker;
