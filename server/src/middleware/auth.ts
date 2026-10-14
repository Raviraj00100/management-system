import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  studentProfile?: any;
  staffProfile?: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'college-permission-portal-super-secret-key-2026-production';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: {
          include: {
            department: true,
            class: true,
            academicYear: true,
            hostel: true,
          },
        },
        staffProfile: {
          include: {
            department: true,
            advisorAssignments: {
              include: { class: true, academicYear: true },
            },
            hodAssignments: {
              include: { department: true, academicYear: true },
            },
            wardenAssignments: {
              include: { hostel: true, academicYear: true },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User not found or account deactivated.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentProfile: user.studentProfile,
      staffProfile: user.staffProfile,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: 'Access denied: You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
};
