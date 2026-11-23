'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const requiredConfig = ['MONGODB_URI', 'MONGODB_DB_NAME', 'JWT_SECRET'];
const missingConfig = requiredConfig.filter((key) => !process.env[key]);
if (missingConfig.length > 0) {
  throw new Error(`Missing required backend configuration: ${missingConfig.join(', ')}`);
}

// Initialize DB and retain the migration promise so startup can await it.
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/universities', require('./routes/universities'));
app.use('/api/matches',      require('./routes/matches'));
app.use('/api/contact-requests', require('./routes/contactRequests'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  await db.ready;
  app.listen(PORT, () => {
    console.log(`BagCheck API running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Unable to start BagCheck API:', err);
    process.exit(1);
  });
}

module.exports = app;
