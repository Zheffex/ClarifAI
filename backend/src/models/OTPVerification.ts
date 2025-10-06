import mongoose, { Document, Schema } from 'mongoose';

export interface IOTPVerification extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  otp: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOTPVerificationModel extends mongoose.Model<IOTPVerification> {
  findValidOTP(email: string, otp: string, type?: string): Promise<IOTPVerification | null>;
  findLatestByEmail(email: string, type?: string): Promise<IOTPVerification | null>;
  cleanupExpired(): Promise<any>;
}

const otpVerificationSchema = new Schema<IOTPVerification>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: 6,
    match: [/^\d{6}$/, 'OTP must be exactly 6 digits']
  },
  type: {
    type: String,
    enum: {
      values: ['email_verification', 'password_reset'],
      message: 'Type must be either email_verification or password_reset'
    },
    required: [true, 'OTP type is required'],
    default: 'email_verification'
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  },
  attempts: {
    type: Number,
    default: 0,
    max: [5, 'Maximum 5 attempts allowed']
  },
  isUsed: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc: any, ret: any) {
      delete ret.otp; // Never expose OTP in JSON
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    transform: function(doc: any, ret: any) {
      delete ret.otp; // Never expose OTP in object
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance and cleanup
otpVerificationSchema.index({ email: 1, type: 1 });
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
otpVerificationSchema.index({ createdAt: -1 });

// Static methods
otpVerificationSchema.statics.findValidOTP = function(email: string, otp: string, type: string = 'email_verification') {
  return this.findOne({
    email: email.toLowerCase(),
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 }
  });
};

otpVerificationSchema.statics.findLatestByEmail = function(email: string, type: string = 'email_verification') {
  return this.findOne({
    email: email.toLowerCase(),
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

otpVerificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true },
      { attempts: { $gte: 5 } }
    ]
  });
};

export const OTPVerification = mongoose.model<IOTPVerification, IOTPVerificationModel>('OTPVerification', otpVerificationSchema);
