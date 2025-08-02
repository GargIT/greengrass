import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';

// Define UserRole enum locally until we can import it properly
enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = JWTService.verifyAccessToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'The provided token is invalid or expired',
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This resource requires one of the following roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);

export const requireHouseholdAccess = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in to access this resource',
    });
    return;
  }

  // Admin can access all household data
  if (req.user.role === UserRole.ADMIN) {
    next();
    return;
  }

  // Members can only access their own household data
  const householdId = req.params.householdId || req.body.householdId;
  
  if (req.user.role === UserRole.MEMBER && req.user.householdId !== householdId) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only access data for your own household',
    });
    return;
  }

  next();
};
