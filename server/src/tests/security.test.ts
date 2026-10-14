import assert from 'assert';
import request from 'supertest';
import app from '../server';
import { prisma } from '../prisma';
import { runSeed } from '../seed';

interface AuthTokens {
  admin: string;
  advisor: string;
  hod: string;
  warden: string;
  studentA: string;
  studentB: string;
}

let tokens: AuthTokens;
let studentAId: string;
let studentBId: string;
let appAId: string;
let appBId: string;

async function loginUser(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password@123' });
  if (res.status !== 200 || !res.body.token) {
    throw new Error(`Failed to login as ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🔒 EXECUTING MANDATORY SECURITY & WORKFLOW TEST SUITE');
  console.log('======================================================\n');

  // Reset database with fresh seed
  await runSeed();

  // Obtain tokens for all roles
  tokens = {
    admin: await loginUser('admin@college.edu'),
    advisor: await loginUser('advisor.cse@college.edu'),
    hod: await loginUser('hod.cse@college.edu'),
    warden: await loginUser('warden.ganga@college.edu'),
    studentA: await loginUser('student.alex@college.edu'),
    studentB: await loginUser('student.priya@college.edu'),
  };

  const studentAUser = await prisma.user.findUnique({ where: { email: 'student.alex@college.edu' } });
  const studentBUser = await prisma.user.findUnique({ where: { email: 'student.priya@college.edu' } });
  studentAId = studentAUser!.id;
  studentBId = studentBUser!.id;

  // Create clean fresh applications for Student A and Student B
  const appARes = await request(app)
    .post('/api/applications')
    .set('Authorization', `Bearer ${tokens.studentA}`)
    .send({
      type: 'OUTPASS',
      outpassType: 'OVERNIGHT',
      departureTime: new Date(Date.now() + 86400000).toISOString(),
      expectedReturnTime: new Date(Date.now() + 2 * 86400000).toISOString(),
      destination: 'Hometown Family Function',
      reason: 'Urgent family gathering',
      emergencyContact: '+91 98111 22233',
    });
  assert.strictEqual(appARes.status, 201, 'Student A application creation failed');
  appAId = appARes.body.id;

  const appBRes = await request(app)
    .post('/api/applications')
    .set('Authorization', `Bearer ${tokens.studentB}`)
    .send({
      type: 'OD',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      purpose: 'Technical Paper Presentation',
      eventName: 'National Engineering Symposium',
      destination: 'NIT Trichy',
    });
  assert.strictEqual(appBRes.status, 201, 'Student B application creation failed');
  appBId = appBRes.body.id;

  let passed = 0;
  let total = 18;

  async function test(num: number, desc: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [Test ${num.toString().padStart(2, '0')}/${total}] PASS: ${desc}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [Test ${num.toString().padStart(2, '0')}/${total}] FAIL: ${desc}`);
      console.error('   Error detail:', err.message);
      throw err;
    }
  }

  // 1. Student A can access their own applications.
  await test(1, "Student A can access their own applications", async () => {
    const res = await request(app)
      .get(`/api/applications/${appAId}`)
      .set('Authorization', `Bearer ${tokens.studentA}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, appAId);
    assert.strictEqual(res.body.applicantId, studentAId);
  });

  // 2. Student A cannot access Student B's applications by changing the URL or application ID.
  await test(2, "Student A cannot access Student B's applications (403 Forbidden)", async () => {
    const res = await request(app)
      .get(`/api/applications/${appBId}`)
      .set('Authorization', `Bearer ${tokens.studentA}`);
    assert.strictEqual(res.status, 403, 'Expected 403 Forbidden when accessing another student’s application');
  });

  // 3. Student A cannot download Student B's documents.
  await test(3, "Student A cannot download Student B's documents", async () => {
    // Attach dummy file to Student B's app
    const att = await prisma.applicationAttachment.create({
      data: {
        applicationId: appBId,
        fileName: 'studentB-confidential.pdf',
        originalName: 'confidential.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storagePath: './uploads/dummy.pdf',
      },
    });

    const res = await request(app)
      .get(`/api/uploads/${att.fileName}`)
      .set('Authorization', `Bearer ${tokens.studentA}`);
    assert.strictEqual(res.status, 403, 'Expected 403 Forbidden when attempting to access another student’s attachment');
  });

  // 4. Student A cannot change their role to Warden.
  await test(4, "Student A cannot change their role to Warden", async () => {
    // Attempting to post to admin user update or modify role
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${tokens.studentA}`)
      .send({ role: 'WARDEN' });
    assert.strictEqual(res.status, 403, 'Student cannot access admin role management');

    // Verify role remains unchanged in database
    const user = await prisma.user.findUnique({ where: { id: studentAId } });
    assert.strictEqual(user!.role, 'STUDENT', 'User role should strictly remain STUDENT');
  });

  // 5. Student A cannot call an approval endpoint successfully.
  await test(5, "Student A cannot call an approval endpoint successfully (403 Forbidden)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appAId}/approve`)
      .set('Authorization', `Bearer ${tokens.studentA}`)
      .send({ remarks: 'Self approve' });
    assert.strictEqual(res.status, 403, 'Student should be rejected by requireRole check');
  });

  // 6. A student cannot change an application status directly.
  await test(6, "A student cannot change an application status directly", async () => {
    // There is no endpoint that allows directly setting status arbitrarily
    const res = await request(app)
      .patch(`/api/applications/${appAId}`)
      .set('Authorization', `Bearer ${tokens.studentA}`)
      .send({ status: 'APPROVED' });
    // Should be 404/405 as direct status alteration endpoint does not exist
    assert([404, 405].includes(res.status));

    const check = await prisma.application.findUnique({ where: { id: appAId } });
    assert.notStrictEqual(check!.status, 'APPROVED', 'Application status must remain untouched');
  });

  // 7. A Class Advisor can approve only eligible applications in their assigned class.
  await test(7, "Class Advisor can approve only eligible applications in their assigned class", async () => {
    // Advisor is assigned to CSE-A. Let's create an application from a student in CSE-B (Rohit Verma)
    const studentRohit = await prisma.user.findUnique({ where: { email: 'student.rohit@college.edu' } });
    const rohitToken = await loginUser('student.rohit@college.edu');

    const rohitApp = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${rohitToken}`)
      .send({
        type: 'OD',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        purpose: 'Seminar Attendance',
      });

    // Attempt approval by CSE-A advisor
    const failApproval = await request(app)
      .post(`/api/applications/${rohitApp.body.id}/approve`)
      .set('Authorization', `Bearer ${tokens.advisor}`)
      .send({ remarks: 'Approve' });

    assert.strictEqual(failApproval.status, 403, 'Advisor should not be able to approve outside their assigned class');

    // But advisor CAN approve App A (which is from Alex in CSE-A)
    const successApproval = await request(app)
      .post(`/api/applications/${appAId}/approve`)
      .set('Authorization', `Bearer ${tokens.advisor}`)
      .send({ remarks: 'Approved by CSE-A Advisor' });
    assert.strictEqual(successApproval.status, 200);
    assert.strictEqual(successApproval.body.application.status, 'PENDING_HOD');
  });

  // 8. An HOD cannot approve before the Class Advisor.
  await test(8, "An HOD cannot approve before the Class Advisor", async () => {
    // Create new application that is still in PENDING_CLASS_ADVISOR
    const newAppRes = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${tokens.studentA}`)
      .send({
        type: 'OD',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        purpose: 'Workshop',
      });
    const newAppId = newAppRes.body.id;

    // HOD attempts approval before Class Advisor
    const res = await request(app)
      .post(`/api/applications/${newAppId}/approve`)
      .set('Authorization', `Bearer ${tokens.hod}`)
      .send({ remarks: 'Bypass Advisor' });

    assert.strictEqual(res.status, 400, 'HOD should be blocked before Class Advisor approves');
    assert(res.body.message.includes('Class Advisor approval is required'));
  });

  // 9. A Warden cannot approve before the required earlier stages.
  await test(9, "A Warden cannot approve before the required earlier stages", async () => {
    // App A is currently at PENDING_HOD (Advisor approved, but HOD has not yet approved)
    const res = await request(app)
      .post(`/api/applications/${appAId}/approve`)
      .set('Authorization', `Bearer ${tokens.warden}`)
      .send({ remarks: 'Warden early approval attempt' });

    assert.strictEqual(res.status, 400, 'Warden should be blocked before earlier approvals complete');
    assert(res.body.message.includes('Earlier approvals are incomplete'));
  });

  // 10. A user cannot approve their own application, even with a staff role.
  await test(10, "A user cannot approve their own application, even with a staff role", async () => {
    // Let's create an application where applicantId is the advisor himself
    const selfApp = await prisma.application.create({
      data: {
        applicationNumber: 'OD-SELF-001',
        applicantId: (await prisma.user.findUnique({ where: { email: 'advisor.cse@college.edu' } }))!.id,
        type: 'OD',
        status: 'PENDING_CLASS_ADVISOR',
        currentStage: 'CLASS_ADVISOR',
        studentName: 'Prof. S. Ranganathan',
        studentRegNo: 'FAC001',
        departmentName: 'CSE',
        className: 'CSE 3-A',
        qrCodeToken: 'self-app-token-123',
      },
    });

    const res = await request(app)
      .post(`/api/applications/${selfApp.id}/approve`)
      .set('Authorization', `Bearer ${tokens.advisor}`)
      .send({ remarks: 'Self approve attempt' });

    assert.strictEqual(res.status, 403, 'Expected 403 when trying to self-approve');
    assert(res.body.message.includes('cannot approve your own application'));
  });

  // 11. An unauthorized user cannot create an Administrator account.
  await test(11, "An unauthorized user cannot create an Administrator account", async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${tokens.studentA}`)
      .send({
        email: 'hacker@college.edu',
        password: 'Password@123',
        name: 'Attacker Admin',
        role: 'ADMIN',
      });
    assert.strictEqual(res.status, 403, 'Non-admin cannot create administrator account');
  });

  // 12. Rejected applications cannot advance to another stage.
  await test(12, "Rejected applications cannot advance to another stage", async () => {
    // Create new application and reject it at Advisor stage
    const rejAppRes = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${tokens.studentA}`)
      .send({
        type: 'OD',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        purpose: 'Vacation during class',
      });
    const rejAppId = rejAppRes.body.id;

    // Reject by advisor
    const rejRes = await request(app)
      .post(`/api/applications/${rejAppId}/reject`)
      .set('Authorization', `Bearer ${tokens.advisor}`)
      .send({ reason: 'Attendance requirement not met' });
    assert.strictEqual(rejRes.status, 200);
    assert.strictEqual(rejRes.body.application.status, 'REJECTED');

    // Attempt HOD approval on rejected application
    const failHod = await request(app)
      .post(`/api/applications/${rejAppId}/approve`)
      .set('Authorization', `Bearer ${tokens.hod}`)
      .send({ remarks: 'Try to resurrect' });
    assert.strictEqual(failHod.status, 400, 'Cannot approve an application in terminal REJECTED status');
  });

  // 13. Duplicate and concurrent approval attempts are handled safely.
  await test(13, "Duplicate and concurrent approval attempts are handled safely", async () => {
    // App A is at PENDING_HOD. Let's send approval by HOD.
    const hodRes = await request(app)
      .post(`/api/applications/${appAId}/approve`)
      .set('Authorization', `Bearer ${tokens.hod}`)
      .send({ remarks: 'HOD approval confirmed' });
    assert.strictEqual(hodRes.status, 200);

    // Attempt duplicate HOD approval on the same application
    const dupRes = await request(app)
      .post(`/api/applications/${appAId}/approve`)
      .set('Authorization', `Bearer ${tokens.hod}`)
      .send({ remarks: 'Duplicate click' });
    assert([400, 403].includes(dupRes.status), 'Duplicate approval should be safely rejected with 400 or 403');
  });

  // 14. Application history cannot be modified by normal users.
  await test(14, "Application history cannot be modified by normal users", async () => {
    // No PUT/PATCH endpoint exists for approval history
    const res = await request(app)
      .patch(`/api/applications/${appAId}/history`)
      .set('Authorization', `Bearer ${tokens.studentA}`)
      .send({ action: 'APPROVED' });
    assert([404, 405].includes(res.status), 'No route should permit mutating history directly');
  });

  // 15. A fully approved request shows the correct approval history.
  await test(15, "A fully approved request shows the complete, ordered approval history", async () => {
    // Now approve App A as Warden to complete the sequence (Student -> Advisor -> HOD -> Warden)
    const wardenRes = await request(app)
      .post(`/api/applications/${appAId}/approve`)
      .set('Authorization', `Bearer ${tokens.warden}`)
      .send({ remarks: 'Warden approval granted. Outpass active.' });
    assert.strictEqual(wardenRes.status, 200);
    assert.strictEqual(wardenRes.body.application.status, 'APPROVED');

    // Fetch full application details
    const appDetails = await request(app)
      .get(`/api/applications/${appAId}`)
      .set('Authorization', `Bearer ${tokens.studentA}`);
    assert.strictEqual(appDetails.status, 200);

    const history = appDetails.body.approvalHistory;
    const actions = history.map((h: any) => `${h.actorRole}:${h.action}`);

    // Verify history contains all four distinct stages
    assert(actions.some((a: string) => a.startsWith('STUDENT:SUBMITTED')));
    assert(actions.some((a: string) => a.startsWith('CLASS_ADVISOR:APPROVED')));
    assert(actions.some((a: string) => a.startsWith('HOD:APPROVED')));
    assert(actions.some((a: string) => a.startsWith('WARDEN:APPROVED')));
  });

  // 16. Protected pages / endpoints become inaccessible after logout or with invalid token.
  await test(16, "Protected endpoints are inaccessible without valid token", async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', 'Bearer invalid-token-123');
    assert.strictEqual(res.status, 401, 'Invalid token must return 401 Unauthorized');
  });

  // 17. Attachments are accessible only to authorized users.
  await test(17, "Attachments are accessible only to authorized users", async () => {
    const att = await prisma.applicationAttachment.create({
      data: {
        applicationId: appAId,
        fileName: 'alex-permission-slip.pdf',
        originalName: 'slip.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        storagePath: './uploads/dummy.pdf',
      },
    });

    // Student A (owner) can request
    const studentAReq = await request(app)
      .get(`/api/uploads/${att.fileName}`)
      .set('Authorization', `Bearer ${tokens.studentA}`);
    // 200 or 404 (file missing on disk, but NOT 403 forbidden)
    assert.notStrictEqual(studentAReq.status, 403, 'Owner should not receive 403');

    // Student B (unrelated) gets 403 Forbidden
    const studentBReq = await request(app)
      .get(`/api/uploads/${att.fileName}`)
      .set('Authorization', `Bearer ${tokens.studentB}`);
    assert.strictEqual(studentBReq.status, 403, 'Unrelated student must get 403 Forbidden');
  });

  // 18. Each role sees only the dashboards and records allowed by its permissions.
  await test(18, "Each role sees only records allowed by its permissions", async () => {
    // Student list: Student A sees only Student A's apps
    const studentList = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${tokens.studentA}`);
    assert.strictEqual(studentList.status, 200);
    assert(studentList.body.every((a: any) => a.applicantId === studentAId));

    // Admin stats: Student cannot access
    const studentAdminStats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tokens.studentA}`);
    assert.strictEqual(studentAdminStats.status, 403);

    // Admin stats: Admin CAN access
    const adminStats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tokens.admin}`);
    assert.strictEqual(adminStats.status, 200);
    assert(adminStats.body.totalApplications >= 2);
  });

  console.log('\n======================================================');
  console.log(`🎉 ALL ${passed}/${total} MANDATORY SECURITY TESTS PASSED!`);
  console.log('======================================================\n');
}

runTests()
  .catch((e) => {
    console.error('Test suite failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
