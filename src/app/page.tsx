import Link from "next/link";
import { dashboardStats } from "@/lib/queries";
import { grams, inr, formatDate } from "@/lib/money";
import { Button, Card, PageHeader, Stat } from "@/components/ui";
import {
  BookOpen,
  Gem,
  Plus,
  Receipt,
  ShoppingBag,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const stats = await dashboardStats();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Counter Operations"
        title="Dashboard"
        subtitle={`Welcome to ${stats.shop.name}. Today's overview & quick counter actions.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/billing">
              <Button variant="secondary" size="md">
                <Receipt size={16} />
                New Bill
              </Button>
            </Link>
            <Link href="/inventory/new">
              <Button variant="ghost" size="md">
                <Plus size={16} />
                Add Stock
              </Button>
            </Link>
            <Link href="/customers/new">
              <Button variant="ghost" size="md">
                <Users size={16} />
                Add Customer
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Today's Sales"
          value={inr(stats.today.sales)}
          hint={`${stats.today.bills} tax invoice(s) generated`}
        />
        <Stat
          label="Collections Today"
          value={inr(stats.today.collected)}
          hint={`Net payable: ${inr(stats.today.net)}`}
        />
        <Stat
          label="Old Gold Exchange"
          value={inr(stats.today.oldGold)}
          hint="Trade-in value credited"
        />
        <Stat
          label="Stock Inventory"
          value={`${grams(stats.stock.weight)} g`}
          hint={`${stats.stock.pieces} tagged piece(s) in stock`}
        />
      </div>

      {/* Main Grid: Recent Bills & Outstanding Balances */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Invoices */}
        <div className="space-y-6 lg:col-span-2">
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-sand px-5 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">Recent Invoices</h2>
              <Link href="/invoices" className="text-xs font-medium text-wine hover:underline">
                View all →
              </Link>
            </div>
            {stats.recent.length === 0 ? (
              <div className="p-6 text-center text-sm text-stone">
                No invoices created yet today. Click &quot;New Bill&quot; to generate your first invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-sand bg-cream/50 text-[11px] font-semibold tracking-wider text-stone uppercase">
                      <th className="px-5 py-3">Invoice #</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3 text-right">Net Payable</th>
                      <th className="px-5 py-3 text-right">Paid</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/60">
                    {stats.recent.map((inv) => (
                      <tr key={inv.id} className="hover:bg-sand/20 transition">
                        <td className="px-5 py-3.5 font-medium tabular text-ink">
                          {inv.invoiceNo}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-ink">{inv.customerName}</p>
                          <p className="text-xs text-stone">{inv.customerPhone || "—"}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium tabular text-ink">
                          {inr(Number(inv.netPayable))}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular text-ok font-medium">
                          {inr(Number(inv.paidAmount))}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              inv.status === "FINAL"
                                ? "bg-ok/10 text-ok"
                                : "bg-danger/10 text-danger"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-xs font-semibold text-wine hover:underline"
                          >
                            View & Print
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Board Rates & Outstanding Balances */}
        <div className="space-y-6">
          {/* Daily Rates Board Card */}
          <Card>
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="font-display text-base font-semibold text-ink">Daily Metal Board</h3>
              <Link href="/settings#rates" className="text-xs text-gold hover:underline font-medium">
                Update
              </Link>
            </div>
            <div className="mt-3 divide-y divide-sand/40 text-sm">
              {stats.rates.map((rate) => (
                <div key={`${rate.metal}-${rate.purity}`} className="flex justify-between py-2">
                  <span className="font-medium text-stone">
                    {rate.metal} ({rate.purity})
                  </span>
                  <span className="font-semibold tabular text-ink">
                    {inr(Number(rate.ratePerGram))}/g
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Outstanding Balances */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-sand px-5 py-4">
              <div className="flex items-center gap-2 text-warn">
                <AlertCircle size={16} />
                <h3 className="font-display text-base font-semibold text-ink">Pending Balances</h3>
              </div>
              <span className="text-xs font-semibold text-stone">
                {stats.outstanding.length} bill(s)
              </span>
            </div>
            {stats.outstanding.length === 0 ? (
              <div className="p-5 text-center text-xs text-stone">
                All invoices are fully paid!
              </div>
            ) : (
              <div className="divide-y divide-sand/50">
                {stats.outstanding.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-xs text-ink">{inv.customerName}</p>
                      <p className="text-[11px] tabular text-stone">{inv.invoiceNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold tabular text-danger">
                        {inr(Number(inv.balanceAmount))}
                      </p>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-[11px] font-semibold text-wine hover:underline"
                      >
                        Collect
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
