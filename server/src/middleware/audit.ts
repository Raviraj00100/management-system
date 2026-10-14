import { Request } from 'express';
import { prisma } from '../prisma';

export async function createAuditLog(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: any,
  req?: Request
) {
  try {
    const ipAddress = req?.ip || req?.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'System';

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
