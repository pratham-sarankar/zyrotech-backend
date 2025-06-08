import express from 'express';
import {
  signup,
  login,
  sendEmailOTP,
  verifyEmailOTP
} from '../controllers/authController';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/send-email-otp', sendEmailOTP);
router.post('/verify-email-otp', verifyEmailOTP);

export default router; 