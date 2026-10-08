import { notFound } from "next/navigation";
import Link from "next/link";
import { getInvoice, getShop } from "@/lib/queries";
import { inr, num } from "@/lib/money";
import { InvoiceThemeSwitcher } from "@/components/invoice-theme-switcher";
import { CancelInvoiceButton, CollectPaymentForm } from "@/components/forms";
import { Card } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, shop, session] = await Promise.all([getInvoice(id), getShop(), getSession()]);

  if (!invoice) {
    notFound();
  }

  // Prisma Decimal instances cannot cross the Server/Client Component boundary.
  // JSON serialization converts Decimal values to strings and Date values to ISO strings.
  const invoiceForClient = JSON.parse(JSON.stringify(invoice));
  const shopForClient = JSON.parse(JSON.stringify(shop));

  const balance = num(invoice.balanceAmount);

  return (
    <div className="space-y-6">
      {/* Top Bar for Screen only */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/invoices" className="inline-flex items-center gap-1 text-xs font-semibold text-stone hover:text-ink">
            <ArrowLeft size={14} />
            Back to invoices
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {session?.role === "admin" && invoice.status === "FINAL" ? (
              <Link href={`/invoices/${invoice.id}/edit`} className="rounded-md border border-sand px-3 py-2 text-xs font-semibold text-ink hover:bg-sand/40">
                Edit invoice
              </Link>
            ) : null}
            {invoice.status === "FINAL" && balance > 0 ? (
              <div className="flex items-center gap-2 border border-amber-300 bg-amber-50 px-3 py-1.5 rounded-md text-xs">
                <span className="font-semibold text-amber-900">
                  Balance due: {inr(balance)}
                </span>
              </div>
            ) : null}
            {invoice.status === "FINAL" ? <CancelInvoiceButton id={invoice.id} /> : null}
          </div>
        </div>

        {invoice.status === "FINAL" && balance > 0 ? (
          <Card className="bg-amber-50/50 border-amber-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-900">Collect Partial or Pending Payment</p>
                <p className="text-xs text-stone">Record payment received against this invoice balance.</p>
              </div>
              <CollectPaymentForm invoiceId={invoice.id} balance={balance} />
            </div>
          </Card>
        ) : null}
      </div>

      {/* Invoice Printable Document — with theme switcher */}
      <div className="overflow-x-auto max-w-full pb-4">
        <InvoiceThemeSwitcher invoice={invoiceForClient} shop={shopForClient} />
      </div>
    </div>
  );
}
