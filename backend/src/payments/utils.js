/**
 * Minimal, self-contained helpers so this module doesn't depend on the host
 * app's own error/response conventions. If the host app already has its
 * own ApiError/asyncHandler/response-shape utilities, feel free to delete
 * this file and swap the imports in checkoutController.js/webhookController.js
 * for the host app's own — nothing else in this folder depends on it.
 */

export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
