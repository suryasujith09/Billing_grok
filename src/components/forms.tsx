"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  CATEGORIES,
  INDIAN_STATES,
  MAKING_GST_MODES,
  MAKING_TYPES,
  METALS,
  PAYMENT_METHODS,
  PURITIES,
  labelize,
} from "@/lib/constants";
import {
  addPaymentAction,
  cancelInvoiceAction,
  saveCustomerAction,
  saveOrnamentAction,
  saveRatesAction,
  saveShopAction,
  type ActionState,
} from "@/lib/actions";
import { Button, ErrorBanner, Field, Input, Select, SuccessBanner, Textarea } from "./ui";

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}

import { useState } from "react";
import { Image as ImageIcon, Printer } from "lucide-react";

export function PrintDownloadButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => window.print()}
    >
      <Printer size={16} />
      Print / Save as PDF
    </Button>
  );
}

export function ShopForm({
  shop,
}: {
  shop: {
    name: string;
    logoUrl?: string;
    legalName: string;
    address: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
    bankName: string;
    bankAccount: string;
    ifsc: string;
    invoicePrefix: string;
    makingGstMode: string;
    terms: string;
  };
}) {
  const [state, action] = useActionState(saveShopAction, null);
  const [logo, setLogo] = useState(shop.logoUrl || "");

  return (
    <form action={action} className="space-y-6">
      {/* Logo Branding Section */}
      <div className="rounded-lg border border-sand bg-cream/40 p-4">
        <div className="flex items-center gap-2 mb-2 text-wine font-semibold">
          <ImageIcon size={18} />
          <h3 className="font-display text-base">Jewellery House Logo</h3>
        </div>
        <p className="text-xs text-stone mb-3">
          Provide an image URL or choose a preset logo to display on official Tax Invoices.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 w-full space-y-3">
            <input type="hidden" name="logoUrl" value={logo} />
            <Field label="Upload Image File">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setLogo(String(event.target.result));
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-xs text-stone file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-wine file:text-cream hover:file:bg-wine-deep cursor-pointer"
              />
            </Field>

            <Field label="Or Image Web URL">
              <Input
                value={logo.startsWith("data:") ? "[Uploaded local file image]" : logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </Field>

            <div className="flex flex-wrap gap-2 text-xs pt-1">
              <span className="text-stone font-medium">Sample Logos:</span>
              <button
                type="button"
                className="text-wine underline hover:text-ink font-mono text-[11px]"
                onClick={() => setLogo("https://images.unsplash.com/photo-1611591475143-be232935ee37?w=150&auto=format&fit=crop&q=80")}
              >
                Gold Crest Emblem
              </button>
              <button
                type="button"
                className="text-wine underline hover:text-ink font-mono text-[11px]"
                onClick={() => setLogo("https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=150&auto=format&fit=crop&q=80")}
              >
                Diamond Crown
              </button>
              {logo ? (
                <button
                  type="button"
                  className="text-danger underline hover:text-red-700 font-mono text-[11px] ml-auto"
                  onClick={() => setLogo("")}
                >
                  Clear logo
                </button>
              ) : null}
            </div>
          </div>

          {/* Logo Preview Card */}
          <div className="w-full sm:w-48 shrink-0 flex flex-col items-center justify-center rounded-md border border-dashed border-sand bg-white p-3 min-h-[90px]">
            {logo ? (
              <img
                src={logo}
                alt="Shop Logo Preview"
                className="max-h-16 max-w-full object-contain"
                onError={() => {}}
              />
            ) : (
              <div className="text-center text-stone">
                <ImageIcon size={24} className="mx-auto mb-1 opacity-40" />
                <span className="text-[11px]">No logo set</span>
              </div>
            )}
            <span className="text-[10px] text-stone tracking-wider uppercase mt-1">Invoice Preview</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Shop name">
          <Input name="name" defaultValue={shop.name} required />
        </Field>
        <Field label="Legal name">
          <Input name="legalName" defaultValue={shop.legalName} />
        </Field>
        <Field label="Address" className="md:col-span-2">
          <Input name="address" defaultValue={shop.address} />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={shop.city} />
        </Field>
        <Field label="State">
          <Select name="state" defaultValue={shop.state}>
            <option value="">Select</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="State code">
          <Input name="stateCode" defaultValue={shop.stateCode} />
        </Field>
        <Field label="PIN">
          <Input name="pincode" defaultValue={shop.pincode} />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={shop.phone} />
        </Field>
        <Field label="Email">
          <Input name="email" defaultValue={shop.email} />
        </Field>
        <Field label="GSTIN">
          <Input name="gstin" defaultValue={shop.gstin} />
        </Field>
        <Field label="PAN">
          <Input name="pan" defaultValue={shop.pan} />
        </Field>
        <Field label="Invoice prefix">
          <Input name="invoicePrefix" defaultValue={shop.invoicePrefix} />
        </Field>
        <Field label="GST on making">
          <Select name="makingGstMode" defaultValue={shop.makingGstMode}>
            {MAKING_GST_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bank">
          <Input name="bankName" defaultValue={shop.bankName} />
        </Field>
        <Field label="Account">
          <Input name="bankAccount" defaultValue={shop.bankAccount} />
        </Field>
        <Field label="IFSC">
          <Input name="ifsc" defaultValue={shop.ifsc} />
        </Field>
        <Field label="Invoice terms" className="md:col-span-2">
          <Textarea name="terms" defaultValue={shop.terms} />
        </Field>
      </div>
      {state?.ok === false ? <ErrorBanner message={state.error} /> : null}
      {state?.ok ? <SuccessBanner message="Shop details saved." /> : null}
      <Submit>Save shop</Submit>
    </form>
  );
}

export function RateForm({
  rates,
}: {
  rates: Array<{ metal: string; purity: string; ratePerGram: number }>;
}) {
  const [state, action] = useActionState(saveRatesAction, null);
  const keys = [
    "GOLD:24K",
    "GOLD:22K",
    "GOLD:18K",
    "GOLD:14K",
    "SILVER:999",
    "SILVER:925",
    "PLATINUM:950",
  ];
  return (
    <form action={action} className="space-y-4" id="rates">
      <div className="grid gap-3 md:grid-cols-2">
        {keys.map((key) => {
          const [metal, purity] = key.split(":");
          const current = rates.find((r) => r.metal === metal && r.purity === purity);
          return (
            <Field key={key} label={`${metal} ${purity} ₹/g`}>
              <input type="hidden" name="rateKey" value={key} />
              <Input
                name="rateValue"
                type="number"
                step="0.01"
                defaultValue={current?.ratePerGram ?? 0}
                required
              />
            </Field>
          );
        })}
      </div>
      {state?.ok === false ? <ErrorBanner message={state.error} /> : null}
      {state?.ok ? <SuccessBanner message="Rates updated for today." /> : null}
      <Submit>Update rates</Submit>
    </form>
  );
}

export function CustomerForm({
  customer,
}: {
  customer?: {
    id: string;
    name: string;
    phone: string;
    altPhone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    pan: string;
    gstin: string;
    notes: string;
  };
}) {
  const [state, action] = useActionState(saveCustomerAction, null);
  return (
    <form action={action} className="space-y-4">
      {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={customer?.name} required />
        </Field>
        <Field label="Mobile">
          <Input name="phone" defaultValue={customer?.phone} required />
        </Field>
        <Field label="Alt phone">
          <Input name="altPhone" defaultValue={customer?.altPhone} />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={customer?.city} />
        </Field>
        <Field label="Address" className="md:col-span-2">
          <Input name="address" defaultValue={customer?.address} />
        </Field>
        <Field label="State">
          <Input name="state" defaultValue={customer?.state} />
        </Field>
        <Field label="PIN">
          <Input name="pincode" defaultValue={customer?.pincode} />
        </Field>
        <Field label="PAN">
          <Input name="pan" defaultValue={customer?.pan} />
        </Field>
        <Field label="GSTIN">
          <Input name="gstin" defaultValue={customer?.gstin} />
        </Field>
        <Field label="Notes" className="md:col-span-2">
          <Textarea name="notes" defaultValue={customer?.notes} />
        </Field>
      </div>
      {state?.ok === false ? <ErrorBanner message={state.error} /> : null}
      <Submit>{customer ? "Save customer" : "Add customer"}</Submit>
    </form>
  );
}

export function OrnamentForm({
  item,
}: {
  item?: {
    id: string;
    tagNo: string;
    name: string;
    category: string;
    metal: string;
    purity: string;
    huid: string;
    hsn: string;
    grossWeight: number;
    stoneWeight: number;
    netWeight: number;
    makingType: string;
    makingValue: number;
    wastagePercent: number;
    stoneCharge: number;
    hallmarkCharge: number;
    otherCharge: number;
    costPrice: number | null;
    notes: string;
  };
}) {
  const [state, action] = useActionState(saveOrnamentAction, null);
  return (
    <form action={action} className="space-y-4">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Tag no">
          <Input name="tagNo" defaultValue={item?.tagNo} required className="uppercase" />
        </Field>
        <Field label="Name">
          <Input name="name" defaultValue={item?.name} required />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={item?.category ?? "RING"}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelize(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Metal">
          <Select name="metal" defaultValue={item?.metal ?? "GOLD"}>
            {METALS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Purity">
          <Select name="purity" defaultValue={item?.purity ?? "22K"}>
            {Object.values(PURITIES)
              .flat()
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((p) => (
                <option key={p}>{p}</option>
              ))}
          </Select>
        </Field>
        <Field label="HUID">
          <Input name="huid" defaultValue={item?.huid} />
        </Field>
        <Field label="Gross g">
          <Input name="grossWeight" type="number" step="0.001" defaultValue={item?.grossWeight} required />
        </Field>
        <Field label="Stone g">
          <Input name="stoneWeight" type="number" step="0.001" defaultValue={item?.stoneWeight ?? 0} />
        </Field>
        <Field label="Net g">
          <Input name="netWeight" type="number" step="0.001" defaultValue={item?.netWeight} required />
        </Field>
        <Field label="Making type">
          <Select name="makingType" defaultValue={item?.makingType ?? "PER_GRAM"}>
            {MAKING_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Making value">
          <Input name="makingValue" type="number" step="0.01" defaultValue={item?.makingValue ?? 0} />
        </Field>
        <Field label="Wastage %">
          <Input name="wastagePercent" type="number" step="0.1" defaultValue={item?.wastagePercent ?? 0} />
        </Field>
        <Field label="Stone charge">
          <Input name="stoneCharge" type="number" step="0.01" defaultValue={item?.stoneCharge ?? 0} />
        </Field>
        <Field label="Hallmark">
          <Input name="hallmarkCharge" type="number" step="0.01" defaultValue={item?.hallmarkCharge ?? 45} />
        </Field>
        <Field label="Other charge">
          <Input name="otherCharge" type="number" step="0.01" defaultValue={item?.otherCharge ?? 0} />
        </Field>
        <Field label="Cost price">
          <Input name="costPrice" type="number" step="0.01" defaultValue={item?.costPrice ?? ""} />
        </Field>
        <Field label="HSN">
          <Input name="hsn" defaultValue={item?.hsn ?? "7113"} />
        </Field>
        <Field label="Notes" className="md:col-span-3">
          <Textarea name="notes" defaultValue={item?.notes} />
        </Field>
      </div>
      {state?.ok === false ? <ErrorBanner message={state.error} /> : null}
      <Submit>{item ? "Save ornament" : "Add to stock"}</Submit>
    </form>
  );
}

export function CancelInvoiceButton({ id }: { id: string }) {
  const [pending, setPending] = usePendingFlag();
  return (
    <Button
      type="button"
      variant="danger"
      onClick={async () => {
        if (!confirm("Cancel this tax invoice and return tagged items to stock?")) return;
        setPending(true);
        const result = await cancelInvoiceAction(id);
        setPending(false);
        if (!result.ok) alert(result.error);
        else window.location.reload();
      }}
      disabled={pending}
    >
      {pending ? "Cancelling…" : "Cancel invoice"}
    </Button>
  );
}

function usePendingFlag() {
  const { useState } = require("react") as typeof import("react");
  return useState(false);
}

export function CollectPaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  return (
    <form
      className="flex flex-wrap gap-2"
      action={async (formData) => {
        const method = String(formData.get("method") ?? "CASH");
        const amount = Number(formData.get("amount") ?? 0);
        const reference = String(formData.get("reference") ?? "");
        const result = await addPaymentAction(invoiceId, method, amount, reference);
        if (!result.ok) alert(result.error);
      }}
    >
      <Select name="method" defaultValue="UPI" className="w-36">
        {PAYMENT_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      <Input name="amount" type="number" step="0.01" defaultValue={balance} className="w-36" />
      <Input name="reference" placeholder="Reference" className="w-40" />
      <Button type="submit" size="sm">
        Collect
      </Button>
    </form>
  );
}
