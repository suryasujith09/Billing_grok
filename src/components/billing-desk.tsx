"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  CATEGORIES,
  MAKING_TYPES,
  METALS,
  PAYMENT_METHODS,
  PURITIES,
  labelize,
} from "@/lib/constants";
import {
  calcInvoice,
  calcExchange,
  calcLine,
  type MakingGstMode,
  type MakingType,
} from "@/lib/invoice-calc";
import { createInvoiceAction, lookupTagAction, searchCustomersAction } from "@/lib/actions";
import { amountInWords, grams, inr, r2 } from "@/lib/money";
import { Button, Card, ErrorBanner, Field, Input, Select, Textarea } from "./ui";

type RateRow = { metal: string; purity: string; ratePerGram: number };

type Line = {
  key: string;
  ornamentId?: string | null;
  tagNo: string;
  description: string;
  hsn: string;
  huid: string;
  metal: string;
  purity: string;
  category: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  ratePerGram: number;
  makingType: MakingType;
  makingValue: number;
  wastagePercent: number;
  stoneCharge: number;
  hallmarkCharge: number;
  otherCharge: number;
};

type StockItem = Omit<Line, "key"> & { ornamentId: string };

type Exchange = {
  key: string;
  description: string;
  metal: string;
  purity: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  dustWeight: number;
  wastageWeight: number;
  ratePerGram: number;
  deductionPercent: number;
};

type Pay = { key: string; method: string; amount: number; reference: string };

type CustomerHit = {
  id: string | null;
  name: string;
  phone: string;
  address: string;
  pan: string;
  gstin: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyLine(rates: RateRow[]): Line {
  const rate22 = rates.find((r) => r.metal === "GOLD" && r.purity === "22K")?.ratePerGram ?? 0;
  return {
    key: uid(),
    ornamentId: null,
    tagNo: "",
    description: "",
    hsn: "7113",
    huid: "",
    metal: "GOLD",
    purity: "22K",
    category: "RING",
    grossWeight: 0,
    stoneWeight: 0,
    netWeight: 0,
    ratePerGram: rate22,
    makingType: "PER_GRAM",
    makingValue: 600,
    wastagePercent: 0,
    stoneCharge: 0,
    hallmarkCharge: 45,
    otherCharge: 0,
  };
}

function emptyExchange(rates: RateRow[]): Exchange {
  const rate22 = rates.find((r) => r.metal === "GOLD" && r.purity === "22K")?.ratePerGram ?? 0;
  return {
    key: uid(),
    description: "Old gold",
    metal: "GOLD",
    purity: "22K",
    quantity: 1,
    grossWeight: 0,
    netWeight: 0,
    dustWeight: 0,
    wastageWeight: 0,
    ratePerGram: rate22,
    deductionPercent: 0,
  };
}

export function BillingDesk({
  rates,
  stockItems,
  stockCount,
  makingGstMode,
  placeOfSupply,
  biller,
}: {
  rates: RateRow[];
  stockItems: StockItem[];
  stockCount: number;
  makingGstMode: MakingGstMode;
  placeOfSupply: string;
  biller: { name: string; code: string; counter: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [stockQuery, setStockQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState(false);
  const customerSearchSequence = useRef(0);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddr, setCustomerAddr] = useState("");
  const [customerPan, setCustomerPan] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Line[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [payments, setPayments] = useState<Pay[]>([
    { key: uid(), method: "UPI", amount: 0, reference: "" },
  ]);

  const computed = useMemo(() => {
    const lines = items.map((item) => ({
      item,
      calc: calcLine(item, makingGstMode),
    }));
    const olds = exchanges.map((ex) => ({
      ...ex,
      ...calcExchange(ex.netWeight, ex.ratePerGram, ex.dustWeight, ex.wastageWeight),
    }));
    const oldGoldValue = r2(olds.reduce((s, ex) => s + ex.finalAmount, 0));
    const paidAmount = r2(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
    const totals = calcInvoice(
      lines.map(({ item, calc }) => ({
        ...calc,
        stoneCharge: item.stoneCharge,
        hallmarkCharge: item.hallmarkCharge,
        otherCharge: item.otherCharge,
      })),
      oldGoldValue,
      paidAmount,
    );
    return { lines, olds, totals };
  }, [items, exchanges, payments, makingGstMode]);

  function patchLine(key: string, patch: Partial<Line>) {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        if (patch.metal || patch.purity) {
          const found = rates.find((r) => r.metal === next.metal && r.purity === next.purity);
          if (found && !patch.ratePerGram) next.ratePerGram = found.ratePerGram;
        }
        if (patch.grossWeight != null || patch.stoneWeight != null) {
          next.netWeight = Math.max(0, r2(next.grossWeight - next.stoneWeight) as number);
          next.netWeight = Number((next.grossWeight - next.stoneWeight).toFixed(3));
        }
        return next;
      }),
    );
  }

  function patchExchange(key: string, patch: Partial<Exchange>) {
    setExchanges((current) => current.map((exchange) =>
      exchange.key === key ? { ...exchange, ...patch } : exchange,
    ));
  }

  async function addByTag(event?: React.FormEvent) {
    if (event) event.preventDefault();
    setError(null);
    const cleanedTag = tag.trim().toUpperCase();
    if (!cleanedTag) return;
    const result = await lookupTagAction(cleanedTag);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (items.some((item) => item.ornamentId && item.ornamentId === result.item.ornamentId)) {
      setError(`Tag ${cleanedTag} is already on this bill.`);
      return;
    }
    setItems((current) => [...current, { key: uid(), ...result.item }]);
    setTag("");
  }

  function addStockItem(stockItem: StockItem) {
    setError(null);
    if (items.some((item) => item.ornamentId === stockItem.ornamentId)) {
      setError(`Tag ${stockItem.tagNo} is already on this bill.`);
      return;
    }
    setItems((current) => [...current, { key: uid(), ...stockItem }]);
    setStockQuery("");
  }

  async function lookupCustomer(value: string) {
    setCustomerQuery(value);
    setCustomerId("");
    setCustomerSearchError(false);
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);
    if (value.trim().length < 2) {
      customerSearchSequence.current += 1;
      setHits([]);
      setSearchingCustomers(false);
      setCustomerSearchError(false);
      return;
    }
    setHits([]);
    setSearchingCustomers(true);
    const sequence = ++customerSearchSequence.current;
    customerSearchTimer.current = setTimeout(async () => {
      try {
        const rows = await searchCustomersAction(value);
        if (sequence !== customerSearchSequence.current) return;
        setHits(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            address: row.address,
            pan: row.pan,
            gstin: row.gstin,
          })),
        );
      } catch {
        if (sequence === customerSearchSequence.current) {
          setHits([]);
          setCustomerSearchError(true);
        }
      } finally {
        if (sequence === customerSearchSequence.current) setSearchingCustomers(false);
      }
    }, 250);
  }

  function pickCustomer(row: CustomerHit) {
    setCustomerId(row.id ?? "");
    setCustomerName(row.name);
    setCustomerPhone(row.phone);
    setCustomerAddr(row.address);
    setCustomerPan(row.pan);
    setCustomerGstin(row.gstin);
    setCustomerQuery(`${row.name} · ${row.phone}`);
    setHits([]);
  }

  function saveBill() {
    setError(null);
    if (!customerName.trim()) {
      setError("Enter the customer name.");
      return;
    }
    if (!items.length) {
      setError("Add at least one ornament or loose item.");
      return;
    }
    const paymentTotal = r2(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    if (paymentTotal > computed.totals.netPayable) {
      setError("Payment amounts exceed the net payable. Adjust the split before saving.");
      return;
    }
    startTransition(async () => {
      const result = await createInvoiceAction({
        customerId: customerId || null,
        customerName,
        customerPhone,
        customerAddr,
        customerPan,
        customerGstin,
        placeOfSupply,
        notes,
        items: items.map(({ key: _key, ...item }) => item),
        exchanges: exchanges
          .filter((ex) => ex.netWeight > 0)
          .map(({ key: _key, ...ex }) => ex),
        payments: payments
          .filter((p) => p.amount > 0)
          .map(({ key: _key, ...p }) => p),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/invoices/${result.id}`);
    });
  }

  const cashPaid = payments
    .filter((p) => p.method === "CASH")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const needsPan = cashPaid > 200000 && !customerPan.trim();

  function splitPaymentEvenly() {
    const totalPaise = Math.max(0, Math.round(computed.totals.netPayable * 100));
    setPayments((current) => {
      const rows = current.length > 1
        ? current
        : [...current, { key: uid(), method: "CASH", amount: 0, reference: "" }];
      const each = Math.floor(totalPaise / rows.length);
      const remainder = totalPaise % rows.length;
      return rows.map((row, index) => ({
        ...row,
        amount: (each + (index === rows.length - 1 ? remainder : 0)) / 100,
      }));
    });
  }

  function fillRemainingPayment() {
    setPayments((current) => {
      if (!current.length) {
        return [{ key: uid(), method: "UPI", amount: computed.totals.netPayable, reference: "" }];
      }
      const target = current[current.length - 1];
      const allocatedElsewhere = current
        .filter((row) => row.key !== target.key)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const remainder = Math.max(0, r2(computed.totals.netPayable - allocatedElsewhere));
      return current.map((row) => row.key === target.key ? { ...row, amount: remainder } : row);
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="border-gold/30 bg-gold/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone">Logged-in biller</p>
          <p className="font-semibold text-ink">{biller.name} <span className="font-mono text-xs text-stone">{biller.code}</span></p>
          {biller.counter && <p className="text-xs text-stone">Counter {biller.counter}</p>}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">Customer</h2>
            {customerId ? (
              <button
                className="text-xs text-stone underline"
                onClick={() => {
                  setCustomerId("");
                  setCustomerQuery("");
                  setHits([]);
                }}
                type="button"
              >
                Clear saved customer
              </button>
            ) : null}
          </div>
          <div className="relative mb-4">
            <Field label="Search existing">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-3 text-stone" size={16} />
                <Input
                  className="pl-9"
                  value={customerQuery}
                  onChange={(e) => lookupCustomer(e.target.value)}
                  placeholder="Name, mobile, or PAN"
                />
              </div>
            </Field>
            {searchingCustomers ? (
              <p className="absolute z-20 mt-1 w-full rounded-md border border-sand bg-white px-3 py-2 text-sm text-stone shadow-lg">
                Searching customers…
              </p>
            ) : null}
            {!searchingCustomers && customerSearchError ? (
              <p className="absolute z-20 mt-1 w-full rounded-md border border-danger/30 bg-white px-3 py-2 text-sm text-danger shadow-lg">
                Could not search customers. Please try again.
              </p>
            ) : null}
            {!searchingCustomers && !customerSearchError && customerQuery.trim().length >= 2 && hits.length === 0 ? (
              <p className="absolute z-20 mt-1 w-full rounded-md border border-sand bg-white px-3 py-2 text-sm text-stone shadow-lg">
                No matching customers found.
              </p>
            ) : null}
            {hits.length ? (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-sand bg-white shadow-lg">
                {hits.map((hit) => (
                  <li key={hit.id ?? `${hit.name}-${hit.phone}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cream"
                      onClick={() => pickCustomer(hit)}
                    >
                      <span>{hit.name}</span>
                      <span className="text-stone">{hit.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </Field>
            <Field label="Mobile">
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <Input value={customerAddr} onChange={(e) => setCustomerAddr(e.target.value)} />
            </Field>
            <Field label="PAN" hint={needsPan ? "PAN is required for cash above ₹2 lakh." : undefined}>
              <Input value={customerPan} onChange={(e) => setCustomerPan(e.target.value.toUpperCase())} />
            </Field>
            <Field label="GSTIN if registered">
              <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())} />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Ornaments</h2>
              <p className="text-xs text-stone">Scan or type a tag number, or add a loose item.</p>
            </div>
            <form className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap gap-2" onSubmit={addByTag}>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                placeholder="TAG NO"
                className="w-full sm:w-36 uppercase"
              />
              <Button type="submit" variant="secondary" size="sm" className="flex-1 sm:flex-none">
                Add tag
              </Button>
              <Button type="button" variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setItems((c) => [...c, emptyLine(rates)])}>
                <Plus size={14} /> Loose item
              </Button>
            </form>
          </div>

          <div className="mb-5 rounded-md border border-sand bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Add from available stock</p>
                <p className="text-xs text-stone">
                  {stockCount} in-stock {stockCount === 1 ? "item" : "items"}.
                  {stockCount > stockItems.length ? ` Showing the newest ${stockItems.length}; use tag lookup above for other items.` : " Newly added inventory appears after refresh."}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.refresh()}>
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={stockQuery}
                onChange={(event) => setStockQuery(event.target.value)}
                placeholder="Search loaded stock by tag or name"
                className="min-w-[220px] flex-1"
              />
              <Select
                aria-label="Choose available stock"
                className="min-w-[220px] flex-1"
                value=""
                onChange={(event) => {
                  const selected = stockItems.find((row) => row.ornamentId === event.target.value);
                  if (selected) addStockItem(selected);
                }}
              >
                <option value="">Choose stock to add…</option>
                {stockItems
                  .filter((row) => {
                    const query = stockQuery.trim().toLowerCase();
                    return !query || `${row.tagNo} ${row.description} ${row.category} ${row.metal}`.toLowerCase().includes(query);
                  })
                  .map((row) => (
                    <option key={row.ornamentId} value={row.ornamentId}>
                      {row.tagNo} · {row.description} · {row.netWeight.toFixed(3)} g
                    </option>
                  ))}
              </Select>
            </div>
            {stockCount === 0 ? (
              <p className="mt-2 text-xs text-stone">No available inventory yet. Add an item in Inventory or use tag lookup.</p>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="rounded-md border border-dashed border-sand px-4 py-8 text-center text-sm text-stone">
              No items yet. Add a stock tag such as SGD-22002, or a loose piece.
            </p>
          ) : (
            <div className="space-y-4">
              {computed.lines.map(({ item, calc }, index) => (
                <div key={item.key} className="rounded-md border border-sand bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {index + 1}. {item.tagNo || "Loose"} · {item.description || "Untitled"}
                    </p>
                    <button
                      type="button"
                      className="text-danger p-1"
                      onClick={() => setItems((c) => c.filter((row) => row.key !== item.key))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Description" className="md:col-span-2">
                      <Input
                        value={item.description}
                        onChange={(e) => patchLine(item.key, { description: e.target.value })}
                      />
                    </Field>
                    <Field label="Category">
                      <Select
                        value={item.category}
                        onChange={(e) => patchLine(item.key, { category: e.target.value })}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {labelize(c)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="HUID">
                      <Input value={item.huid} onChange={(e) => patchLine(item.key, { huid: e.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Metal">
                      <Select
                        value={item.metal}
                        onChange={(e) =>
                          patchLine(item.key, {
                            metal: e.target.value,
                            purity: PURITIES[e.target.value]?.[0] ?? item.purity,
                          })
                        }
                      >
                        {METALS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Purity">
                      <Select value={item.purity} onChange={(e) => patchLine(item.key, { purity: e.target.value })}>
                        {(PURITIES[item.metal] ?? [item.purity]).map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Gross g">
                      <Input
                        type="number"
                        step="0.001"
                        value={item.grossWeight || ""}
                        onChange={(e) => patchLine(item.key, { grossWeight: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Stone g">
                      <Input
                        type="number"
                        step="0.001"
                        value={item.stoneWeight || ""}
                        onChange={(e) => patchLine(item.key, { stoneWeight: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Net g">
                      <Input
                        type="number"
                        step="0.001"
                        value={item.netWeight || ""}
                        onChange={(e) => patchLine(item.key, { netWeight: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Rate / g">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.ratePerGram || ""}
                        onChange={(e) => patchLine(item.key, { ratePerGram: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Making">
                      <Select
                        value={item.makingType}
                        onChange={(e) => patchLine(item.key, { makingType: e.target.value as MakingType })}
                      >
                        {MAKING_TYPES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Making value">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.makingValue || ""}
                        onChange={(e) => patchLine(item.key, { makingValue: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Wastage %">
                      <Input
                        type="number"
                        step="0.1"
                        value={item.wastagePercent || ""}
                        onChange={(e) => patchLine(item.key, { wastagePercent: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Stone ₹">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.stoneCharge || ""}
                        onChange={(e) => patchLine(item.key, { stoneCharge: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Hallmark ₹">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.hallmarkCharge || ""}
                        onChange={(e) => patchLine(item.key, { hallmarkCharge: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone md:grid-cols-6">
                    <span>Gold {inr(calc.goldValue)}</span>
                    <span>Wastage {inr(calc.wastageAmount)}</span>
                    <span>Making {inr(calc.makingAmount)}</span>
                    {item.otherCharge > 0 && <span>Other {inr(item.otherCharge)}</span>}
                    <span>GST {inr(calc.gstTotal)}</span>
                    <span className="font-semibold text-ink">Line {inr(calc.lineTotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Old metal &amp; diamond exchange</h2>
              <p className="text-xs text-stone">Gold and silver are weighed in grams; diamonds are weighed in carats.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setExchanges((c) => [...c, emptyExchange(rates)])}>
              <Plus size={14} /> Add exchange
            </Button>
          </div>
          {exchanges.length === 0 ? (
            <p className="text-sm text-stone">No exchange on this bill.</p>
          ) : (
            <div className="space-y-3">
              {computed.olds.map((ex) => (
                <div key={ex.key} className="rounded-md border border-sand bg-white p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Metal / stone">
                      <Select value={ex.metal} onChange={(event) => {
                        const metal = event.target.value;
                        const purity = metal === "DIAMOND" ? "N/A" : metal === "SILVER" ? "925" : "22K";
                        const rate = rates.find((row) => row.metal === metal && row.purity === purity)?.ratePerGram ?? 0;
                        const description = /^old (gold|silver|diamond|platinum)$/i.test(ex.description)
                          ? `Old ${metal.toLowerCase()}`
                          : ex.description;
                        patchExchange(ex.key, { metal, purity, ratePerGram: rate, description });
                      }}>
                        <option value="GOLD">Gold</option><option value="SILVER">Silver</option><option value="DIAMOND">Diamond</option><option value="PLATINUM">Platinum</option>
                      </Select>
                    </Field>
                    <Field label={ex.metal === "DIAMOND" ? "Type" : "Purity"}>
                      {ex.metal === "DIAMOND" ? <Input value={ex.purity} onChange={(event) => patchExchange(ex.key, { purity: event.target.value })} /> : (
                        <Select value={ex.purity} onChange={(event) => patchExchange(ex.key, { purity: event.target.value })}>
                          {(PURITIES[ex.metal] ?? ["N/A"]).map((purity) => <option key={purity}>{purity}</option>)}
                        </Select>
                      )}
                    </Field>
                    <Field label="Particulars"><Input value={ex.description} onChange={(event) => patchExchange(ex.key, { description: event.target.value })} /></Field>
                    <Field label="Quantity"><Input type="number" min="1" step="1" value={ex.quantity} onChange={(event) => patchExchange(ex.key, { quantity: Number(event.target.value) })} /></Field>
                    <Field label={`Gross wt (${ex.metal === "DIAMOND" ? "ct" : "g"})`}><Input type="number" min="0" step="0.001" value={ex.grossWeight || ""} onChange={(event) => patchExchange(ex.key, { grossWeight: Number(event.target.value) })} /></Field>
                    <Field label={`Net wt (${ex.metal === "DIAMOND" ? "ct" : "g"})`}><Input type="number" min="0.001" step="0.001" value={ex.netWeight || ""} onChange={(event) => patchExchange(ex.key, { netWeight: Number(event.target.value) })} /></Field>
                    <Field label={`Rate / ${ex.metal === "DIAMOND" ? "ct" : "g"}`}><Input type="number" min="0.01" step="0.01" value={ex.ratePerGram || ""} onChange={(event) => patchExchange(ex.key, { ratePerGram: Number(event.target.value) })} /></Field>
                    <Field label="Dust wt"><Input type="number" min="0" max={ex.netWeight} step="0.001" value={ex.dustWeight || ""} onChange={(event) => patchExchange(ex.key, { dustWeight: Number(event.target.value) })} /></Field>
                    <Field label="Wastage wt"><Input type="number" min="0" max={Math.max(0, ex.netWeight - ex.dustWeight)} step="0.001" value={ex.wastageWeight || ""} onChange={(event) => patchExchange(ex.key, { wastageWeight: Number(event.target.value) })} /></Field>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-sand pt-3 text-xs">
                    <span>Amount <strong>{inr(ex.amount)}</strong></span>
                    <span>Final net wt <strong>{ex.finalNetWeight.toFixed(3)} {ex.metal === "DIAMOND" ? "ct" : "g"}</strong></span>
                    <span className="text-ink">Final amount <strong>{inr(ex.finalAmount)}</strong></span>
                    <button type="button" className="ml-auto text-danger" aria-label="Remove exchange" onClick={() => setExchanges((current) => current.filter((row) => row.key !== ex.key))}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <h2 className="font-display text-xl">Bill total</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Gold value" value={inr(computed.totals.goldValue)} />
            <Row label="Wastage" value={inr(computed.totals.wastageAmount)} />
            <Row label="Making" value={inr(computed.totals.makingAmount)} />
            <Row label="Stones / hallmark" value={inr(computed.totals.stoneAmount + computed.totals.hallmarkAmount)} />
            <Row label="Taxable @ 3%" value={inr(computed.totals.taxable3)} />
            <Row label="CGST 1.5%" value={inr(computed.totals.cgst3)} />
            <Row label="SGST 1.5%" value={inr(computed.totals.sgst3)} />
            {computed.totals.taxable5 > 0 ? (
              <>
                <Row label="Taxable @ 5%" value={inr(computed.totals.taxable5)} />
                <Row label="CGST 2.5%" value={inr(computed.totals.cgst5)} />
                <Row label="SGST 2.5%" value={inr(computed.totals.sgst5)} />
              </>
            ) : null}
            <Row label="Round off" value={inr(computed.totals.roundOff)} />
            <Row label="Invoice value" value={inr(computed.totals.grandTotal)} strong />
            <Row label="Less exchange credit" value={inr(computed.totals.oldGoldValue)} />
            <Row label="Net payable" value={inr(computed.totals.netPayable)} strong />
            <Row label="Received" value={inr(computed.totals.paidAmount)} />
            <Row
              label="Balance"
              value={inr(computed.totals.balanceAmount)}
              strong={computed.totals.balanceAmount > 0}
            />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-stone">{amountInWords(computed.totals.netPayable)}</p>
          <p className="mt-2 text-[11px] text-stone">
            GST mode: {makingGstMode === "SEPARATE_5" ? "3% gold + 5% making" : "3% on full value"}
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Payment</h2>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPayments((current) => [...current, { key: uid(), method: "CASH", amount: 0, reference: "" }])}>
                Add method
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={splitPaymentEvenly}>
                Split equally
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {payments.map((pay) => (
              <div key={pay.key} className="grid grid-cols-1 sm:grid-cols-7 gap-2 border-b border-sand/30 pb-2 sm:border-0 sm:pb-0">
                <Select
                  className="sm:col-span-2"
                  value={pay.method}
                  onChange={(e) =>
                    setPayments((c) => c.map((row) => (row.key === pay.key ? { ...row, method: e.target.value } : row)))
                  }
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
                <Input
                  className="sm:col-span-2"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={pay.amount || ""}
                  onChange={(e) =>
                    setPayments((c) =>
                      c.map((row) => (row.key === pay.key ? { ...row, amount: Number(e.target.value) } : row)),
                    )
                  }
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="Ref"
                  value={pay.reference}
                  onChange={(e) =>
                    setPayments((c) =>
                      c.map((row) => (row.key === pay.key ? { ...row, reference: e.target.value } : row)),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Remove payment method"
                  className="inline-flex min-h-10 items-center justify-center rounded-md text-danger hover:bg-danger/10"
                  onClick={() => setPayments((current) => current.filter((row) => row.key !== pay.key))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fillRemainingPayment}
            >
              Fill remaining balance
            </Button>
            {computed.totals.paidAmount > computed.totals.netPayable ? (
              <p className="text-xs font-medium text-danger">
                Allocated {inr(computed.totals.paidAmount)} is over the net payable by {inr(computed.totals.paidAmount - computed.totals.netPayable)}.
              </p>
            ) : (
              <p className="text-xs text-stone">
                Allocated: {inr(computed.totals.paidAmount)} · Remaining: {inr(r2(computed.totals.netPayable - computed.totals.paidAmount))}
              </p>
            )}
          </div>
          <Field label="Notes" className="mt-4">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
          <ErrorBanner message={error} />
          {needsPan ? (
            <p className="mt-3 text-xs text-warn">Collect PAN before taking more than ₹2,00,000 in cash.</p>
          ) : null}
          <Button className="mt-4 w-full" disabled={pending} onClick={saveBill}>
            {pending ? "Saving bill…" : "Save tax invoice"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-stone">{label}</dt>
      <dd className={strong ? "font-semibold tabular" : "tabular"}>{value}</dd>
    </div>
  );
}
