# EduTrack Implementation Traceability Matrix

_Date:_ 2026-05-22  
_Sources mapped:_ `edutrack-prd.md`, `edutrack-system-spec.md`  
_Implementation reviewed:_ `src/**`, `prisma/schema.prisma`, tests under `src/**` and `tests/**`

## Verification Status Legend
- **Implemented**: Requirement is delivered in code with concrete endpoint(s) and data model support.
- **Partial**: Some acceptance criteria/feature expectations are implemented, but important scope is missing.
- **Unmet**: No concrete implementation artifact found.

## Traceability Matrix

| Requirement ID / Section | Implemented code location | API endpoint(s) | Verification status |
|---|---|---|---|
| **PRD US-AUTH-01** (school onboarding + isolation) | `src/routes/schools.ts`, `src/utils/schoolScope.ts`, `prisma/schema.prisma` | `POST /api/v1/schools`, `GET /api/v1/schools/:id` | **Partial** (school create/isolation exists; onboarding checklist and temporary-password flow not explicit) |
| **PRD US-AUTH-02** (login + JWT/refresh + lockouts + generic errors) | `src/routes/auth.ts`, `src/plugins/redisStore.ts`, `src/utils/http.ts` | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` | **Partial** (login + refresh + lockout + generic failures present; exact token TTL/remember-me behavior not fully aligned) |
| **PRD US-AUTH-03** (password reset link lifecycle) | `src/routes/auth.ts`, `src/utils/authSecurity.ts`, `prisma/schema.prisma` | `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password` | **Partial** (token generation and reset endpoints exist; expiry/one-time guarantees differ from PRD target) |
| **PRD US-AUTH-04** (RBAC + 403 + teacher/parent scoping) | `src/plugins/auth.ts`, `src/utils/schoolScope.ts`, route guards in `src/routes/*.ts` | All protected `/api/v1/*` endpoints | **Partial** (role allowlists + 403 patterns exist; parent child-only access is not comprehensively enforced across all modules) |
| **PRD US-STU-01** (enroll student, ID generation, duplicate warning) | `src/routes/students.ts`, `prisma/schema.prisma` | `POST /api/v1/students` | **Partial** (enrollment exists; duplicate detection and full module propagation checks are incomplete) |
| **PRD US-STU-02** (edit profile, immutable ID, audit, class enrollment history) | `src/routes/students.ts`, `src/plugins/audit.ts` | `PUT /api/v1/students/:id` | **Partial** (update path exists; immutable ID/audit detail/class-enrollment history semantics are incomplete) |
| **PRD US-STU-03** (status change with reason + behavior changes + transfer PDF) | `src/routes/students.ts`, `prisma/schema.prisma` | `PATCH /api/v1/students/:id/status` | **Partial** (status updates exist; required reason + transfer-letter export + downstream suppression behavior not fully implemented) |
| **PRD US-STU-04** (search/filter student list) | `src/routes/students.ts` | `GET /api/v1/students` | **Partial** (search + core filters present; guardian/fee-status filters and URL/bookmark UX aspects are not fully covered at API layer) |
| **PRD US-STU-05** (bulk CSV import) | — | — | **Unmet** |
| **PRD US-STU-06** (student document uploads, restricted visibility) | `src/plugins/storage.ts`, `src/routes/platform.ts` | File upload/storage endpoints under `/api/v1/platform/*` | **Partial** (storage primitives exist; student-document workflow + strict role visibility for docs not fully wired) |
| **PRD US-ACA-01** (academic year/terms, one active term) | `src/routes/academics.ts`, `prisma/schema.prisma` | `POST/GET/PUT/DELETE /api/v1/terms`, `GET /api/v1/terms/:id` | **Partial** (terms CRUD exists; one-active-term invariant not strongly enforced) |
| **PRD US-ACA-02** (classes + class teacher assignment) | `src/routes/academics.ts`, `prisma/schema.prisma` | `POST/GET/PUT/DELETE /api/v1/classes`, `GET /api/v1/classes/:id` | **Implemented** |
| **PRD US-ACA-03** (subjects and teacher assignment constraints) | `src/routes/academics.ts`, `src/utils/schoolScope.ts`, `prisma/schema.prisma` | `POST/GET/PUT/DELETE /api/v1/subjects`, `POST/GET/DELETE /api/v1/class-subject-assignments` | **Implemented** |
| **PRD US-ACA-04** (timetable builder + conflicts + PDF export) | `src/routes/academics.ts`, `prisma/schema.prisma` | `GET/PUT /api/v1/classes/:id/timetable` | **Partial** (timetable persistence exists; conflict detection and PDF export missing) |
| **System Spec 4.3 Attendance** (daily/period tracking, reports, alerts) | `src/routes/attendance.ts`, `src/services/attendanceService.ts`, `prisma/schema.prisma` | `POST /api/v1/attendance/bulk`, register/history/percentage/summary endpoints | **Partial** (core attendance + key reporting endpoints exist; automated alert/escalation workflows absent) |
| **System Spec 4.4 Exams & Grading** (exam lifecycle, grading engine, report cards) | `src/routes/exams.ts`, `src/utils/grading.ts`, `prisma/schema.prisma` | Exam configuration and result endpoints under `/api/v1/exams*` | **Partial** (exam/result handling + grading utilities exist; report cards/transcripts/sign-off workflows incomplete) |
| **System Spec 4.5 Fees** (invoices, payments, arrears/reporting, receipts) | `src/routes/fees.ts`, `prisma/schema.prisma` | Fee endpoints under `/api/v1/fees*` | **Partial** (invoice/payment core exists; full allocation/reconciliation/reporting/receipt coverage incomplete) |
| **System Spec 2 & 7** (Fastify API, Prisma/Postgres, Redis/Queue, storage integration) | `src/server.ts`, `src/plugins/prisma.ts`, `src/plugins/redisStore.ts`, `src/plugins/jobQueue.ts`, `src/plugins/storage.ts` | `/health`, `/api/v1/*` | **Partial** (architecture components are scaffolded; some integrations are in-memory/dev-grade) |
| **System Spec 8** (authentication/security controls) | `src/plugins/auth.ts`, `src/routes/auth.ts`, `src/utils/authSecurity.ts`, `tests/auth-security.test.ts` | `/api/v1/auth/*` and protected routes | **Partial** (important controls exist; production-hardening requirements remain) |
| **System Spec 9** (notifications/integrations: SMS/WhatsApp/email) | `src/plugins/jobQueue.ts`, `src/routes/platform.ts` | Platform/queue endpoints under `/api/v1/platform/*` | **Partial** (queue abstraction exists; real external notification provider integrations are unmet) |
| **System Spec 10** (file storage/media) | `src/plugins/storage.ts`, `src/routes/platform.ts` | File storage endpoints under `/api/v1/platform/*` | **Partial** (storage API exists but no durable S3/MinIO-backed production implementation) |
| **System Spec 11** (offline/PWA support) | — | — | **Unmet** |
| **System Spec 13** (non-functional: reliability, performance, observability) | `src/server.ts`, `src/app.ts`, test suite in `test/**` and `tests/**` | `/health` | **Partial** (health checks/tests exist; full NFR instrumentation and SLO evidence not complete) |

## Unmet/Partial Closure Backlog

### P0 (Launch-blocking closure)
1. Finalize **auth security contract**: exact access/refresh TTLs, remember-me extension, reset-token 1-hour expiry and one-time invalidation, and comprehensive parent/teacher data-scope enforcement.
2. Complete **student lifecycle criticals**: duplicate detection on enrollment, immutable `studentId` guarantees, status-change reason enforcement, and active-module behavior for suspended/withdrawn students.
3. Enforce **academic term invariants**: exactly one active term per school with transactional safeguards.
4. Harden **fees/exams/attendance core accuracy**: reliable invoice-payment allocation, canonical fee status derivation, teacher-subject/class permission checks everywhere marks are entered, and attendance integrity controls.

### P1 (Core value closure)
1. Deliver **bulk CSV student import** with row-level validation reporting.
2. Deliver **document workflow completion**: student document upload restrictions and auditable access controls.
3. Add **timetable conflict detection + export**, **report-card/transcript generation**, and richer analytics/reporting exports (PDF/Excel).
4. Replace in-memory platform abstractions with production adapters (Redis, S3/MinIO, notification providers) and add contract/integration test coverage for those paths.
5. Define and implement **offline/PWA synchronization surface** (API conflict-resolution rules and queued operations).

## Verification Method Used
- Cross-read requirement statements in `edutrack-prd.md` and feature sections in `edutrack-system-spec.md`.
- Mapped each requirement to concrete Fastify route handlers, service logic, plugin capabilities, Prisma schema entities, and existing tests.
- Marked status as **Implemented**, **Partial**, or **Unmet** based on direct artifact evidence.
