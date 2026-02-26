CREATE TYPE "ChangeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED', 'FAILED', 'CLOSED', 'CANCELLED');

CREATE TYPE "ChangePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY');

CREATE TYPE "ChangeCategory" AS ENUM ('STANDARD', 'NORMAL', 'EMERGENCY', 'MAJOR');

CREATE TABLE "change_requests" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "impactAnalysis" TEXT,
    "riskAssessment" TEXT,
    "rollbackPlan" TEXT,
    "testPlan" TEXT,
    "status" "ChangeStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "ChangePriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "ChangeCategory" NOT NULL DEFAULT 'NORMAL',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "requestedById" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "implementationNotes" TEXT,
    "verificationNotes" TEXT,
    "affectedServices" TEXT[],
    "relatedTicketIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "change_audit_logs" (
    "id" SERIAL NOT NULL,
    "changeRequestId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "comment" TEXT,
    "userId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "change_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "change_requests_status_idx" ON "change_requests"("status");

CREATE INDEX "change_requests_priority_idx" ON "change_requests"("priority");

CREATE INDEX "change_requests_category_idx" ON "change_requests"("category");

CREATE INDEX "change_requests_requestedById_idx" ON "change_requests"("requestedById");

CREATE INDEX "change_requests_assignedToId_idx" ON "change_requests"("assignedToId");

CREATE INDEX "change_requests_scheduledStart_idx" ON "change_requests"("scheduledStart");

CREATE INDEX "change_audit_logs_changeRequestId_idx" ON "change_audit_logs"("changeRequestId");

CREATE INDEX "change_audit_logs_userId_idx" ON "change_audit_logs"("userId");

CREATE INDEX "change_audit_logs_timestamp_idx" ON "change_audit_logs"("timestamp");

ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "change_audit_logs" ADD CONSTRAINT "change_audit_logs_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "change_audit_logs" ADD CONSTRAINT "change_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
