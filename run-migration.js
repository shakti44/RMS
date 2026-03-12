const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'dpg-d6pf98ma2pns73b0s41g-a.oregon-postgres.render.com',
  port: 5432,
  database: 'rms_db_4fhy',
  user: 'rms_user',
  password: 'APi4kbOaYawkc5wpWJn9UK7tqoZNvFwB',
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync(
  path.join(__dirname, 'server/src/db/migrations/001_initial_schema.sql'),
  'utf8'
);

async function run() {
  try {
    await client.connect();
    console.log('Connected to Render PostgreSQL');
    await client.query(sql);
    console.log('Schema migration complete!');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

run();
