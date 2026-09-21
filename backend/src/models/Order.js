import mongoose from 'mongoose';

/**
 * A checkout intent for claiming #1. Separate from Payment because one
 * order could, in principle, have more than one payment attempt — and
 * because "did the customer commit to buy" and "did money actually move"
 * are different questions with different failure modes.
 */
const orderSchema = new mongoose.Schema(
  {
    publicOrderId: { type: String, required: true, unique: true },

    // The claim draft this order is paying for — copied here (not just
    // referenced) so payment and business-creation stay consistent even if
    // the customer's browser is closed long before the webhook lands.
    claimDraft: {
      name: { type: String, required: true, trim: true, maxlength: 60 },
      url: { type: String, required: true, trim: true, maxlength: 200 },
      description: { type: String, required: true, trim: true, maxlength: 140 },
      logo: { type: String, default: null, maxlength: 700_000 },
    },

    // Price locked at order-creation time via the atomic BoardMeta CAS —
    // this is what gets charged, and never recalculated afterwards.
    amount: { type: Number, required: true, min: 0 }, // rupees
    prevAmount: { type: Number, default: null }, // for rollback if this order never pays
    currency: { type: String, required: true, default: 'INR' },

    provider: { type: String, required: true, default: 'razorpay' },
    providerOrderId: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
      default: 'CREATED',
      required: true,
    },

    // Set exactly once, the moment the entitlement (Business doc) is created.
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },

    failureCode: { type: String, default: null },
    failureReason: { type: String, default: null },

    paidAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Expiry sweep scans for stale pending orders.
orderSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model('Order', orderSchema);
