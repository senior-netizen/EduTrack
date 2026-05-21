# EduTrack — Student Management System
## Full System Specification v1.0

> **Stack:** Next.js 14 (App Router) · Node.js (Express/Fastify API) · PostgreSQL · Prisma ORM · TailwindCSS · Redis · Docker

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Modules & Features](#4-modules--features)
5. [Data Models](#5-data-models)
6. [API Endpoints](#6-api-endpoints)
7. [Tech Stack & Infrastructure](#7-tech-stack--infrastructure)
8. [Authentication & Security](#8-authentication--security)
9. [Notifications & Integrations](#9-notifications--integrations)
10. [File Storage & Media](#10-file-storage--media)
11. [Offline & PWA Support](#11-offline--pwa-support)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Future Roadmap](#14-future-roadmap)

---

## 1. Project Overview

**EduTrack** is a comprehensive, cloud-ready Student Management System designed for schools, colleges, and training institutions. It centralizes academic operations, fee management, communication, and reporting into a single platform accessible via web and mobile.

### Goals
- Eliminate paper-based record-keeping
- Give administrators real-time visibility into academic and financial performance
- Enable parents to stay informed about their child's progress
- Support multi-school/multi-branch deployments

### Target Users
- School Administrators & Headmasters
- Teachers & HODs
- Bursars & Finance Officers
- Parents & Guardians
- Students (senior secondary+)
- System Super Admins

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│  Next.js 14 App (Web)   |   React Native / PWA (Mobile)  │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTPS / REST + WebSockets
┌────────────────▼─────────────────────────────────────────┐
│                    API GATEWAY                           │
│         Node.js (Fastify) — /api/v1/*                    │
│  Auth Middleware · Rate Limiting · Request Logging       │
└──┬──────────────┬──────────────┬──────────────┬──────────┘
   │              │              │              │
┌──▼──┐      ┌───▼───┐     ┌────▼────┐    ┌────▼────┐
│Auth │      │ Core  │     │ Notif.  │    │Reports  │
│Svc  │      │ DB Svc│     │ Service │    │ Service │
└──┬──┘      └───┬───┘     └────┬────┘    └────┬────┘
   │              │              │              │
┌──▼──────────────▼──┐    ┌─────▼──┐     ┌─────▼──┐
│  PostgreSQL + Redis │    │  SMS / │     │  S3 /  │
│  (Primary DB+Cache) │    │ WA API │     │ Minio  │
└─────────────────────┘    └────────┘     └────────┘
```

### Key Architectural Decisions
| Decision | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 App Router | SSR + ISR for fast dashboards |
| API | Node.js + Fastify | High throughput, schema validation |
| ORM | Prisma | Type-safe queries, migrations |
| Database | PostgreSQL | Relational integrity, JSON support |
| Cache | Redis | Sessions, job queues, rate limiting |
| Queue | BullMQ (Redis) | SMS/email async jobs |
| File Storage | AWS S3 / MinIO | Documents, profile photos |
| Auth | NextAuth.js + JWT | Multi-provider, session management |

---

## 3. User Roles & Permissions

### Role Hierarchy

```
SUPER_ADMIN
  └── SCHOOL_ADMIN
        ├── HEADMASTER
        ├── HOD (Head of Department)
        ├── TEACHER
        ├── BURSAR
        ├── LIBRARIAN
        ├── PARENT
        └── STUDENT
```

### Permission Matrix

| Feature | Super Admin | School Admin | Headmaster | Teacher | Bursar | Parent | Student |
|---|---|---|---|---|---|---|---|
| Manage Schools | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Enroll Students | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Enter Marks | ✅ | ✅ | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| View Grades | ✅ | ✅ | ✅ | ✅ (class) | ❌ | ✅ (child) | ✅ (own) |
| Manage Fees | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| View Fee Status | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ (child) | ✅ (own) |
| Take Attendance | ✅ | ✅ | ✅ | ✅ (class) | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ✅ (limited) | ✅ (finance) | ❌ | ❌ |
| Send Notifications | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 4. Modules & Features

---

### 4.1 Student Management

**Description:** Central registry for all student records from enrollment to graduation.

**Features:**
- Student enrollment form with document upload (birth certificate, transfer letter, passport photo)
- Auto-generated Student ID (format: `SCH-YYYY-NNNN`)
- QR code / barcode on student ID card
- Student profile: personal info, guardian details, medical notes, emergency contacts
- Class/stream assignment per academic year
- Transfer management (in-transfer, out-transfer with records export)
- Student status: Active, Suspended, Transferred, Graduated, Withdrawn
- Bulk import via CSV
- Alumni registry (graduated students)
- Search & filter (name, class, ID, guardian, fee status)

**User Stories:**
- As an admin, I can enroll a new student and assign them to a class so they appear in all module records.
- As an admin, I can transfer a student out and export their full academic record as PDF.
- As a teacher, I can view the student roster for my class.

---

### 4.2 Academic Management

**Description:** Manage the academic structure — classes, subjects, curriculum, and timetables.

**Features:**
- Academic year & term configuration (e.g. Term 1, 2, 3 or Semester 1, 2)
- Class/grade management (Form 1–6, Grade 1–7, etc.)
- Stream/section support (Form 2A, 2B, 2C)
- Subject catalog with subject codes
- Teacher-subject-class assignment
- Timetable builder (drag-and-drop period scheduling)
- Timetable PDF export & print
- Curriculum document uploads per subject
- Department (HOD) management

---

### 4.3 Attendance Tracking

**Description:** Daily and period-based attendance for all students and staff.

**Features:**
- Class attendance entry by teacher (present / absent / late / excused)
- Period-by-period attendance (optional, for secondary schools)
- Bulk mark-as-present with individual exceptions
- Parent alert: automated SMS/WhatsApp when student is absent
- Weekly/monthly attendance reports per student & class
- Attendance percentage dashboard
- Late arrival log with reason
- Staff attendance (separate module)
- Export attendance register to PDF/Excel
- Biometric device integration ready (API hook)

**Attendance Alert Logic:**
```
IF student.attendanceRate < 75% IN last 30 days
  → TRIGGER alert to parent + HOD
IF student absent 3+ consecutive days
  → TRIGGER escalation to Headmaster
```

---

### 4.4 Examinations & Grading

**Description:** Full examination lifecycle from scheduling to report card generation.

**Features:**
- Exam configuration: name, date, max marks, weight (continuous assessment vs. final)
- Mark entry per subject per student (manual entry or CSV import)
- Grade computation engine:
  - Configurable grading scale (A-F, 1-9, percentage)
  - Weighted average support (e.g. 30% CA + 70% final)
  - Class position calculation
- Report card generation (PDF, branded per school)
- Academic transcript (cumulative, multi-year)
- Progress tracker: line chart of student performance over terms
- Exam timetable with room/seat allocation
- Failed subjects & supplementary exam tracking
- Comment bank for report card remarks
- Head of Department sign-off workflow

**Grading Scale Example (configurable):**
| Mark | Grade | Points | Remark |
|---|---|---|---|
| 90–100 | A* | 1 | Distinction |
| 80–89 | A | 2 | Excellent |
| 70–79 | B | 3 | Very Good |
| 60–69 | C | 4 | Good |
| 50–59 | D | 5 | Credit |
| 40–49 | E | 6 | Pass |
| 0–39 | U | 9 | Fail |

---

### 4.5 Fee Management

**Description:** Complete fee billing, collection, and financial reporting for the bursar.

**Features:**
- Fee structure configuration per class per term (tuition, boarding, sport levy, etc.)
- Automatic invoice generation at term start
- Payment recording: cash, EcoCash, bank transfer, online (Paynow)
- Official receipt generation (PDF, auto-numbered)
- Partial payment support with running balance
- Bursary / scholarship configuration (full or partial discount)
- Sibling discount rules
- Fee arrears report with parent contact details
- Bulk SMS to parents with outstanding balances
- Daily/monthly/term collection summaries
- Bank deposit reconciliation
- Export to Excel for auditing

**Fee Workflow:**
```
Term Start
  → Generate invoices for all enrolled students
  → Send SMS to parents with amount due
  → Parent pays → Bursar records payment → Receipt issued
  → Arrears report generated weekly
```

---

### 4.6 Staff & HR

**Description:** Manage teachers, support staff, and school administration personnel.

**Features:**
- Staff profiles: personal info, qualifications, employment details
- Role & department assignment
- Leave management (apply, approve, track balance)
- Staff attendance tracking
- Subject/class assignment (links to Academic module)
- Basic payroll computation (salary, deductions, net pay)
- Payslip generation (PDF)
- Staff ID card generation
- Document storage (contracts, certificates)
- Performance notes (admin only)

---

### 4.7 Parent & Communication Portal

**Description:** Keep parents informed and engaged through a dedicated portal.

**Features:**
- Parent login (linked to one or more children)
- Dashboard: child's attendance, latest grades, fee balance, announcements
- View & download report cards
- Fee payment history
- Messaging: parent ↔ teacher / admin
- Announcement board (school-wide or class-specific)
- Push notifications (PWA)
- SMS & WhatsApp integration for alerts
- Event calendar (school events, exam dates, holidays)
- Parent acknowledgement tracking (e.g. confirm they received report card)

---

### 4.8 Library Management

**Description:** Track school library inventory, borrowing, and overdue books.

**Features:**
- Book catalog with ISBN, title, author, category, copies
- Barcode/QR scan check-in & check-out
- Student & staff borrowing
- Due date tracking & overdue alerts
- Fine calculation for late returns
- Book reservation system
- Borrowing history per student
- Low-stock / missing book alerts
- Library reports (popular books, overdue list, fine collections)

---

### 4.9 Hostel / Boarding Management *(Premium)*

**Features:**
- Hostel buildings, dorms, rooms, beds configuration
- Student room/bed allocation per term
- Boarding fee billing (integrates with Fee module)
- Visitor logbook
- Incident / disciplinary report
- Meals timetable
- Warden staff assignment

---

### 4.10 Transport Management *(Premium)*

**Features:**
- Route & bus management (vehicle details, capacity, driver)
- Student-route assignment
- Transport fee billing (integrates with Fee module)
- Route map visualization
- Driver contact directory
- Morning/afternoon trip attendance

---

### 4.11 Analytics & Reporting Dashboard

**Description:** Real-time school-wide insights for administrators and headmasters.

**Key Dashboards:**
- **Enrollment Dashboard:** total students by class/gender/year, trend chart
- **Attendance Dashboard:** daily rate, heatmap, low-attendance alerts
- **Academic Dashboard:** class pass rates, subject averages, top/bottom performers
- **Finance Dashboard:** fee collection rate, arrears total, revenue by month
- **Staff Dashboard:** staff count, leave utilization, attendance rate

**Reports (exportable PDF/CSV):**
- Full student list (with filter)
- Attendance register (by class, by period, by date range)
- Exam results sheet
- Report cards (bulk PDF)
- Fee statements
- Arrears report
- Payroll summary
- Custom report builder (drag fields to build ad-hoc reports)

---

## 5. Data Models

### `School`
```prisma
model School {
  id            String   @id @default(cuid())
  name          String
  code          String   @unique
  address       String?
  phone         String?
  email         String?
  logoUrl       String?
  country       String   @default("ZW")
  currency      String   @default("USD")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  users         User[]
  students      Student[]
  classes       Class[]
  terms         Term[]
  feeStructures FeeStructure[]
  staff         Staff[]
}
```

### `User`
```prisma
model User {
  id            String   @id @default(cuid())
  schoolId      String
  email         String   @unique
  passwordHash  String
  role          Role
  isActive      Boolean  @default(true)
  lastLogin     DateTime?
  createdAt     DateTime @default(now())

  school        School   @relation(fields: [schoolId], references: [id])
  profile       UserProfile?
  notifications Notification[]
  auditLogs     AuditLog[]
}

enum Role {
  SUPER_ADMIN
  SCHOOL_ADMIN
  HEADMASTER
  HOD
  TEACHER
  BURSAR
  LIBRARIAN
  PARENT
  STUDENT
}
```

### `Student`
```prisma
model Student {
  id              String   @id @default(cuid())
  schoolId        String
  studentId       String   @unique   // e.g. SCH-2024-0042
  firstName       String
  lastName        String
  dateOfBirth     DateTime
  gender          Gender
  photoUrl        String?
  address         String?
  status          StudentStatus @default(ACTIVE)
  enrollmentDate  DateTime
  graduationDate  DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  school          School   @relation(fields: [schoolId], references: [id])
  guardians       Guardian[]
  classEnrollments ClassEnrollment[]
  attendanceRecords AttendanceRecord[]
  examResults     ExamResult[]
  feeAccounts     FeeAccount[]
  medicalNotes    MedicalNote[]
  documents       StudentDocument[]
}

enum Gender { MALE FEMALE OTHER }

enum StudentStatus {
  ACTIVE SUSPENDED TRANSFERRED GRADUATED WITHDRAWN
}
```

### `Class`
```prisma
model Class {
  id          String  @id @default(cuid())
  schoolId    String
  name        String   // e.g. "Form 2A"
  grade       String   // e.g. "Form 2"
  stream      String?  // e.g. "A"
  capacity    Int
  classTeacherId String?

  school      School   @relation(fields: [schoolId], references: [id])
  classTeacher Staff?   @relation(fields: [classTeacherId], references: [id])
  enrollments ClassEnrollment[]
  timetable   Timetable[]
  subjects    ClassSubject[]
}
```

### `ClassEnrollment`
```prisma
model ClassEnrollment {
  id        String   @id @default(cuid())
  studentId String
  classId   String
  termId    String
  enrolledAt DateTime @default(now())

  student   Student  @relation(fields: [studentId], references: [id])
  class     Class    @relation(fields: [classId], references: [id])
  term      Term     @relation(fields: [termId], references: [id])

  @@unique([studentId, classId, termId])
}
```

### `Term`
```prisma
model Term {
  id          String   @id @default(cuid())
  schoolId    String
  academicYear String  // e.g. "2024"
  name        String   // e.g. "Term 1"
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(false)

  school      School   @relation(fields: [schoolId], references: [id])
  enrollments ClassEnrollment[]
  exams       Exam[]
  feeStructures FeeStructure[]
}
```

### `AttendanceRecord`
```prisma
model AttendanceRecord {
  id          String   @id @default(cuid())
  studentId   String
  classId     String
  date        DateTime
  period      Int?     // null = daily, 1-8 = period-based
  status      AttendanceStatus
  remarks     String?
  recordedBy  String   // staffId

  student     Student  @relation(fields: [studentId], references: [id])

  @@unique([studentId, classId, date, period])
}

enum AttendanceStatus {
  PRESENT ABSENT LATE EXCUSED
}
```

### `Exam`
```prisma
model Exam {
  id          String   @id @default(cuid())
  schoolId    String
  termId      String
  name        String   // e.g. "End of Term Exam"
  examType    ExamType
  startDate   DateTime
  endDate     DateTime
  weight      Float    @default(1.0)  // for weighted average

  term        Term     @relation(fields: [termId], references: [id])
  results     ExamResult[]
  papers      ExamPaper[]
}

enum ExamType { CONTINUOUS_ASSESSMENT MIDTERM FINAL MOCK }
```

### `ExamResult`
```prisma
model ExamResult {
  id          String   @id @default(cuid())
  examId      String
  studentId   String
  subjectId   String
  marksObtained Float
  maxMarks    Float
  grade       String?
  points      Int?
  remarks     String?
  enteredBy   String

  exam        Exam     @relation(fields: [examId], references: [id])
  student     Student  @relation(fields: [studentId], references: [id])
  subject     Subject  @relation(fields: [subjectId], references: [id])

  @@unique([examId, studentId, subjectId])
}
```

### `FeeStructure`
```prisma
model FeeStructure {
  id          String   @id @default(cuid())
  schoolId    String
  termId      String
  classId     String?  // null = applies to all classes
  name        String   // e.g. "Tuition Fee"
  amount      Decimal
  isOptional  Boolean  @default(false)

  school      School   @relation(fields: [schoolId], references: [id])
  invoiceItems InvoiceItem[]
}
```

### `FeeAccount`
```prisma
model FeeAccount {
  id          String   @id @default(cuid())
  studentId   String
  termId      String
  totalBilled Decimal
  totalPaid   Decimal  @default(0)
  discount    Decimal  @default(0)
  balance     Decimal  // computed: totalBilled - discount - totalPaid

  student     Student  @relation(fields: [studentId], references: [id])
  invoices    Invoice[]
  payments    Payment[]
}
```

### `Payment`
```prisma
model Payment {
  id              String   @id @default(cuid())
  feeAccountId    String
  amount          Decimal
  method          PaymentMethod
  reference       String?  // EcoCash txn, bank ref
  receiptNumber   String   @unique
  paidAt          DateTime @default(now())
  recordedBy      String

  feeAccount      FeeAccount @relation(fields: [feeAccountId], references: [id])
}

enum PaymentMethod {
  CASH ECOCASH BANK_TRANSFER PAYNOW CHEQUE
}
```

### `Staff`
```prisma
model Staff {
  id            String   @id @default(cuid())
  schoolId      String
  staffId       String   @unique
  userId        String   @unique
  firstName     String
  lastName      String
  role          StaffRole
  departmentId  String?
  phone         String?
  qualification String?
  hireDate      DateTime
  isActive      Boolean  @default(true)

  school        School   @relation(fields: [schoolId], references: [id])
  user          User     @relation(fields: [userId], references: [id])
  classesTeaching ClassSubject[]
  leaveRequests LeaveRequest[]
}
```

### `Notification`
```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  title       String
  body        String
  type        NotificationType
  isRead      Boolean  @default(false)
  channel     String[] // ["sms", "push", "email"]
  sentAt      DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
}

enum NotificationType {
  ATTENDANCE_ALERT FEE_REMINDER GRADE_PUBLISHED
  ANNOUNCEMENT SYSTEM EXAM_SCHEDULE
}
```

### `AuditLog`
```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String   // e.g. "STUDENT_ENROLLED"
  entity      String   // e.g. "Student"
  entityId    String
  before      Json?
  after       Json?
  ip          String?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
}
```

---

## 6. API Endpoints

### Base URL: `/api/v1`

All endpoints require `Authorization: Bearer <token>` unless marked `[PUBLIC]`.

---

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Email/password login → JWT |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset via token |
| GET | `/auth/me` | Current user profile |

---

### Schools *(SUPER_ADMIN only)*
| Method | Endpoint | Description |
|---|---|---|
| GET | `/schools` | List all schools |
| POST | `/schools` | Create school |
| GET | `/schools/:id` | Get school details |
| PUT | `/schools/:id` | Update school |
| DELETE | `/schools/:id` | Deactivate school |

---

### Students
| Method | Endpoint | Description |
|---|---|---|
| GET | `/students` | List students (filterable) |
| POST | `/students` | Enroll new student |
| GET | `/students/:id` | Get student profile |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Soft delete (withdraw) |
| POST | `/students/bulk-import` | CSV bulk import |
| GET | `/students/:id/report-card/:termId` | Generate report card PDF |
| GET | `/students/:id/transcript` | Full academic transcript PDF |
| POST | `/students/:id/transfer` | Initiate transfer out |

---

### Classes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/classes` | List classes |
| POST | `/classes` | Create class |
| GET | `/classes/:id` | Get class details |
| PUT | `/classes/:id` | Update class |
| GET | `/classes/:id/students` | Students in class |
| GET | `/classes/:id/timetable` | Class timetable |
| POST | `/classes/:id/enroll` | Enroll student in class |

---

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/attendance` | Submit attendance session |
| GET | `/attendance` | Query attendance records |
| GET | `/attendance/student/:studentId` | Student attendance history |
| GET | `/attendance/class/:classId` | Class attendance report |
| GET | `/attendance/report` | School-wide attendance report |

---

### Exams & Grades
| Method | Endpoint | Description |
|---|---|---|
| GET | `/exams` | List exams |
| POST | `/exams` | Create exam |
| PUT | `/exams/:id` | Update exam |
| POST | `/exams/:id/results` | Submit mark sheet |
| PUT | `/exams/:id/results` | Update marks |
| GET | `/exams/:id/results` | Get result sheet |
| GET | `/exams/:id/results/export` | Export marks CSV |
| POST | `/exams/:id/publish` | Publish results to parents |

---

### Fees
| Method | Endpoint | Description |
|---|---|---|
| GET | `/fees/structures` | List fee structures |
| POST | `/fees/structures` | Create fee structure |
| POST | `/fees/invoices/generate` | Bulk generate invoices for term |
| GET | `/fees/accounts/:studentId` | Student fee account |
| POST | `/fees/payments` | Record a payment |
| GET | `/fees/payments/:id/receipt` | Download receipt PDF |
| GET | `/fees/arrears` | Arrears report |
| POST | `/fees/arrears/notify` | Bulk SMS to parents with arrears |

---

### Staff
| Method | Endpoint | Description |
|---|---|---|
| GET | `/staff` | List staff |
| POST | `/staff` | Add staff member |
| GET | `/staff/:id` | Staff profile |
| PUT | `/staff/:id` | Update staff |
| POST | `/staff/:id/leave` | Submit leave request |
| GET | `/staff/:id/leave` | Staff leave history |
| PUT | `/staff/leave/:leaveId/approve` | Approve leave |

---

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | My notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/broadcast` | Admin broadcast (SMS/push/email) |

---

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/enrollment` | Enrollment summary |
| GET | `/reports/attendance` | Attendance analytics |
| GET | `/reports/academic` | Academic performance |
| GET | `/reports/finance` | Fee collection report |
| POST | `/reports/custom` | Custom report builder query |

---

### Library
| Method | Endpoint | Description |
|---|---|---|
| GET | `/library/books` | Catalog |
| POST | `/library/books` | Add book |
| POST | `/library/borrow` | Issue book to student |
| POST | `/library/return` | Return book |
| GET | `/library/overdue` | Overdue borrowings |

---

## 7. Tech Stack & Infrastructure

### Frontend (Next.js 14)
```
next: 14.x (App Router)
react: 18.x
typescript: 5.x
tailwindcss: 3.x
shadcn/ui          — component library
react-hook-form    — form handling
zod                — schema validation
tanstack/react-query — data fetching & caching
recharts           — charts & analytics
@react-pdf/renderer — PDF generation (client-side)
next-auth          — authentication
socket.io-client   — real-time notifications
```

### Backend (Node.js)
```
fastify: 4.x        — HTTP server
typescript: 5.x
prisma: 5.x         — ORM
postgresql: 15.x    — primary database
redis: 7.x          — cache & queues
bullmq             — background job queue
zod                — request validation
jsonwebtoken       — JWT signing
bcryptjs           — password hashing
nodemailer         — email
twilio / infobip   — SMS
puppeteer          — server-side PDF generation
winston            — logging
```

### DevOps & Infrastructure
```
docker + docker-compose  — local dev & deployment
nginx                    — reverse proxy
github actions           — CI/CD pipeline
aws s3 / minio           — file storage
sentry                   — error monitoring
posthog                  — analytics
```

### Project Structure
```
edutrack/
├── apps/
│   ├── web/                   # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/        # Login, forgot password
│   │   │   ├── (dashboard)/   # Admin dashboard
│   │   │   ├── (parent)/      # Parent portal
│   │   │   └── (student)/     # Student portal
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   └── api/                   # Node.js Fastify API
│       ├── src/
│       │   ├── modules/       # Feature modules
│       │   │   ├── students/
│       │   │   ├── attendance/
│       │   │   ├── exams/
│       │   │   ├── fees/
│       │   │   └── ...
│       │   ├── plugins/       # Auth, DB, Redis
│       │   ├── jobs/          # BullMQ workers
│       │   └── utils/
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
├── packages/
│   ├── shared/                # Shared types & utils
│   └── ui/                    # Shared component library
└── docker-compose.yml
```

---

## 8. Authentication & Security

### Auth Flow
```
1. User submits email + password
2. API validates credentials, checks isActive
3. Returns: accessToken (15min) + refreshToken (7days, httpOnly cookie)
4. Client stores accessToken in memory (NOT localStorage)
5. On expiry, auto-refresh via /auth/refresh
6. Logout clears refreshToken from DB + cookie
```

### Security Measures
- Passwords: bcrypt with salt rounds = 12
- JWT: RS256 signed (asymmetric keys)
- Rate limiting: 10 login attempts per 15min per IP (Redis)
- CORS: whitelist only known origins
- HTTPS enforced in production
- SQL injection: prevented via Prisma parameterized queries
- XSS: Next.js escaping + CSP headers
- RBAC enforced at middleware level before every controller
- Audit log for all sensitive write operations
- Data encryption at rest for sensitive fields (national ID, medical notes)
- GDPR/local compliance: data deletion workflow on withdrawal

### Multi-Tenancy
- Each school is isolated by `schoolId` on every query
- Middleware injects `schoolId` from JWT into every request context
- Super Admin bypasses school scoping

---

## 9. Notifications & Integrations

### Notification Channels
| Channel | Provider | Use Case |
|---|---|---|
| SMS | Twilio / Infobip / Ding Connect | Attendance alerts, fee reminders |
| WhatsApp | WhatsApp Business API / Twilio | Report card delivery, reminders |
| Email | Nodemailer + SendGrid | Account setup, report cards |
| Push (PWA) | Web Push API | Real-time alerts in browser |
| In-App | WebSocket (Socket.io) | Dashboard notifications |

### Notification Templates
```typescript
// Example: Absence Alert
{
  type: "ATTENDANCE_ALERT",
  channel: ["sms", "whatsapp"],
  template: "Dear {guardianName}, {studentName} was marked ABSENT on {date}. 
             Please contact the school on {schoolPhone} if this is incorrect."
}

// Example: Fee Reminder
{
  type: "FEE_REMINDER",
  channel: ["sms"],
  template: "Dear {guardianName}, {studentName} has an outstanding balance of 
             USD {balance} for {term}. Please visit the bursar's office."
}
```

### Payment Integrations
- **EcoCash:** Zimbabwe mobile money (Cassava Fintech API)
- **Paynow:** Zimbabwe online payment gateway
- **Stripe:** International card payments *(premium)*
- All payments recorded with external transaction reference

---

## 10. File Storage & Media

### Storage Strategy
```
Profile Photos   → S3/MinIO: /schools/{schoolId}/students/{studentId}/photo.jpg
Documents        → S3/MinIO: /schools/{schoolId}/documents/{type}/{filename}
Report Cards     → Generated on-demand via Puppeteer, NOT stored (re-generate each time)
Bulk Exports     → Temp S3 bucket with 1-hour signed URL, auto-deleted
```

### Document Types Stored
- Student: birth certificate, transfer letter, O-level certificate
- Staff: employment contract, qualifications, ID copy
- School: logo, letterhead template
- Library: book cover images

### File Restrictions
- Max file size: 10MB
- Allowed types: PDF, JPG, PNG, DOCX
- Virus scanning hook on upload (ClamAV optional)

---

## 11. Offline & PWA Support

### PWA Configuration
```json
{
  "name": "EduTrack",
  "short_name": "EduTrack",
  "display": "standalone",
  "theme_color": "#1A3C6E",
  "background_color": "#ffffff",
  "icons": [...],
  "start_url": "/dashboard"
}
```

### Offline Capabilities
| Feature | Offline Support | Sync Strategy |
|---|---|---|
| Attendance entry | ✅ (IndexedDB cache) | Sync on reconnect |
| View student list | ✅ (last fetched) | Cache-first, revalidate |
| Enter marks | ✅ (draft saved locally) | Background sync |
| Generate reports | ❌ (requires server) | — |
| Fee payments | ❌ (requires live) | — |

### Background Sync
- Service Worker intercepts POST /attendance when offline
- Queues in IndexedDB with `pendingSync: true`
- On reconnect, background sync API replays queued requests
- Conflict resolution: server timestamp wins

---

## 12. Deployment Architecture

### Docker Compose (Development)
```yaml
services:
  web:
    build: ./apps/web
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://api:4000

  api:
    build: ./apps/api
    ports: ["4000:4000"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379

  postgres:
    image: postgres:15
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
```

### Production (AWS / VPS)
```
Route 53 / Cloudflare DNS
    ↓
CloudFront CDN (static assets)
    ↓
nginx (reverse proxy + SSL termination)
    ↓
  ┌────────────┬────────────┐
  Next.js      Fastify API
  (2 replicas) (2 replicas)
  └────────────┴────────────┘
          ↓
  ┌───────────────────────┐
  RDS PostgreSQL (primary + read replica)
  ElastiCache Redis
  S3 Bucket
  └───────────────────────┘
```

### Environment Variables
```env
# API
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SENDGRID_API_KEY=

# Web
NEXT_PUBLIC_API_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

---

## 13. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API Response Time (p95) | < 300ms |
| Dashboard Load Time | < 2s (with caching) |
| Uptime SLA | 99.5% |
| Concurrent Users | 500 per school instance |
| Report Card Generation | < 5s per batch of 50 |
| Bulk SMS Throughput | 1,000 messages/min (via queue) |
| Data Backup | Daily automated backup, 30-day retention |
| Mobile Responsiveness | Full support (375px+) |
| Accessibility | WCAG 2.1 AA |
| Browser Support | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |

---

## 14. Future Roadmap

### v1.1
- [ ] Biometric attendance device integration (ZKTeco API)
- [ ] Mobile app (React Native) for parents
- [ ] WhatsApp Business API integration
- [ ] Online fee payment (EcoCash / Paynow)

### v1.2
- [ ] AI-powered academic performance predictions
- [ ] Automated report card comments via AI
- [ ] Multi-language support (Shona, Ndebele)
- [ ] CBZ / Steward Bank direct debit integration

### v2.0
- [ ] Ministry of Education data export (national exam results, enrollment stats)
- [ ] Inter-school sports & event management
- [ ] E-learning module (assignments, LMS-lite)
- [ ] Marketplace for school suppliers

---

## Appendix A — Grading Configuration Schema

```json
{
  "schoolId": "clx...",
  "scale": "ZIMSEC_O_LEVEL",
  "grades": [
    { "min": 90, "max": 100, "grade": "A*", "points": 1, "remark": "Distinction" },
    { "min": 80, "max": 89,  "grade": "A",  "points": 2, "remark": "Excellent" },
    { "min": 70, "max": 79,  "grade": "B",  "points": 3, "remark": "Very Good" },
    { "min": 60, "max": 69,  "grade": "C",  "points": 4, "remark": "Good" },
    { "min": 50, "max": 59,  "grade": "D",  "points": 5, "remark": "Credit" },
    { "min": 40, "max": 49,  "grade": "E",  "points": 6, "remark": "Pass" },
    { "min": 0,  "max": 39,  "grade": "U",  "points": 9, "remark": "Ungraded" }
  ],
  "passPoints": 6,
  "assessmentWeights": {
    "CONTINUOUS_ASSESSMENT": 30,
    "FINAL": 70
  }
}
```

---

## Appendix B — CSV Import Format (Students)

```csv
firstName,lastName,dateOfBirth,gender,className,guardianName,guardianPhone,guardianEmail
John,Moyo,2010-03-15,MALE,Form 2A,Agnes Moyo,+263771234567,agnes@email.com
Tafadzwa,Chikwanda,2009-07-22,FEMALE,Form 3B,Peter Chikwanda,+263772345678,
```

---

*EduTrack System Specification v1.0 — Generated for development handoff*
*Stack: Next.js 14 + Node.js (Fastify) + PostgreSQL + Prisma + Redis*
