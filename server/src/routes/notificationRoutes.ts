import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get current user's notifications
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve notifications.' });
  }
});

// Mark single notification as read
router.put('/:id/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

export default router;
