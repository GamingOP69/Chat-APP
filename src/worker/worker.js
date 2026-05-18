const { createClient } = require('redis');
const config = require('../../config');
const logger = require('../utils/logger');

async function startWorker() {
  const client = createClient({
    url: config.redis.password
      ? `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`
      : `redis://${config.redis.host}:${config.redis.port}`,
  });

  client.on('error', (err) => logger.error('Worker Redis error: %o', err));
  await client.connect();
  logger.info('Worker connected to Redis, listening on queue:uploads');

  for (;;) {
    try {
      // BLPOP blocks until an element is available
      const res = await client.blPop('queue:uploads', 0);
      if (!res) continue;
      const [, payload] = res;
      const job = JSON.parse(payload);
      logger.info('Processing upload job: %o', { file: job.fileName, uploader: job.uploader });

      // TODO: implement actual processing (antivirus, thumbnails, metadata)
      // Simulate async work
      await new Promise((r) => setTimeout(r, 500));

      logger.info('Completed upload job: %s', job.fileName);
    } catch (err) {
      logger.error('Worker processing error: %o', err);
      // BackOff on error
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

startWorker().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
