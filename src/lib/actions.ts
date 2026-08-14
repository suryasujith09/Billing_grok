"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./db";
import {
  calcInvoice,
  calcLine,
  calcOldGold,
  type MakingGstMode,
  type MakingType,
} from "./invoice-calc";
import { financialYear, num, padInvoice, r2 } from "./money";
import { getLatestRates, getShop } from "./queries";

const ornamentSchema = z.object({
  tagNo: z.string().min(1),
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
  notes: z.string().optional().default(""),
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
  netWeight: z.coerce.number().positive(),
  ratePerGram: z.coerce.number().positive(),
  makingType: z.enum(["PER_GRAM", "PERCENT", "FLAT"]),
  makingValue: z.coerce.number().nonnegative(),
  wastagePercent: z.coerce.number().nonnegative().optional().default(0),
  stoneCharge: z.coerce.number().nonnegative().optional().default(0),
  hallmarkCharge: z.coerce.number().nonnegative().optional().default(0),
  otherCharge: z.coerce.number().nonnegative().optional().default(0),
});

const exchangeSchema = z.object({
  description: z.string().min(1),
  metal: z.string().optional().default("GOLD"),
  purity: z.string().min(1),
  grossWeight: z.coerce.number().nonnegative(),
  netWeight: z.coerce.number().positive(),
  ratePerGram: z.coerce.number().positive(),
  deductionPercent: z.coerce.number().nonnegative().optional().default(0),
});

const paymentSchema = z.object({
  method: z.enum(["CASH", "UPI", "CARD", "CHEQUE", "BANK", "CREDIT"]),
  amount: z.coerce.number().nonnegative(),
  reference: z.string().optional().default(""),
});

const invoiceSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional().default(""),
  customerAddr: z.string().optional().default(""),
  customerPan: z.string().optional().default(""),
  customerGstin: z.string().optional().default(""),
  placeOfSupply: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  items: z.array(lineSchema).min(1, "Add at least one item"),
  exchanges: z.array(exchangeSchema).optional().default([]),
  payments: z.array(paymentSchema).optional().default([]),
});

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
  const parsed = ornamentSchema.safeParse({
    tagNo: String(formData.get("tagNo") ?? "").toUpperCase(),
    name: formData.get("name"),
    category: formData.get("category"),
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
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ornament" };
  }
  const id = String(formData.get("id") ?? "");
  const data = parsed.data;
  try {
    const saved = id
      ? await prisma.ornament.update({ where: { id }, data })
      : await prisma.ornament.create({ data });
    revalidatePath("/inventory");
    redirect(`/inventory/${saved.id}`);
  } catch (error) {
    const message = String(error);
    if (message.includes("Unique constraint")) {
      return { ok: false, error: "That tag number is already in stock." };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Could not save item" };
  }
}

export async function lookupTagAction(tagNo: string) {
  const tag = tagNo.trim().toUpperCase();
  if (!tag) return { ok: false as const, error: "Enter a tag number" };
  const item = await prisma.ornament.findFirst({
    where: { tagNo: { equals: tag } },
  });
  if (!item) return { ok: false as const, error: `No stock found for ${tag}` };
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
      metal: item.metal,
      purity: item.purity,
      category: item.category,
      grossWeight: num(item.grossWeight),
      stoneWeight: num(item.stoneWeight),
      netWeight: num(item.netWeight),
      ratePerGram: num(rate),
      makingType: item.makingType as MakingType,
      makingValue: num(item.makingValue),
      wastagePercent: num(item.wastagePercent),
      stoneCharge: num(item.stoneCharge),
      hallmarkCharge: num(item.hallmarkCharge),
      otherCharge: num(item.otherCharge),
    },
  };
}

export async function searchCustomersAction(q: string) {
  const term = q.trim();
  return prisma.customer.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term } },
            { phone: { contains: term } },
          ],
        }
      : {},
    orderBy: { name: "asc" },
    take: 8,
  });
}

export async function createInvoiceAction(raw: unknown): Promise<ActionState> {
  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bill" };
  }
  const input = parsed.data;
  const shop = await getShop();
  const mode = shop.makingGstMode as MakingGstMode;

  const computedItems = input.items.map((item) => {
    const calc = calcLine(
      {
        netWeight: item.netWeight,
        ratePerGram: item.ratePerGram,
        makingType: item.makingType,
        makingValue: item.makingValue,
        wastagePercent: item.wastagePercent,
        stoneCharge: item.stoneCharge,
        hallmarkCharge: item.hallmarkCharge,
        otherCharge: item.otherCharge,
      },
      mode,
    );
    return { item, calc };
  });

  const exchanges = input.exchanges.map((ex) => ({
    ...ex,
    amount: calcOldGold(ex.netWeight, ex.ratePerGram, ex.deductionPercent),
  }));
  const oldGoldValue = r2(exchanges.reduce((s, ex) => s + ex.amount, 0));
  const paidAmount = r2(input.payments.reduce((s, p) => s + p.amount, 0));
  const totals = calcInvoice(
    computedItems.map(({ item, calc }) => ({
      ...calc,
      stoneCharge: item.stoneCharge,
      hallmarkCharge: item.hallmarkCharge,
      otherCharge: item.otherCharge,
    })),
    oldGoldValue,
    paidAmount,
  );

  const { gstTotal: _g, beforeRound: _b, ...dbTotals } = totals;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const current = await tx.shop.findUniqueOrThrow({ where: { id: "default" } });
      const invoiceNo = `${current.invoicePrefix}/${financialYear()}/${padInvoice(current.nextInvoiceNo)}`;

      const created = await tx.invoice.create({
        data: {
          invoiceNo,
          customer: input.customerId ? { connect: { id: input.customerId } } : undefined,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerAddr: input.customerAddr,
          customerPan: input.customerPan,
          customerGstin: input.customerGstin,
          placeOfSupply: input.placeOfSupply || current.state,
          notes: input.notes,
          ...dbTotals,
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

      await tx.shop.update({
        where: { id: "default" },
        data: { nextInvoiceNo: current.nextInvoiceNo + 1 },
      });

      return created;
    });

    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    return { ok: true, id: invoice.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save invoice" };
  }
}

export async function cancelInvoiceAction(id: string): Promise<ActionState> {
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

export async function addPaymentAction(
  invoiceId: string,
  method: string,
  amount: number,
  reference: string,
): Promise<ActionState> {
  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      if (invoice.status !== "FINAL") throw new Error("Invoice is not open");
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
          balanceAmount: r2(num(invoice.netPayable) - paid),
        },
      });
    });
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/reports");
    return { ok: true, id: invoiceId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not add payment" };
  }
}
