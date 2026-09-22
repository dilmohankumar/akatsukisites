import mongoose from 'mongoose';

/**
 * A checkout intent. Generic on purpose — this module has no idea what a
 * "business" or a "plan" or a "subscription" is. `payload` carries whatever
 * the host app's `validatePayload` hook returned (the thing being paid
 * for), and `reservationMeta` carries whatever its `computeAmount` hook
 * returned (whatever that app needs to undo/roll back the price if this
 * order never gets paid). This module never reads inside either — it just
 * stores and hands them back to the host app's hooks at the right time.
 */
const orderSchema = new mongoose.Schema(
  {
    publicOrderId: { type: String, required: true, unique: true },

    // Whatever the host app is charging for — copied here (not just
    // referenced) so a webhook arriving long after the browser closed still
    // has everything it needs to fulfill the order.
    payload: { type: mongoose.Schema.Types.Mixed, default: null },

    // Price locked at order-creation time (via the host app's computeAmount
    // hook) — this is what gets charged, and never recalculated afterwards.
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    reservationMeta: { type: mongoose.Schema.Types.Mixed, default: null },

    provider: { type: String, required: true, default: 'razorpay' },
    providerOrderId: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
      default: 'CREATED',
      required: true,
    },

    // Set exactly once, the moment the host app's onPaymentConfirmed hook
    // has run — guards against running it twice for the same order.
    fulfilled: { type: Boolean, default: false },
    // Whatever onPaymentConfirmed returned (e.g. the created record, a
    // rank, anything the frontend needs) — cached so a second confirmation
    // path (webhook after verify, or vice versa) can return the same result
    // without recomputing it.
    fulfillmentResult: { type: mongoose.Schema.Types.Mixed, default: null },

    failureCode: { type: String, default: null },
    failureReason: { type: String, default: null },

    paidAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Expiry sweep scans for stale pending orders.
orderSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model('Order', orderSchema);
