import Order from '../models/Order.js';
import { getPaymentHooks } from '../config.js';

/**
 * Sweeps checkout orders that were never completed (customer closed the
 * tab, checkout timed out, etc.) so they don't stay PENDING forever and so
 * whatever computeAmount reserved gets released via the host app's
 * releaseAmount hook. A single setInterval is enough at low-to-moderate
 * traffic — reach for a real scheduler (node-cron/BullMQ repeatable jobs)
 * only once there's more than one API process running this, since two
 * processes both sweeping is harmless but wasteful, not incorrect (the
 * underlying update is a no-op CAS).
 */
export async function expireStaleOrders() {
  const stale = await Order.find({
    status: { $in: ['CREATED', 'PENDING'] },
    expiresAt: { $lt: new Date() },
  })
    .select('_id reservationMeta')
    .limit(100)
    .lean();

  if (stale.length === 0) return 0;

  const hooks = getPaymentHooks();
  for (const order of stale) {
    // eslint-disable-next-line no-await-in-loop
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: { $in: ['CREATED', 'PENDING'] } },
      { $set: { status: 'EXPIRED' } }
    );
    if (updated) {
      // eslint-disable-next-line no-await-in-loop
      await hooks.releaseAmount(order.reservationMeta);
    }
  }

  return stale.length;
}

export function startOrderExpirySweep({ intervalMs = 5 * 60 * 1000 } = {}) {
  const timer = setInterval(() => {
    expireStaleOrders().catch((err) => console.error('[payments jobs] expireStaleOrders failed:', err.message));
  }, intervalMs);
  timer.unref(); // never keeps the process alive on its own
  return timer;
}
