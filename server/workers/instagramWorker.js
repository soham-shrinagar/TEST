const { Worker } = require('bullmq');
const { connection } = require('../config/queues');
const { delPattern } = require('../services/cacheService');
const instagramService = require('../services/instagramService');
const campaignInstagramService = require('../services/campaignInstagramService');
const User = require('../models/User');

const worker = new Worker('instagram', async (job) => {
  try {
    if (job.name === 'fetch-public') {
      const stats = await instagramService.runPublicScraper(job.data.username);
      await instagramService.savePublicStats(job.data.userId, stats);
      await delPattern(`profile:${job.data.userId}:*`);
      return { success: true };
    }

    if (job.name === 'fetch-verified') {
      const user = await User.findById(job.data.userId);
      if (user) await instagramService.fetchVerifiedForUser(user);
      await delPattern(`profile:${job.data.userId}:*`);
      return { success: true };
    }

    if (job.name === 'verify-post') {
      const result = await campaignInstagramService.verifyInstagramPost(job.data.postId, job.data.expectedHandle || '');
      if (job.data.campaignId) await delPattern(`campaign:${job.data.campaignId}:*`);
      return result;
    }

    if (job.name === 'refresh-live-posts') {
      await campaignInstagramService.refreshAllLivePosts();
      await delPattern('campaign:*');
      return { success: true };
    }

    throw new Error(`Unknown instagram job: ${job.name}`);
  } catch (error) {
    console.error(`[worker:instagram] ${job.name}: ${error.message}`);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => console.log(`[worker:instagram] completed ${job.name}`));
worker.on('failed', (job, error) => console.error(`[worker:instagram] failed ${job?.name}: ${error.message}`));
worker.on('error', (error) => console.error(`[worker:instagram] ${error.message}`));

module.exports = worker;
