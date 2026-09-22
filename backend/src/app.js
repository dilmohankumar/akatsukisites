import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import businessRoutes from './routes/businessRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import { checkoutRoutes, webhookRoutes } from './payments/index.js';
import './paymentsConfig.js'; // registers this app's payment hooks — import before the routes below are used
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust one hop of proxy (ngrok in dev, a load balancer/reverse proxy in
// production) so req.ip / X-Forwarded-For is read correctly — otherwise
// express-rate-limit can't tell real clients apart behind the proxy.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Webhook signature verification is computed over the exact raw request
// bytes — this MUST be mounted with a raw body parser, and BEFORE the
// global express.json() below, or the signature can never validate against
// a body Express has already parsed and re-serialized.
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '256kb' }), webhookRoutes);

// Logo payloads are capped at ~700KB (see Business.logo maxlength) — 1mb covers
// the base64 overhead plus the rest of the claim payload with headroom.
app.use(express.json({ limit: '1mb' }));

// Strips any `$`/`.`-prefixed keys from body/query/params — defense in depth
// against NoSQL operator injection even though current queries don't build
// filters from raw user input.
app.use(mongoSanitize());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Baseline rate limit across the whole API; individual write routes (claim,
// support, checkout) tighten this further with their own limiters. This one
// mainly exists to stop raw request flooding — GET /board and /next-price
// are now server-cached (see boardCache.js), so a generous shared-IP limit
// here (e.g. an office/NAT behind one address) no longer risks hammering
// MongoDB, it just serves cached responses.
app.use(
  '/api',
  rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 1200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Liveness: process is up and can respond at all.
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: 'Service healthy' });
});

// Readiness: also confirms the one critical dependency (MongoDB) is connected.
app.get('/api/ready', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    data: { status: dbReady ? 'ready' : 'not_ready', db: mongoose.STATES[mongoose.connection.readyState] },
    message: dbReady ? 'Service ready' : 'Database not connected',
  });
});

app.use('/api/board', businessRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/checkout', checkoutRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
