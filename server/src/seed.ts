import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma';

export async function runSeed() {
  console.log('🌱 Starting database seeding for College Permission Portal...');

  // Clear existing records cleanly
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approvalHistory.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.applicationAttachment.deleteMany();
  await prisma.application.deleteMany();
  await prisma.wardenAssignment.deleteMany();
  await prisma.hODAssignment.deleteMany();
  await prisma.advisorAssignment.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.class.deleteMany();
  await prisma.department.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  // 1. Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      name: '2025-2026',
      isCurrent: true,
    },
  });

  // 2. Departments
  const deptCSE = await prisma.department.create({
    data: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
    },
  });
  const deptECE = await prisma.department.create({
    data: {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
    },
  });

  // 3. Classes
  const classCSE_A = await prisma.class.create({
    data: {
      name: 'CSE 3rd Year - Sec A',
      departmentId: deptCSE.id,
      semester: 5,
      section: 'A',
      academicYearId: academicYear.id,
    },
  });
  const classCSE_B = await prisma.class.create({
    data: {
      name: 'CSE 3rd Year - Sec B',
      departmentId: deptCSE.id,
      semester: 5,
      section: 'B',
      academicYearId: academicYear.id,
    },
  });

  // 4. Hostels
  const hostelBoys = await prisma.hostel.create({
    data: {
      name: 'Ganga Boys Hostel',
      code: 'BH-1',
      gender: 'BOYS',
      wardenName: 'Mr. R. Sundaram',
    },
  });
  const hostelGirls = await prisma.hostel.create({
    data: {
      name: 'Kaveri Girls Hostel',
      code: 'GH-1',
      gender: 'GIRLS',
      wardenName: 'Dr. Anita Roy',
    },
  });

  // 5. System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'PORTAL_NAME', value: 'College Permission Portal', description: 'Institutional portal title' },
      { key: 'STRICT_WORKFLOW_ENFORCEMENT', value: 'true', description: 'Prevents out-of-order stage transitions' },
      { key: 'DEFAULT_OUTPASS_MAX_HOURS', value: '72', description: 'Maximum permitted hours for outpass' },
      { key: 'HOSTEL_CURFEW_TIME', value: '21:30', description: 'Standard hostel entry curfew' },
    ],
  });

  // 6. Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@college.edu',
      password: defaultPasswordHash,
      name: 'Dr. Arthur Vance (Dean Admin)',
      role: 'ADMIN',
      phone: '+91 98765 43210',
    },
  });

  // 7. Staff Users & Assignments
  // Class Advisor for CSE-A
  const advisorUser = await prisma.user.create({
    data: {
      email: 'advisor.cse@college.edu',
      password: defaultPasswordHash,
      name: 'Prof. S. Ranganathan',
      role: 'CLASS_ADVISOR',
      phone: '+91 98765 11111',
    },
  });
  const advisorProfile = await prisma.staffProfile.create({
    data: {
      userId: advisorUser.id,
      staffCode: 'FAC-CSE-01',
      designation: 'Assistant Professor & Class Advisor',
      departmentId: deptCSE.id,
    },
  });
  await prisma.advisorAssignment.create({
    data: {
      staffProfileId: advisorProfile.id,
      classId: classCSE_A.id,
      academicYearId: academicYear.id,
    },
  });

  // HOD for CSE
  const hodUser = await prisma.user.create({
    data: {
      email: 'hod.cse@college.edu',
      password: defaultPasswordHash,
      name: 'Dr. K. Meenakshi',
      role: 'HOD',
      phone: '+91 98765 22222',
    },
  });
  const hodProfile = await prisma.staffProfile.create({
    data: {
      userId: hodUser.id,
      staffCode: 'FAC-CSE-HOD',
      designation: 'Professor & Head of Department',
      departmentId: deptCSE.id,
    },
  });
  await prisma.hODAssignment.create({
    data: {
      staffProfileId: hodProfile.id,
      departmentId: deptCSE.id,
      academicYearId: academicYear.id,
    },
  });

  // Warden for Ganga Boys Hostel
  const wardenUser = await prisma.user.create({
    data: {
      email: 'warden.ganga@college.edu',
      password: defaultPasswordHash,
      name: 'Mr. R. Sundaram',
      role: 'WARDEN',
      phone: '+91 98765 33333',
    },
  });
  const wardenProfile = await prisma.staffProfile.create({
    data: {
      userId: wardenUser.id,
      staffCode: 'WAR-BH1',
      designation: 'Chief Hostel Warden',
    },
  });
  await prisma.wardenAssignment.create({
    data: {
      staffProfileId: wardenProfile.id,
      hostelId: hostelBoys.id,
      academicYearId: academicYear.id,
    },
  });

  // 8. Students
  // Student A: Alex Kumar (Hosteller in Ganga Boys Hostel, CSE 3-A)
  const studentAlexUser = await prisma.user.create({
    data: {
      email: 'student.alex@college.edu',
      password: defaultPasswordHash,
      name: 'Alex Kumar',
      role: 'STUDENT',
      phone: '+91 91234 56789',
    },
  });
  const studentAlexProfile = await prisma.studentProfile.create({
    data: {
      userId: studentAlexUser.id,
      studentId: '2024CS101',
      departmentId: deptCSE.id,
      classId: classCSE_A.id,
      academicYearId: academicYear.id,
      isHosteller: true,
      hostelId: hostelBoys.id,
      roomNumber: 'B-204',
      parentName: 'Ramesh Kumar',
      parentPhone: '+91 98111 22233',
      address: 'Plot 45, Sector 12, Chennai',
    },
  });

  // Student B: Priya Sharma (Hosteller in Kaveri Girls Hostel, CSE 3-A)
  const studentPriyaUser = await prisma.user.create({
    data: {
      email: 'student.priya@college.edu',
      password: defaultPasswordHash,
      name: 'Priya Sharma',
      role: 'STUDENT',
      phone: '+91 92345 67890',
    },
  });
  await prisma.studentProfile.create({
    data: {
      userId: studentPriyaUser.id,
      studentId: '2024CS102',
      departmentId: deptCSE.id,
      classId: classCSE_A.id,
      academicYearId: academicYear.id,
      isHosteller: true,
      hostelId: hostelGirls.id,
      roomNumber: 'G-112',
      parentName: 'Sunita Sharma',
      parentPhone: '+91 98222 33344',
      address: 'Tower 3, Apt 502, Bengaluru',
    },
  });

  // Student C: Rohit Verma (Day Scholar, CSE 3-B)
  const studentRohitUser = await prisma.user.create({
    data: {
      email: 'student.rohit@college.edu',
      password: defaultPasswordHash,
      name: 'Rohit Verma',
      role: 'STUDENT',
      phone: '+91 93456 78901',
    },
  });
  await prisma.studentProfile.create({
    data: {
      userId: studentRohitUser.id,
      studentId: '2024CS103',
      departmentId: deptCSE.id,
      classId: classCSE_B.id,
      academicYearId: academicYear.id,
      isHosteller: false,
      parentName: 'Anil Verma',
      parentPhone: '+91 98333 44455',
      address: '22 Lake View Road, Coimbatore',
    },
  });

  // 9. Initial Pre-seeded Applications
  // App 1: Alex Kumar - OD for Hackathon (Advisor approved, currently pending HOD)
  const app1 = await prisma.application.create({
    data: {
      applicationNumber: 'OD-2026-0001',
      applicantId: studentAlexUser.id,
      type: 'OD',
      status: 'PENDING_HOD',
      currentStage: 'HOD',
      studentName: studentAlexUser.name,
      studentRegNo: studentAlexProfile.studentId,
      departmentName: deptCSE.name,
      className: classCSE_A.name,
      hostelName: hostelBoys.name,
      startDate: new Date(Date.now() + 2 * 86400000),
      endDate: new Date(Date.now() + 4 * 86400000),
      purpose: 'Hackathon Participation',
      eventName: 'Smart India AI Hackathon 2026 Grand Finale',
      destination: 'IIT Madras Research Park, Chennai',
      additionalRemarks: 'Selected in top 10 national teams. Academic duty permission requested.',
      qrCodeToken: crypto.randomBytes(16).toString('hex'),
      approvalSteps: {
        create: [
          {
            stepOrder: 1,
            stage: 'CLASS_ADVISOR',
            status: 'APPROVED',
            assignedRole: 'CLASS_ADVISOR',
            actionByUserId: advisorUser.id,
            actionAt: new Date(),
            remarks: 'Strongly recommended. Active student with exemplary attendance.',
          },
          {
            stepOrder: 2,
            stage: 'HOD',
            status: 'PENDING',
            assignedRole: 'HOD',
          },
        ],
      },
      approvalHistory: {
        create: [
          {
            actorId: studentAlexUser.id,
            actorName: studentAlexUser.name,
            actorRole: 'STUDENT',
            action: 'SUBMITTED',
            previousStatus: 'DRAFT',
            newStatus: 'PENDING_CLASS_ADVISOR',
            remarks: 'Submitted OD application for college hackathon representation',
          },
          {
            actorId: advisorUser.id,
            actorName: advisorUser.name,
            actorRole: 'CLASS_ADVISOR',
            action: 'APPROVED',
            previousStatus: 'PENDING_CLASS_ADVISOR',
            newStatus: 'PENDING_HOD',
            remarks: 'Strongly recommended. Active student with exemplary attendance.',
          },
        ],
      },
    },
  });

  // App 2: Alex Kumar - Outpass for Weekend Visit (Pending Class Advisor)
  const app2 = await prisma.application.create({
    data: {
      applicationNumber: 'OP-2026-0002',
      applicantId: studentAlexUser.id,
      type: 'OUTPASS',
      status: 'PENDING_CLASS_ADVISOR',
      currentStage: 'CLASS_ADVISOR',
      studentName: studentAlexUser.name,
      studentRegNo: studentAlexProfile.studentId,
      departmentName: deptCSE.name,
      className: classCSE_A.name,
      hostelName: hostelBoys.name,
      outpassType: 'OVERNIGHT',
      departureTime: new Date(Date.now() + 1 * 86400000),
      expectedReturnTime: new Date(Date.now() + 3 * 86400000),
      destination: 'Chennai Hometown',
      reason: 'Attending cousin’s wedding ceremony',
      emergencyContact: '+91 98111 22233',
      qrCodeToken: crypto.randomBytes(16).toString('hex'),
      approvalSteps: {
        create: [
          { stepOrder: 1, stage: 'CLASS_ADVISOR', status: 'PENDING', assignedRole: 'CLASS_ADVISOR' },
          { stepOrder: 2, stage: 'HOD', status: 'PENDING', assignedRole: 'HOD' },
          { stepOrder: 3, stage: 'WARDEN', status: 'PENDING', assignedRole: 'WARDEN' },
        ],
      },
      approvalHistory: {
        create: [
          {
            actorId: studentAlexUser.id,
            actorName: studentAlexUser.name,
            actorRole: 'STUDENT',
            action: 'SUBMITTED',
            previousStatus: 'DRAFT',
            newStatus: 'PENDING_CLASS_ADVISOR',
            remarks: 'Overnight outpass submitted',
          },
        ],
      },
    },
  });

  // App 3: Priya Sharma - Fully Approved Outpass with Outpass Issued
  const app3 = await prisma.application.create({
    data: {
      applicationNumber: 'OP-2026-0003',
      applicantId: studentPriyaUser.id,
      type: 'OUTPASS',
      status: 'OUTPASS_ISSUED',
      currentStage: 'COMPLETED',
      studentName: studentPriyaUser.name,
      studentRegNo: '2024CS102',
      departmentName: deptCSE.name,
      className: classCSE_A.name,
      hostelName: hostelGirls.name,
      outpassType: 'DAY_OUT',
      departureTime: new Date(Date.now() - 3600000),
      expectedReturnTime: new Date(Date.now() + 4 * 3600000),
      destination: 'Central Library & City Center',
      reason: 'Academic book purchase and research',
      emergencyContact: '+91 98222 33344',
      qrCodeToken: crypto.randomBytes(16).toString('hex'),
      approvalSteps: {
        create: [
          { stepOrder: 1, stage: 'CLASS_ADVISOR', status: 'APPROVED', assignedRole: 'CLASS_ADVISOR', actionAt: new Date(Date.now() - 7200000) },
          { stepOrder: 2, stage: 'HOD', status: 'APPROVED', assignedRole: 'HOD', actionAt: new Date(Date.now() - 5400000) },
          { stepOrder: 3, stage: 'WARDEN', status: 'APPROVED', assignedRole: 'WARDEN', actionAt: new Date(Date.now() - 3600000) },
        ],
      },
      approvalHistory: {
        create: [
          {
            actorId: studentPriyaUser.id,
            actorName: studentPriyaUser.name,
            actorRole: 'STUDENT',
            action: 'SUBMITTED',
            previousStatus: 'DRAFT',
            newStatus: 'PENDING_CLASS_ADVISOR',
            remarks: 'Day outpass requested',
          },
          {
            actorId: advisorUser.id,
            actorName: advisorUser.name,
            actorRole: 'CLASS_ADVISOR',
            action: 'APPROVED',
            previousStatus: 'PENDING_CLASS_ADVISOR',
            newStatus: 'PENDING_HOD',
            remarks: 'Approved by Advisor',
          },
          {
            actorId: hodUser.id,
            actorName: hodUser.name,
            actorRole: 'HOD',
            action: 'APPROVED',
            previousStatus: 'PENDING_HOD',
            newStatus: 'PENDING_WARDEN',
            remarks: 'Approved by HOD',
          },
          {
            actorId: wardenUser.id,
            actorName: wardenUser.name,
            actorRole: 'WARDEN',
            action: 'APPROVED',
            previousStatus: 'PENDING_WARDEN',
            newStatus: 'APPROVED',
            remarks: 'Approved by Warden. Pass issued.',
          },
          {
            actorId: wardenUser.id,
            actorName: wardenUser.name,
            actorRole: 'WARDEN',
            action: 'OUTPASS_ISSUED',
            previousStatus: 'APPROVED',
            newStatus: 'OUTPASS_ISSUED',
            remarks: 'Physical exit confirmed at main gate',
          },
        ],
      },
    },
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: studentAlexUser.id,
        title: 'Application Progress: OD-2026-0001',
        message: 'Your OD application was approved by Class Advisor Prof. S. Ranganathan. Now awaiting HOD approval.',
        type: 'INFO',
        link: `/applications/${app1.id}`,
      },
      {
        userId: studentPriyaUser.id,
        title: 'Outpass Approved & Gate Exit Recorded',
        message: 'Your outpass OP-2026-0003 is active. Return before curfew time.',
        type: 'SUCCESS',
        link: `/applications/${app3.id}`,
      },
      {
        userId: advisorUser.id,
        title: 'New Pending Application',
        message: 'Alex Kumar submitted Outpass OP-2026-0002 for your review.',
        type: 'WARNING',
        link: '/approvals',
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Demo Accounts Created (Password: Password@123):');
  console.log('1. Admin:         admin@college.edu');
  console.log('2. Class Advisor: advisor.cse@college.edu');
  console.log('3. HOD:           hod.cse@college.edu');
  console.log('4. Warden:        warden.ganga@college.edu');
  console.log('5. Student A:     student.alex@college.edu (Hosteller, Ganga)');
  console.log('6. Student B:     student.priya@college.edu (Hosteller, Kaveri)');
  console.log('7. Student C:     student.rohit@college.edu (Day Scholar)');
  console.log('--------------------------------------------------');
}

if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
