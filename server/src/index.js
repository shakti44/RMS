require('dotenv').config();
const http    = require('http');
const app     = require('./app');
const sockets = require('./sockets');
const logger  = require('./utils/logger');
const db      = require('./config/database');

const PORT = process.env.PORT || 4000;

async function start() {
  // Verify DB connection before accepting traffic
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Failed to connect to database:', err.message);
    process.exit(1);
  }

  const httpServer = http.createServer(app);
  sockets.init(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`RMS Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await db.destroy();
      logger.info('DB pool closed. Goodbye.');
      process.exit(0);
    });
    // Force kill after 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Log unhandled rejections instead of crashing silently
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

start();
