const { Worker } = require('bullmq');
const { connection } = require('../config/queues');
const { delPattern } = require('../services/cacheService');
const recommendationService = require('../services/recommendationService');

const worker = new Worker('recommendations', async (job) => {
  try {
    if (job.name === 'generate-brand') {
      const result = await recommendationService.generateForBrand(job.data.userId, null, job.data.contextKey || '');
      await delPattern(`recommendations:${job.data.userId}:*`);
      return result;
    }

    if (job.name === 'generate-creator') {
      const [campaignRecs, storeRecs] = await Promise.all([
        recommendationService.generateForCreator(job.data.userId),
        recommendationService.generateStoreDealsForCreator(job.data.userId),
      ]);
      await delPattern(`recommendations:${job.data.userId}:*`);
      return { campaignRecs, storeRecs };
    }

    throw new Error(`Unknown recommendations job: ${job.name}`);
  } catch (error) {
    console.error(`[worker:recommendations] ${job.name}: ${error.message}`);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => console.log(`[worker:recommendations] completed ${job.name}`));
worker.on('failed', (job, error) => console.error(`[worker:recommendations] failed ${job?.name}: ${error.message}`));
worker.on('error', (error) => console.error(`[worker:recommendations] ${error.message}`));

module.exports = worker;
