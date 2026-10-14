ALTER TABLE "PrinterSettings"
  ALTER COLUMN "labelWidthMm" SET DEFAULT 81,
  ALTER COLUMN "labelHeightMm" SET DEFAULT 12;

UPDATE "PrinterSettings"
SET "labelWidthMm" = 81, "labelHeightMm" = 12
WHERE "labelWidthMm" = 60 AND "labelHeightMm" = 25 AND "gapMm" = 3;
