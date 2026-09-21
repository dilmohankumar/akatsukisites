/**
 * Contract every payment provider adapter must implement. The rest of the
 * app (checkout controller, webhook controller) talks only to this
 * interface — never to a provider SDK directly — so a second provider can
 * be added later without touching checkout/webhook logic.
 *
 * @typedef {Object} ProviderOrder
 * @property {string} providerOrderId
 * @property {number} amount    - smallest currency unit (paise for INR)
 * @property {string} currency
 *
 * @typedef {Object} WebhookEvent
 * @property {string} eventId       - provider's unique event id (for dedupe)
 * @property {string} eventType     - e.g. 'payment.captured', 'payment.failed'
 * @property {string} providerOrderId
 * @property {string} providerPaymentId
 * @property {string} status
 * @property {string} [method]
 * @property {string} [failureCode]
 * @property {string} [failureReason]
 */
export class PaymentProvider {
  /** @returns {Promise<ProviderOrder>} */
  // eslint-disable-next-line no-unused-vars
  async createOrder({ amount, currency, receipt, notes }) {
    throw new Error('createOrder not implemented');
  }

  /**
   * Verifies the signature the provider's checkout script hands back to the
   * frontend after payment. This is a fast, synchronous confirmation for UX
   * only — the webhook remains the authoritative source of truth.
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  verifyCheckoutSignature({ providerOrderId, providerPaymentId, signature }) {
    throw new Error('verifyCheckoutSignature not implemented');
  }

  /**
   * Verifies a raw webhook request signature using the provider's official
   * HMAC mechanism. Must run against the raw request body bytes, not a
   * re-serialized JSON object.
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  verifyWebhookSignature({ rawBody, signature }) {
    throw new Error('verifyWebhookSignature not implemented');
  }

  /**
   * Normalizes a provider-specific webhook payload into the common
   * WebhookEvent shape above.
   * @returns {WebhookEvent}
   */
  // eslint-disable-next-line no-unused-vars
  parseWebhookEvent(parsedBody) {
    throw new Error('parseWebhookEvent not implemented');
  }
}
