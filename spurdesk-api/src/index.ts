import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import chatRoutes from './routes/chatRoutes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CORS setup
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply logging middleware
app.use(requestLogger);

// Rate Limiter middleware
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // Limit each IP to 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests from this IP. Please try again after a minute.'
  }
});
app.use('/api/', apiLimiter);

// Routing
app.use('/api/chat', chatRoutes);

// Global Error Handler (must be registered last)
app.use(errorHandler);

// Listen on configured port
app.listen(port, () => {
  console.log(`[SpurDesk API] Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode.`);
});
