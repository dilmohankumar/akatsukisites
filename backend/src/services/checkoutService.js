import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Business from '../models/Business.js';
import { archiveOverflow, releaseReservation, generatePublicId } from './boardPricing.js';
import { invalidateBoardCache } from './boardCache.js';

/**
 * The single, idempotent path that turns "a payment happened" into "the
 * business is on the board". Called from both the checkout-verify endpoint
 * (fast UX after the customer pays) and the webhook (authoritative source
 * of truth) — whichever arrives first does the work, the other is a no-op.
 *
 * Safe to call twice, three times, or concurrently for the same order: the
 * Order.status compare-and-swap below guarantees the entitlement (Business
 * doc) is created at most once per order.
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
    return { order: existing, alreadyProcessed: true };
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

  let business = null;
  if (!order.businessId) {
    business = await Business.create({ ...order.claimDraft, amount: order.amount });
    await Order.updateOne({ _id: order._id }, { $set: { businessId: business._id } });
    invalidateBoardCache();

    // Best-effort — a failure here must not undo a payment that already succeeded.
    try {
      await archiveOverflow();
    } catch (err) {
      console.error('[checkout] archiveOverflow failed after payment:', err.message);
    }
  }

  return { order, business, alreadyProcessed: false };
}

/**
 * Marks an order as failed and releases its price reservation so the
 * displayed "next price" doesn't stay stuck high because of a payment
 * nobody completed.
 */
export async function markOrderFailed(orderId, { failureCode, failureReason } = {}) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: ['CREATED', 'PENDING'] } },
    { $set: { status: 'FAILED', failureCode: failureCode || null, failureReason: failureReason || null } },
    { new: true }
  );
  if (order) {
    await releaseReservation({ amount: order.amount, prevAmount: order.prevAmount });
  }
  return order;
}
