CREATE TYPE "TicketSource" AS ENUM ('PORTAL', 'EMAIL', 'PHONE', 'CHAT', 'TEAMS', 'WALK_IN');

CREATE TYPE "OrganizationalUnitType" AS ENUM ('FACULTY', 'DEPARTMENT', 'LABORATORY', 'BUILDING', 'ROOM', 'OFFICE', 'OTHER');

ALTER TYPE "TicketCategory" ADD VALUE 'EMAIL';
ALTER TYPE "TicketCategory" ADD VALUE 'PRINTER';
ALTER TYPE "TicketCategory" ADD VALUE 'ACCESS';
ALTER TYPE "TicketCategory" ADD VALUE 'INFRASTRUCTURE';

ALTER TYPE "TicketPriority" ADD VALUE 'ESCALATED';

ALTER TYPE "TicketStatus" ADD VALUE 'PENDING';
ALTER TYPE "TicketStatus" ADD VALUE 'ON_HOLD';

ALTER TABLE "comments" ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tickets" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "laboratory" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "organizationalUnitId" INTEGER,
ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'PORTAL';

ALTER TABLE "users" ADD COLUMN     "agentSignature" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "organizationalUnitId" INTEGER,
ADD COLUMN     "phone" TEXT;

CREATE TABLE "organizational_units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationalUnitType" NOT NULL,
    "code" TEXT,
    "parentId" INTEGER,
    "description" TEXT,
    "location" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizational_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_tags" (
    "ticketId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticketId","tagId")
);

CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "minioKey" TEXT NOT NULL,
    "minioBucket" TEXT NOT NULL DEFAULT 'almadesk-attachments',
    "ticketId" INTEGER,
    "commentId" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "userId" INTEGER,
    "ticketId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "changes" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizational_units_code_key" ON "organizational_units"("code");

CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

CREATE INDEX "attachments_ticketId_idx" ON "attachments"("ticketId");

CREATE INDEX "attachments_commentId_idx" ON "attachments"("commentId");

CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

CREATE INDEX "audit_logs_ticketId_idx" ON "audit_logs"("ticketId");

CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

CREATE INDEX "comments_ticketId_idx" ON "comments"("ticketId");

CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

CREATE INDEX "tickets_status_priority_idx" ON "tickets"("status", "priority");

CREATE INDEX "tickets_createdById_idx" ON "tickets"("createdById");

CREATE INDEX "tickets_assignedToId_idx" ON "tickets"("assignedToId");

CREATE INDEX "tickets_isArchived_idx" ON "tickets"("isArchived");

ALTER TABLE "users" ADD CONSTRAINT "users_organizationalUnitId_fkey" FOREIGN KEY ("organizationalUnitId") REFERENCES "organizational_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organizationalUnitId_fkey" FOREIGN KEY ("organizationalUnitId") REFERENCES "organizational_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "organizational_units" ADD CONSTRAINT "organizational_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizational_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
