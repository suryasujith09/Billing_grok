"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./db";
import {
  calcInvoice,
  calcLine,
  applyFinalLinePrice,
  applyMrpLineBase,
  applyLineDiscount,
  applyInvoiceTotalOverride,
  applyInvoiceDiscount,
  applyMrpBaseOverride,
  calcExchange,
  gstModeForMaterial,
  type MakingGstMode,
  type MakingType,
} from "./invoice-calc";
import { financialYear, num, padInvoice, r2 } from "./money";
import { getLatestRates, getShop } from "./queries";
import { getSession } from "./session";

import { generateUniqueTagId, isValidTagBarcode } from "./tag-generator";
import { CATEGORIES } from "./constants";

function invoiceSerialNumber(invoiceNo: string): number | null {
  const match = invoiceNo.match(/(\d+)$/);
  if (!match) return null;
  const serial = Number(match[1]);
  return Number.isSafeInteger(serial) ? serial : null;
}

function invoiceFiscalYear(invoiceNo: string): string | null {
  return invoiceNo.match(/\/(\d{2}-\d{2})\/\d+$/)?.[1] ?? null;
}

function alignInvoiceDateBySerial(
  records: Array<{ invoiceNo: string; date: Date }>,
  serial: number,
  fiscalYear: string,
): Date {
  const numbered = records
    .filter((row) => invoiceFiscalYear(row.invoiceNo) === fiscalYear)
    .map((row) => ({ serial: invoiceSerialNumber(row.invoiceNo), date: row.date }))
    .filter((row): row is { serial: number; date: Date } => row.serial != null);
  const previous = numbered.filter((row) => row.serial < serial).sort((a, b) => b.serial - a.serial)[0];
  const next = numbered.filter((row) => row.serial > serial).sort((a, b) => a.serial - b.serial)[0];
  const start = new Date(`20${fiscalYear.slice(0, 2)}-04-01T00:00:00+05:30`).getTime();
  const end = new Date(`20${fiscalYear.slice(3, 5)}-04-01T00:00:00+05:30`).getTime() - 1;
  if (previous && next) {
    const lower = previous.date.getTime();
    const upper = next.date.getTime();
    const aligned = lower <= upper ? lower + Math.floor((upper - lower) / 2) : upper - 1;
    return new Date(Math.min(end, Math.max(start, aligned)));
  }
  if (next) return new Date(Math.max(start, next.date.getTime() - 1));
  if (previous) return new Date(Math.min(end, previous.date.getTime() + 1));
  return new Date();
}

function invoiceActionError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Invoice_type_fy_serial_key") || message.includes("Invoice_serial_suffix_key")) {
    return "That serial was just assigned in this invoice register. Refresh the unused serial list and choose another number.";
  }
  return message || fallback;
}

export async function getUnusedInvoiceSerialsAction(invoiceType: "GST" | "BILL_OF_SUPPLY"): Promise<number[]> {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "manager")) return [];

  const fiscalYear = financialYear();
  const invoices = await prisma.invoice.findMany({
    where: { invoiceType, invoiceNo: { contains: `/${fiscalYear}/` } },
    select: { invoiceNo: true },
  });
  const used = new Set(invoices.map((invoice) => invoiceSerialNumber(invoice.invoiceNo)).filter((n): n is number => n != null));
  const unused: number[] = [];
  for (let serial = 1; serial <= 999999 && unused.length < 10; serial += 1) {
    if (!used.has(serial)) unused.push(serial);
  }
  return unused;
}

const ornamentSchema = z.object({
  tagNo: z.string().optional().default(""),
  name: z.string().min(1),
  category: z.string().min(1),
  metal: z.string().min(1),
  purity: z.string().min(1),
  huid: z.string().optional().default(""),
  hsn: z.string().optional().default("7113"),
  grossWeight: z.coerce.number().nonnegative(),
  stoneWeight: z.coerce.number().nonnegative().optional().default(0),
  netWeight: z.coerce.number().positive(),
  makingType: z.enum(["PER_GRAM", "PERCENT", "FLAT"]),
  makingValue: z.coerce.number().nonnegative(),
  wastagePercent: z.coerce.number().nonnegative().optional().default(0),
  stoneCharge: z.coerce.number().nonnegative().optional().default(0),
  hallmarkCharge: z.coerce.number().nonnegative().optional().default(0),
  otherCharge: z.coerce.number().nonnegative().optional().default(0),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  productCode: z.string().optional().default(""),
  subcategory: z.string().optional().default(""),
  stoneDetails: z.string().optional().default(""),
  stoneUnit: z.string().optional().default("CTS"),
  diamondCarat: z.coerce.number().nonnegative().optional().default(0),
  diamondPieces: z.coerce.number().int().nonnegative().optional().default(0),
  mrp: z.coerce.number().nonnegative().optional().nullable(),
  supplier: z.string().optional().default(""),
  notes: z.string().optional().default(""),
}).refine((item) => item.netWeight + item.stoneWeight <= item.grossWeight + 0.001, {
  message: "Net weight plus stone weight cannot exceed gross weight. Please check the weights.",
  path: ["netWeight"],
});

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  altPhone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  pincode: z.string().optional().default(""),
  pan: z.string().optional().default(""),
  gstin: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const lineSchema = z.object({
  ornamentId: z.string().optional().nullable(),
  tagNo: z.string().optional().default(""),
  description: z.string().min(1),
  hsn: z.string().optional().default("7113"),
  huid: z.string().optional().default(""),
  metal: z.string().min(1),
  purity: z.string().min(1),
  category: z.string().optional().default(""),
  grossWeight: z.coerce.number().nonnegative(),
  stoneWeight: z.coerce.number().nonnegative().optional().default(0),
  netWeight: z.coerce.number().nonnegative(),
  ratePerGram: z.coerce.number().nonnegative(),
  makingType: z.enum(["PER_GRAM", "PERCENT", "FLAT"]),
  makingValue: z.coerce.number().nonnegative(),
  wastagePercent: z.coerce.number().min(0).max(30, "VA must be between 0% and 30%").optional().default(0),
  manualWastageAmount: z.coerce.number().nonnegative().nullable().optional().default(null),
  stoneCharge: z.coerce.number().nonnegative().optional().default(0),
  hallmarkCharge: z.coerce.number().nonnegative().optional().default(0),
  otherCharge: z.coerce.number().nonnegative().optional().default(0),
  mrp: z.coerce.number().nonnegative().optional().nullable(),
  pricingMode: z.enum(["CALCULATED", "MRP", "MANUAL"]).optional().default("CALCULATED"),
  finalPrice: z.coerce.number().nonnegative().optional().nullable(),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  discountAmount: z.coerce.number().nonnegative().optional().default(0),
  discountMode: z.enum(["PERCENT", "AMOUNT"]).optional().default("PERCENT"),
}).refine((item) => item.pricingMode === "CALCULATED" || item.finalPrice != null, {
  message: "Enter the MRP selling amount or flat selling amount.",
}).refine((item) => item.pricingMode !== "MRP" || (item.finalPrice ?? 0) > 0, {
  message: "Enter an MRP greater than zero.",
  path: ["finalPrice"],
}).refine((item) => item.pricingMode !== "CALCULATED" || item.ratePerGram > 0, {
  message: "Enter a rate per gram for calculated pricing.",
  path: ["ratePerGram"],
}).refine((item) => item.pricingMode !== "CALCULATED" || item.netWeight > 0, {
  message: "Enter a positive net weight for per-gram pricing.",
  path: ["netWeight"],
}).refine((item) => item.makingType !== "PERCENT" || item.makingValue <= 30, {
  message: "Making percentage must be between 0% and 30%.",
  path: ["makingValue"],
});

const exchangeSchema = z.object({
  description: z.string().min(1),
  metal: z.enum(["GOLD", "SILVER", "PLATINUM", "DIAMOND", "PEARLS"]).default("GOLD"),
  purity: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  grossWeight: z.coerce.number().nonnegative(),
  netWeight: z.coerce.number().positive(),
  dustWeight: z.coerce.number().nonnegative().default(0),
  wastageWeight: z.coerce.number().nonnegative().default(0),
  ratePerGram: z.coerce.number().positive(),
  deductionPercent: z.coerce.number().nonnegative().optional().default(0),
}).refine((value) => value.dustWeight + value.wastageWeight <= value.netWeight, {
  message: "Dust and wastage weight cannot exceed net weight.",
});

const paymentSchema = z.object({
  method: z.enum(["CASH", "UPI", "CARD", "CHEQUE", "BANK", "CREDIT"]),
  amount: z.coerce.number().nonnegative(),
  reference: z.string().optional().default(""),
});

const invoiceSchema = z.object({
  invoiceNo: z.string().trim().max(16).optional().default(""),
  billerNameOverride: z.string().trim().max(120).optional().default(""),
  invoiceType: z.enum(["GST", "BILL_OF_SUPPLY"]).optional().default("GST"),
  manualInvoiceSerial: z.preprocess(
    (value) => value == null || value === "" ? undefined : value,
    z.coerce.number().int().positive().max(999999).optional(),
  ),
  billOfSupplyReason: z.string().optional().default(""),
  customerId: z.string().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional().default(""),
  customerAddr: z.string().optional().default(""),
  customerPan: z.string().optional().default(""),
  customerGstin: z.string().optional().default(""),
  placeOfSupply: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  mrpTotal: z.coerce.number().nonnegative().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  discountAmount: z.coerce.number().nonnegative().optional().default(0),
  discountMode: z.enum(["PERCENT", "AMOUNT"]).optional().default("PERCENT"),
  finalInvoiceTotal: z.coerce.number().nonnegative().optional().nullable(),
  items: z.array(lineSchema).min(1, "Add at least one item"),
  exchanges: z.array(exchangeSchema).optional().default([]),
  payments: z.array(paymentSchema).optional().default([]),
}).refine((invoice) => invoice.invoiceType !== "BILL_OF_SUPPLY" || invoice.billOfSupplyReason.trim().length > 0, {
  message: "Enter the reason for issuing this Bill of Supply without GST.",
  path: ["billOfSupplyReason"],
}).refine((invoice) => invoice.items.every((item) => item.metal !== "DIAMOND" || item.pricingMode !== "MRP" || item.tagNo.trim().length > 0), {
  message: "Enter a unique ID for every sparkle diamond item.",
  path: ["items"],
}).refine((invoice) => {
  const ids = invoice.items.filter((item) => item.metal === "DIAMOND" && item.pricingMode === "MRP").map((item) => item.tagNo.trim().toLocaleLowerCase());
  return new Set(ids).size === ids.length;
}, {
  message: "Sparkle diamond IDs must be unique within the invoice.",
  path: ["items"],
});

function invoiceValidationMessage(issue: { path: PropertyKey[]; message: string }): string {
  const path = issue.path;
  const field = String(path.at(-1) ?? "");
  const itemIndex = path[0] === "items" && typeof path[1] === "number" ? path[1] + 1 : null;
  const exchangeIndex = path[0] === "exchanges" && typeof path[1] === "number" ? path[1] + 1 : null;
  const paymentIndex = path[0] === "payments" && typeof path[1] === "number" ? path[1] + 1 : null;
  if (field === "items" && issue.message.toLowerCase().includes("at least")) return "Add at least one item to the bill.";
  if (itemIndex != null) {
    const label: Record<string, string> = {
      description: "description",
      grossWeight: "gross weight",
      stoneWeight: "stone weight",
      netWeight: "net weight",
      ratePerGram: "rate per gram (or choose MRP/flat pricing)",
      makingValue: "making amount",
      wastagePercent: "VA percentage",
      manualWastageAmount: "VA amount",
      stoneCharge: "stone charge",
      hallmarkCharge: "hallmark charge",
      otherCharge: "other charge",
      finalPrice: "selling amount",
      mrp: "MRP",
      discountPercent: "discount percentage (0–100)",
      discountAmount: "discount amount",
    };
    if (label[field]) return `Please enter a valid ${label[field]} for item ${itemIndex}.`;
    if (issue.message.includes("MRP selling amount")) return `Enter the MRP or flat selling amount for item ${itemIndex}.`;
  }
  if (exchangeIndex != null) {
    const label: Record<string, string> = { description: "description", netWeight: "net weight", ratePerGram: "rate", dustWeight: "dust weight", wastageWeight: "wastage weight" };
    if (label[field]) return `Please enter a valid ${label[field]} for exchange ${exchangeIndex}.`;
  }
  if (paymentIndex != null && field === "amount") return `Enter a valid amount for payment ${paymentIndex}.`;
  if (field === "customerName") return "Enter the customer's name before saving the bill.";
  if (field === "invoiceNo") return "Invoice number must be 16 characters or fewer.";
  if (field === "billerNameOverride") return "Biller name must be 120 characters or fewer.";
  if (field === "billOfSupplyReason") return "Enter why this bill is being issued without GST.";
  if (field === "manualInvoiceSerial") return "Enter a positive unused invoice serial number, or switch to automatic numbering.";
  if (field === "mrpTotal") return "Enter a valid MRP total.";
  if (field === "finalInvoiceTotal") return "Enter a valid invoice total.";
  if (field === "discountPercent") return "Discount percentage must be between 0 and 100.";
  if (field === "discountAmount") return "Enter a valid bill discount amount.";
  if (issue.message.toLowerCase().includes("greater than 0")) return "Fill in the required amount and weight fields before saving.";
  if (issue.message.toLowerCase().includes("greater than or equal to 0")) return "Amounts and weights cannot be negative. Please correct the highlighted value.";
  return issue.message;
}

export type ActionState = { ok: false; error: string } | { ok: true; id?: string };

export async function saveShopAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    await prisma.shop.upsert({
      where: { id: "default" },
      update: {
        name: String(formData.get("name") ?? ""),
        logoUrl: String(formData.get("logoUrl") ?? ""),
        legalName: String(formData.get("legalName") ?? ""),
        address: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        stateCode: String(formData.get("stateCode") ?? ""),
        pincode: String(formData.get("pincode") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        gstin: String(formData.get("gstin") ?? ""),
        pan: String(formData.get("pan") ?? ""),
        bankName: String(formData.get("bankName") ?? ""),
        bankAccount: String(formData.get("bankAccount") ?? ""),
        ifsc: String(formData.get("ifsc") ?? ""),
        invoicePrefix: String(formData.get("invoicePrefix") ?? "SGD"),
        billOfSupplyPrefix: String(formData.get("billOfSupplyPrefix") ?? "BOS"),
        makingGstMode: String(formData.get("makingGstMode") ?? "SEPARATE_5"),
        terms: String(formData.get("terms") ?? ""),
      },
      create: {
        id: "default",
        name: String(formData.get("name") ?? "Surya Gold and Diamonds"),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save shop" };
  }
}

export async function saveRatesAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const entries = formData.getAll("rateKey") as string[];
    const values = formData.getAll("rateValue") as string[];
    const now = new Date();
    await prisma.$transaction(
      entries.map((key, index) => {
        const [metal, purity] = key.split(":");
        return prisma.metalRate.create({
          data: {
            metal,
            purity,
            ratePerGram: num(values[index]),
            effectiveFrom: now,
          },
        });
      }),
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save rates" };
  }
}

export async function saveCustomerAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = customerSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone"),
    altPhone: formData.get("altPhone") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    pincode: formData.get("pincode") ?? "",
    pan: formData.get("pan") ?? "",
    gstin: formData.get("gstin") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer" };
  }
  const data = parsed.data;
  const saved = data.id
    ? await prisma.customer.update({ where: { id: data.id }, data })
    : await prisma.customer.create({ data: { ...data, id: undefined } });
  revalidatePath("/customers");
  redirect(`/customers/${saved.id}`);
}

export async function saveOrnamentAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please sign in to manage stock." };
  const id = String(formData.get("id") ?? "");
  if (id && session.role !== "admin") {
    return { ok: false, error: "Only administrators can edit saved stock items." };
  }
  const category = String(formData.get("category") ?? "RING");
  let tagNo = String(formData.get("tagNo") ?? "").trim().toUpperCase();

  if (!tagNo) {
    tagNo = await generateUniqueTagId({ category });
  }

  if (!isValidTagBarcode(tagNo)) {
    return {
      ok: false,
      error: "Tag number must be 3–30 letters, numbers, hyphens, or underscores to print as a Code 128 barcode.",
    };
  }

  const parsed = ornamentSchema.safeParse({
    tagNo,
    name: formData.get("name"),
    category,
    metal: formData.get("metal"),
    purity: formData.get("purity"),
    huid: formData.get("huid") ?? "",
    hsn: formData.get("hsn") ?? "7113",
    grossWeight: formData.get("grossWeight"),
    stoneWeight: formData.get("stoneWeight") || 0,
    netWeight: formData.get("netWeight"),
    makingType: formData.get("makingType"),
    makingValue: formData.get("makingValue"),
    wastagePercent: formData.get("wastagePercent") || 0,
    stoneCharge: formData.get("stoneCharge") || 0,
    hallmarkCharge: formData.get("hallmarkCharge") || 0,
    otherCharge: formData.get("otherCharge") || 0,
    costPrice: formData.get("costPrice") || null,
    productCode: formData.get("productCode") ?? "",
    subcategory: formData.get("subcategory") ?? "",
    stoneDetails: formData.get("stoneDetails") ?? "",
    stoneUnit: formData.get("stoneUnit") ?? "CTS",
    diamondCarat: formData.get("diamondCarat") || 0,
    diamondPieces: formData.get("diamondPieces") || 0,
    mrp: formData.get("mrp") || null,
    supplier: formData.get("supplier") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ornament" };
  }

  const data = parsed.data;
  const ownershipField = session.role === "admin"
    ? { isFullyOwned: formData.get("isFullyOwned") === "true" }
    : {};

  let saved;
  try {
    saved = id
      ? await prisma.ornament.update({ where: { id }, data: { ...data, ...ownershipField } })
      : await prisma.ornament.create({ data: { ...data, ...ownershipField } });
  } catch (error) {
    const message = String(error);
    if (message.includes("Unique constraint")) {
      return { ok: false, error: "That tag number is already in stock." };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Could not save item" };
  }

  revalidatePath("/inventory");
  return { ok: true, id: saved.id };
}

export async function createInventoryCategoryAction(name: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Please sign in to create a stock category." };

  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) return { ok: false as const, error: "Enter a category name." };
  if (normalized.length > 40) return { ok: false as const, error: "Category names can be up to 40 characters." };
  const normalizedName = normalized.toLocaleLowerCase();
  const builtIn = CATEGORIES.find((category) => category.toLocaleLowerCase() === normalizedName);
  if (builtIn) return { ok: true as const, category: builtIn };
  const existing = await prisma.inventoryCategory.findUnique({ where: { normalizedName } });
  if (existing) return { ok: true as const, category: existing.name };
  const inUse = await prisma.ornament.findFirst({
    where: { category: { equals: normalized, mode: "insensitive" } },
    select: { category: true },
  });
  if (inUse) return { ok: true as const, category: inUse.category };

  try {
    const category = await prisma.inventoryCategory.create({ data: { name: normalized, normalizedName } });
    revalidatePath("/inventory");
    revalidatePath("/inventory/new");
    return { ok: true as const, category: category.name };
  } catch (error) {
    const duplicate = await prisma.inventoryCategory.findUnique({ where: { normalizedName } });
    if (duplicate) return { ok: true as const, category: duplicate.name };
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not create category." };
  }
}

export async function lookupTagAction(tagNo: string) {
  const tag = tagNo.trim();
  if (!tag) return { ok: false as const, error: "Scan or enter a stock tag or manufacturer code" };
  const matches = await prisma.ornament.findMany({
    where: {
      OR: [
        { tagNo: { equals: tag.toUpperCase() } },
        { productCode: { equals: tag } },
        { productCode: { equals: tag.toUpperCase() } },
      ],
    },
    take: 2,
  });
  if (matches.length > 1) return { ok: false as const, error: `Scanned code ${tag} matches more than one stock item. Give each item a unique Product Code.` };
  const item = matches[0];
  if (!item) return { ok: false as const, error: `No stock found for scanned code ${tag}. Save the manufacturer QR value as the item's Product Code, then scan again.` };
  if (item.status !== "IN_STOCK") {
    return { ok: false as const, error: `${tag} is already ${item.status.toLowerCase()}` };
  }
  const rates = await getLatestRates();
  const rate =
    rates.find((r) => r.metal === item.metal && r.purity === item.purity)?.ratePerGram ?? 0;
  return {
    ok: true as const,
    item: {
      ornamentId: item.id,
      tagNo: item.tagNo,
      description: item.name,
      hsn: item.hsn,
      huid: item.huid,
      productCode: item.productCode,
      metal: item.metal,
      purity: item.purity,
      category: item.category,
      grossWeight: num(item.grossWeight),
      stoneWeight: item.metal === "DIAMOND" ? num(item.diamondCarat) : num(item.stoneWeight),
      netWeight: item.metal === "DIAMOND" ? num(item.diamondCarat) : num(item.netWeight),
      ratePerGram: num(rate),
      makingType: item.makingType as MakingType,
      makingValue: num(item.makingValue),
      wastagePercent: num(item.wastagePercent),
      stoneCharge: num(item.stoneCharge),
      hallmarkCharge: num(item.hallmarkCharge),
      otherCharge: num(item.otherCharge),
      mrp: item.mrp == null ? null : num(item.mrp),
      pricingMode: item.mrp != null && num(item.mrp) > 0 ? "MRP" as const : "CALCULATED" as const,
      finalPrice: item.mrp == null ? null : num(item.mrp),
      discountPercent: 0,
      discountAmount: 0,
      discountMode: "PERCENT" as const,
    },
  };
}

export async function searchAvailableStockAction(
  query: string,
  filter: "ALL" | "PER_GRAM" | "MRP" = "ALL",
  offset = 0,
) {
  const session = await getSession();
  if (!session) return { items: [], hasMore: false };
  const term = query.trim();
  const where = {
    status: "IN_STOCK",
    ...(filter === "PER_GRAM" ? { makingType: "PER_GRAM" } : {}),
    ...(filter === "MRP" ? { mrp: { gt: 0 } } : {}),
    ...(term ? {
      OR: [
        { tagNo: { contains: term, mode: "insensitive" as const } },
        { productCode: { contains: term, mode: "insensitive" as const } },
        { name: { contains: term, mode: "insensitive" as const } },
        { huid: { contains: term, mode: "insensitive" as const } },
        { category: { contains: term, mode: "insensitive" as const } },
        { metal: { contains: term, mode: "insensitive" as const } },
        { supplier: { contains: term, mode: "insensitive" as const } },
        { subcategory: { contains: term, mode: "insensitive" as const } },
        { stoneDetails: { contains: term, mode: "insensitive" as const } },
        { notes: { contains: term, mode: "insensitive" as const } },
      ],
    } : {}),
  };
  const rows = await prisma.ornament.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { tagNo: "asc" }],
    take: 50,
    skip: Math.max(0, offset),
  });
  const rates = await getLatestRates();
  const items = rows.map((item) => ({
    ornamentId: item.id,
    tagNo: item.tagNo,
    description: item.name,
    hsn: item.hsn,
    huid: item.huid,
    productCode: item.productCode,
    metal: item.metal,
    purity: item.purity,
    category: item.category,
    grossWeight: num(item.grossWeight),
    stoneWeight: item.metal === "DIAMOND" ? num(item.diamondCarat) : num(item.stoneWeight),
    netWeight: item.metal === "DIAMOND" ? num(item.diamondCarat) : num(item.netWeight),
    ratePerGram: num(rates.find((rate) => rate.metal === item.metal && rate.purity === item.purity)?.ratePerGram),
    makingType: item.makingType as MakingType,
    makingValue: num(item.makingValue),
    wastagePercent: num(item.wastagePercent),
    stoneCharge: num(item.stoneCharge),
    hallmarkCharge: num(item.hallmarkCharge),
    otherCharge: num(item.otherCharge),
    mrp: item.mrp == null ? null : num(item.mrp),
    pricingMode: item.mrp != null && num(item.mrp) > 0 ? "MRP" as const : "CALCULATED" as const,
    finalPrice: item.mrp == null ? null : num(item.mrp),
    discountPercent: 0,
    discountAmount: 0,
    discountMode: "PERCENT" as const,
  }));
  return { items, hasMore: rows.length === 50 };
}

export async function addAnotherStockUnitAction(input: {
  productCode?: string;
  description: string;
  category: string;
  metal: string;
  purity: string;
  excludedIds: string[];
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Please sign in to add stock to an invoice." };
  const productCode = input.productCode?.trim().slice(0, 120) ?? "";
  const name = input.description.trim().slice(0, 200);
  if (!name) return { ok: false as const, error: "This stock item has no description to match another unit." };
  const item = await prisma.ornament.findFirst({
    where: {
      status: "IN_STOCK",
      id: { notIn: input.excludedIds.filter((id) => typeof id === "string").slice(0, 500) },
      ...(productCode
        ? { productCode: { equals: productCode, mode: "insensitive" as const } }
        : {
            name: { equals: name, mode: "insensitive" as const },
            category: input.category,
            metal: input.metal,
            purity: input.purity,
          }),
    },
    orderBy: [{ createdAt: "asc" }, { tagNo: "asc" }],
  });
  if (!item) return { ok: true as const, item: null };
  const rates = await getLatestRates();
  const rate = rates.find((row) => row.metal === item.metal && row.purity === item.purity)?.ratePerGram ?? 0;
  return {
    ok: true as const,
    item: {
      ornamentId: item.id,
      tagNo: item.tagNo,
      description: item.name,
      hsn: item.hsn,
      huid: item.huid,
      productCode: item.productCode,
      metal: item.metal,
      purity: item.purity,
      category: item.category,
      grossWeight: num(item.grossWeight),
      stoneWeight: item.metal === "DIAMOND" ? num(item.diamondCarat) : num(item.stoneWeight),
      netWeight: item.metal === "DIAMOND" ? num(item.diamondCarat) : num(item.netWeight),
      ratePerGram: num(rate),
      makingType: item.makingType as MakingType,
      makingValue: num(item.makingValue),
      wastagePercent: num(item.wastagePercent),
      stoneCharge: num(item.stoneCharge),
      hallmarkCharge: num(item.hallmarkCharge),
      otherCharge: num(item.otherCharge),
      mrp: item.mrp == null ? null : num(item.mrp),
      pricingMode: item.mrp != null && num(item.mrp) > 0 ? "MRP" as const : "CALCULATED" as const,
      finalPrice: item.mrp == null ? null : num(item.mrp),
      discountPercent: 0,
      discountAmount: 0,
      discountMode: "PERCENT" as const,
    },
  };
}

export async function searchCustomersAction(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const compactPhone = term.replace(/\D/g, "");
  const phoneTerms = Array.from(
    new Set([
      compactPhone,
      compactPhone.startsWith("91") && compactPhone.length > 10 ? compactPhone.slice(2) : "",
    ].filter(Boolean)),
  );
  const customerWhere = {
    OR: [
      { name: { contains: term, mode: "insensitive" as const } },
      { pan: { contains: term, mode: "insensitive" as const } },
      ...phoneTerms.flatMap((phone) => [
        { phone: { contains: phone } },
        { altPhone: { contains: phone } },
      ]),
    ],
  };
  const [customers, invoiceCustomers] = await Promise.all([
    prisma.customer.findMany({
      where: customerWhere,
      orderBy: { name: "asc" },
      take: 8,
      select: { id: true, name: true, phone: true, address: true, pan: true, gstin: true },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { customerName: { contains: term, mode: "insensitive" } },
          { customerPan: { contains: term, mode: "insensitive" } },
          ...phoneTerms.map((phone) => ({ customerPhone: { contains: phone } })),
        ],
      },
      orderBy: { date: "desc" },
      take: 8,
      select: {
        customerId: true,
        customerName: true,
        customerPhone: true,
        customerAddr: true,
        customerPan: true,
        customerGstin: true,
      },
    }),
  ]);
  const results: Array<{
    id: string | null;
    name: string;
    phone: string;
    address: string;
    pan: string;
    gstin: string;
  }> = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    pan: customer.pan,
    gstin: customer.gstin,
  }));
  const seen = new Set<string>();
  for (const customer of results) {
    if (customer.phone) seen.add(`p:${customer.phone.replace(/\D/g, "")}`);
    seen.add(`n:${customer.name.trim().toLowerCase()}`);
  }
  for (const invoice of invoiceCustomers) {
    const phoneKey = invoice.customerPhone.replace(/\D/g, "");
    const nameKey = invoice.customerName.trim().toLowerCase();
    if (seen.has(`p:${phoneKey}`) || seen.has(`n:${nameKey}`)) continue;
    results.push({
      id: invoice.customerId,
      name: invoice.customerName,
      phone: invoice.customerPhone,
      address: invoice.customerAddr,
      pan: invoice.customerPan,
      gstin: invoice.customerGstin,
    });
    if (phoneKey) seen.add(`p:${phoneKey}`);
    seen.add(`n:${nameKey}`);
  }
  return results.slice(0, 8);
}

export async function getCustomerPurchaseHistoryAction(customerId: string) {
  const session = await getSession();
  if (!session || !customerId.trim()) {
    return { invoiceCount: 0, lifetimeSpend: 0, invoices: [] };
  }
  const where = { customerId, status: "FINAL" };
  const [summary, invoices] = await Promise.all([
    prisma.invoice.aggregate({ where, _count: { _all: true }, _sum: { netPayable: true } }),
    prisma.invoice.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        netPayable: true,
        balanceAmount: true,
        items: { select: { description: true, netWeight: true } },
      },
    }),
  ]);
  return {
    invoiceCount: summary._count._all,
    lifetimeSpend: num(summary._sum.netPayable),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      date: invoice.date.toISOString(),
      netPayable: num(invoice.netPayable),
      balanceAmount: num(invoice.balanceAmount),
      items: invoice.items.map((item) => ({
        description: item.description,
        netWeight: num(item.netWeight),
      })),
    })),
  };
}

export async function createCustomerFromBillingAction(input: {
  name: string;
  phone: string;
  address?: string;
  pan?: string;
  gstin?: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sign in before adding a customer." };

  const parsed = z.object({
    name: z.string().trim().min(1, "Enter the customer's name."),
    phone: z.string().trim().min(1, "Enter a mobile number to add this customer."),
    address: z.string().optional().default(""),
    pan: z.string().optional().default(""),
    gstin: z.string().optional().default(""),
  }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the customer details." };

  const data = parsed.data;
  const phoneDigits = data.phone.replace(/\D/g, "");
  const [candidates, phoneMatches] = await Promise.all([prisma.customer.findMany({
    where: {
      OR: [
        { name: { equals: data.name, mode: "insensitive" } },
        { phone: { contains: data.phone } },
      ],
    },
    select: { id: true, name: true, phone: true, address: true, pan: true, gstin: true },
    take: 30,
  }), searchCustomersAction(data.phone)]);
  const match = [...candidates, ...phoneMatches.filter((customer) => customer.id)]
    .find((customer) => customer.phone.replace(/\D/g, "") === phoneDigits);
  if (match) return { ok: true as const, customer: match, existed: true };

  try {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        pan: data.pan.toUpperCase(),
        gstin: data.gstin.toUpperCase(),
      },
      select: { id: true, name: true, phone: true, address: true, pan: true, gstin: true },
    });
    revalidatePath("/customers");
    return { ok: true as const, customer, existed: false };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not add this customer." };
  }
}

export async function createInvoiceAction(raw: unknown): Promise<ActionState> {
  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0] ? invoiceValidationMessage(parsed.error.issues[0]) : "Check the bill details and try again." };
  }
  const input = parsed.data;
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in before creating an invoice." };
  if (input.manualInvoiceSerial != null && session.role === "counter") {
    return { ok: false, error: "Only a manager or administrator can assign a manual invoice number." };
  }
  if (!session.employeeId && session.role !== "admin") return { ok: false, error: "Use your individual employee login to create a bill." };
  const employee = session.employeeId ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { counter: true } }) : null;
  if (session.employeeId && (!employee || employee.status !== "ACTIVE")) {
    return { ok: false, error: "Your employee account is inactive. Ask an administrator to restore access." };
  }
  const shop = await getShop();
  const mode = shop.makingGstMode as MakingGstMode;
  const includeGst = input.invoiceType === "GST";

  const computedItems = input.items.map((item) => {
    const calculated = calcLine(
      {
        netWeight: item.netWeight,
        ratePerGram: item.ratePerGram,
        makingType: item.makingType,
        makingValue: item.makingValue,
        wastagePercent: item.wastagePercent,
        wastageAmountOverride: item.makingType === "FLAT" || item.pricingMode === "MANUAL" ? item.manualWastageAmount ?? 0 : null,
        stoneCharge: item.stoneCharge,
        hallmarkCharge: item.hallmarkCharge,
        otherCharge: item.otherCharge,
      },
      gstModeForMaterial(item.metal, mode),
      includeGst,
    );
    const priced = item.pricingMode === "CALCULATED"
      ? calculated
      : item.pricingMode === "MRP"
        ? applyMrpLineBase(calculated, item.finalPrice ?? 0, includeGst)
        : applyFinalLinePrice(calculated, item.finalPrice ?? 0, includeGst);
    const calc = applyLineDiscount(priced, item.discountPercent, item.discountAmount, item.discountMode);
    return { item, calc };
  });

  const exchanges = input.exchanges.map((ex) => {
    const values = calcExchange(ex.netWeight, ex.ratePerGram, ex.dustWeight, ex.wastageWeight);
    return {
      ...ex,
      deductionPercent: ex.netWeight > 0 ? ((ex.dustWeight + ex.wastageWeight) / ex.netWeight) * 100 : 0,
      amount: values.finalAmount,
    };
  });
  const oldGoldValue = r2(exchanges.reduce((s, ex) => s + ex.amount, 0));
  const paidAmount = r2(input.payments.reduce((s, p) => s + p.amount, 0));
  const calculatedTotals = calcInvoice(
    computedItems.map(({ item, calc }) => ({
      ...calc,
      stoneCharge: item.stoneCharge,
      hallmarkCharge: item.hallmarkCharge,
      otherCharge: item.otherCharge,
    })),
    oldGoldValue,
    paidAmount,
  );
  const mrpBase = input.mrpTotal ?? r2(calculatedTotals.taxable3 + calculatedTotals.taxable5);
  const productDiscountAmount = r2(computedItems.reduce((sum, row) => sum + row.calc.discountAmount, 0));
  const totalsWithMrp = applyMrpBaseOverride(calculatedTotals, mrpBase, includeGst, productDiscountAmount);
  const totalsAfterDiscount = applyInvoiceDiscount(totalsWithMrp, input.discountPercent, input.discountAmount, input.discountMode);
  const totals = input.finalInvoiceTotal == null
    ? totalsAfterDiscount
    : applyInvoiceTotalOverride(totalsAfterDiscount, input.finalInvoiceTotal);
  const { gstTotal, beforeRound, ...dbTotals } = totals;
  void gstTotal;
  void beforeRound;
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const current = await tx.shop.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", name: "Surya Gold and Diamonds" },
      });
      const numberField = input.invoiceType === "GST" ? "nextInvoiceNo" : "nextBillOfSupplyNo";
      const prefix = input.invoiceType === "GST" ? current.invoicePrefix : current.billOfSupplyPrefix;
      const fy = financialYear();
      let invoiceSerial = input.manualInvoiceSerial;
      if (invoiceSerial != null) {
        invoiceSerial = Math.trunc(invoiceSerial);
        const sameSerialBills = await tx.invoice.findMany({
          where: { invoiceType: input.invoiceType, invoiceNo: { contains: `/${fy}/`, endsWith: padInvoice(invoiceSerial) } },
          select: { invoiceNo: true },
        });
        const serialConflict = sameSerialBills.find((row) => invoiceSerialNumber(row.invoiceNo) === invoiceSerial);
        if (serialConflict) throw new Error(`Serial ${padInvoice(invoiceSerial)} is already used by ${serialConflict.invoiceNo}. Choose an unused serial.`);
        const candidate = `${prefix}/${fy}/${padInvoice(invoiceSerial)}`;
        if (candidate.length > 16) throw new Error("This invoice prefix makes the number longer than 16 characters. Shorten it in Settings.");
        if (await tx.invoice.findUnique({ where: { invoiceNo: candidate }, select: { id: true } })) {
          throw new Error(`Invoice number ${candidate} is already used. Enter an unused number or choose automatic numbering.`);
        }
        const nextSerial = current[numberField];
        if (invoiceSerial >= nextSerial) {
          await tx.shop.update({ where: { id: "default" }, data: { [numberField]: invoiceSerial + 1 } });
        }
      } else {
        let allocated = false;
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const updatedShop = await tx.shop.update({
            where: { id: "default" },
            data: { [numberField]: { increment: 1 } },
          });
          invoiceSerial = updatedShop[numberField] - 1;
          const candidate = `${prefix}/${fy}/${padInvoice(invoiceSerial)}`;
          if (candidate.length > 16) throw new Error("The invoice number prefix makes the number longer than 16 characters. Shorten it in Settings.");
          const sameSerialBills = await tx.invoice.findMany({
            where: { invoiceType: input.invoiceType, invoiceNo: { contains: `/${fy}/`, endsWith: padInvoice(invoiceSerial) } },
            select: { invoiceNo: true },
          });
          const serialConflict = sameSerialBills.some((row) => invoiceSerialNumber(row.invoiceNo) === invoiceSerial);
          if (!serialConflict && !(await tx.invoice.findUnique({ where: { invoiceNo: candidate }, select: { id: true } }))) {
            allocated = true;
            break;
          }
        }
        if (!allocated) throw new Error("Could not find an unused invoice number. Check the invoice sequence in Settings.");
      }
      if (invoiceSerial == null) throw new Error("Could not allocate an invoice number.");
      const invoiceDate = input.manualInvoiceSerial != null
        ? alignInvoiceDateBySerial(
            await tx.invoice.findMany({
              where: { invoiceType: input.invoiceType, invoiceNo: { contains: `/${fy}/` } },
              select: { invoiceNo: true, date: true },
            }),
            invoiceSerial,
            fy,
          )
        : new Date();
      const invoiceNo = `${prefix}/${fy}/${padInvoice(invoiceSerial)}`;

      const created = await tx.invoice.create({
        data: {
          invoiceNo,
          date: invoiceDate,
          invoiceType: input.invoiceType,
          billOfSupplyReason: input.invoiceType === "BILL_OF_SUPPLY" ? input.billOfSupplyReason.trim() : "",
          customer: input.customerId ? { connect: { id: input.customerId } } : undefined,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerAddr: input.customerAddr,
          customerPan: input.customerPan,
          customerGstin: input.customerGstin,
          placeOfSupply: input.placeOfSupply || current.state,
          notes: input.notes,
          employee: employee ? { connect: { id: employee.id } } : undefined,
          employeeCode: employee?.employeeCode ?? session.employeeCode ?? (session.role === "admin" ? "ADMIN" : "COUNTER"),
          billerName: session.role === "admin" && input.billerNameOverride.trim()
            ? input.billerNameOverride.trim()
            : employee?.name ?? session.username,
          billerSignature: employee?.signature ?? "",
          counter: employee?.counter ? { connect: { id: employee.counter.id } } : undefined,
          counterNumber: employee?.counter?.number ?? "",
          counterName: employee?.counter?.name ?? "",
          ...dbTotals,
          mrpTotal: input.mrpTotal ?? r2(calculatedTotals.taxable3 + calculatedTotals.taxable5),
          discountMode: input.discountMode,
          items: {
            create: computedItems.map(({ item, calc }) => ({
              ornament: item.ornamentId ? { connect: { id: item.ornamentId } } : undefined,
              tagNo: item.tagNo,
              description: item.description,
              hsn: item.hsn,
              huid: item.huid,
              metal: item.metal,
              purity: item.purity,
              category: item.category,
              grossWeight: item.grossWeight,
              stoneWeight: item.stoneWeight,
              netWeight: item.netWeight,
              ratePerGram: item.ratePerGram,
              goldValue: calc.goldValue,
              makingType: item.makingType,
              makingValue: item.makingValue,
              makingAmount: calc.makingAmount,
              wastagePercent: item.wastagePercent,
              wastageAmount: calc.wastageAmount,
              stoneCharge: item.stoneCharge,
              hallmarkCharge: item.hallmarkCharge,
              otherCharge: item.otherCharge,
              pricingMode: item.pricingMode,
              finalPrice: item.pricingMode === "CALCULATED" ? null : item.finalPrice,
              discountPercent: calc.discountPercent,
              discountAmount: calc.discountAmount,
              discountMode: item.discountMode,
              taxable3: calc.taxable3,
              taxable5: calc.taxable5,
              lineTotal: calc.lineTotal,
            })),
          },
          exchanges: {
            create: exchanges,
          },
          payments: {
            create: input.payments.filter((p) => p.amount > 0),
          },
        },
      });

      const taggedIds = input.items
        .map((item) => item.ornamentId)
        .filter((id): id is string => Boolean(id));
      if (taggedIds.length) {
        await tx.ornament.updateMany({
          where: { id: { in: taggedIds }, status: "IN_STOCK" },
          data: { status: "SOLD" },
        });
      }

      if (employee) await tx.employeeActivity.create({ data: {
        employeeId: employee.id, employeeCode: employee.employeeCode, employeeName: employee.name,
        action: "BILL_CREATED", transactionNo: invoiceNo,
      } });

      return created;
    });

    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/non-gst-invoices");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    return { ok: true, id: invoice.id };
  } catch (error) {
    return { ok: false, error: invoiceActionError(error, "Could not save invoice") };
  }
}

export async function cancelInvoiceAction(id: string): Promise<ActionState> {
  const session = await getSession();
  if (!session || session.role === "counter") return { ok: false, error: "Manager or administrator access is required to cancel invoices." };
  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "CANCELLED") throw new Error("Already cancelled");

      await tx.invoice.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      if (session.employeeId) await tx.employeeActivity.create({ data: {
        employeeId: session.employeeId, employeeCode: session.employeeCode ?? "", employeeName: session.employeeName ?? session.username,
        action: "BILL_CANCELLED", transactionNo: invoice.invoiceNo, oldValue: invoice.status, newValue: "CANCELLED",
      } });

      const ids = invoice.items
        .map((item) => item.ornamentId)
        .filter((value): value is string => Boolean(value));
      if (ids.length) {
        await tx.ornament.updateMany({
          where: { id: { in: ids } },
          data: { status: "IN_STOCK" },
        });
      }
    });
    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/inventory");
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not cancel" };
  }
}

export async function deleteInvoiceAction(id: string): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can permanently delete invoices." };
  }
  if (!id.trim()) return { ok: false, error: "Invoice not found." };

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true, creditNotes: { select: { id: true } }, creditAdjustments: { select: { id: true } } },
      });
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.creditNotes.length || invoice.creditAdjustments.length) {
        throw new Error("This invoice is linked to credit notes or credit adjustments and cannot be deleted safely.");
      }

      const ornamentIds = [...new Set(invoice.items.map((item) => item.ornamentId).filter((value): value is string => Boolean(value)))];
      if (ornamentIds.length) {
        const usedByOtherFinalInvoices = await tx.invoiceItem.findMany({
          where: { invoiceId: { not: id }, ornamentId: { in: ornamentIds }, invoice: { status: "FINAL" } },
          select: { ornamentId: true },
        });
        const stillSoldIds = new Set(usedByOtherFinalInvoices.map((item) => item.ornamentId).filter((value): value is string => Boolean(value)));
        const returnToStockIds = ornamentIds.filter((ornamentId) => !stillSoldIds.has(ornamentId));
        if (returnToStockIds.length) {
          await tx.ornament.updateMany({
            where: { id: { in: returnToStockIds }, status: "SOLD" },
            data: { status: "IN_STOCK" },
          });
        }
      }

      if (session.employeeId) {
        await tx.employeeActivity.create({
          data: {
            employeeId: session.employeeId,
            employeeCode: session.employeeCode ?? "ADMIN",
            employeeName: session.employeeName ?? session.username,
            action: "INVOICE_DELETED",
            transactionNo: invoice.invoiceNo,
            oldValue: invoice.status,
          },
        });
      }

      // Invoice items, exchanges, and payments cascade with the invoice.
      await tx.invoice.delete({ where: { id } });
    });

    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    revalidatePath("/credit-notes");
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not delete invoice." };
  }
}

export async function updateInvoiceAction(id: string, raw: unknown): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can edit invoices." };
  }

  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0] ? invoiceValidationMessage(parsed.error.issues[0]) : "Check the invoice details and try again." };
  }
  const input = parsed.data;

  try {
    const shop = await getShop();
    const mode = shop.makingGstMode as MakingGstMode;
    const current = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!current) throw new Error("Invoice not found");
    if (current.status !== "FINAL") throw new Error("Cancelled invoices cannot be edited.");
    if (input.invoiceType !== current.invoiceType) throw new Error("Invoice type cannot be changed after issue. Create a new invoice in the correct register.");
    if (input.manualInvoiceSerial != null) throw new Error("Invoice numbers cannot be changed after issue.");
    const updatedInvoiceNo = input.invoiceNo.trim() || current.invoiceNo;
    const invoiceYearSegment = invoiceFiscalYear(updatedInvoiceNo);
    let updatedInvoiceDate = current.date;
    if (updatedInvoiceNo !== current.invoiceNo) {
      const updatedSerial = invoiceSerialNumber(updatedInvoiceNo);
      if (!/^[A-Za-z0-9/-]{1,16}$/.test(updatedInvoiceNo) || updatedSerial == null || updatedSerial < 1 || updatedSerial > 999999) {
        throw new Error("Invoice number must end in an unused serial from 1 to 999999 and be 16 characters or fewer.");
      }
      const fiscalYear = invoiceYearSegment ?? financialYear(current.date);
      updatedInvoiceDate = alignInvoiceDateBySerial(
        await prisma.invoice.findMany({
          where: { id: { not: id }, invoiceType: current.invoiceType, invoiceNo: { contains: `/${fiscalYear}/` } },
          select: { invoiceNo: true, date: true },
        }),
        updatedSerial,
        fiscalYear,
      );
      if (invoiceYearSegment && invoiceYearSegment !== financialYear(updatedInvoiceDate)) {
        throw new Error(`The neighboring serial dates fall outside invoice year ${invoiceYearSegment}.`);
      }
      const sameSerialBills = await prisma.invoice.findMany({
        where: {
          id: { not: id },
          invoiceType: current.invoiceType,
          ...(invoiceYearSegment ? { invoiceNo: { contains: `/${invoiceYearSegment}/`, endsWith: padInvoice(updatedSerial) } } : { invoiceNo: { endsWith: padInvoice(updatedSerial) } }),
        },
        select: { invoiceNo: true },
      });
      const serialConflict = sameSerialBills.find((row) => invoiceSerialNumber(row.invoiceNo) === updatedSerial);
      if (serialConflict) throw new Error(`Serial ${padInvoice(updatedSerial)} is already used by ${serialConflict.invoiceNo}. Choose an unused serial.`);
    }
    const includeGst = current.invoiceType === "GST";

    const computedItems = input.items.map((item) => ({
      item,
      calc: (() => {
        const calculated = calcLine({
        netWeight: item.netWeight,
        ratePerGram: item.ratePerGram,
        makingType: item.makingType,
        makingValue: item.makingValue,
        wastagePercent: item.wastagePercent,
        wastageAmountOverride: item.makingType === "FLAT" || item.pricingMode === "MANUAL" ? item.manualWastageAmount ?? 0 : null,
        stoneCharge: item.stoneCharge,
        hallmarkCharge: item.hallmarkCharge,
        otherCharge: item.otherCharge,
        }, gstModeForMaterial(item.metal, mode), includeGst);
        const priced = item.pricingMode === "CALCULATED"
          ? calculated
          : item.pricingMode === "MRP"
            ? applyMrpLineBase(calculated, item.finalPrice ?? 0, includeGst)
            : applyFinalLinePrice(calculated, item.finalPrice ?? 0, includeGst);
        return applyLineDiscount(priced, item.discountPercent, item.discountAmount, item.discountMode);
      })(),
    }));
    const exchanges = input.exchanges.map((exchange) => {
      const values = calcExchange(exchange.netWeight, exchange.ratePerGram, exchange.dustWeight, exchange.wastageWeight);
      return {
        ...exchange,
        deductionPercent: exchange.netWeight > 0
          ? ((exchange.dustWeight + exchange.wastageWeight) / exchange.netWeight) * 100
          : 0,
        amount: values.finalAmount,
      };
    });
    const oldGoldValue = r2(exchanges.reduce((sum, exchange) => sum + exchange.amount, 0));
    const paidAmount = r2(current.payments.reduce((sum, payment) => sum + num(payment.amount), 0));
    const calculatedTotals = calcInvoice(
      computedItems.map(({ item, calc }) => ({
        ...calc,
        stoneCharge: item.stoneCharge,
        hallmarkCharge: item.hallmarkCharge,
        otherCharge: item.otherCharge,
      })),
      oldGoldValue,
      paidAmount,
    );
    const mrpBase = input.mrpTotal ?? r2(calculatedTotals.taxable3 + calculatedTotals.taxable5);
    const productDiscountAmount = r2(computedItems.reduce((sum, row) => sum + row.calc.discountAmount, 0));
    const totalsWithMrp = applyMrpBaseOverride(calculatedTotals, mrpBase, includeGst, productDiscountAmount);
    const totalsAfterDiscount = applyInvoiceDiscount(totalsWithMrp, input.discountPercent, input.discountAmount, input.discountMode);
    const totals = input.finalInvoiceTotal == null
      ? totalsAfterDiscount
      : applyInvoiceTotalOverride(totalsAfterDiscount, input.finalInvoiceTotal);
    const { gstTotal, beforeRound, ...dbTotals } = totals;
    void gstTotal;
    void beforeRound;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          invoiceNo: updatedInvoiceNo,
          date: updatedInvoiceDate,
          customer: input.customerId ? { connect: { id: input.customerId } } : { disconnect: true },
          invoiceType: current.invoiceType,
          billOfSupplyReason: current.invoiceType === "BILL_OF_SUPPLY" ? input.billOfSupplyReason.trim() : "",
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerAddr: input.customerAddr,
          customerPan: input.customerPan,
          customerGstin: input.customerGstin,
          placeOfSupply: input.placeOfSupply || shop.state,
          notes: input.notes,
          ...dbTotals,
          mrpTotal: input.mrpTotal ?? num(current.mrpTotal),
          discountMode: input.discountMode,
          items: {
            deleteMany: {},
            create: computedItems.map(({ item, calc }) => ({
              ornament: item.ornamentId ? { connect: { id: item.ornamentId } } : undefined,
              tagNo: item.tagNo,
              description: item.description,
              hsn: item.hsn,
              huid: item.huid,
              metal: item.metal,
              purity: item.purity,
              category: item.category,
              grossWeight: item.grossWeight,
              stoneWeight: item.stoneWeight,
              netWeight: item.netWeight,
              ratePerGram: item.ratePerGram,
              goldValue: calc.goldValue,
              makingType: item.makingType,
              makingValue: item.makingValue,
              makingAmount: calc.makingAmount,
              wastagePercent: item.wastagePercent,
              wastageAmount: calc.wastageAmount,
              stoneCharge: item.stoneCharge,
              hallmarkCharge: item.hallmarkCharge,
              otherCharge: item.otherCharge,
              pricingMode: item.pricingMode,
              finalPrice: item.pricingMode === "CALCULATED" ? null : item.finalPrice,
              discountPercent: calc.discountPercent,
              discountAmount: calc.discountAmount,
              discountMode: item.discountMode,
              taxable3: calc.taxable3,
              taxable5: calc.taxable5,
              lineTotal: calc.lineTotal,
            })),
          },
          exchanges: {
            deleteMany: {},
            create: exchanges,
          },
          paidAmount,
          balanceAmount: Math.max(0, r2(totals.netPayable - paidAmount)),
        },
      });
      if (updatedInvoiceNo !== current.invoiceNo) {
        await tx.creditNote.updateMany({ where: { invoiceId: id }, data: { invoiceNo: updatedInvoiceNo } });
        await tx.creditNoteAdjustment.updateMany({ where: { invoiceId: id }, data: { invoiceNo: updatedInvoiceNo } });
      }
      await tx.employeeActivity.create({ data: {
        ...(session.employeeId ? { employeeId: session.employeeId } : {}),
        employeeCode: session.employeeCode ?? "ADMIN",
        employeeName: session.employeeName ?? session.username,
        action: "BILL_MODIFIED",
        transactionNo: updatedInvoiceNo,
        oldValue: current.invoiceNo,
        newValue: updatedInvoiceNo,
      } });
    });

    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/non-gst-invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath(`/invoices/${id}/edit`);
    revalidatePath("/reports");
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: invoiceActionError(error, "Could not update invoice") };
  }
}

export async function addPaymentAction(
  invoiceId: string,
  method: string,
  amount: number,
  reference: string,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in before recording a payment." };
  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      if (invoice.status !== "FINAL") throw new Error("Invoice is not open");
      if (!Number.isFinite(amount) || amount <= 0 || amount > num(invoice.balanceAmount)) {
        throw new Error("Payment must be positive and cannot exceed the outstanding balance.");
      }
      await tx.payment.create({
        data: {
          invoiceId,
          method,
          amount: r2(amount),
          reference,
        },
      });
      const paid = r2(num(invoice.paidAmount) + amount);
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: paid,
          balanceAmount: Math.max(0, r2(num(invoice.netPayable) - paid)),
        },
      });
      if (session.employeeId) await tx.employeeActivity.create({ data: {
        employeeId: session.employeeId, employeeCode: session.employeeCode ?? "", employeeName: session.employeeName ?? session.username,
        action: "PAYMENT_COLLECTED", transactionNo: invoice.invoiceNo, newValue: `${amount} ${method}`,
      } });
    });
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/reports");
    return { ok: true, id: invoiceId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not add payment" };
  }
}
