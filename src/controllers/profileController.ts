import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { createOTP, verifyOTP, checkOTPCooldown } from '../utils/otpUtils';

/**
 * Update phone number and send verification OTP
 * @route POST /api/profile/phone
 * @requires Authentication
 */
export const updatePhoneAndSendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    // Validate required field
    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check cooldown period
    const isInCooldown = await checkOTPCooldown(phoneNumber, 'phone');
    if (isInCooldown) {
      throw new AppError('Please wait before requesting another OTP', 429);
    }

    // Update user's phone number if it's different
    if (user.phoneNumber !== phoneNumber) {
      user.phoneNumber = phoneNumber;
      user.isPhoneVerified = false;
      await user.save();
    }else{
        throw new AppError('Phone number is already verified', 400);
    }

    // TODO: Implement SMS sending functionality
    const otpRecord = await createOTP(phoneNumber, 'phone');
    // await sendVerificationSMS(phoneNumber, otpRecord.otp);

    res.json({ 
      message: 'OTP sent successfully',
      otp: otpRecord.otp, // TODO: Remove this after implementing SMS sending functionality.
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify phone OTP
 * @route POST /api/profile/phone/verify
 * @requires Authentication
 */
export const verifyPhoneOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, otp } = req.body;
    const userId = req.user.id;

    // Verify OTP
    const isValid = await verifyOTP(phoneNumber, otp, 'phone');
    if (!isValid) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Update user verification status
    await User.findOneAndUpdate(
      { _id: userId, phoneNumber },
      { isPhoneVerified: true }
    );

    res.json({ message: 'Phone number verified successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Set user PIN
 * @route POST /api/profile/pin
 * @requires Authentication
 */
export const setPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    // Validate PIN
    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new AppError('PIN must be a 6-digit number', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Hash PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    // Update user's PIN
    user.hashedPin = hashedPin;
    await user.save();

    res.json({ message: 'PIN set successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify user PIN
 * @route POST /api/profile/verify-pin
 * @requires Authentication
 */
export const verifyPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    // Validate PIN
    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new AppError('PIN must be a 6-digit number', 400);
    }

    // Find user with hashedPin
    const user = await User.findById(userId).select('+hashedPin');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if PIN is set
    if (!user.hashedPin) {
      throw new AppError('PIN not set', 400);
    }

    // Verify PIN
    const isValid = await user.comparePin(pin);
    if (!isValid) {
      throw new AppError('Invalid PIN', 401);
    }

    res.json({ message: 'PIN verified successfully' });
  } catch (error) {
    next(error);
  }
}; 