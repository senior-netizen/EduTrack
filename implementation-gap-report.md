# EduTrack Implementation Gap Report

Date: 2026-05-22

## Scope Reviewed
- `edutrack-system-spec.md`
- `edutrack-prd.md`
- `edutrack-db-schema.md`
- `edutrack-api-contracts.md`
- Backend implementation under `src/**`, `prisma/schema.prisma`, `README.md`

## Route-Level Closure Checklist
- [x] **1) Response envelope consistency (global)** — verified `ok/created/err/fail` helper usage is applied across reviewed modules, with contract-style `{ success, data|error }` envelope in route handlers.
- [x] **2) Auth module** — verified token persistence/rotation, password reset token flow, and `/auth/me` permissions model are implemented.
- [x] **3) Schools module** — verified computed school stats + active term and explicit own-school route support.
- [x] **4) Students module** — verified filter coverage (`search`, `classId`, `status`, `gender`, `termId`, `feeStatus`), class school-scope checks on create/update, and fee balance/status computation.
- [x] **5) Academics module** — verified CRUD/list routes for terms/classes/subjects plus assignment, timetable, and curriculum routes.
- [x] **6) Attendance module** — verified bulk entry plus register/history/percentage/summary retrieval routes.
- [x] **7) Exams module** — verified exams, exam papers CRUD, result write/read, ranking/report-card, moderation transition, and timetable.
- [x] **8) Fees module** — verified invoice list/detail/create/update/transition/bulk generation, payment allocation, receipt generation, arrears and reconciliation reporting.
- [x] **9) Cross-cutting platform requirements from system spec/PRD** — static review confirms this section still has known platform gaps (infra/notifications/uploads/exports/audit surfaces), intentionally tracked separately from the requested module matrix.

## Module Matrices vs `edutrack-api-contracts.md`

### Auth
| Contract Route | Status | Evidence |
|---|---|---|
| `POST /auth/login` | Implemented | Handler: `src/routes/auth.ts` (`app.post('/auth/login')`), schema: `loginSchema`, services/helpers: JWT + refresh token persistence (`generateTokenId`, `hashToken`, `prisma.refreshToken.create`). |
| `POST /auth/logout` | Implemented | Handler: `app.post('/auth/logout')`, behavior: refresh token revoke (`prisma.refreshToken.updateMany`) + cookie clear. |
| `POST /auth/refresh` | Implemented | Handler: `app.post('/auth/refresh')`, behavior: refresh token verification + rotation + re-issue access token. |
| `POST /auth/forgot-password` | Implemented | Handler: `app.post('/auth/forgot-password')`, schema: `forgotPasswordSchema`, behavior: token generation + persistence (`prisma.passwordResetToken.create`). |
| `POST /auth/reset-password` | Implemented | Handler: `app.post('/auth/reset-password')`, schema: `resetPasswordSchema`, behavior: token lookup/expiry/one-time-use + password hash update. |
| `GET /auth/me` | Implemented | Handler: `app.get('/auth/me')`, behavior: profile lookup + `permissionsForRole(role)`. |

### Schools
| Contract Route | Status | Evidence |
|---|---|---|
| `POST /schools` | Implemented | Handler: `src/routes/schools.ts` (`app.post('/schools')`), schema: inline Zod payload validator, behavior: tx creates school + admin. |
| `GET /schools/:id` | Implemented | Handler: `app.get('/schools/:id')`, DTO path: `getSchoolResponseDto`, service methods: `resolveSchoolIdForRequest` + Prisma aggregate stats and active term join. |

### Students
| Contract Route | Status | Evidence |
|---|---|---|
| `GET /students` | Implemented | Handler: `src/routes/students.ts` (`app.get('/students')`), behavior: pagination + `search/classId/status/gender/termId/feeStatus` + computed fee balance/status. |
| `POST /students` | Implemented | Handler: `app.post('/students')`, schema: `createStudentSchema`/`guardianInputSchema`, scope guard: `ensureClassInSchool`. |
| `GET /students/:id` | Implemented | Handler present with school scope checks and guardian mapping. |
| `PUT /students/:id` | Implemented | Handler present, schema: `updateStudentSchema`, behavior includes class scope validation for `classId` changes (`ensureClassInSchool`). |
| `POST /students/:id/status` | Implemented | Handler present with scoped status update flow. |
| `POST /students/bulk-import` | Missing | No route handler found in `src/routes/students.ts`. |
| `GET /students/:id/report-card/:termId` | Missing | No route handler found in `src/routes/students.ts` (report card is currently exposed via exams module query route). |

### Academics
| Contract Route | Status | Evidence |
|---|---|---|
| `GET /classes` | Implemented | Handler: `src/routes/academics.ts` (`app.get('/classes')`) with pagination/filter query handling. |
| `POST /classes` | Implemented | Handler: `app.post('/classes')`, schema validation + school scoping. |
| `GET /classes/:id/students` | Missing | No explicit handler for class roster route. |

> Additional verified implemented academics routes beyond contract minimum: terms CRUD, subjects CRUD, class-subject assignments, timetable endpoints, curriculum endpoints.

### Attendance
| Contract Route | Status | Evidence |
|---|---|---|
| `POST /attendance` | Partial | Implemented as `POST /attendance/bulk` with equivalent bulk record behavior. |
| `GET /attendance/student/:studentId` | Partial | Implemented as `GET /attendance/students/:studentId/history` (history behavior present, path differs). |
| `GET /attendance/class/:classId` | Partial | Implemented via `GET /attendance/register/daily` with `classId` + `date` query; class-level read behavior exists, path/contract shape differs. |

### Exams
| Contract Route | Status | Evidence |
|---|---|---|
| `POST /exams` | Implemented | Handler exists with class/term scope checks. |
| `POST /exams/:id/results` | Partial | Equivalent write behavior implemented at `POST /exam-results` (requires `examId` in body). |
| `GET /exams/:id/results` | Partial | Equivalent read behavior implemented at `GET /exam-results?examId=...`. |
| `POST /exams/:id/publish` | Missing | No explicit publish route found; closest behavior is moderation transition route on exam result rows. |

### Fees
| Contract Route | Status | Evidence |
|---|---|---|
| `POST /fees/structures` | Missing | No fee structure route found. |
| `POST /fees/invoices/generate` | Partial | Equivalent bulk generation implemented at `POST /invoices/bulk/term`. |
| `GET /fees/accounts/:studentId` | Missing | No consolidated student fee-account route found. |
| `POST /fees/payments` | Partial | Equivalent implemented at `POST /payments` with allocation + overpayment policy. |
| `GET /fees/payments/:id/receipt` | Partial | Equivalent implemented as `POST /payments/:id/receipt` (idempotent receipt generation). |
| `GET /fees/arrears` | Partial | Equivalent reporting implemented as `GET /reports/arrears`. |
| `POST /fees/arrears/notify` | Missing | No arrears notification route found. |

## Static Review Outcome
After static re-review against `edutrack-api-contracts.md`, the codebase remains **partially implemented** for contract-level route parity due to the missing/partial routes listed in the matrices above.
