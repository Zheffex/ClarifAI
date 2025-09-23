import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { IUser } from '../models/User';

// Define role hierarchy levels
const ROLE_LEVELS = {
  viewer: 1,
  analyst: 2,
  admin: 3
} as const;

type UserRole = keyof typeof ROLE_LEVELS;

// Define permissions for each role
const ROLE_PERMISSIONS = {
  viewer: [
    'datasets:read',
    'analytics:read',
    'collaboration:read',
    'profile:read',
    'profile:update'
  ],
  analyst: [
    'datasets:read',
    'datasets:create',
    'datasets:update',
    'analytics:read',
    'analytics:create',
    'analytics:update',
    'collaboration:read',
    'collaboration:create',
    'collaboration:comment',
    'collaboration:annotate',
    'profile:read',
    'profile:update'
  ],
  admin: [
    'datasets:read',
    'datasets:create',
    'datasets:update',
    'datasets:delete',
    'datasets:admin',
    'analytics:read',
    'analytics:create',
    'analytics:update',
    'analytics:delete',
    'analytics:admin',
    'collaboration:read',
    'collaboration:create',
    'collaboration:update',
    'collaboration:delete',
    'collaboration:comment',
    'collaboration:annotate',
    'collaboration:admin',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'profile:read',
    'profile:update',
    'system:admin'
  ]
} as const;

// Middleware to check if user has required role level
export const requireRole = (minimumRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const userRoleLevel = ROLE_LEVELS[user.role as UserRole];
      const requiredRoleLevel = ROLE_LEVELS[minimumRole];

      if (!userRoleLevel || userRoleLevel < requiredRoleLevel) {
        throw new AppError(`Access denied. Required role: ${minimumRole} or higher`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has specific permission
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const userPermissions = ROLE_PERMISSIONS[user.role as UserRole];
      
      if (!userPermissions || !userPermissions.includes(permission as any)) {
        throw new AppError(`Access denied. Required permission: ${permission}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has any of the specified permissions
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const userPermissions = ROLE_PERMISSIONS[user.role as UserRole];
      
      if (!userPermissions) {
        throw new AppError('Access denied. Invalid user role', 403);
      }

      const hasPermission = permissions.some(permission => 
        userPermissions.includes(permission as any)
      );

      if (!hasPermission) {
        throw new AppError(`Access denied. Required permissions: ${permissions.join(' or ')}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user owns resource or has admin privileges
export const requireOwnershipOrAdmin = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      // Admin users have access to everything
      if (user.role === 'admin') {
        next();
        return;
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || 
                           req.body[resourceUserIdField] || 
                           req.query[resourceUserIdField];

      if (!resourceUserId) {
        throw new AppError('Resource ownership cannot be determined', 400);
      }

      if (user._id.toString() !== resourceUserId.toString()) {
        throw new AppError('Access denied. You can only access your own resources', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware for organization-based access control
export const requireOrganizationAccess = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      // Admin users have access to all organizations
      if (user.role === 'admin') {
        next();
        return;
      }

      const resourceOrgId = req.params.organizationId || 
                          req.body.organizationId || 
                          req.query.organizationId;

      if (!resourceOrgId) {
        throw new AppError('Organization ID is required', 400);
      }

      if (!user.organizationId || user.organizationId.toString() !== resourceOrgId.toString()) {
        throw new AppError('Access denied. You can only access resources from your organization', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Utility function to check if user has permission
export const hasPermission = (user: IUser, permission: string): boolean => {
  const userPermissions = ROLE_PERMISSIONS[user.role as UserRole];
  return userPermissions ? userPermissions.includes(permission as any) : false;
};

// Utility function to check if user has role level
export const hasRoleLevel = (user: IUser, minimumRole: UserRole): boolean => {
  const userRoleLevel = ROLE_LEVELS[user.role as UserRole];
  const requiredRoleLevel = ROLE_LEVELS[minimumRole];
  return userRoleLevel >= requiredRoleLevel;
};

// Utility function to get user permissions
export const getUserPermissions = (user: IUser): readonly string[] => {
  return ROLE_PERMISSIONS[user.role as UserRole] || [];
};

// Middleware factory for custom authorization logic
export const authorize = (authorizationFn: (user: IUser, req: Request) => boolean | Promise<boolean>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const isAuthorized = await authorizationFn(user, req);
      
      if (!isAuthorized) {
        throw new AppError('Access denied', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Export constants for use in other modules
export { ROLE_LEVELS, ROLE_PERMISSIONS, UserRole };