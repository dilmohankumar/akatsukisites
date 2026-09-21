import mongoose from 'mongoose';

/**
 * Singleton document used as an atomic compare-and-swap point for the
 * "next price to claim #1" calculation. Business documents remain the
 * source of truth for what the board displays — this doc exists only so
 * two simultaneous claims can't both compute the same next amount.
 */
const boardMetaSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  topAmount: { type: Number, required: true, default: 0, min: 0 },
});

export default mongoose.model('BoardMeta', boardMetaSchema);
