let loadingPromise = null;

/**
 * Loads Razorpay's hosted Checkout script once and caches the promise, so
 * repeated "Pay" clicks don't inject the script tag multiple times. This is
 * Razorpay's own script — no card/UPI details are ever collected by our
 * frontend or sent to our backend.
 */
export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadingPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loadingPromise;
}
