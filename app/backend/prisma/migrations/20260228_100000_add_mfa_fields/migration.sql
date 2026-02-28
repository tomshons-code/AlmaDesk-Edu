ALTER TABLE "users" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "mfaBackupCodes" TEXT[];

ALTER TABLE "tickets" ADD COLUMN "rating" INTEGER;
ALTER TABLE "tickets" ADD COLUMN "ratingComment" TEXT;
ALTER TABLE "tickets" ADD COLUMN "ratedAt" TIMESTAMP(3);

CREATE TYPE "RecurringAlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "RecurringAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "recurring_alerts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "category" "TicketCategory",
    "status" "RecurringAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "severity" "RecurringAlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
    "affectedUsers" INTEGER NOT NULL DEFAULT 0,
    "firstOccurrence" TIMESTAMP(3) NOT NULL,
    "lastOccurrence" TIMESTAMP(3) NOT NULL,
    "suggestedAction" TEXT,
    "rootCause" TEXT,
    "keywords" TEXT[],
    "acknowledgedById" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_alert_tickets" (
    "alertId" INTEGER NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "recurring_alert_tickets_pkey" PRIMARY KEY ("alertId","ticketId")
);

CREATE INDEX "recurring_alerts_status_idx" ON "recurring_alerts"("status");
CREATE INDEX "recurring_alerts_category_idx" ON "recurring_alerts"("category");
CREATE INDEX "recurring_alerts_severity_idx" ON "recurring_alerts"("severity");
CREATE INDEX "recurring_alerts_firstOccurrence_idx" ON "recurring_alerts"("firstOccurrence");

ALTER TABLE "recurring_alerts" ADD CONSTRAINT "recurring_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recurring_alert_tickets" ADD CONSTRAINT "recurring_alert_tickets_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "recurring_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_alert_tickets" ADD CONSTRAINT "recurring_alert_tickets_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "KnowledgeBaseCategory" AS ENUM ('HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCOUNT_ACCESS', 'EMAIL', 'PRINTING', 'SECURITY', 'MOBILE', 'OFFICE_APPS', 'UNIVERSITY_SYSTEMS', 'OTHER');
CREATE TYPE "KnowledgeBaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "knowledge_base_articles" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" "KnowledgeBaseCategory" NOT NULL DEFAULT 'OTHER',
    "status" "KnowledgeBaseStatus" NOT NULL DEFAULT 'DRAFT',
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "parentId" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "relatedTicketCategories" "TicketCategory"[],
    "tags" TEXT[],
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "metaDescription" TEXT,
    "keywords" TEXT[],

    CONSTRAINT "knowledge_base_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_base_articles_slug_key" ON "knowledge_base_articles"("slug");
CREATE INDEX "knowledge_base_articles_status_idx" ON "knowledge_base_articles"("status");
CREATE INDEX "knowledge_base_articles_category_idx" ON "knowledge_base_articles"("category");
CREATE INDEX "knowledge_base_articles_slug_idx" ON "knowledge_base_articles"("slug");
CREATE INDEX "knowledge_base_articles_authorId_idx" ON "knowledge_base_articles"("authorId");
CREATE INDEX "knowledge_base_articles_parentId_idx" ON "knowledge_base_articles"("parentId");
CREATE INDEX "knowledge_base_articles_isFolder_idx" ON "knowledge_base_articles"("isFolder");

ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "knowledge_base_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD COLUMN "knowledgeBaseArticleId" INTEGER;
CREATE INDEX "attachments_knowledgeBaseArticleId_idx" ON "attachments"("knowledgeBaseArticleId");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_knowledgeBaseArticleId_fkey" FOREIGN KEY ("knowledgeBaseArticleId") REFERENCES "knowledge_base_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
