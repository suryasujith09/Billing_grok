import { prisma } from "./db";
import { endOfDay, num, startOfDay } from "./money";
import { cache } from "react";

export const getShop = cache(async function getShop() {
  const shop = await prisma.shop.findUnique({ where: { id: "default" } });
  if (!shop) {
    // Return a safe default on first boot before seed/setup is run
    return {
      id: "default",
      name: "Surya Gold and Diamonds",
      logoUrl: "",
      legalName: "",
      address: "",
      city: "",
      state: "",
      stateCode: "",
      pincode: "",
      phone: "",
      email: "",
      gstin: "",
      pan: "",
      bankName: "",
      bankAccount: "",
      ifsc: "",
      invoicePrefix: "SGD",
      nextInvoiceNo: 1,
      makingGstMode: "SEPARATE_5",
      terms: "",
    };
  }
  return shop;
});

export const getLatestRates = cache(async function getLatestRates() {
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
});

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
  page?: number;
}) {
  const q = opts?.q?.trim();
  const where = {
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
    };
  const pageSize = 50;
  const [items, count, weights] = await Promise.all([
    prisma.ornament.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      take: pageSize,
      skip: ((opts?.page ?? 1) - 1) * pageSize,
    }),
    prisma.ornament.count({ where }),
    prisma.ornament.aggregate({ where, _sum: { grossWeight: true, netWeight: true } }),
  ]);
  return {
    items,
    count,
    pageSize,
    totalGrossWeight: num(weights._sum.grossWeight),
    totalNetWeight: num(weights._sum.netWeight),
  };
}

export async function getOrnamentByTag(tagNo: string) {
  return prisma.ornament.findUnique({
    where: { tagNo: tagNo.trim().toUpperCase() },
  });
}

export async function listInvoices(opts?: { q?: string; from?: Date; to?: Date; page?: number }) {
  const q = opts?.q?.trim();
  const where = {
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
    };
  const pageSize = 50;
  const [items, count, totals] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: pageSize,
      skip: ((opts?.page ?? 1) - 1) * pageSize,
      include: { items: { select: { id: true } } },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({
      where,
      _sum: { netPayable: true, paidAmount: true, balanceAmount: true },
    }),
  ]);
  return {
    items,
    count,
    pageSize,
    totals: {
      net: num(totals._sum.netPayable),
      paid: num(totals._sum.paidAmount),
      balance: num(totals._sum.balanceAmount),
    },
  };
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

  const [today, stock, outstanding, recent, rates, shop] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: {
          status: "FINAL",
          date: { gte: todayStart, lte: todayEnd },
        },
        _count: { _all: true },
        _sum: { grandTotal: true, netPayable: true, oldGoldValue: true, paidAmount: true },
      }),
      prisma.ornament.aggregate({
        where: { status: "IN_STOCK" },
        _count: { _all: true },
        _sum: { netWeight: true },
      }),
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

  return {
    shop,
    rates,
    today: {
      bills: today._count._all,
      sales: num(today._sum.grandTotal),
      net: num(today._sum.netPayable),
      oldGold: num(today._sum.oldGoldValue),
      collected: num(today._sum.paidAmount),
    },
    stock: {
      pieces: stock._count._all,
      weight: num(stock._sum.netWeight),
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
