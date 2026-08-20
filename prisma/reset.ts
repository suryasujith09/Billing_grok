/**
 * prisma/reset.ts
 *
 * One-shot script to wipe all transactional data and reset the invoice counter to 1.
 * The shop profile (name, GSTIN, bank details, prefix, etc.) is PRESERVED.
 *
 * Run with:  npx tsx prisma/reset.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  Starting full data reset …");

  await prisma.$transaction([
    // Order matters due to FK constraints: children before parents
    prisma.payment.deleteMany(),
    prisma.oldGoldItem.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.ornament.deleteMany(),
    prisma.metalRate.deleteMany(),
  ]);

  // Reset invoice counter to 1 (keep everything else in Shop)
  const shop = await prisma.shop.findFirst();
  if (shop) {
    await prisma.shop.update({
      where: { id: shop.id },
      data: { nextInvoiceNo: 1 },
    });
    console.log(`✅ Reset nextInvoiceNo → 1 for shop: "${shop.name}"`);
  } else {
    console.log("ℹ️  No shop record found — nothing to reset.");
  }

  console.log("✅ All invoices, customers, stock, payments, and rates deleted.");
  console.log("   Shop profile (name, GSTIN, bank details) preserved.");
  console.log("   Next bill will be #1.");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
