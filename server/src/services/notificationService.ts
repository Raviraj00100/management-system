import { prisma } from '../prisma';

export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' = 'INFO',
  link?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
