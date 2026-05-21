# EduTrack — Database Schema
## Version 1.0 | PostgreSQL 15 + Prisma ORM

---

## Conventions

- All primary keys: `CUID` (via Prisma `@default(cuid())`)
- All timestamps: `timestamptz` (timezone-aware)
- Soft deletes: `deletedAt timestamptz NULL` — never hard delete student/financial records
- All monetary values: `DECIMAL(10,2)` in USD
- `schoolId` on every tenant table — enforced at application layer + DB index
- Enum types defined as PostgreSQL `ENUM` and mirrored in Prisma

---

## Migration Order

Run migrations in this exact order to satisfy foreign key constraints:

```
001_create_schools
002_create_users
003_create_user_profiles
004_create_departments
005_create_staff
006_create_terms
007_create_subjects
008_create_classes
009_create_class_subjects
010_create_students
011_create_guardians
012_create_class_enrollments
013_create_attendance_records
014_create_exams
015_create_exam_papers
016_create_exam_results
017_create_fee_structures
018_create_fee_accounts
019_create_invoices
020_create_invoice_items
021_create_payments
022_create_notifications
023_create_announcements
024_create_leave_requests
025_create_library_books
026_create_library_borrowings
027_create_audit_logs
028_create_student_documents
029_create_medical_notes
030_create_grading_scales
```

---

## Full Schema

### `schools`
```sql
CREATE TABLE schools (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,          -- e.g. "SMC"
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  logo_url      TEXT,
  country       CHAR(2) NOT NULL DEFAULT 'ZW',
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_schools_code ON schools(code);
CREATE INDEX idx_schools_active ON schools(is_active) WHERE is_active = TRUE;
```

---

### `users`
```sql
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'HEADMASTER',
  'HOD',
  'TEACHER',
  'BURSAR',
  'LIBRARIAN',
  'PARENT',
  'STUDENT'
);

CREATE TABLE users (
  id                   TEXT PRIMARY KEY,
  school_id            TEXT REFERENCES schools(id) ON DELETE RESTRICT,
  email                TEXT NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,
  role                 user_role NOT NULL,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  last_login           TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(school_id, role);
```

---

### `user_profiles`
```sql
CREATE TABLE user_profiles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

---

### `departments`
```sql
CREATE TABLE departments (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- e.g. "Mathematics", "Sciences"
  hod_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(school_id, name)
);

CREATE INDEX idx_departments_school_id ON departments(school_id);
```

---

### `staff`
```sql
CREATE TYPE staff_role AS ENUM (
  'TEACHER', 'CLASS_TEACHER', 'HOD', 'DEPUTY_HEAD',
  'HEADMASTER', 'BURSAR', 'LIBRARIAN', 'ADMIN_CLERK',
  'SUPPORT_STAFF'
);

CREATE TABLE staff (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  staff_id_code   TEXT NOT NULL UNIQUE,    -- e.g. "STF-2024-0001"
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  role            staff_role NOT NULL,
  department_id   TEXT REFERENCES departments(id) ON DELETE SET NULL,
  phone           TEXT,
  qualification   TEXT,
  hire_date       DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  UNIQUE(school_id, staff_id_code)
);

CREATE INDEX idx_staff_school_id ON staff(school_id);
CREATE INDEX idx_staff_user_id ON staff(user_id);
CREATE INDEX idx_staff_active ON staff(school_id, is_active) WHERE is_active = TRUE;
```

---

### `terms`
```sql
CREATE TABLE terms (
  id            TEXT PRIMARY KEY,
  school_id     TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,          -- e.g. "2024"
  name          TEXT NOT NULL,          -- e.g. "Term 1"
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(school_id, academic_year, name),
  CONSTRAINT term_dates_valid CHECK (end_date > start_date)
);

CREATE INDEX idx_terms_school_id ON terms(school_id);
CREATE INDEX idx_terms_active ON terms(school_id, is_active) WHERE is_active = TRUE;

-- Enforce only one active term per school
CREATE UNIQUE INDEX idx_one_active_term_per_school
  ON terms(school_id)
  WHERE is_active = TRUE;
```

---

### `subjects`
```sql
CREATE TABLE subjects (
  id            TEXT PRIMARY KEY,
  school_id     TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,          -- e.g. "Mathematics"
  code          TEXT NOT NULL,          -- e.g. "MATH"
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(school_id, code)
);

CREATE INDEX idx_subjects_school_id ON subjects(school_id);
```

---

### `classes`
```sql
CREATE TABLE classes (
  id                TEXT PRIMARY KEY,
  school_id         TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,      -- e.g. "Form 2A"
  grade             TEXT NOT NULL,      -- e.g. "Form 2"
  stream            TEXT,               -- e.g. "A"
  capacity          INT NOT NULL DEFAULT 45,
  class_teacher_id  TEXT REFERENCES staff(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(school_id, name)
);

CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_active ON classes(school_id, is_active) WHERE is_active = TRUE;
```

---

### `class_subjects`
Junction: which teacher teaches which subject in which class.

```sql
CREATE TABLE class_subjects (
  id          TEXT PRIMARY KEY,
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  term_id     TEXT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(class_id, subject_id, term_id)
);

CREATE INDEX idx_class_subjects_class_id   ON class_subjects(class_id);
CREATE INDEX idx_class_subjects_teacher_id ON class_subjects(teacher_id);
CREATE INDEX idx_class_subjects_term_id    ON class_subjects(term_id);
```

---

### `students`
```sql
CREATE TYPE student_status AS ENUM (
  'ACTIVE', 'SUSPENDED', 'TRANSFERRED', 'GRADUATED', 'WITHDRAWN'
);

CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');

CREATE TABLE students (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id_code TEXT NOT NULL UNIQUE,   -- e.g. "SMC-2024-0001"
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  date_of_birth   DATE NOT NULL,
  gender          gender NOT NULL,
  photo_url       TEXT,
  address         TEXT,
  status          student_status NOT NULL DEFAULT 'ACTIVE',
  enrollment_date DATE NOT NULL,
  graduation_date DATE,
  user_id         TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  UNIQUE(school_id, student_id_code)
);

CREATE INDEX idx_students_school_id  ON students(school_id);
CREATE INDEX idx_students_status     ON students(school_id, status);
CREATE INDEX idx_students_name       ON students(school_id, last_name, first_name);
CREATE INDEX idx_students_active     ON students(school_id) WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_students_search ON students
  USING GIN(to_tsvector('english', first_name || ' ' || last_name));
```

---

### `guardians`
```sql
CREATE TYPE guardian_relationship AS ENUM (
  'MOTHER', 'FATHER', 'GRANDMOTHER', 'GRANDFATHER',
  'AUNT', 'UNCLE', 'SIBLING', 'GUARDIAN', 'OTHER'
);

CREATE TABLE guardians (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  relationship  guardian_relationship NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  user_id       TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guardians_student_id ON guardians(student_id);
CREATE INDEX idx_guardians_phone      ON guardians(phone);
CREATE INDEX idx_guardians_user_id    ON guardians(user_id);

-- Each student can have only one primary guardian
CREATE UNIQUE INDEX idx_one_primary_guardian_per_student
  ON guardians(student_id)
  WHERE is_primary = TRUE;
```

---

### `class_enrollments`
```sql
CREATE TABLE class_enrollments (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  term_id     TEXT NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(student_id, class_id, term_id)
);

CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX idx_class_enrollments_class_id   ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_term_id    ON class_enrollments(term_id);
```

---

### `attendance_records`
```sql
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

CREATE TABLE attendance_records (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id        TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  term_id         TEXT NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
  date            DATE NOT NULL,
  period          SMALLINT,             -- NULL=daily, 1-8=period based
  status          attendance_status NOT NULL,
  remarks         TEXT,
  recorded_by     TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(student_id, class_id, date, COALESCE(period, -1))
);

CREATE INDEX idx_attendance_student_date  ON attendance_records(student_id, date);
CREATE INDEX idx_attendance_class_date    ON attendance_records(class_id, date);
CREATE INDEX idx_attendance_term          ON attendance_records(term_id);
CREATE INDEX idx_attendance_absent        ON attendance_records(class_id, date)
  WHERE status = 'ABSENT' AND parent_notified = FALSE;
```

---

### `grading_scales`
```sql
CREATE TABLE grading_scales (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,            -- e.g. "ZIMSEC O Level"
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grading_scale_entries (
  id              TEXT PRIMARY KEY,
  scale_id        TEXT NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
  min_mark        DECIMAL(5,2) NOT NULL,
  max_mark        DECIMAL(5,2) NOT NULL,
  grade           TEXT NOT NULL,        -- e.g. "A", "B", "C"
  points          SMALLINT NOT NULL,    -- e.g. 1, 2, 3
  remark          TEXT,                 -- e.g. "Distinction"

  CONSTRAINT grade_range_valid CHECK (max_mark > min_mark)
);

CREATE INDEX idx_grading_scale_entries_scale_id ON grading_scale_entries(scale_id);
```

---

### `exams`
```sql
CREATE TYPE exam_type AS ENUM ('CONTINUOUS_ASSESSMENT', 'MIDTERM', 'FINAL', 'MOCK');
CREATE TYPE exam_status AS ENUM ('DRAFT', 'ACTIVE', 'RESULTS_IN', 'PUBLISHED');

CREATE TABLE exams (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_id     TEXT NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  exam_type   exam_type NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  weight      DECIMAL(4,2) NOT NULL DEFAULT 1.00,  -- e.g. 0.70 for 70% weighted
  status      exam_status NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  published_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT exam_dates_valid CHECK (end_date >= start_date),
  CONSTRAINT weight_valid CHECK (weight > 0 AND weight <= 1)
);

CREATE INDEX idx_exams_school_term ON exams(school_id, term_id);
```

---

### `exam_results`
```sql
CREATE TABLE exam_results (
  id              TEXT PRIMARY KEY,
  exam_id         TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id      TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  class_id        TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  marks_obtained  DECIMAL(6,2) NOT NULL,
  max_marks       DECIMAL(6,2) NOT NULL,
  percentage      DECIMAL(5,2) GENERATED ALWAYS AS (
                    CASE WHEN max_marks > 0
                    THEN ROUND((marks_obtained / max_marks) * 100, 2)
                    ELSE 0 END
                  ) STORED,
  grade           TEXT,
  points          SMALLINT,
  class_position  SMALLINT,
  remarks         TEXT,
  entered_by      TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(exam_id, student_id, subject_id),
  CONSTRAINT marks_valid CHECK (marks_obtained >= 0 AND marks_obtained <= max_marks)
);

CREATE INDEX idx_exam_results_exam_id     ON exam_results(exam_id);
CREATE INDEX idx_exam_results_student_id  ON exam_results(student_id);
CREATE INDEX idx_exam_results_class_id    ON exam_results(class_id, exam_id);
```

---

### `fee_structures`
```sql
CREATE TABLE fee_structures (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_id     TEXT NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,            -- e.g. "Tuition Fee"
  amount      DECIMAL(10,2) NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fee_amount_positive CHECK (amount >= 0)
);

-- Fee applicability: which classes this fee applies to (NULL = all classes)
CREATE TABLE fee_structure_classes (
  fee_structure_id  TEXT NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  class_id          TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (fee_structure_id, class_id)
);

CREATE INDEX idx_fee_structures_term_id ON fee_structures(term_id);
```

---

### `fee_accounts`
One account per student per term.

```sql
CREATE TYPE fee_status AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERPAID');

CREATE TABLE fee_accounts (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id         TEXT NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
  total_billed    DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_paid      DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance         DECIMAL(10,2) GENERATED ALWAYS AS (
                    total_billed - discount - total_paid
                  ) STORED,
  status          fee_status NOT NULL DEFAULT 'UNPAID',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(student_id, term_id),
  CONSTRAINT billing_positive    CHECK (total_billed >= 0),
  CONSTRAINT discount_valid      CHECK (discount >= 0 AND discount <= total_billed),
  CONSTRAINT total_paid_positive CHECK (total_paid >= 0)
);

CREATE INDEX idx_fee_accounts_student_id ON fee_accounts(student_id);
CREATE INDEX idx_fee_accounts_term_id    ON fee_accounts(term_id);
CREATE INDEX idx_fee_accounts_status     ON fee_accounts(term_id, status);
CREATE INDEX idx_fee_accounts_balance    ON fee_accounts(term_id, balance) WHERE balance > 0;
```

---

### `invoices`
```sql
CREATE TABLE invoices (
  id              TEXT PRIMARY KEY,
  fee_account_id  TEXT NOT NULL REFERENCES fee_accounts(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL UNIQUE,  -- e.g. "INV-2024-001247"
  total_amount    DECIMAL(10,2) NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date        DATE
);

CREATE TABLE invoice_items (
  id                TEXT PRIMARY KEY,
  invoice_id        TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  fee_structure_id  TEXT REFERENCES fee_structures(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  amount            DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_invoices_fee_account_id ON invoices(fee_account_id);
```

---

### `payments`
```sql
CREATE TYPE payment_method AS ENUM (
  'CASH', 'ECOCASH', 'BANK_TRANSFER', 'PAYNOW', 'CHEQUE'
);

CREATE TABLE payments (
  id              TEXT PRIMARY KEY,
  fee_account_id  TEXT NOT NULL REFERENCES fee_accounts(id) ON DELETE RESTRICT,
  amount          DECIMAL(10,2) NOT NULL,
  method          payment_method NOT NULL,
  reference       TEXT,                  -- EcoCash txn, bank ref
  receipt_number  TEXT NOT NULL UNIQUE,  -- e.g. "RCP-2024-000142"
  notes           TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by     TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  voided          BOOLEAN NOT NULL DEFAULT FALSE,
  voided_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  voided_at       TIMESTAMPTZ,
  void_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payment_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_payments_fee_account_id ON payments(fee_account_id);
CREATE INDEX idx_payments_receipt        ON payments(receipt_number);
CREATE INDEX idx_payments_method_date    ON payments(method, paid_at);

-- Receipt number sequence function
CREATE SEQUENCE receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_receipt_number(school_code TEXT)
RETURNS TEXT AS $$
  SELECT school_code || '-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('receipt_number_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;
```

---

### `notifications`
```sql
CREATE TYPE notification_type AS ENUM (
  'ATTENDANCE_ALERT', 'FEE_REMINDER', 'GRADE_PUBLISHED',
  'ANNOUNCEMENT', 'SYSTEM', 'EXAM_SCHEDULE', 'LEAVE_STATUS'
);

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        notification_type NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  channels    TEXT[] NOT NULL DEFAULT '{}',  -- e.g. '{sms,push}'
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB                            -- e.g. {"studentId": "...", "termId": "..."}
);

CREATE INDEX idx_notifications_user_id   ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_school_id ON notifications(school_id, sent_at DESC);
CREATE INDEX idx_notifications_unread    ON notifications(user_id) WHERE is_read = FALSE;
```

---

### `announcements`
```sql
CREATE TYPE announcement_target AS ENUM (
  'ALL_USERS', 'ALL_PARENTS', 'CLASS_PARENTS',
  'ALL_STAFF', 'SPECIFIC_CLASS'
);

CREATE TABLE announcements (
  id            TEXT PRIMARY KEY,
  school_id     TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  target_type   announcement_target NOT NULL,
  class_ids     TEXT[],                   -- populated when target = CLASS_PARENTS
  channels      TEXT[] NOT NULL,
  created_by    TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_sent    INT NOT NULL DEFAULT 0,
  total_failed  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_school_id ON announcements(school_id, created_at DESC);
```

---

### `leave_requests`
```sql
CREATE TYPE leave_type   AS ENUM ('ANNUAL', 'SICK', 'COMPASSIONATE', 'UNPAID', 'STUDY');
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE leave_requests (
  id              TEXT PRIMARY KEY,
  staff_id        TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  leave_type      leave_type NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  days_requested  SMALLINT NOT NULL,
  reason          TEXT NOT NULL,
  status          leave_status NOT NULL DEFAULT 'PENDING',
  reviewed_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  review_comment  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT leave_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_staff_id ON leave_requests(staff_id);
CREATE INDEX idx_leave_requests_pending  ON leave_requests(school_id, status) WHERE status = 'PENDING';
```

---

### `library_books`
```sql
CREATE TABLE library_books (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  isbn            TEXT,
  title           TEXT NOT NULL,
  author          TEXT,
  category        TEXT,
  total_copies    SMALLINT NOT NULL DEFAULT 1,
  available_copies SMALLINT NOT NULL DEFAULT 1,
  cover_url       TEXT,
  added_at        DATE NOT NULL DEFAULT CURRENT_DATE,

  CONSTRAINT copies_valid CHECK (available_copies >= 0 AND available_copies <= total_copies)
);

CREATE INDEX idx_library_books_school_id ON library_books(school_id);
CREATE INDEX idx_library_books_isbn      ON library_books(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX idx_library_books_search    ON library_books
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(author, '')));
```

---

### `library_borrowings`
```sql
CREATE TYPE borrow_status AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE', 'LOST');

CREATE TABLE library_borrowings (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
  borrower_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date    DATE NOT NULL,
  returned_at TIMESTAMPTZ,
  status      borrow_status NOT NULL DEFAULT 'BORROWED',
  fine_amount DECIMAL(6,2) NOT NULL DEFAULT 0,
  fine_paid   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_borrowings_book_id     ON library_borrowings(book_id);
CREATE INDEX idx_borrowings_borrower_id ON library_borrowings(borrower_id);
CREATE INDEX idx_borrowings_overdue     ON library_borrowings(due_date)
  WHERE status = 'BORROWED' AND returned_at IS NULL;
```

---

### `student_documents`
```sql
CREATE TYPE document_type AS ENUM (
  'BIRTH_CERTIFICATE', 'TRANSFER_LETTER', 'PASSPORT_PHOTO',
  'EXAM_CERTIFICATE', 'MEDICAL_CERT', 'OTHER'
);

CREATE TABLE student_documents (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type          document_type NOT NULL,
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size_kb  INT,
  uploaded_by   TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_documents_student_id ON student_documents(student_id);
```

---

### `medical_notes`
```sql
CREATE TABLE medical_notes (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  note          TEXT NOT NULL,
  recorded_by   TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_notes_student_id ON medical_notes(student_id);
```

---

### `audit_logs`
```sql
CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action      TEXT NOT NULL,       -- e.g. "STUDENT_ENROLLED", "PAYMENT_RECORDED"
  entity      TEXT NOT NULL,       -- e.g. "Student", "Payment"
  entity_id   TEXT NOT NULL,
  before_data JSONB,
  after_data  JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_school_id  ON audit_logs(school_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity     ON audit_logs(entity, entity_id);

-- Partition by month for large schools (optional for v1.1)
-- CREATE TABLE audit_logs PARTITION BY RANGE (created_at);
```

---

## Prisma Schema (complete)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────

enum UserRole {
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

enum StaffRole {
  TEACHER CLASS_TEACHER HOD DEPUTY_HEAD
  HEADMASTER BURSAR LIBRARIAN ADMIN_CLERK SUPPORT_STAFF
}

enum Gender           { MALE FEMALE OTHER }
enum StudentStatus    { ACTIVE SUSPENDED TRANSFERRED GRADUATED WITHDRAWN }
enum GuardianRelationship {
  MOTHER FATHER GRANDMOTHER GRANDFATHER
  AUNT UNCLE SIBLING GUARDIAN OTHER
}
enum AttendanceStatus { PRESENT ABSENT LATE EXCUSED }
enum ExamType         { CONTINUOUS_ASSESSMENT MIDTERM FINAL MOCK }
enum ExamStatus       { DRAFT ACTIVE RESULTS_IN PUBLISHED }
enum FeeStatus        { UNPAID PARTIAL PAID OVERPAID }
enum PaymentMethod    { CASH ECOCASH BANK_TRANSFER PAYNOW CHEQUE }
enum NotificationType {
  ATTENDANCE_ALERT FEE_REMINDER GRADE_PUBLISHED
  ANNOUNCEMENT SYSTEM EXAM_SCHEDULE LEAVE_STATUS
}
enum AnnouncementTarget {
  ALL_USERS ALL_PARENTS CLASS_PARENTS ALL_STAFF SPECIFIC_CLASS
}
enum LeaveType   { ANNUAL SICK COMPASSIONATE UNPAID STUDY }
enum LeaveStatus { PENDING APPROVED REJECTED CANCELLED }
enum BorrowStatus { BORROWED RETURNED OVERDUE LOST }
enum DocumentType {
  BIRTH_CERTIFICATE TRANSFER_LETTER PASSPORT_PHOTO
  EXAM_CERTIFICATE MEDICAL_CERT OTHER
}

// ─── Models ───────────────────────────────────────────────────

model School {
  id         String   @id @default(cuid())
  name       String
  code       String   @unique
  address    String?
  phone      String?
  email      String?
  logoUrl    String?  @map("logo_url")
  country    String   @default("ZW")
  currency   String   @default("USD")
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")

  users        User[]
  staff        Staff[]
  terms        Term[]
  classes      Class[]
  subjects     Subject[]
  departments  Department[]
  students     Student[]
  feeStructures FeeStructure[]
  announcements Announcement[]
  notifications Notification[]
  auditLogs    AuditLog[]

  @@map("schools")
}

model User {
  id                   String    @id @default(cuid())
  schoolId             String?   @map("school_id")
  email                String    @unique
  passwordHash         String    @map("password_hash")
  role                 UserRole
  isActive             Boolean   @default(true) @map("is_active")
  failedLoginAttempts  Int       @default(0) @map("failed_login_attempts")
  lockedUntil          DateTime? @map("locked_until")
  lastLogin            DateTime? @map("last_login")
  passwordResetToken   String?   @map("password_reset_token")
  passwordResetExpires DateTime? @map("password_reset_expires")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  school       School?       @relation(fields: [schoolId], references: [id])
  profile      UserProfile?
  staff        Staff?
  student      Student?
  guardian     Guardian?
  notifications Notification[]
  auditLogs    AuditLog[]
  payments     Payment[]
  documents    StudentDocument[]

  @@map("users")
}

model UserProfile {
  id        String   @id @default(cuid())
  userId    String   @unique @map("user_id")
  firstName String   @map("first_name")
  lastName  String   @map("last_name")
  phone     String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

model Department {
  id        String   @id @default(cuid())
  schoolId  String   @map("school_id")
  name      String
  hodId     String?  @map("hod_id")
  createdAt DateTime @default(now()) @map("created_at")

  school   School  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  subjects Subject[]
  staff    Staff[]

  @@unique([schoolId, name])
  @@map("departments")
}

model Staff {
  id           String    @id @default(cuid())
  schoolId     String    @map("school_id")
  userId       String    @unique @map("user_id")
  staffIdCode  String    @unique @map("staff_id_code")
  firstName    String    @map("first_name")
  lastName     String    @map("last_name")
  role         StaffRole
  departmentId String?   @map("department_id")
  phone        String?
  qualification String?
  hireDate     DateTime  @map("hire_date") @db.Date
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  school        School        @relation(fields: [schoolId], references: [id])
  user          User          @relation(fields: [userId], references: [id])
  department    Department?   @relation(fields: [departmentId], references: [id])
  classes       Class[]
  classSubjects ClassSubject[]
  attendanceRecords AttendanceRecord[]
  examResults   ExamResult[]
  leaveRequests LeaveRequest[]

  @@map("staff")
}

model Term {
  id           String   @id @default(cuid())
  schoolId     String   @map("school_id")
  academicYear String   @map("academic_year")
  name         String
  startDate    DateTime @map("start_date") @db.Date
  endDate      DateTime @map("end_date") @db.Date
  isActive     Boolean  @default(false) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  school      School   @relation(fields: [schoolId], references: [id])
  enrollments ClassEnrollment[]
  classSubjects ClassSubject[]
  exams       Exam[]
  feeStructures FeeStructure[]
  feeAccounts FeeAccount[]
  attendanceRecords AttendanceRecord[]

  @@unique([schoolId, academicYear, name])
  @@map("terms")
}

model Subject {
  id           String   @id @default(cuid())
  schoolId     String   @map("school_id")
  name         String
  code         String
  departmentId String?  @map("department_id")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  school        School       @relation(fields: [schoolId], references: [id])
  department    Department?  @relation(fields: [departmentId], references: [id])
  classSubjects ClassSubject[]
  examResults   ExamResult[]

  @@unique([schoolId, code])
  @@map("subjects")
}

model Class {
  id             String   @id @default(cuid())
  schoolId       String   @map("school_id")
  name           String
  grade          String
  stream         String?
  capacity       Int      @default(45)
  classTeacherId String?  @map("class_teacher_id")
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  school        School   @relation(fields: [schoolId], references: [id])
  classTeacher  Staff?   @relation(fields: [classTeacherId], references: [id])
  enrollments   ClassEnrollment[]
  classSubjects ClassSubject[]
  attendanceRecords AttendanceRecord[]
  examResults   ExamResult[]

  @@unique([schoolId, name])
  @@map("classes")
}

model ClassSubject {
  id        String   @id @default(cuid())
  classId   String   @map("class_id")
  subjectId String   @map("subject_id")
  teacherId String   @map("teacher_id")
  termId    String   @map("term_id")
  createdAt DateTime @default(now()) @map("created_at")

  class   Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject Subject @relation(fields: [subjectId], references: [id])
  teacher Staff   @relation(fields: [teacherId], references: [id])
  term    Term    @relation(fields: [termId], references: [id], onDelete: Cascade)

  @@unique([classId, subjectId, termId])
  @@map("class_subjects")
}

model Student {
  id             String        @id @default(cuid())
  schoolId       String        @map("school_id")
  studentIdCode  String        @unique @map("student_id_code")
  firstName      String        @map("first_name")
  lastName       String        @map("last_name")
  dateOfBirth    DateTime      @map("date_of_birth") @db.Date
  gender         Gender
  photoUrl       String?       @map("photo_url")
  address        String?
  status         StudentStatus @default(ACTIVE)
  enrollmentDate DateTime      @map("enrollment_date") @db.Date
  graduationDate DateTime?     @map("graduation_date") @db.Date
  userId         String?       @unique @map("user_id")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  deletedAt      DateTime?     @map("deleted_at")

  school      School    @relation(fields: [schoolId], references: [id])
  user        User?     @relation(fields: [userId], references: [id])
  guardians   Guardian[]
  enrollments ClassEnrollment[]
  attendanceRecords AttendanceRecord[]
  examResults ExamResult[]
  feeAccounts FeeAccount[]
  documents   StudentDocument[]
  medicalNotes MedicalNote[]

  @@map("students")
}

model Guardian {
  id           String               @id @default(cuid())
  studentId    String               @map("student_id")
  firstName    String               @map("first_name")
  lastName     String               @map("last_name")
  relationship GuardianRelationship
  phone        String
  email        String?
  isPrimary    Boolean              @default(false) @map("is_primary")
  userId       String?              @unique @map("user_id")
  createdAt    DateTime             @default(now()) @map("created_at")
  updatedAt    DateTime             @updatedAt @map("updated_at")

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id])

  @@map("guardians")
}

model ClassEnrollment {
  id         String   @id @default(cuid())
  studentId  String   @map("student_id")
  classId    String   @map("class_id")
  termId     String   @map("term_id")
  enrolledAt DateTime @default(now()) @map("enrolled_at")

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class   Class   @relation(fields: [classId], references: [id])
  term    Term    @relation(fields: [termId], references: [id])

  @@unique([studentId, classId, termId])
  @@map("class_enrollments")
}

model AttendanceRecord {
  id             String           @id @default(cuid())
  studentId      String           @map("student_id")
  classId        String           @map("class_id")
  termId         String           @map("term_id")
  date           DateTime         @db.Date
  period         Int?
  status         AttendanceStatus
  remarks        String?
  recordedBy     String           @map("recorded_by")
  parentNotified Boolean          @default(false) @map("parent_notified")
  notifiedAt     DateTime?        @map("notified_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  student    Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class      Class   @relation(fields: [classId], references: [id])
  term       Term    @relation(fields: [termId], references: [id])
  recordedByStaff Staff @relation(fields: [recordedBy], references: [id])

  @@map("attendance_records")
}

model Exam {
  id          String     @id @default(cuid())
  schoolId    String     @map("school_id")
  termId      String     @map("term_id")
  name        String
  examType    ExamType   @map("exam_type")
  startDate   DateTime   @map("start_date") @db.Date
  endDate     DateTime   @map("end_date") @db.Date
  weight      Decimal    @default(1.00) @db.Decimal(4, 2)
  status      ExamStatus @default(DRAFT)
  publishedAt DateTime?  @map("published_at")
  publishedBy String?    @map("published_by")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  term    Term         @relation(fields: [termId], references: [id])
  results ExamResult[]

  @@map("exams")
}

model ExamResult {
  id            String   @id @default(cuid())
  examId        String   @map("exam_id")
  studentId     String   @map("student_id")
  subjectId     String   @map("subject_id")
  classId       String   @map("class_id")
  marksObtained Decimal  @map("marks_obtained") @db.Decimal(6, 2)
  maxMarks      Decimal  @map("max_marks") @db.Decimal(6, 2)
  grade         String?
  points        Int?
  classPosition Int?     @map("class_position")
  remarks       String?
  enteredBy     String   @map("entered_by")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  exam    Exam    @relation(fields: [examId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subject Subject @relation(fields: [subjectId], references: [id])
  class   Class   @relation(fields: [classId], references: [id])
  enteredByStaff Staff @relation(fields: [enteredBy], references: [id])

  @@unique([examId, studentId, subjectId])
  @@map("exam_results")
}

model FeeStructure {
  id          String   @id @default(cuid())
  schoolId    String   @map("school_id")
  termId      String   @map("term_id")
  name        String
  amount      Decimal  @db.Decimal(10, 2)
  isOptional  Boolean  @default(false) @map("is_optional")
  createdAt   DateTime @default(now()) @map("created_at")

  school       School        @relation(fields: [schoolId], references: [id])
  term         Term          @relation(fields: [termId], references: [id])
  invoiceItems InvoiceItem[]

  @@map("fee_structures")
}

model FeeAccount {
  id           String    @id @default(cuid())
  studentId    String    @map("student_id")
  termId       String    @map("term_id")
  totalBilled  Decimal   @default(0) @map("total_billed") @db.Decimal(10, 2)
  discount     Decimal   @default(0) @db.Decimal(10, 2)
  totalPaid    Decimal   @default(0) @map("total_paid") @db.Decimal(10, 2)
  status       FeeStatus @default(UNPAID)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  student  Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  term     Term      @relation(fields: [termId], references: [id])
  invoices Invoice[]
  payments Payment[]

  @@unique([studentId, termId])
  @@map("fee_accounts")
}

model Invoice {
  id            String   @id @default(cuid())
  feeAccountId  String   @map("fee_account_id")
  invoiceNumber String   @unique @map("invoice_number")
  totalAmount   Decimal  @map("total_amount") @db.Decimal(10, 2)
  issuedAt      DateTime @default(now()) @map("issued_at")
  dueDate       DateTime? @map("due_date") @db.Date

  feeAccount FeeAccount    @relation(fields: [feeAccountId], references: [id], onDelete: Cascade)
  items      InvoiceItem[]

  @@map("invoices")
}

model InvoiceItem {
  id             String  @id @default(cuid())
  invoiceId      String  @map("invoice_id")
  feeStructureId String? @map("fee_structure_id")
  name           String
  amount         Decimal @db.Decimal(10, 2)

  invoice      Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  feeStructure FeeStructure? @relation(fields: [feeStructureId], references: [id])

  @@map("invoice_items")
}

model Payment {
  id            String        @id @default(cuid())
  feeAccountId  String        @map("fee_account_id")
  amount        Decimal       @db.Decimal(10, 2)
  method        PaymentMethod
  reference     String?
  receiptNumber String        @unique @map("receipt_number")
  notes         String?
  paidAt        DateTime      @default(now()) @map("paid_at")
  recordedBy    String        @map("recorded_by")
  voided        Boolean       @default(false)
  voidedBy      String?       @map("voided_by")
  voidedAt      DateTime?     @map("voided_at")
  voidReason    String?       @map("void_reason")
  createdAt     DateTime      @default(now()) @map("created_at")

  feeAccount FeeAccount @relation(fields: [feeAccountId], references: [id])
  recordedByUser User   @relation(fields: [recordedBy], references: [id])

  @@map("payments")
}

model Notification {
  id        String           @id @default(cuid())
  userId    String           @map("user_id")
  schoolId  String           @map("school_id")
  title     String
  body      String
  type      NotificationType
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at")
  channels  String[]
  sentAt    DateTime         @default(now()) @map("sent_at")
  metadata  Json?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  school School @relation(fields: [schoolId], references: [id])

  @@map("notifications")
}

model AuditLog {
  id         String   @id @default(cuid())
  schoolId   String   @map("school_id")
  userId     String   @map("user_id")
  action     String
  entity     String
  entityId   String   @map("entity_id")
  beforeData Json?    @map("before_data")
  afterData  Json?    @map("after_data")
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  school School @relation(fields: [schoolId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}

model StudentDocument {
  id          String       @id @default(cuid())
  studentId   String       @map("student_id")
  type        DocumentType
  fileName    String       @map("file_name")
  fileUrl     String       @map("file_url")
  fileSizeKb  Int?         @map("file_size_kb")
  uploadedBy  String       @map("uploaded_by")
  uploadedAt  DateTime     @default(now()) @map("uploaded_at")

  student    Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  uploadedByUser User @relation(fields: [uploadedBy], references: [id])

  @@map("student_documents")
}

model MedicalNote {
  id          String   @id @default(cuid())
  studentId   String   @map("student_id")
  note        String
  recordedBy  String   @map("recorded_by")
  recordedAt  DateTime @default(now()) @map("recorded_at")

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("medical_notes")
}

model LeaveRequest {
  id            String      @id @default(cuid())
  staffId       String      @map("staff_id")
  schoolId      String      @map("school_id")
  leaveType     LeaveType   @map("leave_type")
  startDate     DateTime    @map("start_date") @db.Date
  endDate       DateTime    @map("end_date") @db.Date
  daysRequested Int         @map("days_requested")
  reason        String
  status        LeaveStatus @default(PENDING)
  reviewedBy    String?     @map("reviewed_by")
  reviewedAt    DateTime?   @map("reviewed_at")
  reviewComment String?     @map("review_comment")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  staff Staff @relation(fields: [staffId], references: [id], onDelete: Cascade)

  @@map("leave_requests")
}
```

---

## Seed Data

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@edutrack.app' },
    update: {},
    create: {
      email: 'super@edutrack.app',
      passwordHash: await bcrypt.hash('EduTrack$2024', 12),
      role: 'SUPER_ADMIN',
      isActive: true,
      profile: {
        create: { firstName: 'System', lastName: 'Admin' }
      }
    }
  })

  // 2. Demo School
  const school = await prisma.school.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: "St. Mary's Demo College",
      code: 'DEMO',
      address: '123 Borrowdale Road, Harare, Zimbabwe',
      phone: '+263242123456',
      email: 'demo@stmarys.ac.zw',
      country: 'ZW',
      currency: 'USD',
    }
  })

  // 3. School Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.edutrack.app' },
    update: {},
    create: {
      email: 'admin@demo.edutrack.app',
      passwordHash: await bcrypt.hash('Admin#1234', 12),
      role: 'SCHOOL_ADMIN',
      schoolId: school.id,
      isActive: true,
      profile: {
        create: { firstName: 'Tendai', lastName: 'Moyo', phone: '+263771000001' }
      }
    }
  })

  // 4. Active term
  const term = await prisma.term.upsert({
    where: { schoolId_academicYear_name: { schoolId: school.id, academicYear: '2024', name: 'Term 2' } },
    update: {},
    create: {
      schoolId: school.id,
      academicYear: '2024',
      name: 'Term 2',
      startDate: new Date('2024-07-15'),
      endDate: new Date('2024-09-27'),
      isActive: true,
    }
  })

  // 5. Sample departments
  const mathDept = await prisma.department.create({
    data: { schoolId: school.id, name: 'Mathematics' }
  })
  const sciDept = await prisma.department.create({
    data: { schoolId: school.id, name: 'Sciences' }
  })

  // 6. Sample subjects
  const subjects = await Promise.all([
    prisma.subject.create({ data: { schoolId: school.id, name: 'Mathematics', code: 'MATH', departmentId: mathDept.id } }),
    prisma.subject.create({ data: { schoolId: school.id, name: 'English Language', code: 'ENG' } }),
    prisma.subject.create({ data: { schoolId: school.id, name: 'History', code: 'HIST' } }),
    prisma.subject.create({ data: { schoolId: school.id, name: 'Biology', code: 'BIO', departmentId: sciDept.id } }),
    prisma.subject.create({ data: { schoolId: school.id, name: 'Chemistry', code: 'CHEM', departmentId: sciDept.id } }),
  ])

  // 7. Sample classes
  const classes = await Promise.all([
    prisma.class.create({ data: { schoolId: school.id, name: 'Form 1A', grade: 'Form 1', stream: 'A', capacity: 40 } }),
    prisma.class.create({ data: { schoolId: school.id, name: 'Form 2A', grade: 'Form 2', stream: 'A', capacity: 40 } }),
    prisma.class.create({ data: { schoolId: school.id, name: 'Form 3B', grade: 'Form 3', stream: 'B', capacity: 40 } }),
  ])

  // 8. Grading scale (ZIMSEC O Level)
  const scale = await prisma.gradingScale.create({
    data: {
      schoolId: school.id,
      name: 'ZIMSEC O Level',
      isDefault: true,
      entries: {
        create: [
          { minMark: 90, maxMark: 100, grade: 'A*', points: 1, remark: 'Distinction' },
          { minMark: 80, maxMark: 89,  grade: 'A',  points: 2, remark: 'Excellent'   },
          { minMark: 70, maxMark: 79,  grade: 'B',  points: 3, remark: 'Very Good'   },
          { minMark: 60, maxMark: 69,  grade: 'C',  points: 4, remark: 'Good'        },
          { minMark: 50, maxMark: 59,  grade: 'D',  points: 5, remark: 'Credit'      },
          { minMark: 40, maxMark: 49,  grade: 'E',  points: 6, remark: 'Pass'        },
          { minMark: 0,  maxMark: 39,  grade: 'U',  points: 9, remark: 'Ungraded'    },
        ]
      }
    }
  })

  console.log('✅ Seed complete')
  console.log(`   School: ${school.name} (${school.code})`)
  console.log(`   Admin:  admin@demo.edutrack.app / Admin#1234`)
  console.log(`   Term:   ${term.name} ${term.academicYear} (active)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## Key Database Rules

| Rule | Implementation |
|---|---|
| Multi-tenancy | Every query MUST include `WHERE school_id = $schoolId` |
| No hard deletes | Use `deleted_at` timestamp — filter `WHERE deleted_at IS NULL` |
| Financial immutability | Payments are never deleted — only voided with audit trail |
| Single active term | Unique partial index on `terms(school_id) WHERE is_active = TRUE` |
| Attendance deduplication | Unique constraint on `(student_id, class_id, date, period)` |
| Receipt numbering | Sequential per school using `generate_receipt_number(school_code)` |
| Audit everything | All writes to students, payments, grades, status changes go to `audit_logs` |

---

*EduTrack DB Schema v1.0 — PostgreSQL 15 + Prisma ORM*
*Migration order, full SQL DDL, Prisma schema, and seed data included*
