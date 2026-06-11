import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const messageSchema = z.object({
  message: z.string({
    required_error: 'Message is required.',
    invalid_type_error: 'Message must be a string.'
  })
  .trim()
  .min(1, 'Message cannot be empty.')
  .max(2000, 'Message exceeds maximum length.'),
  
  sessionId: z.string().uuid('Invalid sessionId format (must be a UUID).').optional()
});

export function validateMessageInput(req: Request, res: Response, next: NextFunction) {
  try {
    messageSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]?.message || 'Invalid input.';
      return res.status(400).json({
        error: true,
        message: firstError,
        requestId: req.requestId
      });
    }
    next(error);
  }
}
