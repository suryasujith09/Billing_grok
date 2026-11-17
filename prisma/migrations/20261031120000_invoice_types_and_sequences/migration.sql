ALTER TABLE "Shop"
  ADD COLUMN "billOfSupplyPrefix" TEXT NOT NULL DEFAULT 'BOS',
  ADD COLUMN "nextBillOfSupplyNo" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Invoice"
  ADD COLUMN "invoiceType" TEXT NOT NULL DEFAULT 'GST',
  ADD COLUMN "billOfSupplyReason" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_invoiceType_check"
  CHECK ("invoiceType" IN ('GST', 'BILL_OF_SUPPLY'));

CREATE INDEX "Invoice_invoiceType_date_idx" ON "Invoice"("invoiceType", "date");
