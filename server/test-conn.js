const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://rms_user:APi4kbOaYawkc5wpWJn9UK7tqoZNvFwB@dpg-d6pf98ma2pns73b0s41g-a.oregon-postgres.render.com:5432/rms_db_4fhy',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query('SELECT version()'))
  .then(r => { console.log('OK:', r.rows[0].version.substring(0,30)); return client.end(); })
  .catch(e => { console.error('FAIL:', e.message, e.code); process.exit(1); });
