/**
 * User Model
 * Defines the schema and methods for user authentication and verification
 */
import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Interface for User document
 */
export interface IUser extends Document {
  fullName: string;
  email: string;
  phoneNumber?: string; // Optional phone number
  password?: string;
  googleId?: string;
  profilePicture?: string;
  hashedPin?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
  comparePin(candidatePin: string): Promise<boolean>;
}

/**
 * User Schema
 * Defines the structure and validation rules for user documents
 */
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined values while maintaining uniqueness
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in query results by default
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  profilePicture: {
    type: String,
    trim: true
  },
  hashedPin: {
    type: String,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new) and exists
  if (!this.isModified('password') || !this.password) return next();

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Compare password with hashed password
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

/**
 * Compare PIN with hashed PIN
 * @param {string} candidatePin - PIN to compare
 * @returns {Promise<boolean>} True if PINs match
 */
userSchema.methods.comparePin = async function(candidatePin: string): Promise<boolean> {
  try {
    if (!this.hashedPin) return false;
    return await bcrypt.compare(candidatePin, this.hashedPin);
  } catch (error) {
    throw error;
  }
};

export default mongoose.model<IUser>('User', userSchema);