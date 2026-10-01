-- Add indexes for foreign key lookups and cascades identified by Supabase Performance Advisor.
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "InvoiceItem_ornamentId_idx" ON "InvoiceItem"("ornamentId");
CREATE INDEX "OldGoldItem_invoiceId_idx" ON "OldGoldItem"("invoiceId");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
