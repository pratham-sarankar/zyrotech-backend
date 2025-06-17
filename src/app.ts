/**
 * Main application entry point
 * Sets up Express server with middleware, routes, and error handling
 */
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import kycRoutes from "./routes/kycRoutes";
import botRoutes from "./routes/botRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { verifySMTPConnection } from "./utils/emailUtils";
import { getResetPasswordPage } from "./controllers/authController";

const app = express();
const port = process.env.PORT || 3000;

// Initialize MongoDB connection
connectDB();

// Verify SMTP connection
verifySMTPConnection();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Request logging middleware
if (process.env.NODE_ENV === "development") {
  // Detailed logging for development
  app.use(morgan("dev"));
} else {
  // Standard logging for production
  app.use(morgan("combined"));
}

// Serve reset password page
app.get("/reset-password", getResetPasswordPage);

// API Routes
app.use("/api/auth", authRoutes); // Mount authentication routes
app.use("/api/profile", profileRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/bots", botRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// Health check endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Welcome to Express + TypeScript API" });
});

// Global error handling middleware
app.use(errorHandler);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
