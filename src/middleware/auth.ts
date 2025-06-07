/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

/**
 * JWT payload interface
 */
interface JwtPayload {
  userId: string;
}

/**
 * Extend Express Request type to include user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

/**
 * Middleware to check if user's email is verified
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const requireEmailVerification = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({ error: 'Your email is not verified yet.' });
  }
  next();
};

/**
 * Middleware to check if user's phone is verified
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const requirePhoneVerification = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user.isPhoneVerified) {
    return res.status(403).json({ error: 'Your phone number is not verified yet.' });
  }
  next();
}; 