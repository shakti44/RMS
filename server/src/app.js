require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const logger       = require('./utils/logger');

const app = express();

// Trust proxy (needed for correct IP behind Nginx / AWS ALB)
app.set('trust proxy', 1);

// ── Security & utility middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,     // allow QR image embeds
  contentSecurityPolicy: false,         // handled at Nginx level in prod
}));
app.use(compression());
app.use(cors({
  origin:      (process.env.CLIENT_URL || 'http://localhost:5173').split(','),
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));

// HTTP request logging — pipe morgan into winston
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip:   (req) => req.url === '/api/health',    // skip noisy health checks
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────
// Strict limit on auth endpoints to block brute-force
app.use('/api/auth/login',           rateLimit({ windowMs: 15 * 60 * 1000, max: 20,  message: { success: false, message: 'Too many login attempts' } }));
app.use('/api/auth/register-tenant', rateLimit({ windowMs: 60 * 60 * 1000, max: 5,   message: { success: false, message: 'Too many registrations' } }));

// General API limit
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      500,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later' },
}));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api', require('./routes'));

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
