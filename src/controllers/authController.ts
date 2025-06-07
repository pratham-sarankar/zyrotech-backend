/**
 * Authentication Controller
 * Handles user authentication, registration, and verification
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { createOTP, verifyOTP, checkOTPCooldown } from '../utils/otpUtils';
import { sendVerificationEmail } from '../utils/emailUtils';

// JWT configuration
const JWT_EXPIRES_IN = '7d';

/**
 * Register a new user
 * @route POST /api/auth/signup
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      throw new AppError('Please provide all required fields', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      password
    });

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      userId: user._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send email verification OTP
 * @route POST /api/auth/send-email-otp
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const sendEmailOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    // Validate required field
    if (!email) {
      throw new AppError('Email is required', 400);
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found. Please sign up first.', 404);
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    // Check cooldown period
    const isInCooldown = await checkOTPCooldown(email, 'email');
    if (isInCooldown) {
      throw new AppError('Please wait before requesting another OTP', 429);
    }

    // Generate and send OTP
    const otpRecord = await createOTP(email, 'email');
    await sendVerificationEmail(email, otpRecord.otp);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email OTP
 * @route POST /api/auth/verify-email-otp
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const verifyEmailOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    const isValid = await verifyOTP(email, otp, 'email');
    if (!isValid) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Update user verification status
    await User.findOneAndUpdate(
      { email },
      { isEmailVerified: true }
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Send phone verification OTP
 * @route POST /api/auth/send-phone-otp
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const sendPhoneOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber } = req.body;

    // Validate required field
    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    // Check if user exists with this phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new AppError('No user found with this phone number', 404);
    }

    // Check if phone number is already verified
    if (user.isPhoneVerified) {
      throw new AppError('Phone number is already verified', 400);
    }

    // Check cooldown period
    const isInCooldown = await checkOTPCooldown(phoneNumber, 'phone');
    if (isInCooldown) {
      throw new AppError('Please wait before requesting another OTP', 429);
    }

    // Generate and send OTP
    const otpRecord = await createOTP(phoneNumber, 'phone');
    // TODO: Implement SMS sending functionality
    console.log(`Phone OTP for ${phoneNumber}: ${otpRecord.otp}`);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify phone OTP
 * @route POST /api/auth/verify-phone-otp
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const verifyPhoneOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber, otp } = req.body;

    const isValid = await verifyOTP(phoneNumber, otp, 'phone');
    if (!isValid) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Update user verification status
    await User.findOneAndUpdate(
      { phone: phoneNumber },
      { isPhoneVerified: true }
    );

    res.json({ message: 'Phone number verified successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Find user and check password
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check email verification
    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    // Check phone verification only if phone number exists
    if (user.phoneNumber && !user.isPhoneVerified) {
      throw new AppError('Please verify your phone number before logging in', 403);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        ...(user.phoneNumber && { isPhoneVerified: user.isPhoneVerified })
      }
    });
  } catch (error) {
    next(error);
  }
}; 