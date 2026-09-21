import { useEffect, useRef, useState } from 'react';
import Stars from './components/Stars.jsx';
import Header from './components/Header.jsx';
import Throne from './components/Throne.jsx';
import Top10List from './components/Top10List.jsx';
import ClaimForm from './components/ClaimForm.jsx';
import PayStep from './components/PayStep.jsx';
import SuccessView from './components/SuccessView.jsx';
import SupportModal from './components/SupportModal.jsx';
import Footer from './footer/Footer.jsx';
import { useBoard } from './hooks/useBoard.js';
import { createCheckoutOrder, verifyCheckoutPayment, cancelCheckoutOrder, beaconCancelCheckoutOrder } from './api/checkout.js';
import { loadRazorpayScript } from './utils/loadRazorpay.js';

const VIEWS = { THRONE: 'throne', FORM: 'form', PAY: 'pay', SUCCESS: 'success' };

export default function App() {
  const { board, current, nextPrice, loading, error, refresh } = useBoard();
  const [view, setView] = useState(VIEWS.THRONE);
  const [draft, setDraft] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);

  // Tracks the order currently awaiting payment, so it can be released if
  // the customer leaves the page (tab close, hard refresh, back button)
  // instead of using Razorpay's own close button. A ref, not state — the
  // pagehide listener below needs the latest value without re-subscribing.
  const pendingOrderIdRef = useRef(null);

  useEffect(() => {
    function handlePageHide() {
      if (pendingOrderIdRef.current) {
        beaconCancelCheckoutOrder(pendingOrderIdRef.current);
      }
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  function goToThrone() {
    setDraft(null);
    setResult(null);
    setPayError(null);
    setView(VIEWS.THRONE);
    refresh();
  }

  function goToForm() {
    setView(VIEWS.FORM);
  }

  function goToPay(formValues) {
    setDraft(formValues);
    setPayError(null);
    setView(VIEWS.PAY);
  }

  async function handlePay() {
    if (!draft) return;
    setSubmitting(true);
    setPayError(null);

    try {
      // Server decides and locks the real price here — the browser never
      // sends an amount, and nothing is charged until the customer
      // completes Razorpay's own secure checkout below.
      const order = await createCheckoutOrder(draft);
      pendingOrderIdRef.current = order.publicOrderId;

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Could not load the secure payment page. Check your connection and try again.');
      }

      const previousAmount = current?.amount ?? null;

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.keyId,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          name: 'AkatuskiSites',
          description: `Claim #1 — ${draft.name}`,
          order_id: order.providerOrderId,
          prefill: { name: draft.name },
          theme: { color: '#0057FF' },
          // Pay Later and EMI both involve credit/installment eligibility
          // checks that don't fit a one-time payment like this — hide them
          // so the checkout only shows methods that settle immediately.
          config: {
            display: {
              hide: [{ method: 'paylater' }, { method: 'emi' }],
            },
          },
          handler: async (response) => {
            try {
              const verified = await verifyCheckoutPayment({
                publicOrderId: order.publicOrderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              pendingOrderIdRef.current = null;
              setResult({ business: verified.business, previousAmount });
              setView(VIEWS.SUCCESS);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              // Release the reserved price immediately instead of leaving the
              // "next price" inflated until this order's 15-minute expiry.
              pendingOrderIdRef.current = null;
              cancelCheckoutOrder(order.publicOrderId).catch(() => {});
              reject(new Error('Payment window closed before completing.'));
            },
          },
        });

        // IMPORTANT: Razorpay fires this on EVERY failed attempt, not just
        // when the customer gives up — the checkout modal stays open with
        // its own "Retry payment" screen after a decline, and a later retry
        // in that same still-open modal can still succeed. Cancelling the
        // order here (as this used to do) would mark it FAILED while the
        // customer is still retrying, so a subsequent real successful
        // payment's verify call gets silently ignored (the order is no
        // longer PENDING). The order should only be released when the modal
        // actually closes — that's what `ondismiss` above is for.
        razorpay.on('payment.failed', () => {
          // No-op by design — see note above. Razorpay's own UI already
          // shows the decline reason and a retry option.
        });

        razorpay.open();
      });
    } catch (err) {
      setPayError(err.message || 'Payment could not be completed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stars />
      <Header crumb={view !== VIEWS.THRONE && view !== VIEWS.SUCCESS} onCrumbClick={goToThrone} onLogoClick={goToThrone} />

      <main className="wrap">
        {view === VIEWS.THRONE && (
          <>
            <Throne business={current} nextPrice={nextPrice} onClaimClick={goToForm} />
            <Top10List board={board} loading={loading} error={error} />
          </>
        )}

        {view === VIEWS.FORM && <ClaimForm onCancel={goToThrone} onContinue={goToPay} />}

        {view === VIEWS.PAY && draft && (
          <PayStep
            draft={draft}
            nextPrice={nextPrice}
            previousAmount={current?.amount ?? null}
            onCancel={goToThrone}
            onPay={handlePay}
            submitting={submitting}
            serverError={payError}
          />
        )}

        {view === VIEWS.SUCCESS && result && (
          <SuccessView business={result.business} previousAmount={result.previousAmount} onBackToBoard={goToThrone} />
        )}
      </main>

      <Footer onRaiseTicket={() => setSupportOpen(true)} />
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
