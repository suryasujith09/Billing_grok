import Link from "next/link";
import { listInvoices } from "@/lib/queries";
import { formatDate, inr, num } from "@/lib/money";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { Plus, Receipt, Search } from "lucide-react";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const fromDate = params.from ? new Date(params.from) : undefined;
  const toDate = params.to ? new Date(params.to) : undefined;

  const invoices = await listInvoices({ q, from: fromDate, to: toDate });

  const totalNet = invoices.reduce((sum, i) => sum + num(i.netPayable), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + num(i.paidAmount), 0);
  const totalBalance = invoices.reduce((sum, i) => sum + num(i.balanceAmount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales Register"
        title="Tax Invoices"
        subtitle="Manage and search all tax invoices generated at counter."
        actions={
          <Link href="/billing">
            <Button variant="primary">
              <Plus size={16} />
              New Bill
            </Button>
          </Link>
        }
      />

      {/* Filter Toolbar */}
      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <Field label="Search Invoice / Customer">
              <Input name="q" defaultValue={q} placeholder="Invoice #, name, or phone..." />
            </Field>
          </div>
          <div className="w-full sm:w-36">
            <Field label="From Date">
              <Input name="from" type="date" defaultValue={params.from ?? ""} />
            </Field>
          </div>
          <div className="w-full sm:w-36">
            <Field label="To Date">
              <Input name="to" type="date" defaultValue={params.to ?? ""} />
            </Field>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
              <Search size={16} />
              Filter
            </Button>
            {q || params.from || params.to ? (
              <Link href="/invoices" className="flex-1 sm:flex-none">
                <Button type="button" variant="ghost" className="w-full">
                  Reset
                </Button>
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      {/* Summary Chips */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border border-sand bg-paper p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone uppercase">Bills Found</p>
          <p className="font-display mt-1 text-xl sm:text-2xl font-semibold text-ink">{invoices.length}</p>
        </div>
        <div className="rounded-lg border border-sand bg-paper p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone uppercase">Total Sales Net</p>
          <p className="font-display mt-1 text-xl sm:text-2xl font-semibold text-ink">{inr(totalNet)}</p>
        </div>
        <div className="rounded-lg border border-sand bg-paper p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone uppercase">Collected</p>
          <p className="font-display mt-1 text-xl sm:text-2xl font-semibold text-ok">{inr(totalPaid)}</p>
        </div>
        <div className="rounded-lg border border-sand bg-paper p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone uppercase">Pending Balance</p>
          <p className="font-display mt-1 text-xl sm:text-2xl font-semibold text-danger">{inr(totalBalance)}</p>
        </div>
      </div>

      {/* Invoices Table */}
      <Card padded={false}>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone">
            No tax invoices matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand bg-cream/50 text-[11px] font-semibold tracking-wider text-stone uppercase">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3 text-right">Items</th>
                  <th className="px-5 py-3 text-right">Grand Total</th>
                  <th className="px-5 py-3 text-right">Old Gold</th>
                  <th className="px-5 py-3 text-right">Net Payable</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-sand/20 transition">
                    <td className="px-5 py-3.5 whitespace-nowrap text-stone text-xs">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-5 py-3.5 font-medium tabular text-ink">
                      {inv.invoiceNo}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{inv.customerName}</p>
                      <p className="text-xs text-stone">{inv.customerPhone || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular text-stone">
                      {inv.items.length}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular font-medium text-ink">
                      {inr(num(inv.grandTotal))}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular text-stone">
                      {num(inv.oldGoldValue) > 0 ? inr(num(inv.oldGoldValue)) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular font-semibold text-ink">
                      {inr(num(inv.netPayable))}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular font-medium text-ok">
                      {inr(num(inv.paidAmount))}
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
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
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
  );
}
