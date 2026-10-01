import { prisma } from "./db";

/**
 * Maps common jewellery categories to a 2-letter code for concise, readable tag IDs.
 */
export const CATEGORY_CODES: Record<string, string> = {
  RING: "RG",
  CHAIN: "CH",
  NECKLACE: "NL",
  BANGLE: "BG",
  BRACELET: "BR",
  EARRING: "ER",
  PENDANT: "PD",
  ANKLET: "AK",
  COIN: "CN",
  BAR: "BR",
  STUD: "ST",
  MANGALSUTRA: "MS",
  DIAMOND: "DM",
  SILVER: "SV",
};

export function getCategoryCode(category: string): string {
  const upper = category.trim().toUpperCase();
  if (CATEGORY_CODES[upper]) return CATEGORY_CODES[upper];
  // Extract 2 consonants or first 2 chars
  const letters = upper.replace(/[^A-Z]/g, "");
  if (letters.length >= 2) return letters.slice(0, 2);
  return "JW";
}

/**
 * Generates a stable, company-aware, concurrency-safe unique Tag ID.
 * Format: [PREFIX][YY][CAT_CODE][00001]
 * Example: SGD26RG00001
 */
export async function generateUniqueTagId(opts?: {
  shopId?: string;
  prefix?: string;
  category?: string;
}): Promise<string> {
  const shopId = opts?.shopId ?? "default";
  let prefix = opts?.prefix?.trim().toUpperCase();

  if (!prefix) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    prefix = shop?.invoicePrefix?.trim().toUpperCase() || "SGD";
  }

  const catCode = getCategoryCode(opts?.category || "JEWELLERY");
  const year = new Date().getFullYear() % 100; // e.g. 26 for 2026

  const fullPrefix = `${prefix}${year}${catCode}`;

  return await prisma.$transaction(async (tx) => {
    const seq = await tx.tagSequence.upsert({
      where: {
        shopId_prefix_year: {
          shopId,
          prefix: fullPrefix,
          year,
        },
      },
      update: {
        nextVal: { increment: 1 },
      },
      create: {
        shopId,
        prefix: fullPrefix,
        year,
        nextVal: 2, // First one will be 1
      },
    });

    const currentVal = seq.nextVal - 1;
    const seqPadded = String(currentVal).padStart(5, "0");
    return `${fullPrefix}${seqPadded}`;
  });
}

/**
 * Validates Code 128 barcode string format.
 */
export function isValidTagBarcode(tagNo: string): boolean {
  if (!tagNo || typeof tagNo !== "string") return false;
  const trimmed = tagNo.trim().toUpperCase();
  // Valid ASCII characters printable for Code 128 (3 to 30 chars)
  return /^[A-Z0-9_-]{3,30}$/.test(trimmed);
}
