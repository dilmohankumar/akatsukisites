import Order from '../models/Order.js';
import Business from '../models/Business.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, ApiError } from '../utils/apiResponse.js';
import { validateClaimPayload } from '../utils/validators.js';
import { reserveNextAmount, releaseReservation, generatePublicId } from '../services/boardPricing.js';
import { confirmOrderPaid, markOrderFailed } from '../services/checkoutService.js';
import { getPaymentProvider, CURRENCY } from '../services/payments/index.js';

const ORDER_EXPIRY_MINUTES = Number(process.env.CHECKOUT_ORDER_EXPIRY_MINUTES) || 15;

/**
 * POST /api/checkout/order
 * Body: { name, url, description, logo? } — the claim draft, nothing else.
 * The frontend can never send an amount or currency here; the price is
 * always determined server-side (see reserveNextAmount) at the moment the
 * order is created, and that's the amount actually charged.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const claimDraft = validateClaimPayload(req.body);

  const { amount, prevAmount } = await reserveNextAmount();
  const publicOrderId = generatePublicId('ORD');

  const provider = getPaymentProvider();
  let providerOrder;
  try {
    providerOrder = await provider.createOrder({
      amount: Math.round(amount * 100), // paise
      currency: CURRENCY,
      receipt: publicOrderId,
      notes: { publicOrderId, businessName: claimDraft.name },
    });
  } catch (err) {
    // Nothing was charged and no order was persisted — undo the price
    // reservation immediately rather than leaving the price stuck high.
    await releaseReservation({ amount, prevAmount });
    // Razorpay SDK errors carry the useful message under err.error.description,
    // not err.message — log both so this never shows up as "undefined" again.
    console.error('[checkout] provider.createOrder failed:', err.error?.description || err.message || err);
    throw new ApiError(502, 'Could not start payment right now. Please try again.');
  }

  const order = await Order.create({
    publicOrderId,
    claimDraft,
    amount,
    prevAmount,
    currency: CURRENCY,
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
 * POST /api/checkout/verify
 * Body: { publicOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
 * Fast-path confirmation right after Razorpay's Checkout reports success in
 * the browser. This is NOT the only source of truth — the webhook
 * (webhookController.razorpayWebhook) confirms the same order independently
 * and idempotently, so a browser closed before this call still ends with a
 * correctly activated claim.
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
    // a mismatched order id avoids doing an HMAC compute for a request that
    // was never going to be valid anyway.
    throw new ApiError(400, 'Order mismatch.');
  }

  const provider = getPaymentProvider();
  const valid = provider.verifyCheckoutSignature({
    providerOrderId: razorpayOrderId,
    providerPaymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!valid) {
    throw new ApiError(400, 'Payment verification failed.');
  }

  const { order: confirmedOrder, business } = await confirmOrderPaid({
    orderId: order._id,
    providerPaymentId: razorpayPaymentId,
  });

  const resolvedBusiness = business || (confirmedOrder.businessId && (await Business.findById(confirmedOrder.businessId).lean()));
  const board = await Business.find().sort({ amount: -1, createdAt: 1 }).limit(10).lean();
  const rank = resolvedBusiness ? board.findIndex((b) => String(b._id) === String(resolvedBusiness._id)) + 1 : null;

  return ok(
    res,
    {
      status: confirmedOrder.status,
      business: resolvedBusiness,
      rank: rank || null,
      board,
    },
    'Payment verified'
  );
});

/**
 * POST /api/checkout/order/:publicOrderId/cancel
 * Called by the frontend the moment it knows a checkout didn't succeed —
 * Razorpay's checkout reported payment.failed, or the customer closed the
 * payment modal without paying. This releases the price reservation
 * immediately instead of leaving the "next price" artificially inflated
 * until the order's 15-minute expiry sweep runs.
 *
 * Safe to call on an order that's already PAID/FAILED/EXPIRED — it's a
 * guarded no-op in that case (see markOrderFailed's status filter), so a
 * confused or duplicate frontend call can't undo a real payment.
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
 * GET /api/checkout/order/:publicOrderId
 * Lightweight status poll — lets the frontend confirm activation went
 * through even if the verify-call response was lost to a network blip
 * (the webhook may have confirmed it in the meantime).
 */
export const getOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ publicOrderId: req.params.publicOrderId })
    .select('publicOrderId status amount currency businessId failureReason')
    .lean();
  if (!order) throw new ApiError(404, 'Order not found.');
  return ok(res, { order }, 'Order status fetched');
});
