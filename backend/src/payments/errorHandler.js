import { ApiError } from './utils.js';

/**
 * Attached to the end of this module's own routers so its ApiError
 * instances are handled correctly even if the host app's global error
 * handler doesn't recognize this module's own ApiError class (a plain
 * `instanceof` check across two different classes named "ApiError" would
 * otherwise fail and everything would fall through as a generic 500).
 */
// eslint-disable-next-line no-unused-vars
export function paymentsErrorHandler(err, req, res, next) {
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const message = isApiError ? err.message : 'Something went wrong. Please try again.';

  if (!isApiError) {
    console.error('[payments] unexpected error:', err);
  }

  res.status(status).json({ success: false, message, errors: isApiError ? err.errors : [] });
}
