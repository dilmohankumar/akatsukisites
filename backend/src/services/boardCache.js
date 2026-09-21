/**
 * Tiny in-process TTL cache for the two hottest read endpoints (GET /board,
 * GET /board/next-price) — these are fetched on every single page load
 * (see frontend useBoard.js), so under a traffic burst the exact same query
 * result gets requested by hundreds of clients within the same second.
 *
 * A short TTL (a few seconds) absorbs that burst without meaningfully
 * changing what anyone perceives as "live" — but MUST be invalidated the
 * moment a claim actually succeeds, otherwise a real paying customer
 * wouldn't see themselves at #1 immediately. See confirmOrderPaid, which
 * calls invalidateBoardCache() right after creating the Business doc.
 *
 * In-process only — correct as long as this runs as a single Node process.
 * If this is ever horizontally scaled to multiple instances, this cache
 * needs to move to Redis (or be removed) so instances don't disagree.
 */
const TTL_MS = 2000;

let boardEntry = null; // { value, expiresAt }
let priceEntry = null;

export function getCachedBoard() {
  if (boardEntry && boardEntry.expiresAt > Date.now()) return boardEntry.value;
  return null;
}

export function setCachedBoard(value) {
  boardEntry = { value, expiresAt: Date.now() + TTL_MS };
}

export function getCachedNextPrice() {
  if (priceEntry && priceEntry.expiresAt > Date.now()) return priceEntry.value;
  return null;
}

export function setCachedNextPrice(value) {
  priceEntry = { value, expiresAt: Date.now() + TTL_MS };
}

export function invalidateBoardCache() {
  boardEntry = null;
  priceEntry = null;
}
