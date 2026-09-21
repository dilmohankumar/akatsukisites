import crypto from 'crypto';
import Business from '../models/Business.js';
import BusinessArchive from '../models/BusinessArchive.js';
import BoardMeta from '../models/BoardMeta.js';
import { ApiError } from '../utils/apiResponse.js';
import { invalidateBoardCache } from './boardCache.js';

const BASE_ENTRY_AMOUNT = Number(process.env.BASE_ENTRY_AMOUNT) || 1000;
// Flat step-up per claim (not a multiplier) — keeps pricing predictable and,
// unlike doubling, never runs into the payment gateway's max-amount limit.
const CLAIM_INCREMENT_AMOUNT = Number(process.env.CLAIM_INCREMENT_AMOUNT) || 1000;
const TOP_N = 10;

/**
 * Returns the singleton meta doc, creating it from the current board state
 * the first time it's needed (e.g. after deploying this change to an
 * existing database that already has businesses in it).
 */
export async function ensureBoardMeta() {
  let meta = await BoardMeta.findById('singleton').lean();
  if (meta) return meta;

  const current = await Business.findOne().sort({ amount: -1, createdAt: 1 }).lean();
  const topAmount = current ? current.amount : 0;

  meta = await BoardMeta.findOneAndUpdate(
    { _id: 'singleton' },
    { $setOnInsert: { topAmount } },
    { upsert: true, new: true }
  ).lean();
  return meta;
}

/**
 * Atomically reserves the next claim amount using compare-and-swap on the
 * singleton meta doc, so two simultaneous checkouts can never be quoted (and
 * charged) the same price. Called once, at checkout-order creation — NOT at
 * payment confirmation, because the amount charged by the payment provider
 * must be fixed before the customer pays.
 *
 * If the resulting payment never completes (abandoned/failed/expired), the
 * caller MUST call releaseReservation to undo this, otherwise the "next
 * price" would stay inflated forever from a payment nobody made.
 */
export async function reserveNextAmount() {
  await ensureBoardMeta();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const meta = await BoardMeta.findById('singleton').lean();
    const prevAmount = meta.topAmount;
    const nextAmount = prevAmount > 0 ? prevAmount + CLAIM_INCREMENT_AMOUNT : BASE_ENTRY_AMOUNT;

    // eslint-disable-next-line no-await-in-loop
    const updated = await BoardMeta.findOneAndUpdate(
      { _id: 'singleton', topAmount: prevAmount },
      { $set: { topAmount: nextAmount } }
    );

    if (updated) {
      invalidateBoardCache();
      return { amount: nextAmount, prevAmount: prevAmount || null };
    }
  }

  throw new ApiError(409, 'The top spot changed hands just now — please try again.');
}

/**
 * Best-effort rollback of a reservation that never turned into a paid claim
 * (payment failed / checkout abandoned / order expired). Only restores the
 * price if nobody has reserved a higher amount since — if someone else has
 * already moved the price on, we leave it alone rather than clobber their
 * reservation. Worst case on a race here: the displayed "next price" stays
 * one step higher than the true top until the next successful claim
 * naturally corrects it — a display inconvenience, not a security issue.
 */
export async function releaseReservation({ amount, prevAmount }) {
  if (amount == null) return;
  await BoardMeta.findOneAndUpdate({ _id: 'singleton', topAmount: amount }, { $set: { topAmount: prevAmount || 0 } });
  invalidateBoardCache();
}

/**
 * Keeps the hot `businesses` collection capped at TOP_N docs. Anything past
 * rank 10 is moved into `businessarchives` — never deleted, just relocated.
 */
export async function archiveOverflow() {
  const all = await Business.find().sort({ amount: -1, createdAt: 1 }).lean();
  if (all.length <= TOP_N) return;

  const overflow = all.slice(TOP_N);
  const archiveDocs = overflow.map(({ _id, name, url, description, logo, amount, createdAt }) => ({
    _id,
    name,
    url,
    description,
    logo,
    amount,
    claimedAt: createdAt,
  }));

  await BusinessArchive.insertMany(archiveDocs, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err;
  });
  await Business.deleteMany({ _id: { $in: overflow.map((b) => b._id) } });
}

export function generatePublicId(prefix) {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${year}-${random}`;
}

export { BASE_ENTRY_AMOUNT, CLAIM_INCREMENT_AMOUNT, TOP_N };
