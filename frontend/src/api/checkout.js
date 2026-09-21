import client from './client.js';

export const createCheckoutOrder = (draft) => client.post('/checkout/order', draft).then((res) => res.data);

export const verifyCheckoutPayment = (payload) => client.post('/checkout/verify', payload).then((res) => res.data);

export const getCheckoutOrderStatus = (publicOrderId) =>
  client.get(`/checkout/order/${publicOrderId}`).then((res) => res.data);

export const cancelCheckoutOrder = (publicOrderId) =>
  client.post(`/checkout/order/${publicOrderId}/cancel`).then((res) => res.data);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Fires the same cancel request via navigator.sendBeacon, which (unlike a
 * normal fetch/axios call) is guaranteed by the browser to actually be sent
 * even while the page is unloading — a tab close or hard refresh kills an
 * in-flight axios request before it reaches the network, but a beacon
 * survives it. Used as a last-resort release of the price reservation when
 * the customer leaves mid-checkout instead of using Razorpay's own close
 * button (which the normal cancelCheckoutOrder call already handles).
 */
export function beaconCancelCheckoutOrder(publicOrderId) {
  if (!publicOrderId || typeof navigator.sendBeacon !== 'function') return;
  const blob = new Blob([], { type: 'text/plain' }); // empty body — the endpoint needs none
  navigator.sendBeacon(`${API_BASE}/checkout/order/${publicOrderId}/cancel`, blob);
}
