import express from "express";
import {
  updatePhoneAndSendOTP,
  verifyPhoneOTP,
  setPin,
  verifyPin,
} from "../controllers/profileController";
import { auth } from "../middleware/auth";
import { getMe } from "../controllers/authController";

const router = express.Router();

// Get user profile
router.get("/me", auth, getMe);

// All profile routes require authentication
router.use(auth);

// Phone verification routes
router.put("/phone", updatePhoneAndSendOTP);
router.post("/phone/verify", verifyPhoneOTP);

// PIN routes
router.post("/pin", setPin);
router.post("/verify-pin", verifyPin);

export default router;
