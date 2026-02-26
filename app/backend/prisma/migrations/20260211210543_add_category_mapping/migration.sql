CREATE TABLE "category_mappings" (
    "id" SERIAL NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "organizationalUnitId" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "category_mappings_category_idx" ON "category_mappings"("category");

CREATE INDEX "category_mappings_organizationalUnitId_idx" ON "category_mappings"("organizationalUnitId");

CREATE UNIQUE INDEX "category_mappings_category_organizationalUnitId_key" ON "category_mappings"("category", "organizationalUnitId");

ALTER TABLE "category_mappings" ADD CONSTRAINT "category_mappings_organizationalUnitId_fkey" FOREIGN KEY ("organizationalUnitId") REFERENCES "organizational_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
