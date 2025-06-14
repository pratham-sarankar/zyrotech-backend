import express from "express";
import {
  updatePhoneAndSendOTP,
  verifyPhoneOTP,
  setPin,
  verifyPin,
  updatePassword,
} from "../controllers/profileController";
import { auth } from "../middleware/auth";
import { getMe } from "../controllers/authController";
import { AppError } from "../middleware/errorHandler";
import User from "../models/User";

const router = express.Router();

// Get user profile
router.get("/me", auth, getMe);

// All profile routes require authentication
router.use(auth);

/**
 * @route PUT /api/profile
 * @desc Update user profile details (fullName, email, phoneNumber)
 * @access Private
 */
router.put("/", async (req, res, next) => {
  try {
    const { fullName, email, phoneNumber } = req.body;

    // Validate at least one field is provided
    if (!fullName && !email && !phoneNumber) {
      throw new AppError(
        "Please provide at least one field to update",
        400,
        "no-update-fields"
      );
    }

    // Validate fullName if provided
    if (fullName) {
      const nameRegex = /^[a-zA-Z\s.'-]{2,50}$/;
      if (!nameRegex.test(fullName)) {
        throw new AppError(
          "Invalid full name format. Name should be 2-50 characters and contain only letters, spaces, and common name characters",
          400,
          "invalid-full-name"
        );
      }
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        throw new AppError(
          "Please provide a valid email address",
          400,
          "invalid-email"
        );
      }

      // Check if email is already used by another user
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        throw new AppError(
          "Email is already registered",
          409,
          "email-already-exists"
        );
      }
    }

    // Validate phone number if provided
    if (phoneNumber) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new AppError(
          "Please provide a valid phone number",
          400,
          "invalid-phone"
        );
      }

      // Check if phone is already used by another user
      const existingUser = await User.findOne({
        phoneNumber,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        throw new AppError(
          "Phone number is already registered",
          409,
          "phone-already-exists"
        );
      }
    }

    // Prepare update object
    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (email) {
      updateData.email = email;
      updateData.isEmailVerified = false; // Reset email verification
    }
    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber;
      updateData.isPhoneVerified = false; // Reset phone verification
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -hashedPin -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      throw new AppError(
        "Failed to update profile",
        500,
        "profile-update-failed"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Phone verification routes
router.post("/phone", updatePhoneAndSendOTP);
router.post("/verify-phone", verifyPhoneOTP);

// PIN routes
router.post("/pin", setPin);
router.post("/verify-pin", verifyPin);

// Password update route
router.put("/password", updatePassword);

export default router;
