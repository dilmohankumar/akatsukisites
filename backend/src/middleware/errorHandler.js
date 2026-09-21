import { ApiError } from '../utils/apiResponse.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isApiError = err instanceof ApiError;

  // Belt-and-suspenders: our own validators should catch bad input before it
  // ever reaches Mongoose, but if anything slips through, surface it as a
  // proper 422 with field errors instead of a generic 500.
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  const status = isApiError ? err.status : err.status || 500;

  // ApiError messages are always hand-written by us to be safe to show —
  // even at a 5xx status (e.g. "payment provider unavailable"). Only an
  // *unexpected* error (not one of ours) gets its message replaced, since
  // that one could contain a stack trace, a DB error string, etc.
  const message = !isApiError && status >= 500 ? 'Something went wrong. Please try again.' : err.message;

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    message,
    errors: isApiError ? err.errors : [],
  });
}
