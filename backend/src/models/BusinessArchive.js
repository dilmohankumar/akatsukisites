import mongoose from 'mongoose';

/**
 * Businesses that have dropped out of the live top-10 board land here.
 * Keeps the hot `businesses` collection small (always <=10 docs), which is
 * the collection every board read hits — archive reads are rare/manual.
 */
const businessArchiveSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    url: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 140 },
    logo: { type: String, default: null, maxlength: 700_000 },
    amount: { type: Number, required: true, min: 0 },
    // Original claim time, preserved from the source document.
    claimedAt: { type: Date, required: true },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Archive is browsed/sorted by amount, and by when something dropped out.
businessArchiveSchema.index({ amount: -1 });
businessArchiveSchema.index({ archivedAt: -1 });

export default mongoose.model('BusinessArchive', businessArchiveSchema);
