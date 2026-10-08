ALTER TABLE "Invoice"
  ADD COLUMN "employeeId" TEXT,
  ADD COLUMN "employeeCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "billerName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "billerSignature" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "counterId" TEXT,
  ADD COLUMN "counterNumber" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "counterName" TEXT NOT NULL DEFAULT '';

CREATE TABLE "Employee" (
  "id" TEXT NOT NULL, "employeeCode" TEXT NOT NULL, "name" TEXT NOT NULL,
  "mobile" TEXT NOT NULL DEFAULT '', "email" TEXT NOT NULL DEFAULT '',
  "designation" TEXT NOT NULL DEFAULT '', "department" TEXT NOT NULL DEFAULT '',
  "dateOfJoining" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "username" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'counter',
  "signature" TEXT NOT NULL DEFAULT '', "permissions" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Counter" (
  "id" TEXT NOT NULL, "number" TEXT NOT NULL, "name" TEXT NOT NULL, "location" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "employeeId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "employeeCode" TEXT NOT NULL, "employeeName" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL, "checkIn" TIMESTAMP(3), "checkOut" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'PRESENT',
  "totalMinutes" INTEGER NOT NULL DEFAULT 0, "modifiedBy" TEXT NOT NULL DEFAULT '', "modificationLog" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LoginSession" (
  "id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "employeeCode" TEXT NOT NULL, "employeeName" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endedAt" TIMESTAMP(3),
  "userAgent" TEXT NOT NULL DEFAULT '', "ipAddress" TEXT NOT NULL DEFAULT '', CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EmployeeActivity" (
  "id" TEXT NOT NULL, "employeeId" TEXT, "employeeCode" TEXT NOT NULL DEFAULT '', "employeeName" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL, "transactionNo" TEXT NOT NULL DEFAULT '', "oldValue" TEXT NOT NULL DEFAULT '',
  "newValue" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeActivity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdvanceBooking" (
  "id" TEXT NOT NULL, "bookingNo" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customerId" TEXT, "customerName" TEXT NOT NULL, "customerPhone" TEXT NOT NULL DEFAULT '', "description" TEXT NOT NULL,
  "productCode" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL DEFAULT '', "approximateWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "purity" TEXT NOT NULL DEFAULT '', "metal" TEXT NOT NULL DEFAULT 'GOLD', "bookingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "advancePaid" DECIMAL(65,30) NOT NULL DEFAULT 0, "balanceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "paymentMode" TEXT NOT NULL DEFAULT 'CASH', "expectedDelivery" TIMESTAMP(3), "goldRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "makingCharges" DECIMAL(65,30) NOT NULL DEFAULT 0, "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "instructions" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'CONFIRMED', "employeeId" TEXT,
  "employeeCode" TEXT NOT NULL DEFAULT '', "billerName" TEXT NOT NULL DEFAULT '', "billerSignature" TEXT NOT NULL DEFAULT '', "counterId" TEXT,
  "counterNumber" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AdvanceBooking_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdvancePayment" (
  "id" TEXT NOT NULL, "bookingId" TEXT NOT NULL, "amount" DECIMAL(65,30) NOT NULL, "mode" TEXT NOT NULL,
  "reference" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvancePayment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CreditNote" (
  "id" TEXT NOT NULL, "creditNoteNo" TEXT NOT NULL, "invoiceId" TEXT NOT NULL, "invoiceNo" TEXT NOT NULL,
  "customerName" TEXT NOT NULL, "originalBillDate" TIMESTAMP(3) NOT NULL, "originalAmount" DECIMAL(65,30) NOT NULL,
  "creditAmount" DECIMAL(65,30) NOT NULL, "remainingBalance" DECIMAL(65,30) NOT NULL, "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "employeeId" TEXT, "employeeCode" TEXT NOT NULL DEFAULT '',
  "createdByName" TEXT NOT NULL DEFAULT '', "approvedById" TEXT, "approvedByCode" TEXT NOT NULL DEFAULT '',
  "approvedByName" TEXT NOT NULL DEFAULT '', "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CreditNoteAdjustment" (
  "id" TEXT NOT NULL, "creditNoteId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL, "invoiceNo" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL, "employeeCode" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditNoteAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE UNIQUE INDEX "Employee_username_key" ON "Employee"("username");
CREATE UNIQUE INDEX "Counter_number_key" ON "Counter"("number");
CREATE UNIQUE INDEX "Counter_employeeId_key" ON "Counter"("employeeId");
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");
CREATE UNIQUE INDEX "AdvanceBooking_bookingNo_key" ON "AdvanceBooking"("bookingNo");
CREATE UNIQUE INDEX "CreditNote_creditNoteNo_key" ON "CreditNote"("creditNoteNo");
CREATE INDEX "Invoice_employeeId_date_idx" ON "Invoice"("employeeId", "date");
CREATE INDEX "Invoice_counterId_date_idx" ON "Invoice"("counterId", "date");
CREATE INDEX "Attendance_date_status_idx" ON "Attendance"("date", "status");
CREATE INDEX "LoginSession_employeeId_startedAt_idx" ON "LoginSession"("employeeId", "startedAt");
CREATE INDEX "EmployeeActivity_employeeId_createdAt_idx" ON "EmployeeActivity"("employeeId", "createdAt");
CREATE INDEX "EmployeeActivity_action_createdAt_idx" ON "EmployeeActivity"("action", "createdAt");
CREATE INDEX "AdvanceBooking_date_status_idx" ON "AdvanceBooking"("date", "status");
CREATE INDEX "AdvanceBooking_customerId_idx" ON "AdvanceBooking"("customerId");
CREATE INDEX "CreditNote_status_createdAt_idx" ON "CreditNote"("status", "createdAt");
CREATE INDEX "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");
CREATE INDEX "CreditNoteAdjustment_creditNoteId_idx" ON "CreditNoteAdjustment"("creditNoteId");
CREATE INDEX "CreditNoteAdjustment_invoiceId_idx" ON "CreditNoteAdjustment"("invoiceId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Counter" ADD CONSTRAINT "Counter_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeActivity" ADD CONSTRAINT "EmployeeActivity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvanceBooking" ADD CONSTRAINT "AdvanceBooking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvanceBooking" ADD CONSTRAINT "AdvanceBooking_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvanceBooking" ADD CONSTRAINT "AdvanceBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "AdvanceBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNoteAdjustment" ADD CONSTRAINT "CreditNoteAdjustment_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNoteAdjustment" ADD CONSTRAINT "CreditNoteAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
