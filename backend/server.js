const path = require('node:path');

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(__dirname, '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

const app = require('./app');
const pool = require('./db');

const port = Number.parseInt(process.env.PORT || '3000', 10);

if (require.main === module) {
  const server = app.listen(port, () => {
    console.log(`Roxiler backend listening on port ${port}`);
  });

  function shutdown() {
    server.close(() => {
      pool.end()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error('Failed to close PostgreSQL pool', error);
          process.exit(1);
        });
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
