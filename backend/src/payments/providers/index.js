import { RazorpayProvider } from './RazorpayProvider.js';

let instance = null;

/**
 * Returns the configured payment provider, constructed lazily (not at
 * import time) so a missing env var fails loudly the first time a payment
 * route is actually hit, not at process boot before dotenv may have loaded
 * in some environments.
 */
export function getPaymentProvider() {
  if (instance) return instance;

  const provider = process.env.PAYMENT_PROVIDER || 'razorpay';
  if (provider !== 'razorpay') {
    throw new Error(`Unsupported PAYMENT_PROVIDER: ${provider}`);
  }

  instance = new RazorpayProvider({
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  });
  return instance;
}
