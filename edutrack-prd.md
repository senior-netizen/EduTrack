# EduTrack — Product Requirements Document (PRD)
## Version 1.0 | Next.js 14 + Node.js

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Priority Framework](#4-priority-framework)
5. [Module Requirements](#5-module-requirements)
6. [Non-Goals](#6-non-goals)
7. [Constraints & Assumptions](#7-constraints--assumptions)
8. [Open Questions](#8-open-questions)

---

## 1. Product Vision

**EduTrack** eliminates paper-based school administration by giving every stakeholder — admins, teachers, bursars, and parents — a single source of truth for student data, academic records, and fee management.

**Problem Statement:**
Most schools in Zimbabwe and Sub-Saharan Africa still manage student records in physical registers, fee receipts in duplicate books, and report cards typed on Word documents. This leads to lost records, billing errors, delayed communication, and zero visibility into school performance.

**Solution:**
A web-first, offline-capable school management platform built for low-bandwidth environments, supporting EcoCash payments, WhatsApp notifications, and multi-school deployments from day one.

**Target Market:**
- Private primary & secondary schools (50–2,000 students)
- College & tertiary institutions
- Government-aided schools with administrative capacity

---

## 2. Goals & Success Metrics

### Launch Goals (v1.0)

| Goal | Metric | Target |
|---|---|---|
| Replace paper registers | % of attendance entered digitally | > 90% within 30 days of onboarding |
| Reduce fee arrears | Average collection rate per term | > 85% (up from ~65% manual) |
| Parent engagement | % of parents who log in at least once per term | > 60% |
| Report card delivery | Time from exam results entry to report card PDF | < 10 minutes |
| System reliability | Monthly uptime | > 99.5% |
| Data entry speed | Time to take class attendance for 40 students | < 3 minutes |

### Business Metrics
- Time to onboard a new school (from signup to first attendance): < 2 hours
- Support tickets per school per month: < 5
- Monthly Active Users (MAU) per school: > 80% of registered users

---

## 3. User Personas

### Persona 1 — Tendai, School Administrator
- **Age:** 38 | **Tech comfort:** Medium
- **Goal:** Replace the filing cabinet with something she can access on her phone
- **Pain points:** Losing student files, re-entering data every term, parents calling to ask about fees
- **Needs:** Fast enrollment, bulk imports, PDF report cards, arrears list before term ends
- **Device:** Windows laptop at school, Android phone at home

### Persona 2 — Mr. Ncube, Form 3 Teacher
- **Age:** 44 | **Tech comfort:** Low-medium
- **Goal:** Mark attendance quickly and enter grades without training
- **Pain points:** Slow internet, complex systems, forgetting passwords
- **Needs:** One-tap attendance, simple mark entry grid, see his class list offline
- **Device:** Android smartphone (4G, sometimes 3G)

### Persona 3 — Mrs. Dube, Bursar
- **Age:** 50 | **Tech comfort:** Medium
- **Goal:** Know exactly who owes what, issue receipts, close the term cleanly
- **Pain points:** Chasing parents for fees, reconciling handwritten receipts, manual Excel reports
- **Needs:** Instant receipt generation, arrears report sorted by amount, bulk SMS to defaulters
- **Device:** Desktop PC, receipt printer connected via USB

### Persona 4 — Agnes, Parent
- **Age:** 41 | **Tech comfort:** Low
- **Goal:** Know her child is at school and fees are up to date without visiting the school
- **Pain points:** Travelling to school for report cards, not knowing about absent days until it's too late
- **Needs:** SMS alerts for absence, fee balance on phone, download report card from home
- **Device:** Android phone (WhatsApp-primary)

### Persona 5 — Takudzwa, Student (Form 5)
- **Age:** 17 | **Tech comfort:** High
- **Goal:** Check his grades and exam timetable without asking a teacher
- **Needs:** View results, upcoming exams, personal attendance record
- **Device:** Shared school computer or own Android phone

---

## 4. Priority Framework

```
P0 — Launch blocker. System cannot go live without this.
P1 — Core value. Must ship in v1.0.
P2 — Important. Ship in v1.1 (within 60 days of launch).
P3 — Nice to have. Backlog / v2.0.
```

---

## 5. Module Requirements

---

### 5.1 Authentication & Onboarding

#### P0 — Launch Blockers

**US-AUTH-01:** As a Super Admin, I can create a new school account so the school can start using EduTrack.
- **Acceptance Criteria:**
  - School name, address, logo, currency, academic year config are captured
  - A School Admin user is created with a temporary password
  - Onboarding checklist is shown after first login (add classes → add students → configure fees)
  - School is isolated — no data bleeds between schools

**US-AUTH-02:** As any user, I can log in with email and password.
- **Acceptance Criteria:**
  - Returns JWT access token (15min) + httpOnly refresh token (7 days)
  - Failed login attempt counter — lock account after 10 failures for 15 minutes
  - "Remember me" extends refresh token to 30 days
  - Error message is generic ("Invalid email or password") — no enumeration

**US-AUTH-03:** As any user, I can reset my password via email link.
- **Acceptance Criteria:**
  - Reset link expires in 1 hour
  - Link is single-use (invalidated after use)
  - New password must be min 8 chars, 1 uppercase, 1 number

**US-AUTH-04:** Role-based access control is enforced on every API endpoint.
- **Acceptance Criteria:**
  - Every route has an explicit role allowlist
  - 403 returned (not 401) when authenticated but unauthorized
  - Teachers can only access data for their assigned classes
  - Parents can only access their own children's data

---

### 5.2 Student Management

#### P0 — Launch Blockers

**US-STU-01:** As a School Admin, I can enroll a new student so they appear in all modules.
- **Acceptance Criteria:**
  - Required fields: first name, last name, date of birth, gender, class, at least one guardian
  - System generates a unique Student ID (`SCH-YYYY-NNNN`)
  - Student immediately appears in class roster, attendance, and fee modules
  - Duplicate check: warn if same name + DOB + guardian already exists

**US-STU-02:** As a School Admin, I can edit a student's profile.
- **Acceptance Criteria:**
  - All fields editable except Student ID (immutable)
  - Changes are audit-logged (who changed what, when)
  - Class change creates a new `ClassEnrollment` record (old record preserved)

**US-STU-03:** As a School Admin, I can change a student's status (Active, Suspended, Transferred, Withdrawn).
- **Acceptance Criteria:**
  - Status change requires a reason (text field, required)
  - Suspended/Withdrawn students disappear from active attendance and fee billing
  - Transferred students get an exportable transfer letter PDF

**US-STU-04:** As any authorised user, I can search and filter the student list.
- **Acceptance Criteria:**
  - Search by: name (partial match), Student ID, guardian name/phone
  - Filter by: class, gender, status, fee status (paid/partial/overdue)
  - Results update in < 300ms (debounced, server-side)
  - Filters are bookmarkable (persist in URL query params)

#### P1 — Core Value

**US-STU-05:** As a School Admin, I can bulk-import students via CSV.
- **Acceptance Criteria:**
  - Downloadable CSV template with required column headers
  - Validation report before import: shows row errors without blocking valid rows
  - Duplicates are flagged, not auto-created
  - Max 500 rows per import

**US-STU-06:** As a School Admin, I can upload student documents (birth certificate, photo, etc.).
- **Acceptance Criteria:**
  - Accepted formats: PDF, JPG, PNG — max 10MB per file
  - Files stored in S3/MinIO with school-scoped paths
  - Documents visible only to Admin, Headmaster roles

---

### 5.3 Academic Management

#### P0

**US-ACA-01:** As a School Admin, I can configure the academic year and terms.
- **Acceptance Criteria:**
  - Academic year has a name (e.g. "2024") and multiple terms
  - Each term has start date, end date, and can be set as "active"
  - Only one term can be active at a time per school
  - Changing active term does not delete previous term data

**US-ACA-02:** As a School Admin, I can create classes and assign a class teacher.
- **Acceptance Criteria:**
  - Class has name, grade level, stream/section, capacity
  - Class teacher is selected from active staff list
  - Class appears in attendance, exam, fee, and timetable modules immediately

**US-ACA-03:** As a School Admin, I can assign subjects to a class and assign a teacher per subject.
- **Acceptance Criteria:**
  - Subject has name, code, department
  - One teacher per subject per class (can be same teacher for multiple subjects)
  - Teacher can only enter marks for subjects assigned to them

#### P1

**US-ACA-04:** As a School Admin, I can build a class timetable.
- **Acceptance Criteria:**
  - Drag-and-drop interface: periods (rows) × days (columns)
  - Conflict detection: same teacher cannot be in two classes at the same time
  - Timetable is exportable as PDF

---

### 5.4 Attendance

#### P0

**US-ATT-01:** As a Teacher, I can take daily attendance for my class.
- **Acceptance Criteria:**
  - Shows all active students enrolled in the class for the current term
  - Each student has status toggle: Present / Absent / Late / Excused
  - Default status is Present (bulk-mark, individual exceptions)
  - Attendance can only be submitted once per class per day (edit allowed within same day)
  - Works offline — queued and synced when connection restored

**US-ATT-02:** Parent is automatically notified when their child is marked Absent.
- **Acceptance Criteria:**
  - SMS sent within 5 minutes of attendance submission
  - Message template: "Dear [Guardian], [Student] was marked ABSENT on [Date]. Contact [School Phone] if incorrect."
  - SMS only sent for Absent status — not Late or Excused
  - SMS not sent if it's a school holiday (holidays configured in academic calendar)

**US-ATT-03:** As a Teacher or Admin, I can view attendance history for a class or student.
- **Acceptance Criteria:**
  - Calendar view per student showing P/A/L/E per day
  - Percentage calculation: Present days / School days × 100
  - Filter by date range, status
  - Export to PDF/Excel

#### P1

**US-ATT-04:** As a Headmaster, I receive an alert when a student's attendance falls below 75%.
- **Acceptance Criteria:**
  - Threshold is configurable per school (default 75%)
  - Alert appears in dashboard and is sent via in-app notification
  - Alert is triggered at end of each school week (Friday evening)

---

### 5.5 Examinations & Grading

#### P0

**US-EXM-01:** As a School Admin, I can create an examination for a term.
- **Acceptance Criteria:**
  - Exam has name, type (CA / Midterm / Final / Mock), date range, and weight
  - Weight is used in final grade calculation (e.g. CA=30%, Final=70%)
  - Exam is linked to a term and visible to teachers immediately

**US-EXM-02:** As a Teacher, I can enter marks for my subject.
- **Acceptance Criteria:**
  - Spreadsheet-style grid: students (rows) × one subject column
  - Max marks configurable per exam-subject
  - Marks must be 0 ≤ mark ≤ max marks (inline validation)
  - Auto-save every 30 seconds + on blur
  - Mark entry is locked after Headmaster publishes results

**US-EXM-03:** System calculates grades and class positions automatically.
- **Acceptance Criteria:**
  - Grade computed from configurable grading scale
  - Total points = sum of (grade points × subject weight)
  - Class position = rank by total points, ties share position
  - Subject average and class average computed per subject

**US-EXM-04:** As a School Admin, I can generate and download report cards.
- **Acceptance Criteria:**
  - Report card includes: school header/logo, student info, all subject marks/grades, total, position, teacher remarks, principal comment, attendance summary for the term
  - PDF generated server-side (Puppeteer)
  - Single student or bulk (all students in class) as ZIP
  - Generation time < 5 seconds for single, < 60 seconds for 40 students

#### P1

**US-EXM-05:** As a Headmaster, I can publish results to make them visible to parents and students.
- **Acceptance Criteria:**
  - Publish action is irreversible without admin override
  - On publish: push notification + SMS sent to parents
  - Parents can download report card PDF from parent portal immediately after publish

---

### 5.6 Fee Management

#### P0

**US-FEE-01:** As a Bursar, I can configure a fee structure for a term.
- **Acceptance Criteria:**
  - Fee items: name, amount, applicable classes (all or specific), optional/required
  - Multiple fee items per term (tuition, boarding, sport levy, etc.)
  - Fee structure can be duplicated from previous term

**US-FEE-02:** As a Bursar, I can bulk-generate invoices for all students at term start.
- **Acceptance Criteria:**
  - One-click generation for all active students in selected term
  - Invoice = sum of all applicable fee items for student's class
  - Students with bursary/discount have amounts adjusted automatically
  - Re-generation is blocked if payments already recorded (requires override)

**US-FEE-03:** As a Bursar, I can record a payment and issue a receipt.
- **Acceptance Criteria:**
  - Required: amount, payment method, date, recorded-by
  - Optional: reference number (EcoCash txn ID, bank ref)
  - Receipt number is auto-generated (sequential, e.g. `RCP-2024-000142`)
  - Receipt PDF generated instantly and printable
  - Partial payments supported — running balance updated immediately

**US-FEE-04:** As a Bursar, I can view and export the fee arrears report.
- **Acceptance Criteria:**
  - Shows all students with balance > 0
  - Sortable by balance amount, class, last payment date
  - Includes guardian phone number
  - Exportable to Excel and PDF
  - "Send SMS" button per row or bulk (sends balance reminder via SMS)

#### P1

**US-FEE-05:** As a Bursar, I can configure bursary and discount rules.
- **Acceptance Criteria:**
  - Bursary: full or percentage discount per student per term
  - Sibling discount: configurable % off for 2nd, 3rd child from same family
  - Discount applied at invoice generation, visible on invoice

**US-FEE-06:** As a Parent, I receive an SMS reminder when fees are due.
- **Acceptance Criteria:**
  - Automated reminder 7 days before term end if balance > 0
  - Manual "Send Reminder" triggered by Bursar also available
  - Message includes student name, amount due, payment methods accepted

---

### 5.7 Staff & HR

#### P1

**US-STF-01:** As a School Admin, I can add and manage staff profiles.
- **Acceptance Criteria:**
  - Fields: name, role, department, phone, email, qualification, hire date
  - Staff linked to a User account for system login
  - Staff ID auto-generated (`STF-2024-NNNN`)

**US-STF-02:** As a Staff member, I can apply for leave.
- **Acceptance Criteria:**
  - Leave types: Annual, Sick, Compassionate, Unpaid
  - Request includes: type, start date, end date, reason
  - Headmaster or Admin approves/rejects with comment
  - Leave balance tracked and deducted on approval

---

### 5.8 Parent Portal

#### P1

**US-PAR-01:** As a Parent, I can log in and see my child's key information.
- **Acceptance Criteria:**
  - Dashboard shows: attendance this term (%), latest grades, fee balance, upcoming exams
  - If multiple children at the same school, switcher at top
  - Mobile-responsive (primary device is Android phone)

**US-PAR-02:** As a Parent, I can download my child's report card.
- **Acceptance Criteria:**
  - Available only after Headmaster publishes results
  - PDF download, same format as printed version
  - Download logged for audit purposes

**US-PAR-03:** As a Parent, I can view my child's fee account.
- **Acceptance Criteria:**
  - Shows: current term invoice, all payments made, current balance
  - Each payment shows date, amount, method, receipt number
  - Receipt PDF downloadable per payment

---

### 5.9 Notifications

#### P0

**US-NOT-01:** System sends SMS on student absence (see US-ATT-02).

**US-NOT-02:** As a School Admin, I can send a broadcast announcement.
- **Acceptance Criteria:**
  - Target: all parents, specific class parents, all staff, or all users
  - Channels: in-app, SMS (optional), email (optional)
  - Announcement appears in parent portal and teacher dashboard
  - Delivery report: sent count, failed count

#### P1

**US-NOT-03:** As any user, I can see my notifications in the notification centre.
- **Acceptance Criteria:**
  - Bell icon in header shows unread count badge
  - Clicking opens notification panel: list with timestamp, mark-as-read
  - Notification types: attendance alert, fee reminder, grade published, announcement, system

---

### 5.10 Reports & Analytics

#### P1

**US-RPT-01:** As a Headmaster or Admin, I can view the school dashboard.
- **Acceptance Criteria:**
  - Stat cards: Total Students, Today's Attendance %, Term Fee Collection Rate, Active Staff
  - Charts: Enrollment by class (bar), Fee collection vs arrears by month (line)
  - Recent activity feed: last 10 payments, last 5 absences
  - Data refreshes every 5 minutes (or on manual refresh)

**US-RPT-02:** As a Bursar, I can view the finance dashboard.
- **Acceptance Criteria:**
  - Total billed, total collected, total outstanding for current term
  - Collection rate % with trend vs previous term
  - Payment method breakdown (cash / EcoCash / bank)
  - Top 10 highest arrears list

**US-RPT-03:** As a School Admin, I can export any report to PDF or Excel.
- **Acceptance Criteria:**
  - All tabular reports have "Export CSV" and "Export PDF" buttons
  - Exports include the filter state at time of export
  - Large exports (> 500 rows) processed as background job with download link emailed

---

## 6. Non-Goals (v1.0)

The following are explicitly **out of scope** for v1.0:

- ❌ Online fee payment (EcoCash/Paynow API integration) — v1.1
- ❌ Mobile native app (iOS/Android) — v1.2
- ❌ WhatsApp Business API — v1.1 (SMS only at launch)
- ❌ Biometric attendance device integration — v1.1
- ❌ E-learning / LMS features (assignments, online classes)
- ❌ Government / Ministry of Education data export
- ❌ Multi-currency support (USD only at launch)
- ❌ Payroll processing (payslips only, no bank integration)
- ❌ Transport management module
- ❌ Hostel management module

---

## 7. Constraints & Assumptions

### Technical Constraints
- Must work on 3G connections (< 1MB initial page load)
- Must work on Android Chrome (version 90+) and Windows Chrome/Edge
- Offline attendance and mark entry must sync within 60 seconds of reconnection
- PDF generation must not block the API (use background job queue)
- Maximum API response time: 500ms at p95

### Business Constraints
- SMS costs are passed to the school (per-message billing via Twilio/Infobip)
- Schools in Zimbabwe primarily use USD — no RTGS/ZiG support at launch
- Data must be hosted in-country or in South Africa (data sovereignty concerns for some institutions)

### Assumptions
- Each school has at least one person with basic computer literacy to act as admin
- Schools have a Wi-Fi router even if bandwidth is limited
- Parents have feature phones capable of receiving SMS (WhatsApp not guaranteed)
- Schools will self-onboard using a guided setup wizard (no white-glove onboarding for Basic tier)

---

## 8. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Should attendance alerts go to both parents (mother + father) if two guardians registered? | Product | ❓ Open |
| 2 | What happens to fee invoices if a student transfers mid-term? Pro-rate or full term? | Finance | ❓ Open |
| 3 | Do teachers need to enter marks per CA session or just the final CA total? | Academic | ❓ Open |
| 4 | Should the Parent Portal require email login or can parents use phone number + OTP? | Product | ❓ Open |
| 5 | What SMS provider works best in Zimbabwe with reliable delivery? (Twilio vs Econet direct vs Ding Connect) | Tech | ❓ Open |
| 6 | Does the grading scale need to support both ZIMSEC and Cambridge in the same school? | Academic | ❓ Open |

---

*EduTrack PRD v1.0 — For development handoff and agent context*
