import { prisma } from '../prisma';
import { sendNotification } from './notificationService';
import { createAuditLog } from '../middleware/audit';
import { AuthenticatedUser } from '../middleware/auth';

export class WorkflowError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function processApproval({
  applicationId,
  actor,
  remarks,
}: {
  applicationId: string;
  actor: AuthenticatedUser;
  remarks?: string;
}) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: {
        include: {
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

  if (!application) {
    throw new WorkflowError('Application not found', 404);
  }

  // 1. Self-approval prevention
  if (application.applicantId === actor.id) {
    throw new WorkflowError('Conflict of interest: You cannot approve your own application.', 403);
  }

  // 2. Terminal state checks
  if (['APPROVED', 'REJECTED', 'CANCELLED', 'RETURNED_TO_HOSTEL'].includes(application.status)) {
    throw new WorkflowError(`Application is already in terminal status: ${application.status}`, 400);
  }

  const studentProfile = application.applicant.studentProfile;
  if (!studentProfile) {
    throw new WorkflowError('Applicant student profile missing', 400);
  }

  let nextStatus = '';
  let nextStage = '';
  let currentStepStage = '';

  // 3. Stage & Role enforcement
  if (actor.role === 'HOD' && application.currentStage === 'CLASS_ADVISOR') {
    throw new WorkflowError('Workflow violation: Class Advisor approval is required before HOD can approve.', 400);
  }

  if (actor.role === 'WARDEN' && (application.currentStage === 'CLASS_ADVISOR' || application.currentStage === 'HOD')) {
    throw new WorkflowError('Workflow violation: Earlier approvals are incomplete. Class Advisor and HOD must approve first.', 400);
  }

  if (application.currentStage === 'CLASS_ADVISOR') {
    if (actor.role !== 'CLASS_ADVISOR') {
      throw new WorkflowError('Forbidden: Only an authorized Class Advisor can perform this approval.', 403);
    }
    if (application.status !== 'PENDING_CLASS_ADVISOR') {
      throw new WorkflowError(`Invalid state: Application status is ${application.status}, not pending advisor.`, 400);
    }

    // Verify assignment to applicant's class
    const isAssigned = actor.staffProfile?.advisorAssignments?.some(
      (a: any) => a.classId === studentProfile.classId
    );
    if (!isAssigned) {
      throw new WorkflowError('Access denied: You are not the assigned Class Advisor for this student’s class.', 403);
    }

    currentStepStage = 'CLASS_ADVISOR';
    nextStatus = 'PENDING_HOD';
    nextStage = 'HOD';
  } else if (application.currentStage === 'HOD') {
    if (actor.role !== 'HOD') {
      throw new WorkflowError('Forbidden: Only an authorized HOD can perform this approval.', 403);
    }
    if (application.status !== 'PENDING_HOD') {
      throw new WorkflowError(`Invalid state: Application status is ${application.status}. Class Advisor approval is required first.`, 400);
    }

    // Verify Class Advisor step was approved
    const advisorStep = application.approvalSteps.find((s) => s.stage === 'CLASS_ADVISOR');
    if (!advisorStep || advisorStep.status !== 'APPROVED') {
      throw new WorkflowError('Workflow violation: Class Advisor approval is required before HOD can approve.', 400);
    }

    // Verify assignment to applicant's department
    const isAssigned = actor.staffProfile?.hodAssignments?.some(
      (a: any) => a.departmentId === studentProfile.departmentId
    );
    if (!isAssigned) {
      throw new WorkflowError('Access denied: You are not the HOD for this student’s department.', 403);
    }

    currentStepStage = 'HOD';

    // Determine if Warden approval is needed:
    // Outpass always requires Warden. For OD / Leave: if student is a hosteller and application is Outpass or leave requiring hostel exit.
    const requiresWarden = application.type === 'OUTPASS' || (studentProfile.isHosteller && application.type === 'LEAVE');

    if (requiresWarden) {
      nextStatus = 'PENDING_WARDEN';
      nextStage = 'WARDEN';
    } else {
      nextStatus = 'APPROVED';
      nextStage = 'COMPLETED';
    }
  } else if (application.currentStage === 'WARDEN') {
    if (actor.role !== 'WARDEN') {
      throw new WorkflowError('Forbidden: Only an authorized Warden can perform this approval.', 403);
    }
    if (application.status !== 'PENDING_WARDEN') {
      throw new WorkflowError(`Invalid state: Application status is ${application.status}. Earlier approvals are incomplete.`, 400);
    }

    // Verify previous steps (Class Advisor and HOD)
    const advisorStep = application.approvalSteps.find((s) => s.stage === 'CLASS_ADVISOR');
    const hodStep = application.approvalSteps.find((s) => s.stage === 'HOD');
    if (!advisorStep || advisorStep.status !== 'APPROVED' || !hodStep || hodStep.status !== 'APPROVED') {
      throw new WorkflowError('Workflow violation: Class Advisor and HOD approvals must be completed before Warden approval.', 400);
    }

    // Verify assignment to applicant's hostel
    if (studentProfile.hostelId) {
      const isAssigned = actor.staffProfile?.wardenAssignments?.some(
        (a: any) => a.hostelId === studentProfile.hostelId
      );
      if (!isAssigned) {
        throw new WorkflowError('Access denied: You are not the assigned Warden for this student’s hostel.', 403);
      }
    }

    currentStepStage = 'WARDEN';
    nextStatus = 'APPROVED';
    nextStage = 'COMPLETED';
  } else {
    throw new WorkflowError(`Workflow is not awaiting approval at this stage (${application.currentStage}).`, 400);
  }

  // Atomic database transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update matching ApprovalStep
    await tx.approvalStep.updateMany({
      where: {
        applicationId,
        stage: currentStepStage,
      },
      data: {
        status: 'APPROVED',
        actionByUserId: actor.id,
        actionAt: new Date(),
        remarks: remarks || null,
      },
    });

    // 2. Update Application status and currentStage
    const updatedApp = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: nextStatus,
        currentStage: nextStage,
      },
    });

    // 3. Create ApprovalHistory record
    await tx.approvalHistory.create({
      data: {
        applicationId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'APPROVED',
        previousStatus: application.status,
        newStatus: nextStatus,
        remarks: remarks || `Approved by ${actor.role.replace('_', ' ')}`,
      },
    });

    return updatedApp;
  });

  // Notify student
  await sendNotification(
    application.applicantId,
    `Application ${nextStatus === 'APPROVED' ? 'Fully Approved' : 'Approved at ' + actor.role.replace('_', ' ')}`,
    `Your ${application.type} request #${application.applicationNumber} was approved by ${actor.name} (${actor.role.replace('_', ' ')}). Next status: ${nextStatus.replace(/_/g, ' ')}.`,
    nextStatus === 'APPROVED' ? 'SUCCESS' : 'INFO',
    `/applications/${application.id}`
  );

  // Notify next approver if still pending
  if (nextStage === 'HOD') {
    const hod = await prisma.hODAssignment.findFirst({
      where: { departmentId: studentProfile.departmentId },
      include: { staffProfile: true },
    });
    if (hod?.staffProfile?.userId) {
      await sendNotification(
        hod.staffProfile.userId,
        'New Application Awaiting HOD Approval',
        `Application #${application.applicationNumber} from ${application.studentName} is awaiting your approval.`,
        'WARNING',
        `/approvals`
      );
    }
  } else if (nextStage === 'WARDEN' && studentProfile.hostelId) {
    const warden = await prisma.wardenAssignment.findFirst({
      where: { hostelId: studentProfile.hostelId },
      include: { staffProfile: true },
    });
    if (warden?.staffProfile?.userId) {
      await sendNotification(
        warden.staffProfile.userId,
        'New Outpass/Leave Awaiting Warden Approval',
        `Hostel request #${application.applicationNumber} from ${application.studentName} is awaiting your final review.`,
        'WARNING',
        `/approvals`
      );
    }
  }

  await createAuditLog(
    actor.id,
    'APPROVE_APPLICATION',
    'Application',
    application.id,
    { previousStatus: application.status, nextStatus, remarks }
  );

  return result;
}

export async function processRejection({
  applicationId,
  actor,
  reason,
}: {
  applicationId: string;
  actor: AuthenticatedUser;
  reason: string;
}) {
  if (!reason || reason.trim().length === 0) {
    throw new WorkflowError('A mandatory rejection reason must be provided.', 400);
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: {
        include: {
          studentProfile: true,
        },
      },
      approvalSteps: true,
    },
  });

  if (!application) {
    throw new WorkflowError('Application not found', 404);
  }

  if (application.applicantId === actor.id) {
    throw new WorkflowError('Conflict of interest: You cannot reject your own application.', 403);
  }

  if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
    throw new WorkflowError(`Application is already in terminal status: ${application.status}`, 400);
  }

  const studentProfile = application.applicant.studentProfile;
  if (!studentProfile) {
    throw new WorkflowError('Applicant student profile missing', 400);
  }

  // Validate actor is the current required stage approver
  if (application.currentStage === 'CLASS_ADVISOR') {
    if (actor.role !== 'CLASS_ADVISOR') {
      throw new WorkflowError('Forbidden: Only an authorized Class Advisor can act on this stage.', 403);
    }
    const isAssigned = actor.staffProfile?.advisorAssignments?.some(
      (a: any) => a.classId === studentProfile.classId
    );
    if (!isAssigned) {
      throw new WorkflowError('Access denied: You are not the assigned Class Advisor for this student.', 403);
    }
  } else if (application.currentStage === 'HOD') {
    if (actor.role !== 'HOD') {
      throw new WorkflowError('Forbidden: Only an authorized HOD can act on this stage.', 403);
    }
    const isAssigned = actor.staffProfile?.hodAssignments?.some(
      (a: any) => a.departmentId === studentProfile.departmentId
    );
    if (!isAssigned) {
      throw new WorkflowError('Access denied: You are not the assigned HOD for this student.', 403);
    }
  } else if (application.currentStage === 'WARDEN') {
    if (actor.role !== 'WARDEN') {
      throw new WorkflowError('Forbidden: Only an authorized Warden can act on this stage.', 403);
    }
    if (studentProfile.hostelId) {
      const isAssigned = actor.staffProfile?.wardenAssignments?.some(
        (a: any) => a.hostelId === studentProfile.hostelId
      );
      if (!isAssigned) {
        throw new WorkflowError('Access denied: You are not the assigned Warden for this hostel.', 403);
      }
    }
  } else {
    throw new WorkflowError('Application is not currently in an active approval stage.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.approvalStep.updateMany({
      where: {
        applicationId,
        stage: application.currentStage,
      },
      data: {
        status: 'REJECTED',
        actionByUserId: actor.id,
        actionAt: new Date(),
        remarks: reason,
      },
    });

    const updatedApp = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        currentStage: 'COMPLETED',
        rejectionReason: reason,
      },
    });

    await tx.approvalHistory.create({
      data: {
        applicationId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'REJECTED',
        previousStatus: application.status,
        newStatus: 'REJECTED',
        remarks: `Rejected by ${actor.role.replace('_', ' ')}: ${reason}`,
      },
    });

    return updatedApp;
  });

  await sendNotification(
    application.applicantId,
    'Application Rejected',
    `Your ${application.type} request #${application.applicationNumber} was rejected by ${actor.name} (${actor.role.replace('_', ' ')}). Reason: ${reason}`,
    'DANGER',
    `/applications/${application.id}`
  );

  await createAuditLog(
    actor.id,
    'REJECT_APPLICATION',
    'Application',
    application.id,
    { previousStatus: application.status, reason }
  );

  return result;
}

export async function processReturnForCorrection({
  applicationId,
  actor,
  remarks,
}: {
  applicationId: string;
  actor: AuthenticatedUser;
  remarks: string;
}) {
  if (!remarks || remarks.trim().length === 0) {
    throw new WorkflowError('Correction remarks are mandatory when returning an application.', 400);
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: {
        include: { studentProfile: true },
      },
    },
  });

  if (!application) {
    throw new WorkflowError('Application not found', 404);
  }

  if (application.applicantId === actor.id) {
    throw new WorkflowError('Conflict of interest: You cannot return your own application.', 403);
  }

  if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
    throw new WorkflowError('Cannot return an application that has reached a terminal status.', 400);
  }

  const studentProfile = application.applicant.studentProfile;
  if (!studentProfile) {
    throw new WorkflowError('Applicant student profile missing', 400);
  }

  // Verify actor permission for current stage
  if (application.currentStage === 'CLASS_ADVISOR') {
    if (actor.role !== 'CLASS_ADVISOR') {
      throw new WorkflowError('Forbidden: Only an authorized Class Advisor can return this request.', 403);
    }
  } else if (application.currentStage === 'HOD') {
    if (actor.role !== 'HOD') {
      throw new WorkflowError('Forbidden: Only an authorized HOD can return this request.', 403);
    }
  } else {
    throw new WorkflowError('Application cannot be returned at this stage.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.approvalStep.updateMany({
      where: {
        applicationId,
        stage: application.currentStage,
      },
      data: {
        status: 'RETURNED',
        actionByUserId: actor.id,
        actionAt: new Date(),
        remarks,
      },
    });

    const updatedApp = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: 'RETURNED_FOR_CORRECTION',
        currentStage: 'STUDENT',
        correctionRemarks: remarks,
      },
    });

    await tx.approvalHistory.create({
      data: {
        applicationId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'RETURNED',
        previousStatus: application.status,
        newStatus: 'RETURNED_FOR_CORRECTION',
        remarks: `Returned by ${actor.role.replace('_', ' ')}: ${remarks}`,
      },
    });

    return updatedApp;
  });

  await sendNotification(
    application.applicantId,
    'Application Returned for Correction',
    `Your ${application.type} request #${application.applicationNumber} was returned by ${actor.name}. Remarks: ${remarks}. Please update and resubmit.`,
    'WARNING',
    `/applications/${application.id}`
  );

  await createAuditLog(
    actor.id,
    'RETURN_APPLICATION_FOR_CORRECTION',
    'Application',
    application.id,
    { remarks }
  );

  return result;
}

export async function processOutpassAction({
  applicationId,
  actor,
  action,
}: {
  applicationId: string;
  actor: AuthenticatedUser;
  action: 'OUTPASS_ISSUED' | 'RETURNED_TO_HOSTEL';
}) {
  if (actor.role !== 'WARDEN' && actor.role !== 'ADMIN') {
    throw new WorkflowError('Forbidden: Only a Warden or Administrator can record gate movements.', 403);
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new WorkflowError('Application not found', 404);
  }

  if (action === 'OUTPASS_ISSUED') {
    if (application.status !== 'APPROVED') {
      throw new WorkflowError('Gate exit can only be issued for fully APPROVED applications.', 400);
    }

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: applicationId },
        data: { status: 'OUTPASS_ISSUED' },
      });

      await tx.approvalHistory.create({
        data: {
          applicationId,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          action: 'OUTPASS_ISSUED',
          previousStatus: application.status,
          newStatus: 'OUTPASS_ISSUED',
          remarks: `Physical exit recorded at gate by Warden ${actor.name}`,
        },
      });

      return app;
    });

    await sendNotification(
      application.applicantId,
      'Outpass Gate Exit Confirmed',
      `Your departure on Outpass #${application.applicationNumber} has been recorded. Remember to return before your scheduled return time!`,
      'INFO'
    );

    return updatedApp;
  } else if (action === 'RETURNED_TO_HOSTEL') {
    if (application.status !== 'OUTPASS_ISSUED' && application.status !== 'OVERDUE_RETURN') {
      throw new WorkflowError('Student must have exited (Outpass Issued or Overdue) to record return.', 400);
    }

    const now = new Date();
    const isOverdue = application.expectedReturnTime ? now > application.expectedReturnTime : false;

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'RETURNED_TO_HOSTEL',
          actualReturnTime: now,
          isOverdue,
        },
      });

      await tx.approvalHistory.create({
        data: {
          applicationId,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          action: 'RETURNED_TO_HOSTEL',
          previousStatus: application.status,
          newStatus: 'RETURNED_TO_HOSTEL',
          remarks: `Hostel entry recorded at ${now.toLocaleTimeString()}.${isOverdue ? ' (Late Return)' : ''}`,
        },
      });

      return app;
    });

    await sendNotification(
      application.applicantId,
      'Return to Hostel Recorded',
      `Your return to the hostel for Outpass #${application.applicationNumber} was logged successfully.`,
      'SUCCESS'
    );

    return updatedApp;
  }
}
