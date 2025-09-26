import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../config/logger';
import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize email service
   */
  static initialize(): void {
    if (!process.env.EMAIL_HOST) {
      logger.warn('Email service not configured - EMAIL_HOST not set');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        } : undefined
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send OTP verification email
   */
  static async sendOTPEmail(email: string, otp: string, firstName?: string): Promise<boolean> {
    if (!this.transporter) {
      logger.error('Email service not initialized');
      return false;
    }

    const displayName = firstName ? ` ${firstName}` : '';
    const siteName = process.env.SITE_NAME || 'ClarifAI';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - ${siteName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .otp-box { background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${siteName}</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <h2>Hello${displayName}!</h2>
              <p>Thank you for registering with ${siteName}. To complete your registration, please verify your email address using the One-Time Password (OTP) below:</p>

              <div class="otp-box">
                <p>Your verification code is:</p>
                <div class="otp-code">${otp}</div>
                <p style="margin-top: 15px; color: #6b7280;">This code will expire in 10 minutes</p>
              </div>

              <div class="warning">
                <strong>Security Note:</strong> Never share this code with anyone. ${siteName} will never ask for your OTP via phone or email.
              </div>

              <p>If you didn't request this verification, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 ${siteName}. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Hello${displayName}!

Thank you for registering with ${siteName}. To complete your registration, please verify your email address using the One-Time Password (OTP) below:

Your verification code is: ${otp}

This code will expire in 10 minutes.

Security Note: Never share this code with anyone. ${siteName} will never ask for your OTP via phone or email.

If you didn't request this verification, please ignore this email.

© 2024 ${siteName}. All rights reserved.
This is an automated message, please do not reply to this email.
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"${siteName}" <noreply@clarifai.com>`,
        to: email,
        subject: `Verify Your Email - ${siteName}`,
        text: textContent,
        html: htmlContent
      });

      logger.info(`OTP verification email sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send OTP email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  static async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    if (!this.transporter) {
      logger.error('Email service not initialized');
      return false;
    }

    const siteName = process.env.SITE_NAME || 'ClarifAI';
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${siteName}!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to ${siteName}!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              <p>Your email has been successfully verified and your account is now active. Welcome to ${siteName}!</p>

              <p>You can now start exploring our powerful data analysis and AI-driven insights platform.</p>

              <div style="text-align: center;">
                <a href="${siteUrl}" class="cta-button">Get Started</a>
              </div>

              <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>

              <p>Thank you for joining us!</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 ${siteName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"${siteName}" <noreply@clarifai.com>`,
        to: email,
        subject: `Welcome to ${siteName}!`,
        html: htmlContent
      });

      logger.info(`Welcome email sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
      return false;
    }
  }
}
export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      // Check if email configuration exists
      const emailConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };

      // Only create transporter if config is available
      if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransporter(emailConfig);
        this.isConfigured = true;
        logger.info('Email service configured successfully');
      } else {
        logger.warn('Email service not configured - missing environment variables');
        this.isConfigured = false;
      }
    } catch (error) {
      logger.error('Failed to configure email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'ClarifAI <noreply@clarifai.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendOTPEmail(email: string, otp: string, firstName: string): Promise<boolean> {
    const subject = 'ClarifAI - Email Verification';
    const text = `Hello ${firstName},\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this verification, please ignore this email.\n\nBest regards,\nClarifAI Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; background: white; padding: 20px; border-radius: 5px; margin: 20px 0; letter-spacing: 3px; }
          .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ClarifAI</h1>
            <h2>Email Verification</h2>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName}</strong>,</p>
            <p>Welcome to ClarifAI! Please verify your email address by entering the following verification code:</p>
            <div class="otp-code">${otp}</div>
            <p><strong>This code will expire in 10 minutes.</strong></p>
            <p>If you didn't create an account with ClarifAI, please ignore this email.</p>
            <p>Best regards,<br>The ClarifAI Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
