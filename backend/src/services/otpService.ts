import crypto from 'crypto';
import { OTPVerification, IOTPVerification } from '../models/OTPVerification';
import { emailService } from './emailService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export interface GenerateOTPResult {
  success: boolean;
  message: string;
  canResend?: boolean;
  nextResendTime?: Date;
}

export interface VerifyOTPResult {
  success: boolean;
  message: string;
  attemptsLeft?: number;
}

class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN_MINUTES = 2;

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Generate and send OTP for email verification
   */
  async generateAndSendOTP(
    email: string, 
    firstName: string, 
    type: 'email_verification' | 'password_reset' = 'email_verification'
  ): Promise<GenerateOTPResult> {
    try {
      email = email.toLowerCase();

      // Check if there's a recent OTP that's still valid
      const existingOTP = await OTPVerification.findLatestByEmail(email, type);
      if (existingOTP) {
        const timeDiff = Date.now() - existingOTP.createdAt.getTime();
        const cooldownMs = this.RESEND_COOLDOWN_MINUTES * 60 * 1000;

        if (timeDiff < cooldownMs) {
          const nextResendTime = new Date(existingOTP.createdAt.getTime() + cooldownMs);
          return {
            success: false,
            message: `Please wait ${this.RESEND_COOLDOWN_MINUTES} minutes before requesting a new OTP`,
            canResend: false,
            nextResendTime
          };
        }
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Invalidate any existing OTPs for this email and type
      await OTPVerification.updateMany(
        { email, type, isUsed: false },
        { $set: { isUsed: true } }
      );

      // Create new OTP record
      const otpRecord = new OTPVerification({
        email,
        otp,
        type,
        expiresAt,
        attempts: 0,
        isUsed: false
      });

      await otpRecord.save();

      // Send OTP via email
      const emailSent = await emailService.sendOTPEmail(email, otp, firstName);

      if (!emailSent) {
        // If email sending fails, mark OTP as used to prevent misuse
        otpRecord.isUsed = true;
        await otpRecord.save();

        return {
          success: false,
          message: 'Failed to send verification email. Please try again later.',
          canResend: true
        };
      }

      logger.info(`OTP generated and sent for ${email} (type: ${type})`);

      return {
        success: true,
        message: 'Verification code sent to your email address',
        canResend: true
      };

    } catch (error) {
      logger.error('Error generating OTP:', error);
      return {
        success: false,
        message: 'Failed to generate verification code. Please try again.',
        canResend: true
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    email: string, 
    otp: string, 
    type: 'email_verification' | 'password_reset' = 'email_verification'
  ): Promise<VerifyOTPResult> {
    try {
      email = email.toLowerCase();

      // Find the OTP record
      const otpRecord = await OTPVerification.findOne({
        email,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or expired verification code'
        };
      }

      // Check if max attempts reached
      if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
        otpRecord.isUsed = true;
        await otpRecord.save();

        return {
          success: false,
          message: 'Too many failed attempts. Please request a new verification code.'
        };
      }

      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();

      // Verify OTP
      if (otpRecord.otp !== otp) {
        const attemptsLeft = this.MAX_ATTEMPTS - otpRecord.attempts;
        return {
          success: false,
          message: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
          attemptsLeft
        };
      }

      // OTP is valid - mark as used
      otpRecord.isUsed = true;
      await otpRecord.save();

      logger.info(`OTP verified successfully for ${email} (type: ${type})`);

      return {
        success: true,
        message: 'Verification successful'
      };

    } catch (error) {
      logger.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Failed to verify code. Please try again.'
      };
    }
  }

  /**
   * Check if user can request a new OTP
   */
  async canRequestNewOTP(email: string, type: 'email_verification' | 'password_reset' = 'email_verification'): Promise<{
    canRequest: boolean;
    nextResendTime?: Date;
    message?: string;
  }> {
    try {
      email = email.toLowerCase();
import crypto from 'crypto';
import { logger } from '../config/logger';

interface OTPData {
  code: string;
  email: string;
  expiresAt: Date;
  attempts: number;
}

// In-memory storage for OTPs (in production, use Redis or database)
const otpStore = new Map<string, OTPData>();

// Clean expired OTPs every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, otpData] of otpStore.entries()) {
    if (otpData.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class OTPService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 3;

  /**
   * Generate a new OTP for the given email
   */
  static generateOTP(email: string): string {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpData: OTPData = {
      code: otp,
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0
    };

    // Store OTP with email as key
    otpStore.set(email.toLowerCase(), otpData);

    logger.info(`OTP generated for email: ${email}`);
    return otp;
  }

  /**
   * Verify OTP for the given email
   */
  static verifyOTP(email: string, providedOTP: string): { success: boolean; message: string } {
    const normalizedEmail = email.toLowerCase();
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData) {
      return { success: false, message: 'OTP not found or expired' };
    }

    // Check if OTP has expired
    if (otpData.expiresAt < new Date()) {
      otpStore.delete(normalizedEmail);
      return { success: false, message: 'OTP has expired' };
    }

    // Check if max attempts reached
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      otpStore.delete(normalizedEmail);
      return { success: false, message: 'Maximum OTP attempts reached' };
    }

    // Increment attempts
    otpData.attempts++;

    // Verify OTP
    if (otpData.code === providedOTP.trim()) {
      otpStore.delete(normalizedEmail);
      logger.info(`OTP verified successfully for email: ${email}`);
      return { success: true, message: 'OTP verified successfully' };
    }

    return { success: false, message: 'Invalid OTP' };
  }

  /**
   * Check if OTP exists and is still valid for the given email
   */
  static hasValidOTP(email: string): boolean {
    const normalizedEmail = email.toLowerCase();
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData) {
      return false;
    }

    if (otpData.expiresAt < new Date()) {
      otpStore.delete(normalizedEmail);
      return false;
    }

    return true;
  }

  /**
   * Remove OTP for the given email
   */
  static clearOTP(email: string): void {
    otpStore.delete(email.toLowerCase());
  }

  /**
   * Get remaining attempts for OTP
   */
  static getRemainingAttempts(email: string): number {
    const normalizedEmail = email.toLowerCase();
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData || otpData.expiresAt < new Date()) {
      return 0;
    }

    return Math.max(0, this.MAX_ATTEMPTS - otpData.attempts);
  }
}
      const existingOTP = await OTPVerification.findLatestByEmail(email, type);
      if (!existingOTP) {
        return { canRequest: true };
      }

      const timeDiff = Date.now() - existingOTP.createdAt.getTime();
      const cooldownMs = this.RESEND_COOLDOWN_MINUTES * 60 * 1000;

      if (timeDiff < cooldownMs) {
        const nextResendTime = new Date(existingOTP.createdAt.getTime() + cooldownMs);
        return {
          canRequest: false,
          nextResendTime,
          message: `Please wait ${this.RESEND_COOLDOWN_MINUTES} minutes before requesting a new code`
        };
      }

      return { canRequest: true };

    } catch (error) {
      logger.error('Error checking OTP request eligibility:', error);
      return { 
        canRequest: true // Allow request on error to avoid blocking users
      };
    }
  }

  /**
   * Cleanup expired OTPs (for periodic maintenance)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const result = await OTPVerification.cleanupExpired();
      logger.info(`Cleaned up ${result.deletedCount} expired OTP records`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }
}

export const otpService = new OTPService();
