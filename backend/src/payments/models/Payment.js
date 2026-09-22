import mongoose from 'mongoose';

/**
 * One record per actual gateway payment attempt against an Order. Never
 * stores card/UPI credentials — those never reach this server, the
 * provider's hosted Checkout collects them directly.
 */
const paymentSchema = new mongoose.Schema(
  {
    publicPaymentId: { type: String, required: true, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

    provider: { type: String, required: true, default: 'razorpay' },
    providerPaymentId: { type: String, required: true, unique: true },
    providerOrderId: { type: String, required: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },

    status: {
      type: String,
      enum: ['CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
      required: true,
    },
    method: { type: String, default: null }, // upi | card | netbanking | wallet ...

    failureCode: { type: String, default: null },
    failureReason: { type: String, default: null },

    refundStatus: {
      type: String,
      enum: ['NONE', 'REQUESTED', 'PROCESSING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'],
      default: 'NONE',
    },

    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ orderId: 1 });

export default mongoose.model('Payment', paymentSchema);
