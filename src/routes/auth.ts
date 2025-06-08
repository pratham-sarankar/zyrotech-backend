import express from "express";
import {
  signup,
  login,
  googleAuth,
  sendEmailOTP,
  verifyEmailOTP,
  forgotPassword,
  resetPassword,
  getResetPasswordPage,
  validateResetToken,
} from "../controllers/authController";

const router = express.Router();

// Serve reset password page
router.get("/reset-password", getResetPasswordPage);

// Authentication routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/send-email-otp", sendEmailOTP);
router.post("/verify-email-otp", verifyEmailOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/validate-reset-token", validateResetToken);

export default router;
