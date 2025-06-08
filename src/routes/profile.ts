import express from 'express';
import { updatePhoneAndSendOTP, verifyPhoneOTP } from '../controllers/profileController';
import { auth } from '../middleware/auth';

const router = express.Router();

// All profile routes require authentication
router.use(auth);

// Phone verification routes
router.put('/phone', updatePhoneAndSendOTP);
router.post('/phone/verify', verifyPhoneOTP);

export default router; 