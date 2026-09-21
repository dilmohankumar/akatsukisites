import mongoose from 'mongoose';

/**
 * A Business is one entry on the "claim #1" board.
 * Rank is never stored directly — it is always derived by sorting on
 * `amount` (desc) and, for ties, `createdAt` (asc, earlier payment wins).
 * This keeps the board self-consistent no matter how many entries exist.
 */
const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [60, 'Business name must be 60 characters or fewer'],
    },
    url: {
      type: String,
      required: [true, 'Website URL is required'],
      trim: true,
      maxlength: [200, 'URL is too long'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [140, 'Description must be 140 characters or fewer'],
    },
    logo: {
      // Small data-URI or hosted image URL. Optional — falls back to initials on the frontend.
      type: String,
      default: null,
      maxlength: [700_000, 'Logo is too large'],
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
  },
  { timestamps: true }
);

// Board reads always sort by amount desc, createdAt asc — index supports that directly.
businessSchema.index({ amount: -1, createdAt: 1 });

export default mongoose.model('Business', businessSchema);
