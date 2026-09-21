import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createTicket } from '../controllers/supportController.js';

const router = Router();

const ticketLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many ticket submissions. Please try again later.', errors: [] },
});

router.post('/', ticketLimiter, createTicket);

export default router;
