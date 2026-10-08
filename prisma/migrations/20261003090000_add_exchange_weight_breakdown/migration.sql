ALTER TABLE "OldGoldItem"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "dustWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "wastageWeight" DECIMAL(65,30) NOT NULL DEFAULT 0;

UPDATE "OldGoldItem"
SET "wastageWeight" = "netWeight" * "deductionPercent" / 100
WHERE "deductionPercent" <> 0;
