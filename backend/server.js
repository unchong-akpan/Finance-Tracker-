import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import statsRoutes from './routes/stats.js';
import recurringRoutes from './routes/recurring.js';
import authRoutes from './routes/auth.js';
import { initDatabase } from './models/database.js';
import { optionalAuth } from './lib/auth.js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiSpec = JSON.parse(readFileSync(path.join(__dirname, 'lib', 'openapi.json'), 'utf-8'));

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const API_TOKEN = process.env.API_TOKEN || '';

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// Stricter limit for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again later' },
});
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

app.use(cors({
  origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','),
}));
app.use(express.json({ limit: '1mb' }));

if (API_TOKEN) {
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (req.get('x-api-token') === API_TOKEN) return next();
    res.status(401).json({ error: 'Invalid or missing API token' });
  });
}

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required only if users exist)
app.use('/api/transactions', optionalAuth, transactionRoutes);
app.use('/api/budgets', optionalAuth, budgetRoutes);
app.use('/api/stats', optionalAuth, statsRoutes);
app.use('/api/recurring', optionalAuth, recurringRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API documentation
app.get('/api/docs/openapi.json', (req, res) => {
  res.json(openapiSpec);
});

app.get('/api/docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finance Tracker API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`);
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Serve frontend build in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback — any non-API route returns index.html
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

initDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      console.log(API_TOKEN ? 'API token required' : 'API token not set (open on loopback only)');
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
