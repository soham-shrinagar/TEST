const startWorkers = () => {
  require('./instagramWorker');
  require('./analyticsWorker');
  require('./recommendationsWorker');
  require('./notificationsWorker');
};

module.exports = { startWorkers };
