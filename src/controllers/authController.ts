/**
 * Authentication Controller
 * Handles user authentication, registration, and verification
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import path from "path";
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { createOTP, verifyOTP, checkOTPCooldown } from "../utils/otpUtils";
import { sendVerificationEmail } from "../utils/emailUtils";

// JWT configuration
const JWT_EXPIRES_IN = "7d";

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
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      throw new AppError(
        "Please provide all required fields",
        400,
        "missing-required-fields"
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User already exists", 409, "email-already-exists");
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      password,
    });

    res.status(201).json({
      message: "Account created. Please verify your email.",
      userId: user._id,
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
export const sendEmailOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    // Validate required field
    if (!email) {
      throw new AppError("Email is required", 400, "missing-email");
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(
        "User not found. Please sign up first.",
        404,
        "user-not-found"
      );
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      throw new AppError(
        "Email is already verified",
        400,
        "email-already-verified"
      );
    }

    // Check cooldown period
    const isInCooldown = await checkOTPCooldown(email, "email");
    if (isInCooldown) {
      throw new AppError(
        "Please wait before requesting another OTP",
        429,
        "otp-cooldown"
      );
    }

    // Generate and send OTP
    const otpRecord = await createOTP(email, "email");
    await sendVerificationEmail(email, otpRecord.otp, "verification");

    res.json({ message: "OTP sent successfully" });
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
export const verifyEmailOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const isValid = await verifyOTP(email, otp, "email");
    if (!isValid) {
      throw new AppError("Invalid or expired OTP", 400, "invalid-otp");
    }

    // Update user verification status
    await User.findOneAndUpdate({ email }, { isEmailVerified: true });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError(
        "Please provide email and password",
        400,
        "missing-credentials"
      );
    }

    // Find user and check if they exist
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AppError(
        "Invalid email or password",
        401,
        "invalid-credentials"
      );
    }

    // Check if user is Google-authenticated
    if (user.googleId && !user.password) {
      throw new AppError(
        "This account was created using Google. Please sign in with Google.",
        401,
        "google-auth-required"
      );
    }

    // Check password
    if (!(await user.comparePassword(password))) {
      throw new AppError(
        "Invalid email or password",
        401,
        "invalid-credentials"
      );
    }

    // Check email verification
    if (!user.isEmailVerified) {
      throw new AppError(
        "Please verify your email before logging in",
        403,
        "email-not-verified"
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        ...(user.phoneNumber && { isPhoneVerified: user.isPhoneVerified }),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth authentication
 * @route POST /api/auth/google
 */
export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError("ID token is required", 400, "missing-id-token");
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_IOS_CLIENT_ID) {
      throw new AppError(
        "Google Client IDs are not configured",
        500,
        "google-config-error"
      );
    }

    // Verify the Google ID token
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_IOS_CLIENT_ID,
        ],
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError("Invalid ID token", 401, "invalid-google-token");
      }

      const { email, name, picture, sub: googleId } = payload;

      if (!email) {
        throw new AppError(
          "Email is required from Google profile",
          400,
          "missing-google-email"
        );
      }

      // Find or create user
      let user = await User.findOne({
        $or: [{ email }, { googleId }],
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
          fullName: name || email.split("@")[0],
          googleId,
          profilePicture: picture,
          isEmailVerified: true, // Google emails are pre-verified
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        message: "Google authentication successful",
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Wrong recipient")) {
          throw new AppError(
            "Invalid Google Client ID configuration",
            500,
            "invalid-google-config"
          );
        }
        if (error.message.includes("Token used too late")) {
          throw new AppError(
            "Google token has expired",
            401,
            "expired-google-token"
          );
        }
        if (error.message.includes("Invalid token")) {
          throw new AppError(
            "Invalid Google ID token",
            401,
            "invalid-google-token"
          );
        }
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Serve reset password page
 * @route GET /reset-password
 */
export const getResetPasswordPage = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.sendFile(path.join(__dirname, "../views/reset-password.html"));
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "missing-email");
    }

    // Find user and select reset password fields
    const user = await User.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );
    if (!user) {
      // Don't reveal if email exists
      res.json({
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token and expiration
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    // Send reset email with the reset page URL
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/reset-password?token=${resetToken}`;
    await sendVerificationEmail(email, resetUrl, "password-reset");

    res.json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!token || !newPassword || !confirmPassword) {
      throw new AppError(
        "Token, new password, and confirm password are required",
        400,
        "missing-reset-fields"
      );
    }

    if (newPassword !== confirmPassword) {
      throw new AppError("Passwords do not match", 400, "passwords-dont-match");
    }

    if (newPassword.length < 8) {
      throw new AppError(
        "Password must be at least 8 characters long",
        400,
        "password-too-short"
      );
    }

    // Hash the token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token and expiration
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      throw new AppError(
        "Invalid or expired reset token",
        400,
        "invalid-reset-token"
      );
    }

    // Update password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate reset password token
 * @route POST /api/auth/validate-reset-token
 */
export const validateResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError("Token is required", 400, "missing-token");
    }

    // Hash the token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token and expiration
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      throw new AppError(
        "Invalid or expired reset token",
        400,
        "invalid-reset-token"
      );
    }

    res.json({ message: "Token is valid" });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // Return user profile without sensitive data
    res.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};
