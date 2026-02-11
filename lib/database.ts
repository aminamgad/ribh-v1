import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-ecommerce';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Cached global connection to avoid multiple connections in Next.js (serverless / hot-reload).
// Each process/instance has its own cache; total DB connections ≈ (number of instances) × maxPoolSize.
// Keep maxPoolSize low so Atlas connection count stays under limit. Do NOT set maxPoolSize in the URI.
const g = (typeof globalThis !== 'undefined' ? globalThis : global) as { mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } };
let cached = g.mongoose ?? null;
if (!cached) {
  cached = { conn: null, promise: null };
  g.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  // Reuse existing connection if cache was lost but Mongoose is still connected (e.g. after HMR).
  if (mongoose.connection.readyState === 1) {
    cached!.conn = mongoose;
    return mongoose;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 2,
      minPoolSize: 0,
      maxIdleTimeMS: 60000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export { connectDB };
export default connectDB; 