import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { startOrderExpirySweep } from './payments/index.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`[server] TopSpot API listening on port ${PORT}`);
  });

  startOrderExpirySweep();

  // Let in-flight requests finish and close the DB connection cleanly instead
  // of the process being killed mid-request during a container restart/deploy.
  function shutdown(signal) {
    console.log(`[server] ${signal} received, shutting down gracefully`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
