-- Extend Ornament and add printer, label template, print history, and tag sequence tables.
-- Generated from the previous PostgreSQL Prisma schema with `prisma migrate diff`.

ALTER TABLE "Ornament" ADD COLUMN "branchId" TEXT NOT NULL DEFAULT 'main',
ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN "diamondCarat" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "diamondPieces" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "labelTemplateId" TEXT,
ADD COLUMN "lastPrintedAt" TIMESTAMP(3),
ADD COLUMN "mrp" DECIMAL(65,30),
ADD COLUMN "printCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "printedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "productCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "stoneDetails" TEXT NOT NULL DEFAULT '',
ADD COLUMN "stoneUnit" TEXT NOT NULL DEFAULT 'CTS',
ADD COLUMN "subcategory" TEXT NOT NULL DEFAULT '',
ADD COLUMN "supplier" TEXT NOT NULL DEFAULT '';

CREATE TABLE "PrinterSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL DEFAULT 'default',
    "printerName" TEXT NOT NULL DEFAULT 'TVS LP 46 Dlite',
    "driverMode" TEXT NOT NULL DEFAULT 'TSPL',
    "connectionType" TEXT NOT NULL DEFAULT 'AGENT',
    "density" INTEGER NOT NULL DEFAULT 10,
    "speed" INTEGER NOT NULL DEFAULT 4,
    "orientation" INTEGER NOT NULL DEFAULT 0,
    "offsetX" INTEGER NOT NULL DEFAULT 0,
    "offsetY" INTEGER NOT NULL DEFAULT 0,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "labelWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "labelHeightMm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "gapMm" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "agentUrl" TEXT NOT NULL DEFAULT 'http://127.0.0.1:9191',
    "agentToken" TEXT NOT NULL DEFAULT 'surya-print-secret-token',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrinterSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabelTemplate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "widthMm" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "heightMm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "gapMm" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "columnsAcross" INTEGER NOT NULL DEFAULT 1,
    "rollWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "colGapMm" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "leftWingWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 28,
    "rightWingWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 28,
    "tailWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "elements" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LabelTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL DEFAULT 'default',
    "ornamentId" TEXT,
    "tagNo" TEXT NOT NULL,
    "printerName" TEXT NOT NULL,
    "templateId" TEXT,
    "printedBy" TEXT NOT NULL DEFAULT 'system',
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrintLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TagSequence" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextVal" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TagSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TagSequence_shopId_prefix_year_key"
ON "TagSequence"("shopId", "prefix", "year");
