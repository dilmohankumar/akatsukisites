import { Router } from 'express';
import { getBoard, getNextPrice, getBusinessById } from '../controllers/businessController.js';

const router = Router();

// Claiming #1 now requires real payment — see /api/checkout. There is
// deliberately no free write path left on this router.
router.get('/', getBoard);
router.get('/next-price', getNextPrice);
router.get('/:id', getBusinessById);

export default router;
