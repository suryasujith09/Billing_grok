import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { indiaDayBounds } from "@/lib/india-time";
import { todayISO } from "@/lib/money";

function csvCell(value: unknown) {
  if (value == null) return "\"\"";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  let text = String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: unknown[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function parseDate(value: string | null, fallback: string) {
  const date = value || fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { date, bounds: indiaDayBounds(new Date(`${date}T12:00:00+05:30`)) };
}

function formatDateTimeInIndia(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function decimal(value: unknown) {
  return Number(value ?? 0);
}

function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");

  if (type === "inventory") {
    const stock = await prisma.ornament.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
    const rows: unknown[][] = [[
      "Tag", "Product Code", "Name", "Category", "Metal", "Purity", "HUID", "Status",
      "Gross Weight (g)", "Stone Weight (g)", "Net Weight (g)", "MRP", "Owned Fully",
    ]];
    for (const item of stock) {
      rows.push([
        item.tagNo, item.productCode, item.name, item.category, item.metal, item.purity, item.huid,
        item.status, decimal(item.grossWeight), decimal(item.stoneWeight), decimal(item.netWeight),
        item.mrp == null ? "" : decimal(item.mrp), item.isFullyOwned ? "Yes" : "No",
      ]);
    }
    const stamp = todayISO();
    return csvResponse(toCsv(rows), `stock-inventory-${stamp}.csv`);
  }

  if (type !== "sales") return Response.json({ error: "Choose sales or inventory export." }, { status: 400 });

  const today = todayISO();
  const from = parseDate(searchParams.get("from"), today);
  const to = parseDate(searchParams.get("to"), today);
  if (!from || !to) return Response.json({ error: "Dates must be valid YYYY-MM-DD values." }, { status: 400 });
  if (from.date > to.date) return Response.json({ error: "From date must be on or before to date." }, { status: 400 });

  const invoices = await prisma.invoice.findMany({
    where: { status: "FINAL", date: { gte: from.bounds.start, lt: to.bounds.end } },
    orderBy: [{ date: "asc" }, { invoiceNo: "asc" }],
    include: { items: true, exchanges: true, payments: true },
  });

  const rows: unknown[][] = [[
    "Date & Time (IST)", "Invoice No", "Customer", "Phone", "Item Count", "Items",
    "Gross Weight (g)", "Net Weight (g)", "Taxable Value @ 3%", "Taxable Value @ 5%",
    "CGST", "SGST", "Total GST", "Exchange Credit", "Exchange Details", "Grand Total",
    "Net Payable", "Paid", "Balance", "Payments", "Biller", "Employee Code", "Counter",
  ]];

  for (const invoice of invoices) {
    const grossWeight = invoice.items.reduce((sum, item) => sum + decimal(item.grossWeight), 0);
    const netWeight = invoice.items.reduce((sum, item) => sum + decimal(item.netWeight), 0);
    const cgst = decimal(invoice.cgst3) + decimal(invoice.cgst5);
    const sgst = decimal(invoice.sgst3) + decimal(invoice.sgst5);
    const itemDetails = invoice.items.map((item) =>
      `${item.description} (${item.metal} ${item.purity}; net ${decimal(item.netWeight)} g; ${decimal(item.lineTotal)})`,
    ).join(" | ");
    const exchangeDetails = invoice.exchanges.map((item) =>
      `${item.description} (${item.metal} ${item.purity}; net ${decimal(item.netWeight)} g; ${decimal(item.amount)})`,
    ).join(" | ");
    const paymentDetails = invoice.payments.map((payment) =>
      `${payment.method}: ${decimal(payment.amount)}`,
    ).join(" | ");

    rows.push([
      formatDateTimeInIndia(invoice.date), invoice.invoiceNo, invoice.customerName, invoice.customerPhone,
      invoice.items.length, itemDetails, grossWeight, netWeight, decimal(invoice.taxable3), decimal(invoice.taxable5),
      cgst, sgst, cgst + sgst, decimal(invoice.oldGoldValue), exchangeDetails, decimal(invoice.grandTotal),
      decimal(invoice.netPayable), decimal(invoice.paidAmount), decimal(invoice.balanceAmount), paymentDetails,
      invoice.billerName, invoice.employeeCode, invoice.counterNumber,
    ]);
  }

  const filename = from.date === to.date
    ? `daily-sales-${from.date}.csv`
    : `sales-${from.date}-to-${to.date}.csv`;
  return csvResponse(toCsv(rows), filename);
}
