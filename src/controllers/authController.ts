/**
 * Authentication Controller
 * Handles user authentication, registration, and verification
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { createOTP, verifyOTP, checkOTPCooldown } from '../utils/otpUtils';
import { sendVerificationEmail } from '../utils/emailUtils';

// JWT configuration
const JWT_EXPIRES_IN = '7d';

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Register a new user
 * @route POST /api/auth/signup
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
export const sendEmailOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
export const verifyEmailOTP = async (req: Request, res: Response, next: NextFunction): Promise<void>=> {
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
 * Login user
 * @route POST /api/auth/login
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

/**
 * Google OAuth authentication
 * @route POST /api/auth/google
 */
export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError('ID token is required', 400);
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AppError('Invalid ID token', 401);
    }

    const {
      email,
      name,
      picture,
      sub: googleId
    } = payload;

    if (!email) {
      throw new AppError('Email is required from Google profile', 400);
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { email },
        { googleId }
      ]
    });

    if (user) {
      // Update user's Google profile if needed
      if (!user.googleId || user.googleId !== googleId) {
        user.googleId = googleId;
        user.fullName = name || user.fullName;
        user.profilePicture = picture || user.profilePicture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        email,
        fullName: name || email.split('@')[0],
        googleId,
        profilePicture: picture,
        isEmailVerified: true // Google emails are pre-verified
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid token')) {
      next(new AppError('Invalid Google ID token', 401));
    } else {
      next(error);
    }
  }
}; 