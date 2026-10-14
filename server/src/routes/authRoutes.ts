import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'college-permission-portal-super-secret-key-2026-production';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ message: 'Invalid email or password format' });
      return;
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'This account has been deactivated. Contact an administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await createAuditLog(user.id, 'USER_LOGIN', 'User', user.id, { email: user.email, role: user.role }, req);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        studentProfile: user.studentProfile,
        staffProfile: user.staffProfile,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      studentProfile: user.studentProfile,
      staffProfile: user.staffProfile,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

router.post('/change-password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect current password' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await createAuditLog(user.id, 'CHANGE_PASSWORD', 'User', user.id, {}, req);

    res.json({ message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update password' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }
  // Generic safe message to prevent user enumeration
  res.json({
    message: 'If an account exists with this email, instructions have been sent or please contact your college administrator.',
  });
});

router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  if (req.user) {
    await createAuditLog(req.user.id, 'USER_LOGOUT', 'User', req.user.id, {}, req);
  }
  res.json({ message: 'Logged out successfully' });
});

export default router;
