const { Pool } = require('pg');

const configuredPoolSize = Number.parseInt(process.env.PGPOOL_MAX || '10', 10);
const databaseUrl = process.env.DATABASE_URL || '';
const sslDisabled = process.env.DATABASE_SSL === 'false';
const useSsl = !sslDisabled && (
  process.env.NODE_ENV === 'production'
  || process.env.DATABASE_SSL === 'true'
  || /neon\.tech/i.test(databaseUrl)
  || /sslmode=require/i.test(databaseUrl)
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
    ? configuredPoolSize
    : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

module.exports = pool;
