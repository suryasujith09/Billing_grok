"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./db";
import {
  calcInvoice,
  calcLine,
  calcExchange,
  type MakingGstMode,
  type MakingType,
} from "./invoice-calc";
import { financialYear, num, padInvoice, r2 } from "./money";
import { getLatestRates, getShop } from "./queries";
import { getSession } from "./session";

import { generateUniqueTagId, isValidTagBarcode } from "./tag-generator";

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
  metal: z.enum(["GOLD", "SILVER", "PLATINUM", "DIAMOND"]).default("GOLD"),
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

  const id = String(formData.get("id") ?? "");
  const data = parsed.data;

  let saved;
  try {
    saved = id
      ? await prisma.ornament.update({ where: { id }, data })
      : await prisma.ornament.create({ data });
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

export async function createInvoiceAction(raw: unknown): Promise<ActionState> {
  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bill" };
  }
  const input = parsed.data;
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in before creating an invoice." };
  if (!session.employeeId) return { ok: false, error: "Use your individual employee login to create a bill." };
  const employee = session.employeeId ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { counter: true } }) : null;
  if (session.employeeId && (!employee || employee.status !== "ACTIVE")) {
    return { ok: false, error: "Your employee account is inactive. Ask an administrator to restore access." };
  }
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
  if (paidAmount > totals.netPayable) {
    return { ok: false, error: "Payment amounts cannot exceed the net payable." };
  }

  const { gstTotal: _g, beforeRound: _b, ...dbTotals } = totals;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const current = await tx.shop.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", name: "Surya Gold and Diamonds" },
      });
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
          employee: employee ? { connect: { id: employee.id } } : undefined,
          employeeCode: employee?.employeeCode ?? session.employeeCode ?? (session.role === "admin" ? "ADMIN" : "COUNTER"),
          billerName: employee?.name ?? session.username,
          billerSignature: employee?.signature ?? "",
          counter: employee?.counter ? { connect: { id: employee.counter.id } } : undefined,
          counterNumber: employee?.counter?.number ?? "",
          counterName: employee?.counter?.name ?? "",
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

      if (employee) await tx.employeeActivity.create({ data: {
        employeeId: employee.id, employeeCode: employee.employeeCode, employeeName: employee.name,
        action: "BILL_CREATED", transactionNo: invoiceNo,
      } });

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

export async function updateInvoiceAction(id: string, raw: unknown): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can edit invoices." };
  }

  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invoice details" };
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

    const computedItems = input.items.map((item) => ({
      item,
      calc: calcLine({
        netWeight: item.netWeight,
        ratePerGram: item.ratePerGram,
        makingType: item.makingType,
        makingValue: item.makingValue,
        wastagePercent: item.wastagePercent,
        stoneCharge: item.stoneCharge,
        hallmarkCharge: item.hallmarkCharge,
        otherCharge: item.otherCharge,
      }, mode),
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
    if (paidAmount > totals.netPayable) {
      return { ok: false, error: "The edited net payable cannot be less than payments already collected." };
    }
    const { gstTotal: _gstTotal, beforeRound: _beforeRound, ...dbTotals } = totals;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          customer: input.customerId ? { connect: { id: input.customerId } } : { disconnect: true },
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerAddr: input.customerAddr,
          customerPan: input.customerPan,
          customerGstin: input.customerGstin,
          placeOfSupply: input.placeOfSupply || shop.state,
          notes: input.notes,
          ...dbTotals,
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
          balanceAmount: r2(totals.netPayable - paidAmount),
        },
      });
      if (session.employeeId) await tx.employeeActivity.create({ data: {
        employeeId: session.employeeId, employeeCode: session.employeeCode ?? "", employeeName: session.employeeName ?? session.username,
        action: "BILL_MODIFIED", transactionNo: current.invoiceNo,
      } });
    });

    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath(`/invoices/${id}/edit`);
    revalidatePath("/reports");
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update invoice" };
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
