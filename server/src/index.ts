import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();

// Middleware
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    mongo: 'pending',  // updated Day 3
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

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(env.port, () => {
  logger.info('Server started', {
    port: env.port,
    env: env.nodeEnv,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

export default app;
