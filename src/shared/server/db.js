import mongoose from 'mongoose';
import { config } from './config.js';

// Unit IV: Database Integration - Database Connectivity
// Disable Mongoose command buffering so queries fail fast if DB is disconnected
mongoose.set('bufferCommands', false);

// In Next.js (development & serverless), we cache the mongoose connection
// on the global object so we don't open new MongoDB connections on every request.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDb() {
  // Return active connection if ready
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const uri = config.mongoUri;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Please add MONGODB_URI to your .env.local file (see .env.example).'
    );
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(uri, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDb;
