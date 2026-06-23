const { Worker } = require('bullmq');
const { connection } = require('../config/queues');
const { delPattern } = require('../services/cacheService');
const { updateCampaignStats } = require('../services/campaignInstagramService');

const worker = new Worker('analytics', async (job) => {
  try {
    if (job.name === 'campaign-stats') {
      const stats = await updateCampaignStats(job.data.campaignId);
      await delPattern(`campaign:${job.data.campaignId}:*`);
      await delPattern(`campaigns:brand:${job.data.brandId || '*'}:*`);
      return stats;
    }

    throw new Error(`Unknown analytics job: ${job.name}`);
  } catch (error) {
    console.error(`[worker:analytics] ${job.name}: ${error.message}`);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => console.log(`[worker:analytics] completed ${job.name}`));
worker.on('failed', (job, error) => console.error(`[worker:analytics] failed ${job?.name}: ${error.message}`));
worker.on('error', (error) => console.error(`[worker:analytics] ${error.message}`));

module.exports = worker;
