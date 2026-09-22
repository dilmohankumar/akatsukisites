import { configurePayments } from './payments/index.js';
import { validateClaimPayload } from './utils/validators.js';
import { reserveNextAmount, releaseReservation, archiveOverflow } from './services/boardPricing.js';
import { invalidateBoardCache } from './services/boardCache.js';
import Business from './models/Business.js';

const CURRENCY = 'INR';

/**
 * This is the only file that connects the generic payments/ module to
 * TopSpot's actual product: "pay to claim #1". Nothing in payments/ knows
 * what a Business is — it only knows the four hooks below.
 */
configurePayments({
  async validatePayload(body) {
    // Reuses the same validation the claim form always used — name/url/
    // description/logo, nothing else (no amount, no currency).
    return validateClaimPayload(body);
  },

  async computeAmount() {
    // Atomically reserves the next price (current #1 + increment) so two
    // simultaneous checkouts can never be quoted the same amount.
    const { amount, prevAmount } = await reserveNextAmount();
    return { amount, currency: CURRENCY, meta: { amount, prevAmount } };
  },

  async releaseAmount(meta) {
    if (!meta) return;
    await releaseReservation(meta);
  },

  async onPaymentConfirmed({ order }) {
    const business = await Business.create({ ...order.payload, amount: order.amount });
    invalidateBoardCache();

    // Best-effort — a failure here must not undo a payment that already succeeded.
    try {
      await archiveOverflow();
    } catch (err) {
      console.error('[payments] archiveOverflow failed after payment:', err.message);
    }

    const board = await Business.find().sort({ amount: -1, createdAt: 1 }).limit(10).lean();
    const rank = board.findIndex((b) => String(b._id) === String(business._id)) + 1;

    return { business, rank: rank || null, board };
  },
});
