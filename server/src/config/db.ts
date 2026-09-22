import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../shared/logger';

export async function connectDB(): Promise<void> {
  if (!env.mongoUri) {
    logger.warn('MONGODB_URI not set — skipping DB connection');
    return;
  }

  mongoose.set('strictQuery', true);
  mongoose.set('autoIndex', env.nodeEnv !== 'production');

  try {
    await mongoose.connect(env.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });

    logger.info('MongoDB connected', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });
  } catch (err) {
    logger.error('MongoDB connection failed', {
      message: (err as Error).message,
    });
    throw err;
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', { message: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
