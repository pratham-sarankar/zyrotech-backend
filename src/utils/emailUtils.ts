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
     console.error('Current SMTP configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER,
    });
    await transporter.verify();
    console.log('SMTP server connection established and ready to send emails.');
  } catch (error) {
    console.error('SMTP connection failed:', error);
    process.exit(1);
  }
};

/**
 * Send verification email with OTP
 * @param {string} email - Recipient email address
 * @param {string} otp - One-time password for verification
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 */
export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${otp}</strong>
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
}; 