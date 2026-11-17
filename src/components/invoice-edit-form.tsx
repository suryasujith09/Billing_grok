"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { updateInvoiceAction } from "@/lib/actions";
import { Button, Card, ErrorBanner, Field, Input, Textarea } from "@/components/ui";
import type { DiscountMode } from "@/lib/invoice-calc";
import { DEFAULT_HSN_CODES, HSN_CODE_STORAGE_KEY, type HsnCode } from "@/lib/hsn-codes";

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
  manualWastageAmount: string;
  stoneCharge: string;
  hallmarkCharge: string;
  otherCharge: string;
  pricingMode: "CALCULATED" | "MRP" | "MANUAL";
  finalPrice: string;
  discountPercent: string;
  discountAmount: string;
  discountMode: DiscountMode;
};

type InvoiceEditDraft = {
  id: string;
  invoiceNo: string;
  invoiceType: "GST" | "BILL_OF_SUPPLY";
  billOfSupplyReason: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddr: string;
  customerPan: string;
  customerGstin: string;
  placeOfSupply: string;
  notes: string;
  mrpTotal: string;
  discountPercent: string;
  discountAmount: string;
  discountMode: DiscountMode;
  finalInvoiceTotal: string;
  items: EditLine[];
  exchanges: Array<Record<string, unknown>>;
  payments: Array<{ method: string; amount: string; reference: string }>;
};

export function InvoiceEditForm({ invoice }: { invoice: InvoiceEditDraft }) {
  const [draft, setDraft] = useState(invoice);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([...DEFAULT_HSN_CODES]);

  function loadSavedHsnCodes() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(HSN_CODE_STORAGE_KEY) ?? "[]") as unknown;
      if (!Array.isArray(stored)) return;
      const custom = stored.filter((entry): entry is HsnCode =>
        typeof entry === "object" && entry !== null &&
        "code" in entry && typeof entry.code === "string" && entry.code.trim() !== "" &&
        "description" in entry && typeof entry.description === "string",
      );
      setHsnCodes([...DEFAULT_HSN_CODES, ...custom.filter((entry) => !DEFAULT_HSN_CODES.some((defaultCode) => defaultCode.code === entry.code))]);
    } catch {
      // Keep the built-in codes if local storage is unavailable or malformed.
    }
  }

  function rememberHsnCode(rawCode: string) {
    const code = rawCode.trim();
    if (!code || hsnCodes.some((entry) => entry.code.toLocaleLowerCase() === code.toLocaleLowerCase())) return;
    const updated = [...hsnCodes, { code, description: "Custom HSN code" }];
    setHsnCodes(updated);
    try {
      window.localStorage.setItem(HSN_CODE_STORAGE_KEY, JSON.stringify(updated.filter((entry) => !DEFAULT_HSN_CODES.some((defaultCode) => defaultCode.code === entry.code))));
    } catch {
      // The code remains available while editing if local storage is unavailable.
    }
  }

  function update<K extends keyof InvoiceEditDraft>(key: K, next: InvoiceEditDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: next,
      ...(key === "mrpTotal" ? { finalInvoiceTotal: "" } : {}),
    }));
  }

  function updateLine(index: number, key: keyof EditLine, next: string) {
    setDraft((current) => ({
      ...current,
      finalInvoiceTotal: "",
      items: current.items.map((item, i) => i === index ? { ...item, [key]: next } : item),
    }));
  }

  function save() {
    setError("");
    if (!draft.invoiceNo.trim()) {
      setError("Enter an invoice number.");
      return;
    }
    const missingHsnIndex = draft.items.findIndex((item) => !item.hsn.trim());
    if (missingHsnIndex !== -1) {
      setError(`Enter an HSN code for item ${missingHsnIndex + 1}.`);
      return;
    }
    if (draft.invoiceNo.length > 16 || !/^[A-Za-z0-9/-]+$/.test(draft.invoiceNo.trim())) {
      setError("Invoice number can use letters, numbers, slash, or hyphen, up to 16 characters.");
      return;
    }
    startTransition(async () => {
      const result = await updateInvoiceAction(draft.id, {
        ...draft,
        mrpTotal: Number(draft.mrpTotal),
        finalInvoiceTotal: draft.finalInvoiceTotal.trim() ? Number(draft.finalInvoiceTotal) : null,
        items: draft.items.map((item) => ({
          ...item,
          grossWeight: Number(item.grossWeight),
          stoneWeight: Number(item.stoneWeight),
          netWeight: Number(item.netWeight),
          ratePerGram: Number(item.ratePerGram),
          makingValue: Number(item.makingValue),
          wastagePercent: Number(item.wastagePercent),
          manualWastageAmount: item.manualWastageAmount.trim() ? Number(item.manualWastageAmount) : null,
          stoneCharge: Number(item.stoneCharge),
          hallmarkCharge: Number(item.hallmarkCharge),
          otherCharge: Number(item.otherCharge),
          finalPrice: item.finalPrice ? Number(item.finalPrice) : null,
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
      <datalist id="invoice-edit-hsn-codes">
        {hsnCodes.map((entry) => <option key={entry.code} value={entry.code} label={entry.description} />)}
      </datalist>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-stone">Admin invoice editor</p><h1 className="font-display text-2xl text-ink">{draft.invoiceNo}</h1></div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push(`/invoices/${draft.id}`)}><ArrowLeft size={16} /> Cancel</Button>
          <Button onClick={save} disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <h2 className="mb-4 font-display text-lg">Customer and invoice details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Invoice number" hint="Must be unique and 16 characters or fewer. If changed, the invoice date aligns automatically with neighboring serials.">
            <Input value={draft.invoiceNo} maxLength={16} onChange={(event) => update("invoiceNo", event.target.value)} />
          </Field>
          <Field label="Invoice type">
            <Input value={draft.invoiceType === "GST" ? "GST Tax Invoice" : "Bill of Supply · No GST"} readOnly />
          </Field>
          {draft.invoiceType === "BILL_OF_SUPPLY" ? <Field label="Reason for no GST"><Input value={draft.billOfSupplyReason} onChange={(event) => update("billOfSupplyReason", event.target.value)} /></Field> : null}
          {textField("Customer name", "customerName")}
          {textField("Phone", "customerPhone")}
          {textField("Address", "customerAddr")}
          {textField("PAN", "customerPan")}
          {textField("GSTIN", "customerGstin")}
          {textField("Place of supply", "placeOfSupply")}
          <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
            <Textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
          <Field label="MRP total">
            <Input type="number" min="0" step="0.01" value={draft.mrpTotal} onChange={(event) => update("mrpTotal", event.target.value)} />
          </Field>
          <Field label="Bill discount %">
            <Input type="number" min="0" max="100" step="0.01" value={draft.discountPercent} onChange={(event) => setDraft((current) => ({ ...current, discountPercent: event.target.value, discountMode: "PERCENT", finalInvoiceTotal: "" }))} />
          </Field>
          <Field label="Bill discount amount ₹">
            <Input type="number" min="0" step="0.01" value={draft.discountAmount} onChange={(event) => setDraft((current) => ({ ...current, discountAmount: event.target.value, discountMode: "AMOUNT", finalInvoiceTotal: "" }))} />
          </Field>
          <Field label="Invoice total override (optional)" hint="Leave blank to recalculate from discounts and GST. The payable total cannot be lower than payments already collected.">
            <Input type="number" min="0" step="0.01" value={draft.finalInvoiceTotal} onChange={(event) => update("finalInvoiceTotal", event.target.value)} />
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
            <Field label="HSN code *" hint="Required. Choose a listed code or type a new code; new codes are saved in this browser for reuse."><Input required list="invoice-edit-hsn-codes" value={item.hsn} onFocus={loadSavedHsnCodes} onChange={(e) => updateLine(index, "hsn", e.target.value)} onBlur={(e) => rememberHsnCode(e.target.value)} /></Field>
            <Field label="HUID"><Input value={item.huid} onChange={(e) => updateLine(index, "huid", e.target.value)} /></Field>
            <Field label="Gross weight (g)"><Input type="number" step="0.001" value={item.grossWeight} onChange={(e) => updateLine(index, "grossWeight", e.target.value)} /></Field>
            <Field label="Stone weight (g)"><Input type="number" step="0.001" value={item.stoneWeight} onChange={(e) => updateLine(index, "stoneWeight", e.target.value)} /></Field>
            <Field label="Net weight (g)"><Input type="number" step="0.001" value={item.netWeight} onChange={(e) => updateLine(index, "netWeight", e.target.value)} /></Field>
            <Field label="Rate per gram"><Input type="number" step="0.01" value={item.ratePerGram} onChange={(e) => updateLine(index, "ratePerGram", e.target.value)} /></Field>
            <Field label="Making type"><select className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm" value={item.makingType} onChange={(e) => updateLine(index, "makingType", e.target.value)}><option value="PER_GRAM">Per gram</option><option value="PERCENT">Percent of gold</option><option value="FLAT">Flat amount</option></select></Field>
            <Field label={item.makingType === "PERCENT" ? "Making percentage (0–30%)" : "Making value"}><Input type="number" min="0" max={item.makingType === "PERCENT" ? 30 : undefined} step="0.01" value={item.makingValue} onChange={(e) => updateLine(index, "makingValue", e.target.value)} /></Field>
            {item.makingType === "FLAT" || item.pricingMode === "MANUAL" ? (
              <Field label="VA amount ₹" hint="Enter value addition manually for flat pricing."><Input type="number" min="0" step="0.01" value={item.manualWastageAmount} onChange={(e) => updateLine(index, "manualWastageAmount", e.target.value)} /></Field>
            ) : (
              <Field label="VA / Wastage (0–30%)"><Input type="number" min="0" max="30" step="0.01" value={item.wastagePercent} onChange={(e) => updateLine(index, "wastagePercent", e.target.value)} /></Field>
            )}
            <Field label="Stone charge"><Input type="number" step="0.01" value={item.stoneCharge} onChange={(e) => updateLine(index, "stoneCharge", e.target.value)} /></Field>
            <Field label="Hallmark charge"><Input type="number" step="0.01" value={item.hallmarkCharge} onChange={(e) => updateLine(index, "hallmarkCharge", e.target.value)} /></Field>
            <Field label="Other charge"><Input type="number" step="0.01" value={item.otherCharge} onChange={(e) => updateLine(index, "otherCharge", e.target.value)} /></Field>
            <Field label="Discount %" hint="Deducted after GST from this item total."><Input type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={(event) => setDraft((current) => ({ ...current, finalInvoiceTotal: "", items: current.items.map((row, i) => i === index ? { ...row, discountPercent: event.target.value, discountMode: "PERCENT" } : row) }))} /></Field>
            <Field label="Discount amount ₹"><Input type="number" min="0" step="0.01" value={item.discountAmount} onChange={(event) => setDraft((current) => ({ ...current, finalInvoiceTotal: "", items: current.items.map((row, i) => i === index ? { ...row, discountAmount: event.target.value, discountMode: "AMOUNT" } : row) }))} /></Field>
            <Field label="Price method"><select className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm" value={item.pricingMode} onChange={(e) => updateLine(index, "pricingMode", e.target.value as EditLine["pricingMode"])}><option value="CALCULATED">Per-gram calculated</option><option value="MRP">MRP-based selling</option><option value="MANUAL">Flat amount (manual)</option></select></Field>
            {item.pricingMode !== "CALCULATED" ? <Field label={item.pricingMode === "MRP" ? "MRP (before GST)" : "Flat selling amount"} hint={item.pricingMode === "MRP" ? "3% GST is added, then the item discount is deducted." : "Flat price is posted as entered; discount is deducted after GST."}><Input type="number" min="0" step="0.01" value={item.finalPrice} onChange={(e) => updateLine(index, "finalPrice", e.target.value)} /></Field> : null}
          </div>
        </Card>
      ))}
      <div className="flex justify-end"><Button onClick={save} disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save and recalculate invoice"}</Button></div>
    </div>
  );
}
