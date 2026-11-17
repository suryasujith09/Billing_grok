-- Keep a numeric invoice serial unique across GST invoices and Bills of Supply.
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_serial_suffix_key"
  ON public."Invoice" ((substring("invoiceNo" FROM '([0-9]+)$')::BIGINT))
  WHERE "invoiceNo" ~ '[0-9]+$';
