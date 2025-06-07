/**
 * Error Handling Middleware
 * Provides custom error handling and error classes
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error class
 * Extends Error class with additional properties for error handling
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  /**
   * Create a new application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Handles both operational and programming errors
 * @param {Error | AppError} err - Error object
 * @param {Request} _req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} _next - Express next middleware function
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Log unexpected errors
  console.error('ERROR 💥', err);

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
}; 