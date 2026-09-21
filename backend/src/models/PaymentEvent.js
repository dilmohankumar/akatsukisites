import mongoose from 'mongoose';

/**
 * Audit trail of every webhook event received, keyed by the provider's own
 * event id so the exact same event delivered twice (Razorpay retries on any
 * non-2xx response) is a no-op the second time. Deliberately does NOT store
 * the raw webhook payload — only what's needed to debug and reconcile.
 */
const paymentEventSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  providerEventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  providerOrderId: { type: String, default: null },
  providerPaymentId: { type: String, default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  processed: { type: Boolean, default: false },
  processedAt: { type: Date, default: null },
  error: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

paymentEventSchema.index({ createdAt: -1 });

export default mongoose.model('PaymentEvent', paymentEventSchema);
