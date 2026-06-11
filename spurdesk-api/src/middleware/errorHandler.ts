import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.requestId || 'unknown';
  const statusCode = err.status || err.statusCode || 500;
  
  console.error(`[${requestId}] [ERROR]`, err);

  const errorResponse = {
    error: true,
    message: err.message || 'Internal server error.',
    requestId
  };

  res.status(statusCode).json(errorResponse);
}
