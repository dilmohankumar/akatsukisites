import Order from '../models/Order.js';
import { releaseReservation } from '../services/boardPricing.js';

/**
 * Sweeps checkout orders that were never completed (customer closed the tab,
 * Razorpay checkout timed out, etc.) so they don't stay PENDING forever and
 * so their price reservation gets released back to BoardMeta. A single
 * setInterval is enough at this traffic volume — reach for a real scheduler
 * (e.g. node-cron/BullMQ repeatable jobs) only once there's more than one
 * API process running this, since two processes both sweeping is harmless
 * but wasteful, not incorrect (the underlying update is a no-op CAS).
 */
export async function expireStaleOrders() {
  const stale = await Order.find({
    status: { $in: ['CREATED', 'PENDING'] },
    expiresAt: { $lt: new Date() },
  })
    .select('_id amount prevAmount')
    .limit(100)
    .lean();

  if (stale.length === 0) return 0;

  for (const order of stale) {
    // eslint-disable-next-line no-await-in-loop
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: { $in: ['CREATED', 'PENDING'] } },
      { $set: { status: 'EXPIRED' } }
    );
    if (updated) {
      // eslint-disable-next-line no-await-in-loop
      await releaseReservation({ amount: order.amount, prevAmount: order.prevAmount });
    }
  }

  return stale.length;
}

export function startOrderExpirySweep({ intervalMs = 5 * 60 * 1000 } = {}) {
  const timer = setInterval(() => {
    expireStaleOrders().catch((err) => console.error('[jobs] expireStaleOrders failed:', err.message));
  }, intervalMs);
  timer.unref(); // never keeps the process alive on its own
  return timer;
}
