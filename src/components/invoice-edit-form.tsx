"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { updateInvoiceAction } from "@/lib/actions";
import { Button, Card, ErrorBanner, Field, Input, Textarea } from "@/components/ui";

type EditLine = {
  ornamentId: string | null;
  tagNo: string;
  description: string;
  hsn: string;
  huid: string;
  metal: string;
  purity: string;
  category: string;
  grossWeight: string;
  stoneWeight: string;
  netWeight: string;
  ratePerGram: string;
  makingType: "PER_GRAM" | "PERCENT" | "FLAT";
  makingValue: string;
  wastagePercent: string;
  stoneCharge: string;
  hallmarkCharge: string;
  otherCharge: string;
};

type InvoiceEditDraft = {
  id: string;
  invoiceNo: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddr: string;
  customerPan: string;
  customerGstin: string;
  placeOfSupply: string;
  notes: string;
  items: EditLine[];
  exchanges: Array<Record<string, unknown>>;
  payments: Array<{ method: string; amount: string; reference: string }>;
};

export function InvoiceEditForm({ invoice }: { invoice: InvoiceEditDraft }) {
  const [draft, setDraft] = useState(invoice);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function update<K extends keyof InvoiceEditDraft>(key: K, next: InvoiceEditDraft[K]) {
    setDraft((current) => ({ ...current, [key]: next }));
  }

  function updateLine(index: number, key: keyof EditLine, next: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, i) => i === index ? { ...item, [key]: next } : item),
    }));
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await updateInvoiceAction(draft.id, {
        ...draft,
        items: draft.items.map((item) => ({
          ...item,
          grossWeight: Number(item.grossWeight),
          stoneWeight: Number(item.stoneWeight),
          netWeight: Number(item.netWeight),
          ratePerGram: Number(item.ratePerGram),
          makingValue: Number(item.makingValue),
          wastagePercent: Number(item.wastagePercent),
          stoneCharge: Number(item.stoneCharge),
          hallmarkCharge: Number(item.hallmarkCharge),
          otherCharge: Number(item.otherCharge),
        })),
        exchanges: draft.exchanges,
        payments: draft.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/invoices/${draft.id}`);
      router.refresh();
    });
  }

  const textField = (label: string, key: "customerName" | "customerPhone" | "customerAddr" | "customerPan" | "customerGstin" | "placeOfSupply") => (
    <Field label={label} key={key}>
      <Input value={draft[key]} onChange={(event) => update(key, event.target.value)} />
    </Field>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-stone">Admin invoice editor</p><h1 className="font-display text-2xl text-ink">{invoice.invoiceNo}</h1></div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push(`/invoices/${draft.id}`)}><ArrowLeft size={16} /> Cancel</Button>
          <Button onClick={save} disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <h2 className="mb-4 font-display text-lg">Customer and invoice details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {textField("Customer name", "customerName")}
          {textField("Phone", "customerPhone")}
          {textField("Address", "customerAddr")}
          {textField("PAN", "customerPan")}
          {textField("GSTIN", "customerGstin")}
          {textField("Place of supply", "placeOfSupply")}
          <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
            <Textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
        </div>
      </Card>

      {draft.items.map((item, index) => (
        <Card key={`${item.tagNo}-${index}`}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg">Item {index + 1}: {item.tagNo || item.description}</h2>
            <p className="text-xs text-stone">{item.metal} · {item.purity}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Description"><Input value={item.description} onChange={(e) => updateLine(index, "description", e.target.value)} /></Field>
            <Field label="HUID"><Input value={item.huid} onChange={(e) => updateLine(index, "huid", e.target.value)} /></Field>
            <Field label="Gross weight (g)"><Input type="number" step="0.001" value={item.grossWeight} onChange={(e) => updateLine(index, "grossWeight", e.target.value)} /></Field>
            <Field label="Stone weight (g)"><Input type="number" step="0.001" value={item.stoneWeight} onChange={(e) => updateLine(index, "stoneWeight", e.target.value)} /></Field>
            <Field label="Net weight (g)"><Input type="number" step="0.001" value={item.netWeight} onChange={(e) => updateLine(index, "netWeight", e.target.value)} /></Field>
            <Field label="Rate per gram"><Input type="number" step="0.01" value={item.ratePerGram} onChange={(e) => updateLine(index, "ratePerGram", e.target.value)} /></Field>
            <Field label="Making type"><select className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm" value={item.makingType} onChange={(e) => updateLine(index, "makingType", e.target.value)}><option value="PER_GRAM">Per gram</option><option value="PERCENT">Percent of gold</option><option value="FLAT">Flat amount</option></select></Field>
            <Field label="Making value"><Input type="number" step="0.01" value={item.makingValue} onChange={(e) => updateLine(index, "makingValue", e.target.value)} /></Field>
            <Field label="Wastage (%)"><Input type="number" step="0.01" value={item.wastagePercent} onChange={(e) => updateLine(index, "wastagePercent", e.target.value)} /></Field>
            <Field label="Stone charge"><Input type="number" step="0.01" value={item.stoneCharge} onChange={(e) => updateLine(index, "stoneCharge", e.target.value)} /></Field>
            <Field label="Hallmark charge"><Input type="number" step="0.01" value={item.hallmarkCharge} onChange={(e) => updateLine(index, "hallmarkCharge", e.target.value)} /></Field>
            <Field label="Other charge"><Input type="number" step="0.01" value={item.otherCharge} onChange={(e) => updateLine(index, "otherCharge", e.target.value)} /></Field>
          </div>
        </Card>
      ))}
      <div className="flex justify-end"><Button onClick={save} disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save and recalculate invoice"}</Button></div>
    </div>
  );
}
