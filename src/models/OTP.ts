import mongoose from 'mongoose';

/**
 * Interface representing an OTP (One-Time Password) document
 * @interface IOTP
 * @extends {mongoose.Document}
 */
export interface IOTP extends mongoose.Document {
  /** Email address associated with the OTP (optional) */
  email?: string;
  /** Phone number associated with the OTP (optional) */
  phone?: string;
  /** The generated OTP code */
  otp: string;
  /** Type of OTP - either for email or phone verification */
  type: 'email' | 'phone';
  /** Timestamp when the OTP expires */
  expiresAt: Date;
  /** Timestamp when the OTP was created */
  createdAt: Date;
}

/**
 * Mongoose schema for OTP model
 * Handles both email and phone verification OTPs
 */
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true // Ensures email is stored in lowercase
  },
  phone: {
    type: String,
    trim: true // Removes whitespace from phone numbers
  },
  otp: {
    type: String,
    required: true // OTP code is mandatory
  },
  type: {
    type: String,
    enum: ['email', 'phone'], // Restricts type to either 'email' or 'phone'
    required: true
  },
  expiresAt: {
    type: Date,
    required: true // Expiry timestamp is mandatory
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// TTL index that automatically deletes documents when they expire
// MongoDB will remove documents when current time > expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export the OTP model with IOTP interface typing
export default mongoose.model<IOTP>('OTP', otpSchema);