import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    topic: { type: String, required: true, trim: true, maxlength: 140 },
    details: { type: String, trim: true, maxlength: 2000, default: '' },
    refCode: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
  },
  { timestamps: true }
);

// Supports the duplicate-submission check (same email+topic within the last
// minute) without a collection scan.
supportTicketSchema.index({ email: 1, topic: 1, createdAt: -1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
