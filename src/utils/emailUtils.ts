/**
 * Email Utilities
 * Handles email sending functionality using Nodemailer
 */
import nodemailer from 'nodemailer';

/**
 * Configure Nodemailer transporter
 * Uses environment variables for SMTP configuration
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Verify SMTP connection configuration
 * Exits process if connection fails
 * @returns {Promise<void>}
 */
export const verifySMTPConnection = async (): Promise<void> => {
  try {
    await transporter.verify();
    console.log('SMTP server connection established and ready to send emails.');
  } catch (error) {
    console.error('SMTP connection failed:', error);
    process.exit(1);
  }
};

/**
 * Send email with OTP or reset link
 * @param {string} email - Recipient email address
 * @param {string} content - OTP or reset link
 * @param {string} type - Type of email ('verification' or 'password-reset')
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 */
export const sendVerificationEmail = async (email: string, content: string, type: 'verification' | 'password-reset'): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: type === 'verification' ? 'Email Verification OTP' : 'Password Reset Request',
      html: type === 'verification' 
        ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
              <strong>${content}</strong>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You have requested to reset your password. Click the link below to proceed:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${content}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
            </div>
            <p>This link will expire in 30 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}; 