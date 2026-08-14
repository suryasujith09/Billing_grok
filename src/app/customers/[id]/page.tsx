import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/queries";
import { formatDate, inr, num } from "@/lib/money";
import { CustomerForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { ArrowLeft, BookOpen } from "lucide-react";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);

  if (!customer) {
    notFound();
  }

  const totalSpent = customer.invoices.reduce((sum, inv) => sum + num(inv.netPayable), 0);
  const totalBalance = customer.invoices.reduce((sum, inv) => sum + num(inv.balanceAmount), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/customers" className="inline-flex items-center gap-1 text-xs font-semibold text-stone hover:text-ink">
        <ArrowLeft size={14} />
        Back to customers
      </Link>
      
      <PageHeader
        eyebrow="Customer Profile"
        title={customer.name}
        subtitle={`Mobile: ${customer.phone} · Total Invoices: ${customer.invoices.length}`}
      />

      {/* Customer Spend Summary Chips */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-sand bg-paper p-4">
          <p className="text-[11px] font-semibold tracking-wider text-stone uppercase">Total Invoices</p>
          <p className="font-display mt-1 text-2xl font-semibold text-ink">{customer.invoices.length}</p>
        </div>
        <div className="rounded-lg border border-sand bg-paper p-4">
          <p className="text-[11px] font-semibold tracking-wider text-stone uppercase">Lifetime Net Spend</p>
          <p className="font-display mt-1 text-2xl font-semibold text-ink">{inr(totalSpent)}</p>
        </div>
        <div className="rounded-lg border border-sand bg-paper p-4">
          <p className="text-[11px] font-semibold tracking-wider text-stone uppercase">Outstanding Credit</p>
          <p className="font-display mt-1 text-2xl font-semibold text-danger">{inr(totalBalance)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Edit Form */}
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink mb-4">Edit Profile</h2>
          <CustomerForm customer={customer} />
        </Card>

        {/* Invoice Purchase History */}
        <Card padded={false}>
          <div className="border-b border-sand px-5 py-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
              <BookOpen size={18} />
              Purchase History
            </h2>
          </div>
          {customer.invoices.length === 0 ? (
            <div className="p-6 text-center text-sm text-stone">
              No tax invoices created for this customer yet.
            </div>
          ) : (
            <div className="divide-y divide-sand/50">
              {customer.invoices.map((inv) => (
                <div key={inv.id} className="p-4 hover:bg-sand/20 transition flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-ink">{inv.invoiceNo}</p>
                    <p className="text-xs text-stone">{formatDate(inv.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular text-ink">
                      {inr(num(inv.netPayable))}
                    </p>
                    {num(inv.balanceAmount) > 0 ? (
                      <p className="text-xs text-danger font-semibold">
                        Bal: {inr(num(inv.balanceAmount))}
                      </p>
                    ) : (
                      <p className="text-xs text-ok font-semibold">Paid</p>
                    )}
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-xs text-wine font-semibold hover:underline block mt-0.5"
                    >
                      View Invoice →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
