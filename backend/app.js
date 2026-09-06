const express = require('express');
const { router: authRoutes } = require('./auth');
const dashboardRoutes = require('./dashboardRoutes');
const ratingsRoutes = require('./ratingsRoutes');
const storesRoutes = require('./storesRoutes');
const usersRoutes = require('./usersRoutes');

const app = express();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.disable('x-powered-by');

app.use((request, response, next) => {
  const origin = request.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }

  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  );
  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, OPTIONS',
  );

  if (request.method === 'OPTIONS') {
    return response.sendStatus(204);
  }

  return next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/health', (request, response) => response.status(200).json({
  ok: true,
}));

app.use('/api', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/users', usersRoutes);

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found.' });
});

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && error.status === 400 && error.body) {
    return response.status(400).json({ error: 'Request body must be valid JSON.' });
  }

  console.error(error);

  if (response.headersSent) {
    return next(error);
  }

  return response.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
