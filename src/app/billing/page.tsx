import { getLatestRates, getShop, listOrnaments } from "@/lib/queries";
import { BillingDesk } from "@/components/billing-desk";
import { PageHeader } from "@/components/ui";
import { num } from "@/lib/money";

import type { MakingGstMode, MakingType } from "@/lib/invoice-calc";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { connection } from "next/server";

export default async function BillingPage() {
  await connection();
  const [shop, rates, stock, session] = await Promise.all([
    getShop(),
    getLatestRates(),
    listOrnaments({ status: "IN_STOCK", page: 1 }),
    getSession(),
  ]);
  const employee = session?.employeeId ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { counter: true } }) : null;
  const rateRows = rates.map((r) => ({
    metal: r.metal,
    purity: r.purity,
    ratePerGram: Number(r.ratePerGram),
  }));
  const stockRows = stock.items.map((item) => ({
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
    ratePerGram: num(rates.find((r) => r.metal === item.metal && r.purity === item.purity)?.ratePerGram),
    makingType: item.makingType as MakingType,
    makingValue: num(item.makingValue),
    wastagePercent: num(item.wastagePercent),
    stoneCharge: num(item.stoneCharge),
    hallmarkCharge: num(item.hallmarkCharge),
    otherCharge: num(item.otherCharge),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Counter Terminal"
        title="New GST Invoice"
        subtitle="Itemized jewellery billing, stock barcode lookup, metal and diamond exchange, and tax invoice generation."
      />
      <BillingDesk
        rates={rateRows}
        stockItems={stockRows}
        stockCount={stock.count}
        makingGstMode={shop.makingGstMode as MakingGstMode}
        placeOfSupply={shop.state}
        biller={employee ? { name: employee.name, code: employee.employeeCode, counter: employee.counter?.number ?? "" } : { name: session?.username ?? "", code: session?.role === "admin" ? "ADMIN" : "COUNTER", counter: "" }}
      />
    </div>
  );
}
