CREATE TABLE "response_templates" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "TicketCategory",
    "createdById" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "response_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "response_templates_createdById_idx" ON "response_templates"("createdById");

CREATE INDEX "response_templates_category_idx" ON "response_templates"("category");

ALTER TABLE "response_templates" ADD CONSTRAINT "response_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
