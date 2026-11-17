/**
 * One-time business data reset: clears invoices, customers, and stock while
 * retaining shop/profile settings, staff, counters, bookings, and metal rates.
 * Writes a JSON backup outside the repository before deleting anything.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function main() {
  const backupDirectory = join(process.env.LOCALAPPDATA ?? process.env.TEMP ?? process.cwd(), "billing-grok-backups");
  await mkdir(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDirectory, `business-data-before-reset-${stamp}.json`);

  await prisma.$transaction(async (tx) => {
    const [invoices, customers, ornaments, invoiceItems, oldGoldItems, payments, creditNotes, creditNoteAdjustments] = await Promise.all([
      tx.invoice.findMany(),
      tx.customer.findMany(),
      tx.ornament.findMany(),
      tx.invoiceItem.findMany(),
      tx.oldGoldItem.findMany(),
      tx.payment.findMany(),
      tx.creditNote.findMany(),
      tx.creditNoteAdjustment.findMany(),
    ]);

    const backup = {
      createdAt: new Date().toISOString(),
      scope: "Invoices and their items, exchanges, payments, and credit notes; customers; stock ornaments.",
      invoices,
      invoiceItems,
      oldGoldItems,
      payments,
      creditNotes,
      creditNoteAdjustments,
      customers,
      ornaments,
    };
    await writeFile(backupPath, JSON.stringify(backup, null, 2), { flag: "wx" });
    console.log("Backed up records:", {
      invoices: invoices.length,
      customers: customers.length,
      stockItems: ornaments.length,
      invoiceItems: invoiceItems.length,
      exchanges: oldGoldItems.length,
      payments: payments.length,
      creditNotes: creditNotes.length,
      creditNoteAdjustments: creditNoteAdjustments.length,
    });

    await tx.creditNoteAdjustment.deleteMany();
    await tx.creditNote.deleteMany();
    await tx.payment.deleteMany();
    await tx.oldGoldItem.deleteMany();
    await tx.invoiceItem.deleteMany();
    await tx.invoice.deleteMany();
    await tx.customer.deleteMany();
    await tx.ornament.deleteMany();
    await tx.shop.updateMany({ data: { nextInvoiceNo: 1 } });
  }, { timeout: 120_000, maxWait: 10_000 });

  console.log(`Business data reset completed. Backup saved to ${backupPath}`);
  console.log("Removed invoices and related records, customers, and stock. Retained staff, bookings, settings, and metal rates.");
}

main()
  .catch((error) => {
    console.error("Business data reset failed before completion.", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
