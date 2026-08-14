import { prisma } from "./db";
import { endOfDay, num, startOfDay } from "./money";

export async function getShop() {
  const shop = await prisma.shop.findUnique({ where: { id: "default" } });
  if (!shop) {
    throw new Error("Shop is not set up. Run npm run db:seed.");
  }
  return shop;
}

export async function getLatestRates() {
  const rows = await prisma.metalRate.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.metal}:${row.purity}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return Array.from(latest.values()).sort((a, b) => {
    if (a.metal !== b.metal) return a.metal.localeCompare(b.metal);
    return a.purity.localeCompare(b.purity);
  });
}

export function rateMap(rates: Awaited<ReturnType<typeof getLatestRates>>) {
  const map: Record<string, number> = {};
  for (const rate of rates) {
    map[`${rate.metal}:${rate.purity}`] = num(rate.ratePerGram);
  }
  return map;
}

export async function searchCustomers(q: string) {
  const term = q.trim();
  if (!term) {
    return prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
  return prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: term } },
        { phone: { contains: term } },
        { pan: { contains: term } },
      ],
    },
    orderBy: { name: "asc" },
    take: 20,
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { date: "desc" },
        include: { payments: true },
      },
    },
  });
}

export async function listOrnaments(opts?: {
  q?: string;
  status?: string;
  category?: string;
}) {
  const q = opts?.q?.trim();
  return prisma.ornament.findMany({
    where: {
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.category ? { category: opts.category } : {}),
      ...(q
        ? {
            OR: [
              { tagNo: { contains: q } },
              { name: { contains: q } },
              { huid: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getOrnamentByTag(tagNo: string) {
  return prisma.ornament.findUnique({
    where: { tagNo: tagNo.trim().toUpperCase() },
  });
}

export async function listInvoices(opts?: { q?: string; from?: Date; to?: Date }) {
  const q = opts?.q?.trim();
  return prisma.invoice.findMany({
    where: {
      ...(opts?.from || opts?.to
        ? {
            date: {
              ...(opts.from ? { gte: startOfDay(opts.from) } : {}),
              ...(opts.to ? { lte: endOfDay(opts.to) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { invoiceNo: { contains: q } },
              { customerName: { contains: q } },
              { customerPhone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
    include: { payments: true, items: true, exchanges: true },
  });
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { items: true, exchanges: true, payments: true, customer: true },
  });
}

export async function dashboardStats() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [todayInvoices, stock, outstanding, recent, rates, shop] =
    await Promise.all([
      prisma.invoice.findMany({
        where: {
          status: "FINAL",
          date: { gte: todayStart, lte: todayEnd },
        },
        include: { items: true, exchanges: true, payments: true },
      }),
      prisma.ornament.findMany({ where: { status: "IN_STOCK" } }),
      prisma.invoice.findMany({
        where: { status: "FINAL", balanceAmount: { gt: 0 } },
        orderBy: { date: "desc" },
        take: 8,
      }),
      prisma.invoice.findMany({
        orderBy: { date: "desc" },
        take: 6,
      }),
      getLatestRates(),
      getShop(),
    ]);

  const sales = todayInvoices.reduce((s, inv) => s + num(inv.grandTotal), 0);
  const net = todayInvoices.reduce((s, inv) => s + num(inv.netPayable), 0);
  const oldGold = todayInvoices.reduce((s, inv) => s + num(inv.oldGoldValue), 0);
  const collected = todayInvoices.reduce((s, inv) => s + num(inv.paidAmount), 0);
  const stockWeight = stock.reduce((s, item) => s + num(item.netWeight), 0);

  return {
    shop,
    rates,
    today: {
      bills: todayInvoices.length,
      sales,
      net,
      oldGold,
      collected,
    },
    stock: {
      pieces: stock.length,
      weight: stockWeight,
    },
    outstanding,
    recent,
  };
}

export async function reportForRange(from: Date, to: Date) {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: "FINAL",
      date: { gte: startOfDay(from), lte: endOfDay(to) },
    },
    include: { items: true, exchanges: true, payments: true },
  });

  const stock = await prisma.ornament.findMany();

  const paymentBreak: Record<string, number> = {};
  for (const inv of invoices) {
    for (const pay of inv.payments) {
      paymentBreak[pay.method] = (paymentBreak[pay.method] ?? 0) + num(pay.amount);
    }
  }

  const categoryBreak: Record<string, { pieces: number; amount: number }> = {};
  for (const inv of invoices) {
    for (const item of inv.items) {
      const key = item.category || "OTHER";
      const current = categoryBreak[key] ?? { pieces: 0, amount: 0 };
      current.pieces += 1;
      current.amount += num(item.lineTotal);
      categoryBreak[key] = current;
    }
  }

  return {
    invoices,
    totals: {
      bills: invoices.length,
      goldValue: invoices.reduce((s, i) => s + num(i.goldValue), 0),
      making: invoices.reduce((s, i) => s + num(i.makingAmount), 0),
      wastage: invoices.reduce((s, i) => s + num(i.wastageAmount), 0),
      taxable3: invoices.reduce((s, i) => s + num(i.taxable3), 0),
      taxable5: invoices.reduce((s, i) => s + num(i.taxable5), 0),
      cgst3: invoices.reduce((s, i) => s + num(i.cgst3), 0),
      sgst3: invoices.reduce((s, i) => s + num(i.sgst3), 0),
      cgst5: invoices.reduce((s, i) => s + num(i.cgst5), 0),
      sgst5: invoices.reduce((s, i) => s + num(i.sgst5), 0),
      grand: invoices.reduce((s, i) => s + num(i.grandTotal), 0),
      oldGold: invoices.reduce((s, i) => s + num(i.oldGoldValue), 0),
      net: invoices.reduce((s, i) => s + num(i.netPayable), 0),
      paid: invoices.reduce((s, i) => s + num(i.paidAmount), 0),
      balance: invoices.reduce((s, i) => s + num(i.balanceAmount), 0),
    },
    paymentBreak,
    categoryBreak,
    stock: {
      inStock: stock.filter((s) => s.status === "IN_STOCK").length,
      sold: stock.filter((s) => s.status === "SOLD").length,
      weightInStock: stock
        .filter((s) => s.status === "IN_STOCK")
        .reduce((sum, s) => sum + num(s.netWeight), 0),
    },
  };
}
