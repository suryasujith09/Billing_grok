import { notFound, redirect } from "next/navigation";
import { getInvoice } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { InvoiceEditForm } from "@/components/invoice-edit-form";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/");

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  if (invoice.status !== "FINAL") redirect(`/invoices/${id}`);

  const serialized = JSON.parse(JSON.stringify(invoice)) as Record<string, unknown>;
  const text = (value: unknown) => String(value ?? "");
  const draft = {
    id: text(serialized.id),
    invoiceNo: text(serialized.invoiceNo),
    customerId: typeof serialized.customerId === "string" ? serialized.customerId : null,
    customerName: text(serialized.customerName),
    customerPhone: text(serialized.customerPhone),
    customerAddr: text(serialized.customerAddr),
    customerPan: text(serialized.customerPan),
    customerGstin: text(serialized.customerGstin),
    placeOfSupply: text(serialized.placeOfSupply),
    notes: text(serialized.notes),
    items: (serialized.items as Array<Record<string, unknown>>).map((item) => ({
      ornamentId: typeof item.ornamentId === "string" ? item.ornamentId : null,
      tagNo: text(item.tagNo), description: text(item.description), hsn: text(item.hsn), huid: text(item.huid),
      metal: text(item.metal), purity: text(item.purity), category: text(item.category),
      grossWeight: text(item.grossWeight), stoneWeight: text(item.stoneWeight), netWeight: text(item.netWeight),
      ratePerGram: text(item.ratePerGram), makingType: text(item.makingType) as "PER_GRAM" | "PERCENT" | "FLAT",
      makingValue: text(item.makingValue), wastagePercent: text(item.wastagePercent), stoneCharge: text(item.stoneCharge),
      hallmarkCharge: text(item.hallmarkCharge), otherCharge: text(item.otherCharge),
    })),
    exchanges: (serialized.exchanges as Array<Record<string, unknown>>).map((exchange) => ({
      description: text(exchange.description), metal: text(exchange.metal), purity: text(exchange.purity),
      quantity: text(exchange.quantity || 1), grossWeight: text(exchange.grossWeight), netWeight: text(exchange.netWeight),
      dustWeight: text(exchange.dustWeight), wastageWeight: text(exchange.wastageWeight), ratePerGram: text(exchange.ratePerGram),
      deductionPercent: text(exchange.deductionPercent),
    })),
    payments: (serialized.payments as Array<Record<string, unknown>>).map((payment) => ({
      method: text(payment.method), amount: text(payment.amount), reference: text(payment.reference),
    })),
  };
  return <InvoiceEditForm invoice={draft} />;
}
