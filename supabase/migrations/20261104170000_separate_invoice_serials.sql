-- GST invoices and Bills of Supply have independent serials within each FY.
-- Replaces the original cross-register serial index.
DROP INDEX IF EXISTS public."Invoice_serial_suffix_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_type_fy_serial_key"
  ON public."Invoice" (
    "invoiceType",
    (substring("invoiceNo" FROM '/([0-9]{2}-[0-9]{2})/[0-9]+$')),
    ((substring("invoiceNo" FROM '([0-9]+)$'))::BIGINT)
  )
  WHERE "invoiceNo" ~ '[0-9]+$';
