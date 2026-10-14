export type UserRole = 'STUDENT' | 'CLASS_ADVISOR' | 'HOD' | 'WARDEN' | 'ADMIN';

export type ApplicationType = 'OD' | 'LEAVE' | 'OUTPASS';

export type ApplicationStatus =
  | 'DRAFT'
  | 'PENDING_CLASS_ADVISOR'
  | 'PENDING_HOD'
  | 'PENDING_WARDEN'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_CORRECTION'
  | 'CANCELLED'
  | 'OUTPASS_ISSUED'
  | 'RETURNED_TO_HOSTEL'
  | 'OVERDUE_RETURN';

export type ApprovalStage = 'STUDENT' | 'CLASS_ADVISOR' | 'HOD' | 'WARDEN' | 'COMPLETED';

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface ClassItem {
  id: string;
  name: string;
  departmentId: string;
  semester: number;
  section: string;
  academicYearId: string;
}

export interface Hostel {
  id: string;
  name: string;
  code: string;
  gender: string;
  wardenName?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface StudentProfile {
  id: string;
  studentId: string;
  departmentId: string;
  department?: Department;
  classId: string;
  class?: ClassItem;
  academicYearId: string;
  isHosteller: boolean;
  hostelId?: string;
  hostel?: Hostel;
  roomNumber?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
}

export interface StaffProfile {
  id: string;
  staffCode: string;
  designation?: string;
  departmentId?: string;
  department?: Department;
  advisorAssignments?: Array<{ classId: string; class?: ClassItem }>;
  hodAssignments?: Array<{ departmentId: string; department?: Department }>;
  wardenAssignments?: Array<{ hostelId: string; hostel?: Hostel }>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  isActive?: boolean;
  studentProfile?: StudentProfile;
  staffProfile?: StaffProfile;
}

export interface ApplicationAttachment {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
}

export interface ApprovalStep {
  id: string;
  stepOrder: number;
  stage: ApprovalStage;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'SKIPPED';
  assignedRole: string;
  actionByUserId?: string;
  actionAt?: string;
  remarks?: string;
}

export interface ApprovalHistory {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  remarks?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  applicationNumber: string;
  applicantId: string;
  applicant?: User;
  type: ApplicationType;
  status: ApplicationStatus;
  currentStage: ApprovalStage;
  studentName: string;
  studentRegNo: string;
  departmentName: string;
  className: string;
  hostelName?: string;
  startDate?: string;
  endDate?: string;
  purpose?: string;
  eventName?: string;
  destination?: string;
  additionalRemarks?: string;
  leaveType?: 'PERSONAL' | 'MEDICAL' | 'EMERGENCY' | 'OTHER';
  reason?: string;
  contactNumber?: string;
  parentContact?: string;
  outpassType?: 'DAY_OUT' | 'OVERNIGHT';
  departureTime?: string;
  expectedReturnTime?: string;
  actualReturnTime?: string;
  emergencyContact?: string;
  isOverdue?: boolean;
  rejectionReason?: string;
  correctionRemarks?: string;
  qrCodeToken: string;
  createdAt: string;
  updatedAt: string;
  attachments?: ApplicationAttachment[];
  approvalSteps: ApprovalStep[];
  approvalHistory: ApprovalHistory[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}
