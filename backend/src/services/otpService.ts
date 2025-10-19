import crypto from 'crypto';
import { OTPVerification, IOTPVerification } from '../models/OTPVerification';
import { EmailService } from './emailService';
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

          // Find latest OTP for this email and type
          const existingOTP = await OTPVerification.findOne({
            email,
            type,
            isUsed: false,
            expiresAt: { $gt: new Date() }
          }).sort({ createdAt: -1 });

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
      let emailSent;
      // Send OTP via email
      if(type === 'email_verification') {
        emailSent = await EmailService.sendOTPEmail(email, otp, firstName);
      } else if(type === 'password_reset') {
        emailSent = await EmailService.sendResetOTPEmail(email, otp, firstName);
      }

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

      // Find latest OTP for this email and type
      const existingOTP = await OTPVerification.findOne({
        email,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

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
      const result = await OTPVerification.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isUsed: true },
          { attempts: { $gte: 5 } }
        ]
      });
      logger.info(`Cleaned up ${result.deletedCount} expired OTP records`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs:', error);
      return 0;
    }


    
  }
}

export const otpService = new OTPService();
