# EduTrack — API Contracts
## Version 1.0 | Node.js Fastify REST API

---

## Conventions

### Base URL
```
Development:  http://localhost:4000/api/v1
Production:   https://api.edutrack.app/api/v1
```

### Authentication
All endpoints require `Authorization: Bearer <accessToken>` unless marked `[PUBLIC]`.

### Request Headers
```
Content-Type:  application/json
Authorization: Bearer <jwt_access_token>
X-School-ID:   <schoolId>   (injected by middleware from JWT — do not send manually)
```

### Standard Response Envelope
```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 247,
    "totalPages": 10
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Pagination (all list endpoints)
```
Query params:  ?page=1&perPage=25&sortBy=createdAt&sortOrder=desc
```

### Error Codes
| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/params failed validation |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Authenticated but insufficient role |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource |
| 422 | `UNPROCESSABLE` | Business logic rejection |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## 1. Auth

### POST `/auth/login` [PUBLIC]
Authenticate user and return tokens.

**Request:**
```json
{
  "email": "admin@stmarys.ac.zw",
  "password": "SecurePass123",
  "rememberMe": false
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clx9f2k3p0001ab12cd34ef56",
      "email": "admin@stmarys.ac.zw",
      "role": "SCHOOL_ADMIN",
      "schoolId": "clx9f2k3p0002ab12cd34ef56",
      "schoolName": "St. Mary's College",
      "firstName": "Tendai",
      "lastName": "Moyo",
      "avatarUrl": null
    }
  }
}
```
> Refresh token set as `httpOnly` cookie: `edutrack_refresh`

**Response 401:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

### POST `/auth/logout`
**Request:** *(no body)*
**Response 200:**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

### POST `/auth/refresh` [PUBLIC]
Uses `httpOnly` cookie to issue new access token.

**Request:** *(no body — reads cookie)*
**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/auth/forgot-password` [PUBLIC]
**Request:**
```json
{ "email": "admin@stmarys.ac.zw" }
```
**Response 200:** *(always 200 to prevent enumeration)*
```json
{ "success": true, "data": { "message": "If that email exists, a reset link has been sent." } }
```

---

### POST `/auth/reset-password` [PUBLIC]
**Request:**
```json
{
  "token": "abc123resettoken",
  "newPassword": "NewSecurePass456"
}
```
**Response 200:**
```json
{ "success": true, "data": { "message": "Password reset successfully." } }
```

---

### GET `/auth/me`
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clx9f2k3p0001ab12cd34ef56",
    "email": "admin@stmarys.ac.zw",
    "role": "SCHOOL_ADMIN",
    "schoolId": "clx9f2k3p0002ab12cd34ef56",
    "firstName": "Tendai",
    "lastName": "Moyo",
    "avatarUrl": "https://s3.../schools/scl1/users/usr1/avatar.jpg",
    "lastLogin": "2024-09-14T08:23:00Z",
    "permissions": ["students:read", "students:write", "fees:read", "fees:write"]
  }
}
```

---

## 2. Schools

> Roles: `SUPER_ADMIN` only (except GET own school)

### POST `/schools`
**Request:**
```json
{
  "name": "St. Mary's College",
  "code": "SMC",
  "address": "123 Borrowdale Road, Harare",
  "phone": "+263242123456",
  "email": "info@stmarys.ac.zw",
  "country": "ZW",
  "currency": "USD",
  "adminEmail": "admin@stmarys.ac.zw",
  "adminFirstName": "Tendai",
  "adminLastName": "Moyo"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "clx9f2k3p0002ab12cd34ef56",
    "name": "St. Mary's College",
    "code": "SMC",
    "createdAt": "2024-09-01T10:00:00Z",
    "admin": {
      "id": "clx9f2k3p0001ab12cd34ef56",
      "email": "admin@stmarys.ac.zw",
      "temporaryPassword": "TempPass!789"
    }
  }
}
```

---

### GET `/schools/:id`
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clx9f2k3p0002ab12cd34ef56",
    "name": "St. Mary's College",
    "code": "SMC",
    "address": "123 Borrowdale Road, Harare",
    "phone": "+263242123456",
    "email": "info@stmarys.ac.zw",
    "logoUrl": "https://s3.../schools/scl1/logo.png",
    "country": "ZW",
    "currency": "USD",
    "studentCount": 1247,
    "staffCount": 62,
    "activeTermId": "clxterm001",
    "activeTermName": "Term 2 2024",
    "createdAt": "2024-09-01T10:00:00Z"
  }
}
```

---

## 3. Students

### GET `/students`
**Query params:** `page`, `perPage`, `search`, `classId`, `status`, `feeStatus`, `gender`, `termId`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxstu001",
      "studentId": "SMC-2024-0001",
      "firstName": "John",
      "lastName": "Moyo",
      "fullName": "John Moyo",
      "dateOfBirth": "2010-03-15",
      "gender": "MALE",
      "photoUrl": "https://s3.../schools/scl1/students/stu1/photo.jpg",
      "status": "ACTIVE",
      "currentClass": {
        "id": "clxcls002",
        "name": "Form 2A",
        "grade": "Form 2",
        "stream": "A"
      },
      "primaryGuardian": {
        "name": "Agnes Moyo",
        "phone": "+263771234567",
        "relationship": "MOTHER"
      },
      "feeBalance": 0.00,
      "feeStatus": "PAID",
      "enrollmentDate": "2024-01-15"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 1247,
    "totalPages": 50
  }
}
```

---

### POST `/students`
**Request:**
```json
{
  "firstName": "Tafadzwa",
  "lastName": "Chikwanda",
  "dateOfBirth": "2009-07-22",
  "gender": "FEMALE",
  "address": "45 Mbare Ave, Harare",
  "medicalNotes": "Asthmatic — has inhaler",
  "classId": "clxcls003",
  "enrollmentDate": "2024-01-15",
  "guardians": [
    {
      "firstName": "Peter",
      "lastName": "Chikwanda",
      "relationship": "FATHER",
      "phone": "+263772345678",
      "email": "peter@email.com",
      "isPrimary": true
    }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "clxstu002",
    "studentId": "SMC-2024-0002",
    "firstName": "Tafadzwa",
    "lastName": "Chikwanda",
    "status": "ACTIVE",
    "currentClass": {
      "id": "clxcls003",
      "name": "Form 3B"
    },
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

**Response 409 (duplicate):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A student with this name and date of birth already exists.",
    "details": [{ "existingStudentId": "SMC-2024-0001" }]
  }
}
```

---

### GET `/students/:id`
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clxstu001",
    "studentId": "SMC-2024-0001",
    "firstName": "John",
    "lastName": "Moyo",
    "fullName": "John Moyo",
    "dateOfBirth": "2010-03-15",
    "gender": "MALE",
    "photoUrl": null,
    "address": "123 Harare St",
    "medicalNotes": null,
    "status": "ACTIVE",
    "enrollmentDate": "2024-01-15",
    "currentClass": {
      "id": "clxcls002",
      "name": "Form 2A",
      "classTeacher": "Mr. T. Ncube"
    },
    "guardians": [
      {
        "id": "clxgrd001",
        "firstName": "Agnes",
        "lastName": "Moyo",
        "relationship": "MOTHER",
        "phone": "+263771234567",
        "email": null,
        "isPrimary": true,
        "hasPortalAccess": true
      }
    ],
    "classHistory": [
      { "class": "Form 1B", "term": "Term 1 2023", "year": "2023" },
      { "class": "Form 2A", "term": "Term 1 2024", "year": "2024" }
    ],
    "documents": [
      {
        "id": "clxdoc001",
        "type": "BIRTH_CERTIFICATE",
        "fileName": "birth_cert.pdf",
        "uploadedAt": "2024-01-15T08:00:00Z",
        "url": "https://s3.../signed-url-expires-in-1hr"
      }
    ],
    "createdAt": "2024-01-15T08:00:00Z",
    "updatedAt": "2024-09-01T10:00:00Z"
  }
}
```

---

### PUT `/students/:id`
**Request:** *(any subset of student fields)*
```json
{
  "address": "45 New Address, Harare",
  "medicalNotes": "Updated: Asthmatic, uses Ventolin"
}
```
**Response 200:** *(returns full updated student object)*

---

### POST `/students/:id/status`
**Request:**
```json
{
  "status": "TRANSFERRED",
  "reason": "Family relocated to Bulawayo",
  "effectiveDate": "2024-09-20"
}
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clxstu001",
    "status": "TRANSFERRED",
    "transferLetterUrl": "https://s3.../transfer-letter-SMC-2024-0001.pdf"
  }
}
```

---

### POST `/students/bulk-import`
**Request:** `multipart/form-data`
```
file: students.csv   (max 500 rows)
classId: clxcls002   (optional — override class column in CSV)
termId: clxterm001
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalRows": 45,
    "imported": 43,
    "skipped": 2,
    "errors": [
      { "row": 12, "field": "dateOfBirth", "message": "Invalid date format. Expected YYYY-MM-DD." },
      { "row": 27, "field": "email", "message": "Duplicate: student already exists." }
    ]
  }
}
```

---

### GET `/students/:id/report-card/:termId`
Generates and streams a PDF report card.

**Response 200:** `Content-Type: application/pdf`
> Binary PDF stream

---

## 4. Classes

### GET `/classes`
**Query params:** `termId`, `grade`, `search`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxcls002",
      "name": "Form 2A",
      "grade": "Form 2",
      "stream": "A",
      "capacity": 40,
      "studentCount": 37,
      "classTeacher": {
        "id": "clxstf001",
        "name": "Mr. T. Ncube"
      }
    }
  ]
}
```

---

### POST `/classes`
**Request:**
```json
{
  "name": "Form 2A",
  "grade": "Form 2",
  "stream": "A",
  "capacity": 40,
  "classTeacherId": "clxstf001"
}
```
**Response 201:** *(returns created class)*

---

### GET `/classes/:id/students`
**Query params:** `termId` (defaults to active term)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxstu001",
      "studentId": "SMC-2024-0001",
      "fullName": "John Moyo",
      "gender": "MALE",
      "photoUrl": null,
      "attendanceRate": 94.2,
      "feeStatus": "PAID"
    }
  ]
}
```

---

## 5. Attendance

### POST `/attendance`
Submit attendance for a class session.

**Request:**
```json
{
  "classId": "clxcls002",
  "date": "2024-09-16",
  "period": null,
  "records": [
    { "studentId": "clxstu001", "status": "PRESENT", "remarks": null },
    { "studentId": "clxstu002", "status": "ABSENT",  "remarks": null },
    { "studentId": "clxstu003", "status": "LATE",    "remarks": "Arrived 8:45am" },
    { "studentId": "clxstu004", "status": "EXCUSED", "remarks": "Medical certificate" }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "sessionId": "clxatt001",
    "classId": "clxcls002",
    "date": "2024-09-16",
    "totalStudents": 37,
    "present": 34,
    "absent": 1,
    "late": 1,
    "excused": 1,
    "smsQueued": 1,
    "submittedBy": "clxstf001",
    "submittedAt": "2024-09-16T07:45:00Z"
  }
}
```

**Response 409 (already submitted):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Attendance already submitted for Form 2A on 2024-09-16. Use PUT to update.",
    "details": [{ "existingSessionId": "clxatt001" }]
  }
}
```

---

### GET `/attendance/student/:studentId`
**Query params:** `termId`, `startDate`, `endDate`, `status`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "studentId": "clxstu001",
    "studentName": "John Moyo",
    "termId": "clxterm001",
    "termName": "Term 2 2024",
    "summary": {
      "schoolDays": 52,
      "present": 49,
      "absent": 1,
      "late": 2,
      "excused": 0,
      "attendanceRate": 94.2
    },
    "records": [
      {
        "date": "2024-09-16",
        "status": "PRESENT",
        "class": "Form 2A",
        "remarks": null
      },
      {
        "date": "2024-09-13",
        "status": "ABSENT",
        "class": "Form 2A",
        "remarks": null,
        "parentNotified": true,
        "notifiedAt": "2024-09-13T08:12:00Z"
      }
    ]
  }
}
```

---

### GET `/attendance/class/:classId`
**Query params:** `date`, `termId`, `startDate`, `endDate`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "classId": "clxcls002",
    "className": "Form 2A",
    "termId": "clxterm001",
    "averageAttendanceRate": 91.4,
    "students": [
      {
        "studentId": "clxstu001",
        "studentName": "John Moyo",
        "presentDays": 49,
        "absentDays": 1,
        "lateDays": 2,
        "attendanceRate": 94.2,
        "belowThreshold": false
      }
    ]
  }
}
```

---

## 6. Examinations

### POST `/exams`
**Request:**
```json
{
  "name": "End of Term 2 Examinations",
  "termId": "clxterm001",
  "examType": "FINAL",
  "startDate": "2024-09-23",
  "endDate": "2024-09-27",
  "weight": 0.70
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "clxexm001",
    "name": "End of Term 2 Examinations",
    "termId": "clxterm001",
    "examType": "FINAL",
    "weight": 0.70,
    "status": "DRAFT",
    "createdAt": "2024-09-01T10:00:00Z"
  }
}
```

---

### POST `/exams/:id/results`
Submit or update mark sheet for a subject-class combination.

**Request:**
```json
{
  "classId": "clxcls002",
  "subjectId": "clxsub001",
  "maxMarks": 100,
  "results": [
    { "studentId": "clxstu001", "marksObtained": 87, "remarks": "Good effort" },
    { "studentId": "clxstu002", "marksObtained": 54, "remarks": null },
    { "studentId": "clxstu003", "marksObtained": 91, "remarks": "Excellent" }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "examId": "clxexm001",
    "classId": "clxcls002",
    "subjectId": "clxsub001",
    "subjectName": "Mathematics",
    "totalStudents": 37,
    "submitted": 37,
    "classAverage": 71.3,
    "highestMark": 97,
    "lowestMark": 28,
    "passCount": 31,
    "failCount": 6
  }
}
```

---

### GET `/exams/:id/results`
**Query params:** `classId`, `subjectId`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "examId": "clxexm001",
    "examName": "End of Term 2 Examinations",
    "classId": "clxcls002",
    "className": "Form 2A",
    "subjectId": "clxsub001",
    "subjectName": "Mathematics",
    "results": [
      {
        "studentId": "clxstu001",
        "studentName": "John Moyo",
        "marksObtained": 87,
        "maxMarks": 100,
        "percentage": 87.0,
        "grade": "A",
        "points": 2,
        "position": 3,
        "remarks": "Good effort"
      }
    ],
    "statistics": {
      "classAverage": 71.3,
      "highest": 97,
      "lowest": 28,
      "passRate": 83.8
    }
  }
}
```

---

### POST `/exams/:id/publish`
Publish results and notify parents.

**Request:**
```json
{ "notifyParents": true, "channels": ["sms", "push"] }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "examId": "clxexm001",
    "status": "PUBLISHED",
    "publishedAt": "2024-09-28T14:00:00Z",
    "notificationsSent": 1247,
    "notificationsFailed": 3
  }
}
```

---

## 7. Fees

### POST `/fees/structures`
**Request:**
```json
{
  "termId": "clxterm001",
  "items": [
    { "name": "Tuition Fee",    "amount": 350.00, "classIds": null,          "isOptional": false },
    { "name": "Sport Levy",     "amount": 15.00,  "classIds": null,          "isOptional": false },
    { "name": "Boarding Fee",   "amount": 200.00, "classIds": ["clxcls005"], "isOptional": true  },
    { "name": "Computer Levy",  "amount": 20.00,  "classIds": null,          "isOptional": false }
  ]
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "termId": "clxterm001",
    "termName": "Term 2 2024",
    "items": [
      { "id": "clxfee001", "name": "Tuition Fee", "amount": 350.00 },
      { "id": "clxfee002", "name": "Sport Levy",  "amount": 15.00  }
    ],
    "totalItems": 4
  }
}
```

---

### POST `/fees/invoices/generate`
Bulk-generate invoices for all active students in a term.

**Request:**
```json
{
  "termId": "clxterm001",
  "overwriteExisting": false
}
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "termId": "clxterm001",
    "invoicesGenerated": 1247,
    "invoicesSkipped": 0,
    "totalBilled": 459831.00
  }
}
```

---

### GET `/fees/accounts/:studentId`
**Query params:** `termId`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "studentId": "clxstu001",
    "studentName": "John Moyo",
    "termId": "clxterm001",
    "termName": "Term 2 2024",
    "totalBilled": 385.00,
    "discount": 0.00,
    "totalPaid": 385.00,
    "balance": 0.00,
    "status": "PAID",
    "invoiceItems": [
      { "name": "Tuition Fee",   "amount": 350.00 },
      { "name": "Sport Levy",    "amount": 15.00  },
      { "name": "Computer Levy", "amount": 20.00  }
    ],
    "payments": [
      {
        "id": "clxpay001",
        "amount": 385.00,
        "method": "ECOCASH",
        "reference": "ECD241234567",
        "receiptNumber": "RCP-2024-000142",
        "paidAt": "2024-09-02T09:15:00Z",
        "recordedBy": "Mrs. R. Dube"
      }
    ]
  }
}
```

---

### POST `/fees/payments`
Record a fee payment.

**Request:**
```json
{
  "studentId": "clxstu002",
  "termId": "clxterm001",
  "amount": 200.00,
  "method": "CASH",
  "reference": null,
  "paidAt": "2024-09-05T10:30:00Z",
  "notes": "Partial payment — balance USD 185"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "paymentId": "clxpay002",
    "receiptNumber": "RCP-2024-000143",
    "studentName": "Tafadzwa Chikwanda",
    "amount": 200.00,
    "method": "CASH",
    "paidAt": "2024-09-05T10:30:00Z",
    "feeAccount": {
      "totalBilled": 385.00,
      "totalPaid": 200.00,
      "balance": 185.00,
      "status": "PARTIAL"
    },
    "receiptUrl": "/api/v1/fees/payments/clxpay002/receipt"
  }
}
```

---

### GET `/fees/payments/:id/receipt`
Streams a PDF receipt.

**Response 200:** `Content-Type: application/pdf`

---

### GET `/fees/arrears`
**Query params:** `termId`, `classId`, `minBalance`, `page`, `perPage`, `sortBy`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "studentId": "clxstu002",
      "studentName": "Tafadzwa Chikwanda",
      "studentIdCode": "SMC-2024-0002",
      "class": "Form 3B",
      "totalBilled": 385.00,
      "totalPaid": 200.00,
      "balance": 185.00,
      "lastPaymentDate": "2024-09-05",
      "guardianName": "Peter Chikwanda",
      "guardianPhone": "+263772345678"
    }
  ],
  "meta": {
    "totalArrears": 74183.00,
    "studentsWithBalance": 312,
    "page": 1,
    "perPage": 25,
    "total": 312
  }
}
```

---

### POST `/fees/arrears/notify`
Send SMS reminder to parents with outstanding fees.

**Request:**
```json
{
  "termId": "clxterm001",
  "studentIds": ["clxstu002", "clxstu003"],
  "messageTemplate": "Dear {guardianName}, {studentName} has an outstanding fee balance of USD {balance} for {term}. Please contact the bursar."
}
```
> Use `"studentIds": null` to send to ALL students with balance > 0

**Response 200:**
```json
{
  "success": true,
  "data": {
    "queued": 312,
    "estimatedDelivery": "2–5 minutes"
  }
}
```

---

## 8. Staff

### GET `/staff`
**Query params:** `role`, `departmentId`, `search`, `isActive`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxstf001",
      "staffId": "STF-2024-0001",
      "firstName": "Tonderai",
      "lastName": "Ncube",
      "fullName": "Mr. T. Ncube",
      "role": "TEACHER",
      "department": "Mathematics",
      "phone": "+263773456789",
      "email": "t.ncube@stmarys.ac.zw",
      "isActive": true,
      "assignedClasses": ["Form 2A", "Form 3B", "Form 4A"]
    }
  ]
}
```

---

### POST `/staff`
**Request:**
```json
{
  "firstName": "Tonderai",
  "lastName": "Ncube",
  "role": "TEACHER",
  "departmentId": "clxdpt001",
  "phone": "+263773456789",
  "email": "t.ncube@stmarys.ac.zw",
  "qualification": "B.Ed Mathematics, UZ 2005",
  "hireDate": "2018-01-15",
  "createUserAccount": true
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "clxstf001",
    "staffId": "STF-2024-0001",
    "userId": "clxusr010",
    "temporaryPassword": "Welcome#2024"
  }
}
```

---

### POST `/staff/:id/leave`
**Request:**
```json
{
  "leaveType": "ANNUAL",
  "startDate": "2024-09-30",
  "endDate": "2024-10-04",
  "reason": "Family vacation"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "leaveRequestId": "clxlvr001",
    "status": "PENDING",
    "daysRequested": 5,
    "remainingBalance": 15
  }
}
```

---

## 9. Notifications

### GET `/notifications`
**Query params:** `isRead`, `type`, `page`, `perPage`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxnot001",
      "title": "Results Published",
      "body": "End of Term 2 results for Form 2A have been published.",
      "type": "GRADE_PUBLISHED",
      "isRead": false,
      "createdAt": "2024-09-28T14:05:00Z"
    }
  ],
  "meta": { "unreadCount": 4, "total": 23 }
}
```

---

### POST `/notifications/broadcast`
**Request:**
```json
{
  "title": "School closing early",
  "body": "Dear parents, school will close at 1pm today due to staff development. Please arrange early pickup.",
  "targetType": "ALL_PARENTS",
  "classIds": null,
  "channels": ["in_app", "sms"]
}
```
> `targetType` options: `ALL_USERS`, `ALL_PARENTS`, `CLASS_PARENTS`, `ALL_STAFF`, `SPECIFIC_CLASS`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "announcementId": "clxann001",
    "targetCount": 1247,
    "smsQueued": 1247,
    "inAppSent": 842
  }
}
```

---

## 10. Reports

### GET `/reports/enrollment`
**Query params:** `academicYear`, `termId`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total": 1247,
    "byGender": { "MALE": 634, "FEMALE": 613 },
    "byClass": [
      { "class": "Form 1A", "count": 42, "capacity": 45 },
      { "class": "Form 1B", "count": 39, "capacity": 45 }
    ],
    "trend": [
      { "year": "2022", "count": 1098 },
      { "year": "2023", "count": 1183 },
      { "year": "2024", "count": 1247 }
    ]
  }
}
```

---

### GET `/reports/finance`
**Query params:** `termId`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "termId": "clxterm001",
    "termName": "Term 2 2024",
    "totalBilled": 459831.00,
    "totalCollected": 385648.00,
    "totalOutstanding": 74183.00,
    "collectionRate": 83.9,
    "byPaymentMethod": {
      "CASH": 142000.00,
      "ECOCASH": 198000.00,
      "BANK_TRANSFER": 45648.00
    },
    "monthlyTrend": [
      { "month": "Jul 2024", "collected": 98000.00 },
      { "month": "Aug 2024", "collected": 156000.00 },
      { "month": "Sep 2024", "collected": 131648.00 }
    ]
  }
}
```

---

*EduTrack API Contracts v1.0 — Full request/response shapes for development handoff*
