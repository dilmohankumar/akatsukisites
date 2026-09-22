# payments/

A self-contained, drop-in Razorpay checkout + webhook module. Copy this
entire folder into any Node/Express + MongoDB (Mongoose) project and wire it
up with the steps below — nothing in here imports anything from outside this
folder.

It gives you: order creation with server-locked pricing, Razorpay Checkout
integration, signature-verified payment confirmation (both the fast
frontend-callback path and the authoritative webhook path), idempotent
fulfillment (a webhook delivered 10 times still only fulfills once), and
an order-expiry sweep for abandoned checkouts.

It knows nothing about what you're selling. You tell it via four hooks.

## 1. Install the one dependency

```
npm install razorpay
```

## 2. Add environment variables

```
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
CHECKOUT_ORDER_EXPIRY_MINUTES=15
```

Get test keys instantly (no KYC needed) from the Razorpay dashboard, Test
Mode → Settings → API Keys. The webhook secret is one you type in yourself
when you add the webhook (Settings → Webhooks) — same value in both places.

## 3. Configure the hooks (the only file you write)

Create one file in your own app, e.g. `src/paymentsConfig.js`:

```js
import { configurePayments } from './payments/index.js';

configurePayments({
  // Validate the raw checkout request body. Throw on invalid input.
  // Whatever you return is stored and handed back to you in onPaymentConfirmed.
  async validatePayload(body) {
    if (!body.planId) throw new Error('planId is required');
    return { planId: body.planId, userId: body.userId };
  },

  // Server-side price. NEVER trust an amount from the frontend.
  // `meta` is anything you need later to undo this reservation.
  async computeAmount({ payload }) {
    const plan = await Plan.findById(payload.planId).lean();
    return { amount: plan.price, currency: 'INR', meta: { planId: plan._id } };
  },

  // Runs exactly once, the moment payment is verified. Do the actual
  // fulfillment here. Whatever you return goes back to the frontend.
  async onPaymentConfirmed({ order }) {
    const sub = await Subscription.create({ userId: order.payload.userId, planId: order.payload.planId });
    return { subscription: sub };
  },

  // Optional — undo computeAmount's reservation on failure/expiry.
  async releaseAmount(meta) {
    // e.g. release a held coupon, decrement a reserved-seats counter, etc.
  },
});
```

Import this file once, near the top of your app's entry point, before any
request can reach the payment routes (module-level code in it runs on import).

## 4. Mount the routes

The webhook route needs the **raw** request body (for signature
verification) — mount it with `express.raw()` **before** your global
`express.json()` middleware, or its signature check will always fail:

```js
import express from 'express';
import { checkoutRoutes, webhookRoutes, startOrderExpirySweep } from './payments/index.js';
import './paymentsConfig.js'; // registers the hooks — import before the routes are used

const app = express();

app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '256kb' }), webhookRoutes);

app.use(express.json());
// ...your other app middleware...

app.use('/api/checkout', checkoutRoutes);

startOrderExpirySweep(); // call once, after connecting to MongoDB
```

## 5. Frontend

Load Razorpay's Checkout script, `POST /api/checkout/order` with whatever
`validatePayload` expects, open `new window.Razorpay({...})` with the
returned `providerOrderId`/`amount`/`currency`/`keyId`, and on its `handler`
callback `POST /api/checkout/verify` with the four fields Razorpay hands
back (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`,
plus your `publicOrderId`). See the host app's `frontend/src/App.jsx` for a
complete reference implementation, including handling `payment.failed` /
modal-dismiss correctly (release the reservation, but don't treat a
mid-retry failure as final — Razorpay keeps its modal open for retries).

## What this module does NOT do

- Doesn't know about users, auth, plans, or subscriptions — that's 100%
  your hooks.
- Doesn't cache anything — pricing/fulfillment hooks run on every request;
  cache inside your own hooks if you need to.
- In-memory rate limiting only — if you run this behind multiple app
  instances, swap `express-rate-limit`'s store for a Redis-backed one.
- Single-process order-expiry sweep — fine for one instance; for multiple,
  either accept the (harmless) redundant sweeps or move it to a proper job
  scheduler.
