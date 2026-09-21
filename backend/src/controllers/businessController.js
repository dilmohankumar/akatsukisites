import Business from '../models/Business.js';
import BusinessArchive from '../models/BusinessArchive.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, ApiError } from '../utils/apiResponse.js';
import { ensureBoardMeta, BASE_ENTRY_AMOUNT, CLAIM_INCREMENT_AMOUNT } from '../services/boardPricing.js';
import { getCachedBoard, setCachedBoard, getCachedNextPrice, setCachedNextPrice } from '../services/boardCache.js';

/**
 * GET /api/board
 * Returns the top 10 businesses, highest amount first.
 * Ties are broken by earlier createdAt (the payment that cleared first keeps the higher spot).
 *
 * This is the single most-requested endpoint in the app (fetched on every
 * page load) — short-TTL cached so a traffic burst doesn't turn into a
 * burst of identical MongoDB queries. Invalidated immediately on a real claim.
 */
export const getBoard = asyncHandler(async (req, res) => {
  let board = getCachedBoard();
  if (!board) {
    board = await Business.find().sort({ amount: -1, createdAt: 1 }).limit(10).lean();
    setCachedBoard(board);
  }
  res.set('Cache-Control', 'no-store'); // this header is about the browser, not our own server-side cache
  return ok(res, { board }, 'Board fetched');
});

/**
 * GET /api/board/next-price
 * Tells the client exactly how much is needed to become #1 right now,
 * without leaking the whole board just to compute one number. This is a
 * read-only quote — the price is only actually reserved when a checkout
 * order is created (see checkoutController.createOrder), because that's the
 * point a real charge amount has to be fixed.
 */
export const getNextPrice = asyncHandler(async (req, res) => {
  let payload = getCachedNextPrice();
  if (!payload) {
    const meta = await ensureBoardMeta();
    const currentAmount = meta.topAmount;
    const nextPrice = currentAmount > 0 ? currentAmount + CLAIM_INCREMENT_AMOUNT : BASE_ENTRY_AMOUNT;
    const current = currentAmount > 0 ? await Business.findOne().sort({ amount: -1, createdAt: 1 }).lean() : null;
    payload = { currentAmount, nextPrice, current };
    setCachedNextPrice(payload);
  }
  return ok(res, payload, 'Next price calculated');
});

/**
 * GET /api/board/:id
 * Used by the profile-style view of a single business, if needed later.
 */
export const getBusinessById = asyncHandler(async (req, res) => {
  let business = await Business.findById(req.params.id).lean();
  if (!business) business = await BusinessArchive.findById(req.params.id).lean();
  if (!business) throw new ApiError(404, 'Business not found');
  return ok(res, { business }, 'Business fetched');
});
