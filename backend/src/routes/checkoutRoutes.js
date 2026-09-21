import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createOrder, verifyPayment, cancelOrder, getOrderStatus } from '../controllers/checkoutController.js';

const router = Router();

// Creating a checkout order reserves a price and calls out to Razorpay —
// rate-limit it specifically, tighter than a read endpoint but loose enough
// that a legitimate customer retrying after a failed attempt isn't blocked.
const createOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout attempts. Please try again later.', errors: [] },
});

const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please try again later.', errors: [] },
});

router.post('/order', createOrderLimiter, createOrder);
router.post('/verify', verifyLimiter, verifyPayment);
router.post('/order/:publicOrderId/cancel', verifyLimiter, cancelOrder);
router.get('/order/:publicOrderId', getOrderStatus);

export default router;
