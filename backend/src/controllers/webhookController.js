import Order from '../models/Order.js';
import PaymentEvent from '../models/PaymentEvent.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPaymentProvider } from '../services/payments/index.js';
import { confirmOrderPaid, markOrderFailed } from '../services/checkoutService.js';

/**
 * POST /api/webhooks/razorpay
 * The authoritative confirmation path. Runs independently of anything the
 * browser reports — this is what actually gets trusted for money.
 *
 * Mounted with express.raw() (see app.js) because the signature is computed
 * over the exact raw request bytes; re-serializing a parsed JSON object
 * would produce a different byte sequence and always fail verification.
 */
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('X-Razorpay-Signature');
  const provider = getPaymentProvider();

  if (!signature || !provider.verifyWebhookSignature({ rawBody: req.body, signature })) {
    // Do not process, do not leak why — just refuse it. Respond 400 so
    // Razorpay's retry/alerting treats this as a delivery problem, not a
    // transient failure to retry blindly forever.
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  let body;
  try {
    body = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Malformed payload' });
  }

  const event = provider.parseWebhookEvent(body);

  // Idempotency: the same event id delivered N times (Razorpay retries on
  // any non-2xx) must be recorded once, but if the FIRST attempt failed
  // partway through (so it was recorded but never marked processed), a
  // retry must still go through processing rather than being waved off as
  // "already handled" — otherwise a failed attempt can never be retried.
  let eventDoc = await PaymentEvent.findOne({ providerEventId: event.eventId });
  if (!eventDoc) {
    try {
      eventDoc = await PaymentEvent.create({
        provider: 'razorpay',
        providerEventId: event.eventId,
        eventType: event.eventType,
        providerOrderId: event.providerOrderId,
        providerPaymentId: event.providerPaymentId,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Lost the race to create it — someone else's request is handling
        // (or already handled) this exact event.
        eventDoc = await PaymentEvent.findOne({ providerEventId: event.eventId });
      } else {
        throw err;
      }
    }
  }

  if (eventDoc.processed) {
    return res.status(200).json({ success: true, message: 'Already processed' });
  }

  try {
    const order = await Order.findOne({ providerOrderId: event.providerOrderId });
    if (!order) {
      // Nothing to reconcile against (e.g. a webhook for an order created
      // outside this flow, or test-mode noise) — acknowledge, don't retry forever.
      await PaymentEvent.updateOne({ _id: eventDoc._id }, { processed: true, processedAt: new Date() });
      return res.status(200).json({ success: true, message: 'No matching order' });
    }

    await PaymentEvent.updateOne({ _id: eventDoc._id }, { orderId: order._id });

    if (event.eventType === 'payment.captured' || event.eventType === 'order.paid') {
      await confirmOrderPaid({ orderId: order._id, providerPaymentId: event.providerPaymentId, method: event.method });
    } else if (event.eventType === 'payment.failed') {
      await markOrderFailed(order._id, { failureCode: event.failureCode, failureReason: event.failureReason });
    }
    // Other event types (refund.*, etc.) are logged via the PaymentEvent row
    // above but don't yet have a handler — safe to acknowledge and move on.

    await PaymentEvent.updateOne({ _id: eventDoc._id }, { processed: true, processedAt: new Date() });
    return res.status(200).json({ success: true });
  } catch (err) {
    await PaymentEvent.updateOne({ _id: eventDoc._id }, { error: err.message });
    console.error('[webhook] processing failed:', err);
    // 500 tells Razorpay to retry — safe, because everything above is
    // idempotent (the event row already exists, and confirmOrderPaid/
    // markOrderFailed are both no-ops on a second run for the same order).
    return res.status(500).json({ success: false, message: 'Processing failed, will retry' });
  }
});
