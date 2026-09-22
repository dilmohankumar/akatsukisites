import Order from './models/Order.js';
import Payment from './models/Payment.js';
import { getPaymentHooks } from './config.js';

function generatePublicId(prefix) {
  const year = new Date().getFullYear();
  const random = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `${prefix}-${year}-${random}`;
}
export { generatePublicId };

/**
 * The single, idempotent path that turns "a payment happened" into
 * whatever "fulfilled" means for the host app. Called from both the
 * checkout-verify endpoint (fast UX after the customer pays) and the
 * webhook (authoritative source of truth) — whichever arrives first does
 * the work, the other is a no-op.
 *
 * Safe to call twice, three times, or concurrently for the same order: the
 * Order.status compare-and-swap below guarantees onPaymentConfirmed runs
 * at most once per order.
 */
export async function confirmOrderPaid({ orderId, providerPaymentId, method }) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: ['CREATED', 'PENDING'] } },
    { $set: { status: 'PAID', paidAt: new Date() } },
    { new: true }
  );

  if (!order) {
    // Either already confirmed by the other path, or the order is
    // FAILED/EXPIRED/CANCELLED — nothing to do either way.
    const existing = await Order.findById(orderId).lean();
    return { order: existing, fulfillmentResult: existing?.fulfillmentResult ?? null, alreadyProcessed: true };
  }

  // Upsert on providerPaymentId (unique) — if this ever runs twice for the
  // same gateway payment id (shouldn't, given the CAS above, but cheap
  // insurance), it updates the same row instead of erroring or duplicating.
  await Payment.updateOne(
    { providerPaymentId },
    {
      $setOnInsert: {
        publicPaymentId: generatePublicId('PAY'),
        orderId: order._id,
        provider: order.provider,
        providerPaymentId,
        providerOrderId: order.providerOrderId,
        amount: order.amount,
        currency: order.currency,
      },
      $set: { status: 'CAPTURED', method: method || null, paidAt: new Date() },
    },
    { upsert: true }
  );

  let fulfillmentResult = order.fulfillmentResult;
  if (!order.fulfilled) {
    const hooks = getPaymentHooks();
    fulfillmentResult = (await hooks.onPaymentConfirmed({ order, providerPaymentId, method })) ?? null;
    await Order.updateOne({ _id: order._id }, { $set: { fulfilled: true, fulfillmentResult } });
  }

  return { order, fulfillmentResult, alreadyProcessed: false };
}

/**
 * Marks an order as failed and releases whatever computeAmount reserved,
 * via the host app's releaseAmount hook.
 */
export async function markOrderFailed(orderId, { failureCode, failureReason } = {}) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: ['CREATED', 'PENDING'] } },
    { $set: { status: 'FAILED', failureCode: failureCode || null, failureReason: failureReason || null } },
    { new: true }
  );
  if (order) {
    const hooks = getPaymentHooks();
    await hooks.releaseAmount(order.reservationMeta);
    await hooks.onPaymentFailed({ order });
  }
  return order;
}
