# College Permission Portal — OD, Leave & Hostel Outpass Management System

A secure, production-ready full-stack web application designed for engineering colleges to manage **On Duty (OD)** applications, **Student Leave** requests, and **Hostel Outpass** gate passes with a server-enforced, four-stage approval workflow.

---

## 🏛️ Mandatory Approval Workflow

The portal enforces a strict sequential approval hierarchy:

$$\text{Student} \longrightarrow \text{Class Advisor} \longrightarrow \text{HOD} \longrightarrow \text{Warden}$$

### Workflow Integrity Rules:
- **No stage skipping**: An HOD cannot approve before the Class Advisor; a Warden cannot approve before the HOD.
- **Strict Role-Based Access Control (RBAC)**: All approvals require authenticated session tokens validated against verified staff profile assignments in the database.
- **Anti-Self-Approval**: Users cannot approve, reject, or return their own requests, even if they hold a faculty or staff role.
- **Immediate Termination on Rejection**: A rejection at any stage immediately halts the workflow and logs a mandatory rejection reason.
- **Return for Correction**: Class Advisors and HODs can return requests with specific remarks for the student to resubmit.
- **Gate Movement Tracker**: Wardens can digitally track physical exits and record hostel returns, with automatic late-return / overdue alerts.
- **Verification QR Passes**: Approved permissions generate cryptographically unique QR verification tokens for gate security verification.

---

## 🛡️ Strict Privacy & Anti-Spoofing Architecture

- **Student Data Isolation**: When Student A logs in, the backend and database strictly restrict queries (`where: { applicantId: req.user.id }`). Student A can never view or access Student B’s profile, applications, documents, or approval history.
- **Tamper-Proof Roles**: User roles are never accepted from client-side payloads. They are extracted exclusively from cryptographically signed server-side JWT tokens validated against active database user records.
- **Protected Attachments**: File storage endpoints verify ownership and approver jurisdiction before streaming documents. Unauthorized requests return `403 Forbidden`.

---

## 🚀 Pre-Configured Demo Personas

The system comes pre-seeded with test accounts representing every stage of the college hierarchy. All accounts share the password: **`Password@123`**

| Role | Name | Institutional Email | Assigned Responsibility |
| :--- | :--- | :--- | :--- |
| **Student A** | Alex Kumar | `student.alex@college.edu` | CSE 3rd Year Sec A • Ganga Boys Hostel (Room B-204) |
| **Student B** | Priya Sharma | `student.priya@college.edu` | CSE 3rd Year Sec A • Kaveri Girls Hostel (Room G-112) |
| **Student C** | Rohit Verma | `student.rohit@college.edu` | CSE 3rd Year Sec B • Day Scholar |
| **Class Advisor** | Prof. S. Ranganathan | `advisor.cse@college.edu` | Assigned Advisor for **CSE 3rd Year - Sec A** |
| **HOD** | Dr. K. Meenakshi | `hod.cse@college.edu` | Head of **Computer Science & Engineering** |
| **Hostel Warden** | Mr. R. Sundaram | `warden.ganga@college.edu` | Chief Warden of **Ganga Boys Hostel** |
| **Administrator** | Dr. Arthur Vance | `admin@college.edu` | Master Institutional Administrator |

> 💡 **Quick Switcher**: The login page includes a **1-Click Persona Switcher** allowing you to instantly switch between student and approver accounts during evaluations.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React icons, Vite 5.
- **Backend**: Node.js, Express, TypeScript, Zod schema validation, Multer secure file uploads.
- **Database & ORM**: PostgreSQL-ready schema with Prisma ORM (bundled with SQLite for zero-config, out-of-the-box local execution).
- **Authentication**: JWT authentication with bcrypt password hashing and HTTP headers.
- **Testing**: Supertest automated security test suite covering all 18 mandatory security test cases.

---

## 💻 Quickstart & Setup Guide

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### 2. Installation
Clone or navigate to the project directory:
```bash
cd "/Users/raviraj/hostel management system"
```

Install all dependencies and generate Prisma clients:
```bash
npm run postinstall
```

### 3. Database Initialization & Seeding
Push the database schema and populate the demo accounts:
```bash
npm run seed
```

### 4. Running the Mandatory Security Test Suite
Execute the automated test suite verifying all 18 security requirements:
```bash
npm test
```
*Output: All 18/18 mandatory security tests pass.*

### 5. Running the Application
Build and run the unified production server (serves API and frontend on port 5001):
```bash
npm run build
npm start
```

Access the portal in your browser at:
**[http://localhost:5001](http://localhost:5001)**

Alternatively, run in development mode with live reloading:
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend (Vite Dev Server)
npm run client
```

---

## 🧪 Security Test Suite Coverage

The test suite in [`server/src/tests/security.test.ts`](file:///Users/raviraj/hostel%20management%20system/server/src/tests/security.test.ts) validates:
1. Student A can access their own applications.
2. Student A cannot access Student B's applications (403 Forbidden).
3. Student A cannot download Student B's documents.
4. Student A cannot change their role to Warden.
5. Student A cannot call approval endpoints successfully (403 Forbidden).
6. A student cannot directly modify an application status.
7. A Class Advisor can approve only applications in their assigned class.
8. An HOD cannot approve before the Class Advisor has approved.
9. A Warden cannot approve before both Advisor and HOD have approved.
10. A user cannot approve their own application (anti-self-approval).
11. Unauthorized users cannot create Administrator accounts.
12. Rejected applications cannot advance to another stage.
13. Duplicate and concurrent approval attempts are safely rejected.
14. Application history cannot be modified directly.
15. A fully approved request shows the complete, ordered approval history.
16. Protected endpoints reject requests with invalid or expired tokens.
17. Attachments are accessible only to authorized users.
18. Each role sees only the dashboards and records permitted by its role.

---

## 📄 License
MIT License. Developed for Institutional Permission & Hostel Management.
