import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'analyst' | 'viewer';
  organizationId?: mongoose.Types.ObjectId;
  preferences: Record<string, any>;
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  fullName: string;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'analyst', 'viewer'],
      message: 'Role must be either admin, analyst, or viewer'
    },
    required: [true, 'User role is required'],
    default: 'viewer'
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: false
  },
  preferences: {
    type: Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(v: any) {
        return typeof v === 'object' && v !== null;
      },
      message: 'Preferences must be an object'
    }
  },
  lastLogin: {
    type: Date,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc: any, ret: any) {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function(this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ organizationId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function(): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

userSchema.statics.findByRole = function(role: string) {
  return this.find({ role, isActive: true });
};

userSchema.statics.findByOrganization = function(organizationId: string) {
  return this.find({ organizationId, isActive: true });
};

export const User = mongoose.model<IUser>('User', userSchema);