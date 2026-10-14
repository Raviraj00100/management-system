import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();

// Enforce ADMIN role across all admin routes
router.use(authenticate, requireRole(['ADMIN']));

// 1. Dashboard System Statistics & Overview
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalStaff,
      totalApplications,
      pendingAdvisor,
      pendingHOD,
      pendingWarden,
      approvedApps,
      rejectedApps,
      overdueReturns,
      departmentStats,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: { in: ['CLASS_ADVISOR', 'HOD', 'WARDEN'] } } }),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'PENDING_CLASS_ADVISOR' } }),
      prisma.application.count({ where: { status: 'PENDING_HOD' } }),
      prisma.application.count({ where: { status: 'PENDING_WARDEN' } }),
      prisma.application.count({ where: { status: 'APPROVED' } }),
      prisma.application.count({ where: { status: 'REJECTED' } }),
      prisma.application.count({
        where: {
          type: 'OUTPASS',
          status: { in: ['OUTPASS_ISSUED', 'OVERDUE_RETURN'] },
          expectedReturnTime: { lt: new Date() },
        },
      }),
      prisma.department.findMany({
        include: {
          _count: {
            select: { students: true, classes: true, staff: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
    ]);

    res.json({
      totalUsers,
      totalStudents,
      totalStaff,
      totalApplications,
      pendingAdvisor,
      pendingHOD,
      pendingWarden,
      approvedApps,
      rejectedApps,
      overdueReturns,
      departmentStats,
      recentAuditLogs,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve stats' });
  }
});

// 2. Users Management
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;
    const where: any = {};
    if (role && typeof role === 'string') {
      where.role = role;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
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
            advisorAssignments: { include: { class: true } },
            hodAssignments: { include: { department: true } },
            wardenAssignments: { include: { hostel: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
});

// Create User (Student or Staff)
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['STUDENT', 'CLASS_ADVISOR', 'HOD', 'WARDEN', 'ADMIN']),
  phone: z.string().optional(),
  // Student fields
  studentId: z.string().optional(),
  departmentId: z.string().optional(),
  classId: z.string().optional(),
  academicYearId: z.string().optional(),
  isHosteller: z.boolean().optional(),
  hostelId: z.string().optional(),
  roomNumber: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  // Staff fields
  staffCode: z.string().optional(),
  designation: z.string().optional(),
});

router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = createUserSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ message: 'Validation error', errors: parse.error.format() });
      return;
    }

    const data = parse.data;

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      res.status(400).json({ message: 'A user with this email already exists.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: hashedPassword,
          name: data.name,
          role: data.role,
          phone: data.phone,
        },
      });

      if (data.role === 'STUDENT') {
        if (!data.studentId || !data.departmentId || !data.classId || !data.academicYearId) {
          throw new Error('Student ID, Department, Class, and Academic Year are mandatory for students.');
        }

        await tx.studentProfile.create({
          data: {
            userId: user.id,
            studentId: data.studentId,
            departmentId: data.departmentId,
            classId: data.classId,
            academicYearId: data.academicYearId,
            isHosteller: data.isHosteller || false,
            hostelId: data.isHosteller ? data.hostelId || null : null,
            roomNumber: data.roomNumber || null,
            parentName: data.parentName || null,
            parentPhone: data.parentPhone || null,
          },
        });
      } else if (['CLASS_ADVISOR', 'HOD', 'WARDEN'].includes(data.role)) {
        await tx.staffProfile.create({
          data: {
            userId: user.id,
            staffCode: data.staffCode || `STF-${Date.now().toString().slice(-4)}`,
            designation: data.designation || data.role.replace('_', ' '),
            departmentId: data.departmentId || null,
          },
        });
      }

      return user;
    });

    await createAuditLog(req.user!.id, 'CREATE_USER', 'User', newUser.id, { email: newUser.email, role: newUser.role }, req);

    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to create user' });
  }
});

// Toggle User Active Status
router.patch('/users/:id/toggle-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    await createAuditLog(
      req.user!.id,
      'TOGGLE_USER_STATUS',
      'User',
      id,
      { previous: user.isActive, current: updated.isActive },
      req
    );

    res.json({ message: `User ${updated.isActive ? 'activated' : 'deactivated'}`, user: updated });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// 3. Departments, Classes, Hostels, Academic Years
router.get('/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const [departments, classes, hostels, academicYears] = await Promise.all([
      prisma.department.findMany({ include: { hodAssignments: { include: { staffProfile: { include: { user: true } } } } } }),
      prisma.class.findMany({ include: { department: true, advisorAssignments: { include: { staffProfile: { include: { user: true } } } } } }),
      prisma.hostel.findMany({ include: { wardenAssignments: { include: { staffProfile: { include: { user: true } } } } } }),
      prisma.academicYear.findMany({ orderBy: { name: 'desc' } }),
    ]);

    res.json({ departments, classes, hostels, academicYears });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to load metadata' });
  }
});

// Role Assignment (Advisor, HOD, Warden)
router.post('/assign-role', async (req: Request, res: Response): Promise<void> => {
  try {
    const { staffProfileId, roleType, targetId, academicYearId } = req.body;

    if (!staffProfileId || !roleType || !targetId || !academicYearId) {
      res.status(400).json({ message: 'All assignment fields are required' });
      return;
    }

    if (roleType === 'CLASS_ADVISOR') {
      await prisma.advisorAssignment.upsert({
        where: {
          classId_academicYearId: { classId: targetId, academicYearId },
        },
        update: { staffProfileId },
        create: { staffProfileId, classId: targetId, academicYearId },
      });
    } else if (roleType === 'HOD') {
      await prisma.hODAssignment.upsert({
        where: {
          departmentId_academicYearId: { departmentId: targetId, academicYearId },
        },
        update: { staffProfileId },
        create: { staffProfileId, departmentId: targetId, academicYearId },
      });
    } else if (roleType === 'WARDEN') {
      await prisma.wardenAssignment.upsert({
        where: {
          staffProfileId_hostelId_academicYearId: {
            staffProfileId,
            hostelId: targetId,
            academicYearId,
          },
        },
        update: {},
        create: { staffProfileId, hostelId: targetId, academicYearId },
      });
    }

    await createAuditLog(req.user!.id, 'ASSIGN_STAFF_ROLE', 'StaffProfile', staffProfileId, { roleType, targetId }, req);

    res.json({ message: 'Role assignment successfully updated' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to assign staff role' });
  }
});

// 4. CSV Import for Students
router.post('/import-students-csv', async (req: Request, res: Response): Promise<void> => {
  try {
    const { csvData, defaultPassword = 'Password@123' } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      res.status(400).json({ message: 'CSV data string is required' });
      return;
    }

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      res.status(400).json({ message: 'CSV must contain at least a header row and 1 data row' });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    // Required headers: name, email, studentid, departmentcode, classname, academicyear, ishosteller, hostelcode, roomnumber
    const rows = lines.slice(1);

    const defaultHashedPassword = await bcrypt.hash(defaultPassword, 10);
    let importedCount = 0;
    const errors: string[] = [];

    // Cache departments, classes, hostels, years
    const [depts, classes, hostels, years] = await Promise.all([
      prisma.department.findMany(),
      prisma.class.findMany(),
      prisma.hostel.findMany(),
      prisma.academicYear.findMany(),
    ]);

    for (let i = 0; i < rows.length; i++) {
      const line = rows[i].trim();
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim());

      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowData[h] = cols[idx] || '';
      });

      const { name, email, studentid, departmentcode, classname, academicyear, ishosteller, hostelcode, roomnumber, phone } = rowData;

      if (!name || !email || !studentid || !departmentcode || !classname) {
        errors.push(`Row ${i + 2}: Missing required fields`);
        continue;
      }

      const dept = depts.find((d) => d.code.toLowerCase() === departmentcode.toLowerCase());
      const cls = classes.find((c) => c.name.toLowerCase() === classname.toLowerCase());
      const year = years.find((y) => academicyear ? y.name === academicyear : y.isCurrent);
      const isHost = ishosteller?.toLowerCase() === 'true' || ishosteller === '1' || ishosteller?.toLowerCase() === 'yes';
      const hostel = isHost && hostelcode ? hostels.find((h) => h.code.toLowerCase() === hostelcode.toLowerCase()) : null;

      if (!dept || !cls || !year) {
        errors.push(`Row ${i + 2}: Department, Class, or Academic Year not found`);
        continue;
      }

      try {
        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
          errors.push(`Row ${i + 2}: User with email ${email} already exists`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: email.toLowerCase(),
              name,
              password: defaultHashedPassword,
              role: 'STUDENT',
              phone: phone || null,
            },
          });

          await tx.studentProfile.create({
            data: {
              userId: user.id,
              studentId: studentid,
              departmentId: dept.id,
              classId: cls.id,
              academicYearId: year.id,
              isHosteller: isHost,
              hostelId: hostel?.id || null,
              roomNumber: roomnumber || null,
            },
          });
        });

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    await createAuditLog(
      req.user!.id,
      'IMPORT_STUDENTS_CSV',
      'StudentProfile',
      null,
      { totalRows: rows.length, importedCount, errorCount: errors.length },
      req
    );

    res.json({
      message: `Successfully imported ${importedCount} students.`,
      importedCount,
      errors,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'CSV import processing failed' });
  }
});

// 5. Audit Logs with Search and Filtering
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, entity, search, limit = '100' } = req.query;
    const where: any = {};
    if (action && typeof action === 'string') {
      where.action = action;
    }
    if (entity && typeof entity === 'string') {
      where.entity = entity;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { details: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve audit logs' });
  }
});

// 6. System Settings
router.get('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findMany();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve settings' });
  }
});

router.post('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ message: 'Key and Value are required' });
      return;
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value), description },
      create: { key, value: String(value), description },
    });

    await createAuditLog(req.user!.id, 'UPDATE_SETTING', 'SystemSetting', setting.id, { key, value }, req);

    res.json(setting);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update setting' });
  }
});

export default router;
