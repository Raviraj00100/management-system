import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, requireRole } from '../middleware/auth';
import {
  processApproval,
  processRejection,
  processReturnForCorrection,
  processOutpassAction,
  WorkflowError,
} from '../services/workflowService';
import { sendNotification } from '../services/notificationService';
import { createAuditLog } from '../middleware/audit';

const router = Router();

const createApplicationSchema = z.object({
  type: z.enum(['OD', 'LEAVE', 'OUTPASS']),
  // OD fields
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  purpose: z.string().optional(),
  eventName: z.string().optional(),
  destination: z.string().optional(),
  additionalRemarks: z.string().optional(),
  // Leave fields
  leaveType: z.enum(['PERSONAL', 'MEDICAL', 'EMERGENCY', 'OTHER']).optional(),
  reason: z.string().optional(),
  contactNumber: z.string().optional(),
  parentContact: z.string().optional(),
  // Outpass fields
  outpassType: z.enum(['DAY_OUT', 'OVERNIGHT']).optional(),
  departureTime: z.string().optional(),
  expectedReturnTime: z.string().optional(),
  emergencyContact: z.string().optional(),
  // Attachments
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        originalName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        storagePath: z.string(),
      })
    )
    .optional(),
});

// Helper: generate application number
async function generateAppNumber(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.application.count();
  const seq = (count + 1).toString().padStart(4, '0');
  const prefix = type === 'OD' ? 'OD' : type === 'LEAVE' ? 'LV' : 'OP';
  return `${prefix}-${year}-${seq}`;
}

// 1. Submit Application (STUDENT only)
router.post('/', authenticate, requireRole(['STUDENT']), async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = createApplicationSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ message: 'Validation failed', errors: parse.error.format() });
      return;
    }

    const studentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        studentProfile: {
          include: {
            department: true,
            class: true,
            hostel: true,
          },
        },
      },
    });

    if (!studentUser || !studentUser.studentProfile) {
      res.status(400).json({ message: 'Incomplete student profile. Please contact administration.' });
      return;
    }

    const sp = studentUser.studentProfile;
    const body = parse.data;

    // Date validations
    if (body.type === 'OD') {
      if (!body.startDate || !body.endDate || !body.purpose) {
        res.status(400).json({ message: 'Start date, end date, and purpose are required for OD requests.' });
        return;
      }
      if (new Date(body.startDate) > new Date(body.endDate)) {
        res.status(400).json({ message: 'End date cannot be earlier than start date.' });
        return;
      }
    } else if (body.type === 'LEAVE') {
      if (!body.startDate || !body.endDate || !body.reason || !body.leaveType) {
        res.status(400).json({ message: 'Leave type, start date, end date, and reason are required.' });
        return;
      }
      if (new Date(body.startDate) > new Date(body.endDate)) {
        res.status(400).json({ message: 'End date cannot be earlier than start date.' });
        return;
      }
    } else if (body.type === 'OUTPASS') {
      if (!sp.isHosteller || !sp.hostelId) {
        res.status(400).json({ message: 'Hostel outpasses can only be requested by hosteller students.' });
        return;
      }
      if (!body.departureTime || !body.expectedReturnTime || !body.destination || !body.reason) {
        res.status(400).json({ message: 'Departure time, expected return time, destination, and reason are required for Outpass.' });
        return;
      }
      if (new Date(body.departureTime) >= new Date(body.expectedReturnTime)) {
        res.status(400).json({ message: 'Expected return time must be after departure time.' });
        return;
      }
    }

    const appNumber = await generateAppNumber(body.type);
    const qrToken = crypto.randomBytes(16).toString('hex');

    const requiresWarden = body.type === 'OUTPASS' || (sp.isHosteller && body.type === 'LEAVE');

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          applicationNumber: appNumber,
          applicantId: req.user!.id,
          type: body.type,
          status: 'PENDING_CLASS_ADVISOR',
          currentStage: 'CLASS_ADVISOR',
          studentName: studentUser.name,
          studentRegNo: sp.studentId,
          departmentName: sp.department.name,
          className: sp.class.name,
          hostelName: sp.hostel?.name || null,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          purpose: body.purpose,
          eventName: body.eventName,
          destination: body.destination,
          additionalRemarks: body.additionalRemarks,
          leaveType: body.leaveType,
          reason: body.reason,
          contactNumber: body.contactNumber,
          parentContact: body.parentContact,
          outpassType: body.outpassType,
          departureTime: body.departureTime ? new Date(body.departureTime) : null,
          expectedReturnTime: body.expectedReturnTime ? new Date(body.expectedReturnTime) : null,
          emergencyContact: body.emergencyContact,
          qrCodeToken: qrToken,
          attachments: body.attachments
            ? {
                create: body.attachments.map((att) => ({
                  fileName: att.fileName,
                  originalName: att.originalName,
                  fileSize: att.fileSize,
                  mimeType: att.mimeType,
                  storagePath: att.storagePath,
                })),
              }
            : undefined,
          approvalSteps: {
            create: [
              {
                stepOrder: 1,
                stage: 'CLASS_ADVISOR',
                status: 'PENDING',
                assignedRole: 'CLASS_ADVISOR',
              },
              {
                stepOrder: 2,
                stage: 'HOD',
                status: 'PENDING',
                assignedRole: 'HOD',
              },
              ...(requiresWarden
                ? [
                    {
                      stepOrder: 3,
                      stage: 'WARDEN',
                      status: 'PENDING',
                      assignedRole: 'WARDEN',
                    },
                  ]
                : []),
            ],
          },
        },
        include: {
          approvalSteps: true,
          attachments: true,
        },
      });

      await tx.approvalHistory.create({
        data: {
          applicationId: app.id,
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'SUBMITTED',
          previousStatus: 'DRAFT',
          newStatus: 'PENDING_CLASS_ADVISOR',
          remarks: 'Application submitted by student',
        },
      });

      return app;
    });

    // Notify assigned class advisor
    const advisor = await prisma.advisorAssignment.findFirst({
      where: { classId: sp.classId },
      include: { staffProfile: true },
    });
    if (advisor?.staffProfile?.userId) {
      await sendNotification(
        advisor.staffProfile.userId,
        `New ${body.type} Request from ${studentUser.name}`,
        `Application #${appNumber} is awaiting your review.`,
        'WARNING',
        `/approvals`
      );
    }

    // Confirmation notification to student
    await sendNotification(
      req.user!.id,
      'Application Submitted Successfully',
      `Your ${body.type} request #${appNumber} has been submitted to your Class Advisor.`,
      'SUCCESS',
      `/applications/${application.id}`
    );

    await createAuditLog(
      req.user!.id,
      'SUBMIT_APPLICATION',
      'Application',
      application.id,
      { type: body.type, appNumber },
      req
    );

    res.status(201).json(application);
  } catch (err: any) {
    console.error('Error creating application:', err);
    res.status(500).json({ message: 'Failed to create application.' });
  }
});

// 2. List Applications (Strict role-based isolation)
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, type, search } = req.query;
    const user = req.user!;

    let whereClause: any = {};

    if (status && typeof status === 'string') {
      whereClause.status = status;
    }
    if (type && typeof type === 'string') {
      whereClause.type = type;
    }
    if (search && typeof search === 'string') {
      whereClause.OR = [
        { applicationNumber: { contains: search } },
        { studentName: { contains: search } },
        { studentRegNo: { contains: search } },
      ];
    }

    if (user.role === 'STUDENT') {
      // STRICT PRIVACY: Student can NEVER see another student's applications
      whereClause.applicantId = user.id;
    } else if (user.role === 'CLASS_ADVISOR') {
      const assignedClassIds = (user.staffProfile?.advisorAssignments || []).map(
        (a: any) => a.classId
      );
      whereClause.applicant = {
        studentProfile: {
          classId: { in: assignedClassIds },
        },
      };
    } else if (user.role === 'HOD') {
      const assignedDeptIds = (user.staffProfile?.hodAssignments || []).map(
        (a: any) => a.departmentId
      );
      whereClause.applicant = {
        studentProfile: {
          departmentId: { in: assignedDeptIds },
        },
      };
    } else if (user.role === 'WARDEN') {
      const assignedHostelIds = (user.staffProfile?.wardenAssignments || []).map(
        (a: any) => a.hostelId
      );
      whereClause.applicant = {
        studentProfile: {
          hostelId: { in: assignedHostelIds },
        },
      };
    } else if (user.role === 'ADMIN') {
      // Admin can view all
    } else {
      res.status(403).json({ message: 'Unauthorized role' });
      return;
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              include: {
                class: true,
                department: true,
                hostel: true,
              },
            },
          },
        },
        approvalSteps: {
          orderBy: { stepOrder: 'asc' },
        },
        approvalHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(applications);
  } catch (err: any) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ message: 'Failed to retrieve applications.' });
  }
});

// 3. Application Details by ID (Strict ownership and authorization checks)
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = req.user!;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            studentProfile: {
              include: {
                class: true,
                department: true,
                hostel: true,
              },
            },
          },
        },
        attachments: true,
        approvalSteps: {
          orderBy: { stepOrder: 'asc' },
        },
        approvalHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    // Role-based Resource Access Enforcement
    if (user.role === 'STUDENT') {
      if (application.applicantId !== user.id) {
        res.status(403).json({
          message: 'Access denied: You are not authorized to view another student’s application.',
        });
        return;
      }
    } else if (user.role === 'CLASS_ADVISOR') {
      const studentClassId = application.applicant.studentProfile?.classId;
      const isAssigned = user.staffProfile?.advisorAssignments?.some(
        (a: any) => a.classId === studentClassId
      );
      if (!isAssigned) {
        res.status(403).json({
          message: 'Access denied: This application is not from your assigned class.',
        });
        return;
      }
    } else if (user.role === 'HOD') {
      const studentDeptId = application.applicant.studentProfile?.departmentId;
      const isAssigned = user.staffProfile?.hodAssignments?.some(
        (a: any) => a.departmentId === studentDeptId
      );
      if (!isAssigned) {
        res.status(403).json({
          message: 'Access denied: This application is not from your assigned department.',
        });
        return;
      }
    } else if (user.role === 'WARDEN') {
      const studentHostelId = application.applicant.studentProfile?.hostelId;
      const isAssigned = user.staffProfile?.wardenAssignments?.some(
        (a: any) => a.hostelId === studentHostelId
      );
      if (!isAssigned) {
        res.status(403).json({
          message: 'Access denied: This application is not from your assigned hostel.',
        });
        return;
      }
    }

    res.json(application);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve application details.' });
  }
});

// 4. Approval Endpoint
router.post(
  '/:id/approve',
  authenticate,
  requireRole(['CLASS_ADVISOR', 'HOD', 'WARDEN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { remarks } = req.body;

      const updated = await processApproval({
        applicationId: id,
        actor: req.user!,
        remarks,
      });

      res.json({ message: 'Application approved successfully', application: updated });
    } catch (err: any) {
      if (err instanceof WorkflowError) {
        res.status(err.statusCode).json({ message: err.message });
      } else {
        console.error('Approval error:', err);
        res.status(500).json({ message: 'Internal server error during approval.' });
      }
    }
  }
);

// 5. Rejection Endpoint (Mandatory reason required)
router.post(
  '/:id/reject',
  authenticate,
  requireRole(['CLASS_ADVISOR', 'HOD', 'WARDEN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({ message: 'A mandatory rejection reason is required.' });
        return;
      }

      const updated = await processRejection({
        applicationId: id,
        actor: req.user!,
        reason,
      });

      res.json({ message: 'Application rejected', application: updated });
    } catch (err: any) {
      if (err instanceof WorkflowError) {
        res.status(err.statusCode).json({ message: err.message });
      } else {
        res.status(500).json({ message: 'Internal server error during rejection.' });
      }
    }
  }
);

// 6. Return for Correction Endpoint (Mandatory remarks required)
router.post(
  '/:id/return',
  authenticate,
  requireRole(['CLASS_ADVISOR', 'HOD']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { remarks } = req.body;

      if (!remarks || remarks.trim().length === 0) {
        res.status(400).json({ message: 'Correction remarks are required.' });
        return;
      }

      const updated = await processReturnForCorrection({
        applicationId: id,
        actor: req.user!,
        remarks,
      });

      res.json({ message: 'Application returned for correction', application: updated });
    } catch (err: any) {
      if (err instanceof WorkflowError) {
        res.status(err.statusCode).json({ message: err.message });
      } else {
        res.status(500).json({ message: 'Internal server error during return.' });
      }
    }
  }
);

// 7. Resubmit Returned Application (Student only)
router.post(
  '/:id/resubmit',
  authenticate,
  requireRole(['STUDENT']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const app = await prisma.application.findUnique({ where: { id } });

      if (!app) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }

      if (app.applicantId !== req.user!.id) {
        res.status(403).json({ message: 'You can only resubmit your own applications.' });
        return;
      }

      if (app.status !== 'RETURNED_FOR_CORRECTION') {
        res.status(400).json({ message: 'Only returned applications can be resubmitted.' });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Reset approval steps to PENDING
        await tx.approvalStep.updateMany({
          where: { applicationId: id },
          data: { status: 'PENDING', actionAt: null, actionByUserId: null, remarks: null },
        });

        const resubmittedApp = await tx.application.update({
          where: { id },
          data: {
            status: 'PENDING_CLASS_ADVISOR',
            currentStage: 'CLASS_ADVISOR',
            correctionRemarks: null,
          },
        });

        await tx.approvalHistory.create({
          data: {
            applicationId: id,
            actorId: req.user!.id,
            actorName: req.user!.name,
            actorRole: req.user!.role,
            action: 'RESUBMITTED',
            previousStatus: 'RETURNED_FOR_CORRECTION',
            newStatus: 'PENDING_CLASS_ADVISOR',
            remarks: 'Application corrections completed and resubmitted by student',
          },
        });

        return resubmittedApp;
      });

      res.json({ message: 'Application resubmitted successfully', application: updated });
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to resubmit application.' });
    }
  }
);

// 8. Cancel Application (Student only, before final approval)
router.post(
  '/:id/cancel',
  authenticate,
  requireRole(['STUDENT']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const app = await prisma.application.findUnique({ where: { id } });

      if (!app) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }

      if (app.applicantId !== req.user!.id) {
        res.status(403).json({ message: 'You can only cancel your own applications.' });
        return;
      }

      if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(app.status)) {
        res.status(400).json({ message: `Cannot cancel an application in ${app.status} status.` });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const cancelledApp = await tx.application.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            currentStage: 'COMPLETED',
          },
        });

        await tx.approvalHistory.create({
          data: {
            applicationId: id,
            actorId: req.user!.id,
            actorName: req.user!.name,
            actorRole: req.user!.role,
            action: 'CANCELLED',
            previousStatus: app.status,
            newStatus: 'CANCELLED',
            remarks: 'Cancelled by applicant',
          },
        });

        return cancelledApp;
      });

      res.json({ message: 'Application cancelled successfully', application: updated });
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to cancel application.' });
    }
  }
);

// 9. Warden Gate Actions (Outpass Issued / Returned to Hostel)
router.post(
  '/:id/outpass-action',
  authenticate,
  requireRole(['WARDEN', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { action } = req.body;

      if (action !== 'OUTPASS_ISSUED' && action !== 'RETURNED_TO_HOSTEL') {
        res.status(400).json({ message: 'Invalid action. Must be OUTPASS_ISSUED or RETURNED_TO_HOSTEL.' });
        return;
      }

      const updated = await processOutpassAction({
        applicationId: id,
        actor: req.user!,
        action,
      });

      res.json({ message: `Action ${action} recorded`, application: updated });
    } catch (err: any) {
      if (err instanceof WorkflowError) {
        res.status(err.statusCode).json({ message: err.message });
      } else {
        res.status(500).json({ message: 'Failed to record gate movement.' });
      }
    }
  }
);

// 10. Pass Verification (Gate / QR Verification)
router.get('/verify-pass/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token);
    const app = await prisma.application.findUnique({
      where: { qrCodeToken: token },
      include: {
        applicant: {
          select: {
            name: true,
            studentProfile: {
              include: {
                class: true,
                department: true,
                hostel: true,
              },
            },
          },
        },
        approvalSteps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!app) {
      res.status(404).json({ valid: false, message: 'Invalid or unrecognized permission pass token.' });
      return;
    }

    const isValid = app.status === 'APPROVED' || app.status === 'OUTPASS_ISSUED';
    const appRecord = app as any;

    res.json({
      valid: isValid,
      applicationNumber: app.applicationNumber,
      type: app.type,
      status: app.status,
      studentName: app.studentName,
      regNumber: app.studentRegNo,
      department: app.departmentName,
      className: app.className,
      hostelName: app.hostelName,
      departureTime: app.departureTime,
      expectedReturnTime: app.expectedReturnTime,
      actualReturnTime: app.actualReturnTime,
      startDate: app.startDate,
      endDate: app.endDate,
      destination: app.destination,
      purpose: app.purpose || app.reason,
      emergencyContact: app.emergencyContact,
      approvalSteps: (appRecord.approvalSteps || []).map((s: any) => ({
        stage: s.stage,
        status: s.status,
        actionAt: s.actionAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Pass verification service error.' });
  }
});

export default router;
