import OTP, { IOTP } from '../models/OTP';

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOTP = async (
  emailOrPhone: string,
  type: 'email' | 'phone',
  expiryMinutes: number = 5
): Promise<IOTP> => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const otpData = {
    otp,
    type,
    expiresAt,
    ...(type === 'email' ? { email: emailOrPhone } : { phone: emailOrPhone })
  };

  return OTP.create(otpData);
};

export const verifyOTP = async (
  emailOrPhone: string,
  otp: string,
  type: 'email' | 'phone'
): Promise<boolean> => {
  const otpRecord = await OTP.findOne({
    otp,
    type,
    ...(type === 'email' ? { email: emailOrPhone } : { phone: emailOrPhone }),
    expiresAt: { $gt: new Date() }
  });

  if (!otpRecord) {
    return false;
  }

  // Delete the OTP after successful verification
  await OTP.deleteOne({ _id: otpRecord._id });
  return true;
};

export const checkOTPCooldown = async (
  emailOrPhone: string,
  type: 'email' | 'phone',
  cooldownSeconds: number = 60
): Promise<boolean> => {
  const recentOTP = await OTP.findOne({
    type,
    ...(type === 'email' ? { email: emailOrPhone } : { phone: emailOrPhone }),
    createdAt: { $gt: new Date(Date.now() - cooldownSeconds * 1000) }
  });

  return !!recentOTP;
}; 