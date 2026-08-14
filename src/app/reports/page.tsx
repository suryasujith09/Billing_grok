import Link from "next/link";
import { reportForRange } from "@/lib/queries";
import { formatDate, grams, inr, todayISO } from "@/lib/money";
import { labelize } from "@/lib/constants";
import { Button, Card, Field, Input, PageHeader, Stat } from "@/components/ui";
import { Calendar, Filter, PieChart, ShoppingBag } from "lucide-react";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const from = params.from ? new Date(params.from) : startOfMonth;
  const to = params.to ? new Date(params.to) : now;

  const report = await reportForRange(from, to);
  const { totals, paymentBreak, categoryBreak, stock } = report;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financial Intelligence"
        title="Sales & Tax Reports"
        subtitle="GST tax liabilities, revenue breakdown, payment collections, category performance, and inventory valuation."
      />

      {/* Date Range Selector Bar */}
      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="w-full sm:w-44">
            <Field label="From Date">
              <Input name="from" type="date" defaultValue={todayISO(from)} />
            </Field>
          </div>
          <div className="w-full sm:w-44">
            <Field label="To Date">
              <Input name="to" type="date" defaultValue={todayISO(to)} />
            </Field>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              <Filter size={16} />
              Generate Report
            </Button>
          </div>
          <div className="flex items-center gap-1 sm:ml-auto text-xs text-stone pt-1 sm:pt-0">
            <Calendar size={14} />
            <span>
              Period: <strong className="text-ink">{formatDate(from)}</strong> to{" "}
              <strong className="text-ink">{formatDate(to)}</strong>
            </span>
          </div>
        </form>
      </Card>

      {/* Executive Summary Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total Invoices"
          value={totals.bills}
          hint={`Period: ${formatDate(from)} – ${formatDate(to)}`}
        />
        <Stat
          label="Gross Revenue"
          value={inr(totals.grand)}
          hint={`Includes Gold: ${inr(totals.goldValue)} + Making: ${inr(totals.making)}`}
        />
        <Stat
          label="Old Gold Credit"
          value={inr(totals.oldGold)}
          hint="Trade-in value deducted"
        />
        <Stat
          label="Net Collections"
          value={inr(totals.paid)}
          hint={`Pending Balance: ${inr(totals.balance)}`}
        />
      </div>

      {/* Tax Liability & Payment Split Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tax Liability Card */}
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink border-b border-sand pb-3 mb-4">
            GST Tax Liabilities Breakdown
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-sand/30">
              <span className="text-stone">Taxable Value @ 3% (Gold & Ornaments)</span>
              <span className="font-medium tabular text-ink">{inr(totals.taxable3)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-sand/30">
              <span className="text-stone">CGST 1.5% + SGST 1.5%</span>
              <span className="font-semibold tabular text-ink">
                {inr(totals.cgst3 + totals.sgst3)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-sand/30">
              <span className="text-stone">Taxable Value @ 5% (Making Charges)</span>
              <span className="font-medium tabular text-ink">{inr(totals.taxable5)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-sand/30">
              <span className="text-stone">CGST 2.5% + SGST 2.5%</span>
              <span className="font-semibold tabular text-ink">
                {inr(totals.cgst5 + totals.sgst5)}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-base font-bold">
              <span className="text-ink">Total Tax Collected</span>
              <span className="tabular text-wine">
                {inr(totals.cgst3 + totals.sgst3 + totals.cgst5 + totals.sgst5)}
              </span>
            </div>
          </div>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink border-b border-sand pb-3 mb-4 flex items-center gap-2">
            <PieChart size={18} />
            Collections by Payment Method
          </h2>
          <div className="space-y-3 text-sm">
            {Object.keys(paymentBreak).length === 0 ? (
              <p className="text-xs text-stone">No collections in selected period.</p>
            ) : (
              Object.entries(paymentBreak).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between py-1.5 border-b border-sand/30">
                  <span className="font-medium text-ink">{method}</span>
                  <span className="font-bold tabular text-ok">{inr(amount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Category Sales Breakdown & Stock Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Performance */}
        <Card padded={false}>
          <div className="border-b border-sand px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-ink">
              Sales Performance by Category
            </h2>
          </div>
          <div className="p-5">
            {Object.keys(categoryBreak).length === 0 ? (
              <p className="text-xs text-stone">No items sold in selected period.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categoryBreak).map(([cat, data]) => (
                  <div key={cat} className="flex items-center justify-between border-b border-sand/30 py-1 text-sm">
                    <div>
                      <p className="font-semibold text-ink">{labelize(cat)}</p>
                      <p className="text-xs text-stone">{data.pieces} piece(s) sold</p>
                    </div>
                    <span className="font-bold tabular text-ink">{inr(data.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Stock Inventory Snapshot */}
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink border-b border-sand pb-3 mb-4">
            Stock Inventory Valuation
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-sand/30">
              <span className="text-stone">Pieces In Stock</span>
              <span className="font-bold tabular text-ink">{stock.inStock}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-sand/30">
              <span className="text-stone">Net Weight In Stock</span>
              <span className="font-bold tabular text-ink">{grams(stock.weightInStock)} g</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-sand/30">
              <span className="text-stone">Pieces Sold (Total)</span>
              <span className="font-bold tabular text-stone">{stock.sold}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
