import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { razorpayWebhook } from './webhookController.js';
import { paymentsErrorHandler } from './errorHandler.js';

const router = Router();

// Generous but not unbounded — a legitimate payment provider won't exceed
// this, but it stops the endpoint being usable for request flooding.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/razorpay', webhookLimiter, razorpayWebhook);

router.use(paymentsErrorHandler);

export default router;
