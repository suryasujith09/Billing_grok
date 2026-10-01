-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "legalName" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "stateCode" TEXT NOT NULL DEFAULT '',
    "pincode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT NOT NULL DEFAULT '',
    "pan" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "ifsc" TEXT NOT NULL DEFAULT '',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'SGD',
    "nextInvoiceNo" INTEGER NOT NULL DEFAULT 1,
    "makingGstMode" TEXT NOT NULL DEFAULT 'SEPARATE_5',
    "terms" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalRate" (
    "id" TEXT NOT NULL,
    "metal" TEXT NOT NULL,
    "purity" TEXT NOT NULL,
    "ratePerGram" DECIMAL(65,30) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "pincode" TEXT NOT NULL DEFAULT '',
    "pan" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ornament" (
    "id" TEXT NOT NULL,
    "tagNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metal" TEXT NOT NULL,
    "purity" TEXT NOT NULL,
    "huid" TEXT NOT NULL DEFAULT '',
    "hsn" TEXT NOT NULL DEFAULT '7113',
    "grossWeight" DECIMAL(65,30) NOT NULL,
    "stoneWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netWeight" DECIMAL(65,30) NOT NULL,
    "makingType" TEXT NOT NULL DEFAULT 'PER_GRAM',
    "makingValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "wastagePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stoneCharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hallmarkCharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherCharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ornament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "customerAddr" TEXT NOT NULL DEFAULT '',
    "customerPan" TEXT NOT NULL DEFAULT '',
    "customerGstin" TEXT NOT NULL DEFAULT '',
    "placeOfSupply" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "goldValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "makingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "wastageAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stoneAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hallmarkAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxable3" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxable5" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cgst3" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgst3" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cgst5" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgst5" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "oldGoldValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netPayable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'FINAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "ornamentId" TEXT,
    "tagNo" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "hsn" TEXT NOT NULL DEFAULT '7113',
    "huid" TEXT NOT NULL DEFAULT '',
    "metal" TEXT NOT NULL,
    "purity" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "grossWeight" DECIMAL(65,30) NOT NULL,
    "stoneWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netWeight" DECIMAL(65,30) NOT NULL,
    "ratePerGram" DECIMAL(65,30) NOT NULL,
    "goldValue" DECIMAL(65,30) NOT NULL,
    "makingType" TEXT NOT NULL,
    "makingValue" DECIMAL(65,30) NOT NULL,
    "makingAmount" DECIMAL(65,30) NOT NULL,
    "wastagePercent" DECIMAL(65,30) NOT NULL,
    "wastageAmount" DECIMAL(65,30) NOT NULL,
    "stoneCharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hallmarkCharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherCharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxable3" DECIMAL(65,30) NOT NULL,
    "taxable5" DECIMAL(65,30) NOT NULL,
    "lineTotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OldGoldItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metal" TEXT NOT NULL DEFAULT 'GOLD',
    "purity" TEXT NOT NULL,
    "grossWeight" DECIMAL(65,30) NOT NULL,
    "netWeight" DECIMAL(65,30) NOT NULL,
    "ratePerGram" DECIMAL(65,30) NOT NULL,
    "deductionPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "OldGoldItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- All access to the application database goes through the server-side Prisma connection.
-- Keep public-schema tables inaccessible to Supabase Data API roles by default.
ALTER TABLE "Shop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MetalRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ornament" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OldGoldItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE UNIQUE INDEX "Ornament_tagNo_key" ON "Ornament"("tagNo");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_ornamentId_fkey" FOREIGN KEY ("ornamentId") REFERENCES "Ornament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OldGoldItem" ADD CONSTRAINT "OldGoldItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
