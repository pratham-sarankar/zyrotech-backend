/**
 * Main application entry point
 * Sets up Express server with middleware, routes, and error handling
 */
import 'dotenv/config';
import express, { Request, Response } from 'express';
import connectDB from './config/database';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { verifySMTPConnection } from './utils/emailUtils';

const app = express();
const port = process.env.PORT || 3000;

// Initialize MongoDB connection
connectDB();

// Verify SMTP connection
verifySMTPConnection();

// Global middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// API Routes
app.use('/api/auth', authRoutes); // Mount authentication routes

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Express + TypeScript API' });
});

// Global error handling middleware
app.use(errorHandler);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 