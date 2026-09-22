import Order from './models/Order.js';
import { asyncHandler, ok, ApiError } from './utils.js';
import { getPaymentHooks } from './config.js';
import { confirmOrderPaid, markOrderFailed, generatePublicId } from './checkoutService.js';
import { getPaymentProvider } from './providers/index.js';

const ORDER_EXPIRY_MINUTES = Number(process.env.CHECKOUT_ORDER_EXPIRY_MINUTES) || 15;

/**
 * POST /order
 * Body shape is entirely up to the host app's validatePayload hook. The
 * frontend can never send an amount or currency here — the price always
 * comes from the host app's computeAmount hook, and that's the amount
 * actually charged.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const hooks = getPaymentHooks();
  const payload = await hooks.validatePayload(req.body);
  const { amount, currency, meta } = await hooks.computeAmount({ payload });

  const publicOrderId = generatePublicId('ORD');
  const provider = getPaymentProvider();

  let providerOrder;
  try {
    providerOrder = await provider.createOrder({
      amount: Math.round(amount * 100), // paise / smallest currency unit
      currency,
      receipt: publicOrderId,
      notes: { publicOrderId },
    });
  } catch (err) {
    // Nothing was charged and no order was persisted — undo whatever
    // computeAmount reserved rather than leaving it stuck.
    await hooks.releaseAmount(meta);
    console.error('[payments] provider.createOrder failed:', err.error?.description || err.message || err);
    throw new ApiError(502, 'Could not start payment right now. Please try again.');
  }

  const order = await Order.create({
    publicOrderId,
    payload,
    amount,
    currency,
    reservationMeta: meta,
    provider: 'razorpay',
    providerOrderId: providerOrder.providerOrderId,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000),
  });

  return ok(
    res,
    {
      publicOrderId: order.publicOrderId,
      providerOrderId: order.providerOrderId,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    },
    'Checkout order created',
    201
  );
});

/**
 * POST /verify
 * Body: { publicOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
 * Fast-path confirmation right after the provider's Checkout reports
 * success in the browser. This is NOT the only source of truth — the
 * webhook confirms the same order independently and idempotently, so a
 * browser closed before this call still ends with correct fulfillment.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { publicOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};

  if (!publicOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, 'Missing payment verification fields.');
  }

  const order = await Order.findOne({ publicOrderId });
  if (!order) throw new ApiError(404, 'Order not found.');
  if (order.providerOrderId !== razorpayOrderId) {
    // The signature check below would also catch this, but failing fast on
    // a mismatched order id avoids an HMAC compute for a request that was
    // never going to be valid anyway.
    throw new ApiError(400, 'Order mismatch.');
  }

  const provider = getPaymentProvider();
  const valid = provider.verifyCheckoutSignature({
    providerOrderId: razorpayOrderId,
    providerPaymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) throw new ApiError(400, 'Payment verification failed.');

  const { order: confirmedOrder, fulfillmentResult } = await confirmOrderPaid({
    orderId: order._id,
    providerPaymentId: razorpayPaymentId,
  });

  return ok(res, { status: confirmedOrder.status, ...fulfillmentResult }, 'Payment verified');
});

/**
 * POST /order/:publicOrderId/cancel
 * Called by the frontend the moment it knows a checkout didn't succeed —
 * payment failed, or the customer closed the payment modal without paying.
 * Releases whatever computeAmount reserved immediately instead of leaving
 * it stuck until the order's expiry sweep runs.
 *
 * Safe to call on an order that's already PAID/FAILED/EXPIRED — it's a
 * guarded no-op in that case, so a confused or duplicate frontend call
 * can't undo a real payment.
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ publicOrderId: req.params.publicOrderId }).select('_id').lean();
  if (!order) throw new ApiError(404, 'Order not found.');

  await markOrderFailed(order._id, {
    failureCode: 'client_cancelled',
    failureReason: 'Payment was not completed (failed or checkout closed).',
  });

  return ok(res, { status: 'FAILED' }, 'Order cancelled');
});

/**
 * GET /order/:publicOrderId
 * Lightweight status poll — lets the frontend confirm fulfillment went
 * through even if the verify-call response was lost to a network blip.
 */
export const getOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ publicOrderId: req.params.publicOrderId })
    .select('publicOrderId status amount currency fulfilled fulfillmentResult failureReason')
    .lean();
  if (!order) throw new ApiError(404, 'Order not found.');
  return ok(res, { order }, 'Order status fetched');
});
