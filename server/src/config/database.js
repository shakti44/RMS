const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'rms_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './src/db/migrations',
    tableName:  'knex_migrations',
  },
  seeds: {
    directory: './src/db/seeds',
  },
});

module.exports = db;
