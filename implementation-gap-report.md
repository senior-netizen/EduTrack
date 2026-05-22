# EduTrack Implementation Gap Report

Date: 2026-05-22

## Scope Reviewed
- `edutrack-system-spec.md`
- `edutrack-prd.md`
- `edutrack-db-schema.md`
- `edutrack-api-contracts.md`
- Backend implementation under `src/**`, `prisma/schema.prisma`, `README.md`

## Verdict
The backend is **partially implemented** and is **not yet complete to spec**.

## What is implemented (high level)
- Auth basics: login/logout/refresh/forgot-password/reset-password/me.
- Schools: create and get-by-id.
- Students: list/create/get/update/status change.
- Academics: create terms/classes/subjects.
- Attendance: bulk entry.
- Exams: create exams and upsert exam result.
- Fees: create invoices and create payments.

## Major gaps vs API contracts

### 1) Response envelope consistency (global)
- API contract mandates a strict error object format and field-level details.
- Current code uses helper wrappers but does not consistently align all error/detail shapes across routes.

### 2) Auth module
- `/auth/forgot-password` and `/auth/reset-password` are placeholder-style implementations (no token issuing, persistence, expiry, or reset flow).
- `/auth/me` returns empty permissions and null avatar; contract expects populated permission model and richer profile details.
- Refresh token uses the same JWT secret as access token; no dedicated refresh token secret/rotation policy per stricter production interpretation.

### 3) Schools module
- Contract notes school-level stats and active term info in GET response; currently minimal direct model return with no computed aggregates.
- Role behavior "GET own school" exception path is not explicit.

### 4) Students module
- Contract includes filters like `feeStatus` and `termId`; current list supports only subset (`search`, `status`, `classId`, `gender`).
- Fee balance/status in list are placeholder values (`0`, `UNKNOWN`) rather than computed from invoices/payments.
- `PUT /students/:id` lacks schema-level validation and school-scope validation for new `classId` changes.
- Guardian model mapping is partial (first/last split from one stored name; portal-access and primary semantics are placeholders).
- Documents/class history/medical/address data are placeholders/nulls instead of fully modeled values.

### 5) Academics module
- Missing read/list/update/delete endpoints for terms/classes/subjects.
- Missing teacher-subject-class assignment APIs and timetable/curriculum related endpoints referenced in spec-level docs.

### 6) Attendance module
- Only bulk entry endpoint exists.
- Missing retrieval/reporting endpoints (daily register, student attendance history, percentages, monthly summaries, late logs, alert workflows).

### 7) Exams module
- `exam-results` relies on existing `examPaperId` but no API to create/manage exam papers.
- Grade computation is hard-coded and simplified; no configurable grading scales/weighting engine.
- Missing result retrieval, class positions, report card/transcript, moderation/sign-off, and exam timetable endpoints.

### 8) Fees module
- Invoice creation exists but no invoice listing, detail, status transitions, term-based bulk generation, or arrears reporting endpoints.
- Payment recording does not allocate to invoices or update invoice balances/status.
- Missing receipt generation, reconciliation, summaries, and parent communication workflows.

### 9) Cross-cutting platform requirements from system spec/PRD
- No Redis-backed rate limiting/session strategy beyond in-memory login attempt counters.
- No background job/queue handling for notifications (SMS/email/WhatsApp).
- No file upload/storage flows (avatars, student documents, logos, report cards).
- No reporting/analytics endpoints and no export (PDF/Excel) flows.
- No audit trail endpoints/surfaces exposed.
- No automated tests in repo validating contracts.

## Recommended completion checklist
1. Build endpoint coverage matrix from `edutrack-api-contracts.md` and mark each route `Implemented / Partial / Missing`.
2. Implement missing CRUD/read/report endpoints module-by-module.
3. Replace placeholder fields with real computed/business values (fees, permissions, profile fields).
4. Add durable password-reset flow (token store, expiry, one-time use).
5. Add invoice-payment allocation logic and fee status computation.
6. Add exam paper management + configurable grading engine.
7. Add attendance/exams/fees reporting endpoints and export pipeline.
8. Add integration tests against API contract examples.
9. Add infra pieces from system spec (Redis, jobs, notifications, file storage).
