import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PaymentProvider } from './PaymentProvider.js';

/**
 * Razorpay adapter. Chosen because:
 *  - test-mode API keys are issued instantly on signup (no KYC wait) so
 *    development/testing isn't blocked on business verification,
 *  - one integration covers UPI + cards + netbanking + wallets for Indian
 *    customers via a single hosted Checkout (PCI scope stays with Razorpay,
 *    this app never touches card/UPI details),
 *  - international Visa/Mastercard/Amex cards can be accepted through the
 *    same Checkout once "International Payments" is enabled on the account
 *    (a separate Razorpay approval — NOT on by default, and NOT multi-
 *    currency: an India Razorpay account settles in INR only, so an
 *    international card is charged in INR and converted by the card network).
 *
 * This file is the ONLY place that imports the `razorpay` SDK or knows
 * about Razorpay-specific field names — everything else in the app talks to
 * the PaymentProvider interface.
 */
export class RazorpayProvider extends PaymentProvider {
  constructor({ keyId, keySecret, webhookSecret }) {
    super();
    if (!keyId || !keySecret) {
      throw new Error('Razorpay keyId/keySecret are not configured (set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)');
    }
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder({ amount, currency, receipt, notes }) {
    // Razorpay orders take amount in the smallest currency unit (paise for INR).
    const order = await this.client.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });
    return { providerOrderId: order.id, amount: order.amount, currency: order.currency };
  }

  verifyCheckoutSignature({ providerOrderId, providerPaymentId, signature }) {
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');
    return timingSafeEqual(expected, signature);
  }

  verifyWebhookSignature({ rawBody, signature }) {
    if (!this.webhookSecret) return false;
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return timingSafeEqual(expected, signature);
  }

  parseWebhookEvent(body) {
    const entity =
      body.payload?.payment?.entity ||
      body.payload?.order?.entity ||
      {};

    return {
      eventId: body.event_id || `${body.event}:${entity.id}:${entity.order_id || ''}`,
      eventType: body.event,
      providerOrderId: entity.order_id || entity.id,
      providerPaymentId: entity.id?.startsWith('pay_') ? entity.id : null,
      status: entity.status,
      method: entity.method,
      failureCode: entity.error_code || null,
      failureReason: entity.error_description || null,
    };
  }
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a || '', 'utf8');
  const bufB = Buffer.from(b || '', 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
