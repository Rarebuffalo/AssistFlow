import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request to hold custom properties
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  req.requestId = requestId;
  const startTime = Date.now();
  const sessionId = req.body?.sessionId || req.query?.sessionId || req.params?.sessionId || 'none';

  console.log(`[${requestId}] [START] ${req.method} ${req.originalUrl} - Session: ${sessionId}`);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] [END] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Time: ${duration}ms`);
  });

  next();
}
