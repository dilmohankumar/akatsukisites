import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and configure it.');
  }

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      // 10 was the Mongoose default and fine for light dev traffic, but too
      // small once real concurrent write bursts (checkout, verify, webhook)
      // start queuing behind it. 50 is a reasonable ceiling for a single
      // app instance — MongoDB Atlas free/shared tiers cap total incoming
      // connections in the low hundreds, so this leaves headroom instead of
      // claiming it alone. Recalculate this if the app is ever horizontally
      // scaled to multiple instances (each gets its own pool of this size).
      maxPoolSize: 50,
      minPoolSize: 2,
    });
    console.log(`[db] connected to MongoDB at ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });
}
