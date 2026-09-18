import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../shared/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  (req as any).requestId = requestId;
  const start = Date.now();

  res.on('finish', () => {
    const latency = Date.now() - start;
    logger.info('request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latencyMs: latency,
    });
  });

  next();
}