import crypto from 'crypto';
import SupportTicket from '../models/SupportTicket.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, ApiError } from '../utils/apiResponse.js';
import { validateSupportPayload } from '../utils/validators.js';

function generateRefCode() {
  const num = crypto.randomInt(10000, 99999);
  return `VRT-${num}`;
}

const DUPLICATE_WINDOW_MS = 60 * 1000;

/**
 * POST /api/support
 * Creates a support ticket and returns a reference code the person can quote.
 */
export const createTicket = asyncHandler(async (req, res) => {
  // Honeypot: a real visitor never sees or fills this field (hidden off-screen
  // in the form). A bot filling every field in a scraped form will. Return a
  // normal-looking success without touching the database — no point telling
  // the bot it was caught, and no point spending a DB write on it either.
  if (typeof req.body.company === 'string' && req.body.company.trim() !== '') {
    return ok(res, { refCode: generateRefCode() }, 'Support ticket created', 201);
  }

  const payload = validateSupportPayload(req.body);

  // Duplicate-submission guard: a double-click or a browser retrying a timed-out
  // request shouldn't create two tickets. If the same person submitted the same
  // topic in the last minute, hand back that ticket instead of making a new one.
  const recentDuplicate = await SupportTicket.findOne({
    email: payload.email,
    topic: payload.topic,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (recentDuplicate) {
    return ok(res, { refCode: recentDuplicate.refCode }, 'Support ticket created', 201);
  }

  let refCode;
  let attempts = 0;
  // Extremely unlikely to collide, but guard against it rather than trust randomness blindly.
  do {
    refCode = generateRefCode();
    attempts += 1;
    // eslint-disable-next-line no-await-in-loop
  } while ((await SupportTicket.exists({ refCode })) && attempts < 5);

  let ticket;
  try {
    ticket = await SupportTicket.create({ ...payload, refCode });
  } catch (err) {
    // Extremely unlikely: the pre-check passed but another request grabbed
    // the same refCode first. Surface a retryable error instead of a generic 500.
    if (err.code === 11000) {
      throw new ApiError(409, 'Could not generate a reference code — please try again.');
    }
    throw err;
  }

  return ok(res, { refCode: ticket.refCode }, 'Support ticket created', 201);
});
