import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import householdRoutes from './routes/households';
import utilityServiceRoutes from './routes/utilityServices';
import meterReadingRoutes from './routes/meterReadings';
import billingRoutes from './routes/billing';
import reportsRoutes from './routes/reports';
import authRoutes from './routes/auth';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authenticate } from './middleware/auth';

// Import Swagger configuration
import { setupSwagger } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development to fix Swagger UI
})); // Security headers
app.use(compression()); // Gzip compression
app.use(limiter); // Rate limiting
app.use(morgan('combined')); // Logging
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173'|| 'https://5173.code.gargit.se').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup Swagger
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/households', authenticate, householdRoutes);
app.use('/api/utility-services', authenticate, utilityServiceRoutes);
app.use('/api/meter-readings', meterReadingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportsRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gröngräset Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  console.log(`📖 API Documentation available at:`);
  console.log(`   • http://localhost:${PORT}/api-docs`);
  console.log(`   • http://192.168.11.7:${PORT}/api-docs`);
});

export default app;
