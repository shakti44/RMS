require('dotenv').config();
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const app     = require('./app');
const sockets = require('./sockets');
const logger  = require('./utils/logger');
const db      = require('./config/database');

const PORT = process.env.PORT || 4000;

async function runMigrationsIfNeeded() {
  try {
    // Check if tables already exist
    const result = await db.raw(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tenants'
    `);
    const tableExists = parseInt(result.rows[0].count) > 0;

    if (!tableExists) {
      logger.info('Running initial schema migration...');
      const schemaPath = path.join(__dirname, 'db/migrations/001_initial_schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      // Run each statement individually to handle errors gracefully
      const statements = sql.split(/;\s*\n/).filter(s => s.trim().length > 0);
      for (const stmt of statements) {
        try {
          await db.raw(stmt);
        } catch (e) {
          if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
            logger.warn('Migration stmt warning:', e.message.substring(0, 100));
          }
        }
      }
      logger.info('Schema migration complete');

      // Run seeds
      logger.info('Running seed data...');
      try {
        const seedFiles = fs.readdirSync(path.join(__dirname, 'db/seeds')).sort();
        for (const file of seedFiles) {
          if (file.endsWith('.js')) {
            const seed = require(`./db/seeds/${file}`);
            if (typeof seed.seed === 'function') {
              await seed.seed(db);
            } else if (typeof seed === 'function') {
              await seed(db);
            }
            logger.info(`Seed ${file} complete`);
          }
        }
      } catch (seedErr) {
        logger.warn('Seed warning (non-fatal):', seedErr.message);
      }
      logger.info('Initial setup complete');
    } else {
      logger.info('Database already initialised, skipping migration');
    }
  } catch (err) {
    logger.warn('Migration check failed (non-fatal):', err.message);
  }
}

async function start() {
  // Verify DB connection before accepting traffic
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Failed to connect to database:', err.message);
    process.exit(1);
  }

  await runMigrationsIfNeeded();

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
