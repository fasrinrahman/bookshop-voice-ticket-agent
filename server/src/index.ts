import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { connectDB, isDBConnected } from './config/db';
import { logger } from './shared/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { notFound } from './middleware/notFound';

const app = express();

// Security
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(cors({ origin: env.clientUrl, credentials: true }));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Logging
app.use(requestLogger);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  const mongoUp = isDBConnected();
  res.status(mongoUp ? 200 : 503).json({
    status: mongoUp ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    mongo: mongoUp ? 'up' : 'down',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Root
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'BVTA API',
    version: '1.0.0',
    docs: '/health',
  });
});

// 404
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function start(): Promise<void> {
  try {
    await connectDB();

    const server = app.listen(env.port, () => {
      logger.info('Server started', {
        port: env.port,
        env: env.nodeEnv,
      });
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down');
      server.close(() => process.exit(0));
    });
  } catch (err) {
    logger.error('Failed to start server', {
      message: (err as Error).message,
    });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

start();

export default app;