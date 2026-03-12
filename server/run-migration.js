const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'dpg-d6pf98ma2pns73b0s41g-a.oregon-postgres.render.com',
  port: 5432,
  database: 'rms_db_4fhy',
  user: 'rms_user',
  password: 'APi4kbOaYawkc5wpWJn9UK7tqoZNvFwB',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

const sqlFile = path.join(__dirname, 'src/db/migrations/001_initial_schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

async function run() {
  console.log('Connecting...');
  await client.connect();
  console.log('Connected to Render PostgreSQL');
  
  // Split by semicolons and run each statement
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  console.log(`Running ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    try {
      await client.query(statements[i]);
      if (i % 10 === 0) process.stdout.write('.');
    } catch (e) {
      // Ignore "already exists" errors
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.error(`\nStatement ${i} error: ${e.message}`);
      }
    }
  }
  
  console.log('\nSchema migration complete!');
  await client.end();
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
