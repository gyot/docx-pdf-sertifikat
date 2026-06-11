const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = require('./src/app');
const { PORT, TEMP_BASE_PATH } = require('./src/config');
const { cleanTempDir } = require('./src/helpers/fileHelper');
const logger = require('./src/helpers/logger');

async function start() {
  await cleanTempDir(TEMP_BASE_PATH);

  const server = app.listen(PORT, () => {
    logger.info(`Certificate microservice is running on http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    server.close(() => process.exit(1));
  });
}

start();
