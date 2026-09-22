/**
 * The ONE integration point of this module. A host app calls
 * configurePayments({...}) once at startup (before any request can hit the
 * payment routes) with four hooks that encode everything app-specific:
 * what's being paid for, how much it costs, and what "paid" means for that
 * app. This file (and everything else in payments/) never imports an
 * app-specific model or business rule — that's what makes it copy-pasteable
 * into a different project as-is.
 *
 * Required hooks:
 *
 *   validatePayload(body) -> payload
 *     Validate/sanitize the raw request body for "start a checkout".
 *     Throw on invalid input (e.g. your own ApiError). Whatever you return
 *     is stored on the Order and handed back to you in onPaymentConfirmed —
 *     put here whatever you need to fulfill the order later.
 *
 *   computeAmount({ payload }) -> { amount, currency, meta }
 *     Server-side price calculation — the frontend NEVER supplies an
 *     amount. `amount` is in the currency's major unit (e.g. rupees, not
 *     paise). `meta` is anything you need to undo this later (e.g. a
 *     reservation record, a coupon hold) — opaque to this module, passed
 *     back to you verbatim in releaseAmount.
 *
 *   onPaymentConfirmed({ order, providerPaymentId, method }) -> result
 *     Called exactly once per order, the moment payment is verified
 *     (whichever happens first: the frontend verify call or the webhook).
 *     Do the actual fulfillment here (create a record, activate a
 *     subscription, allocate credits, whatever "paid" means for your app).
 *     Whatever you return is cached on the order and returned to the
 *     frontend from POST /checkout/verify.
 *
 * Optional hooks:
 *
 *   releaseAmount(meta) -> void
 *     Undo whatever computeAmount reserved, when an order fails, is
 *     cancelled, or expires unpaid. Defaults to a no-op — implement this if
 *     your pricing has any reserve-then-release semantics (most apps with
 *     a fixed price list don't need to).
 *
 *   onPaymentFailed({ order }) -> void
 *     Extra side effects on failure, beyond releaseAmount (e.g. logging,
 *     notifying the user). Defaults to a no-op.
 */
let hooks = null;

const REQUIRED_HOOKS = ['validatePayload', 'computeAmount', 'onPaymentConfirmed'];

export function configurePayments(custom) {
  for (const key of REQUIRED_HOOKS) {
    if (typeof custom?.[key] !== 'function') {
      throw new Error(`configurePayments: missing required hook "${key}"`);
    }
  }
  hooks = {
    releaseAmount: async () => {},
    onPaymentFailed: async () => {},
    ...custom,
  };
}

export function getPaymentHooks() {
  if (!hooks) {
    throw new Error(
      'payments module used before configurePayments(...) was called. ' +
        'See payments/README.md — the host app must register its hooks at startup.'
    );
  }
  return hooks;
}
