/**
 * MongoDB database connection configuration
 * Handles connection to MongoDB and error handling
 */
import mongoose from 'mongoose';

/**
 * Establishes connection to MongoDB database
 * Uses environment variable MONGODB_URI or falls back to local MongoDB
 * @throws {Error} If connection fails
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zyrotech';
    await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected successfully to ${mongoose.connection.host}:${mongoose.connection.port}`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;