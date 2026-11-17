"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
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
  applyInvoiceTotalOverride,
  applyInvoiceDiscount,
  applyLineDiscount,
  applyMrpBaseOverride,
  calcExchange,
  calcLine,
  applyFinalLinePrice,
  applyMrpLineBase,
  gstModeForMaterial,
  type MakingGstMode,
  type MakingType,
  type DiscountMode,
} from "@/lib/invoice-calc";
import { addAnotherStockUnitAction, createCustomerFromBillingAction, createInvoiceAction, getCustomerPurchaseHistoryAction, getUnusedInvoiceSerialsAction, lookupTagAction, searchAvailableStockAction, searchCustomersAction } from "@/lib/actions";
import { amountInWords, inr, padInvoice, r2 } from "@/lib/money";
import { DEFAULT_HSN_CODES, HSN_CODE_STORAGE_KEY, type HsnCode } from "@/lib/hsn-codes";
import { Button, Card, ErrorBanner, Field, Input, Select, Textarea } from "./ui";

type RateRow = { metal: string; purity: string; ratePerGram: number };

type Line = {
  key: string;
  ornamentId?: string | null;
  tagNo: string;
  productCode?: string;
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
  manualWastageAmount?: number | null;
  stoneCharge: number;
  hallmarkCharge: number;
  otherCharge: number;
  mrp: number | null;
  pricingMode: "CALCULATED" | "MRP" | "MANUAL";
  finalPrice: number | null;
  discountPercent: number;
  discountAmount: number;
  discountMode: DiscountMode;
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

type CustomerPurchaseHistory = {
  invoiceCount: number;
  lifetimeSpend: number;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    date: string;
    netPayable: number;
    balanceAmount: number;
    items: Array<{ description: string; netWeight: number }>;
  }>;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function stockGroupKey(item: Line) {
  if (!item.ornamentId) return `loose:${item.key}`;
  const productCode = item.productCode?.trim().toLocaleLowerCase();
  return productCode
    ? `code:${productCode}`
    : `item:${[item.description, item.category, item.metal, item.purity].map((part) => part.trim().toLocaleLowerCase()).join("|")}`;
}

function emptyLine(rates: RateRow[]): Line {
  const rate22 = rates.find((r) => r.metal === "GOLD" && r.purity === "22K")?.ratePerGram ?? 0;
  return {
    key: uid(),
    ornamentId: null,
    tagNo: "",
    description: "",
    hsn: "",
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
    mrp: null,
    pricingMode: "CALCULATED",
    finalPrice: null,
    discountPercent: 0,
    discountAmount: 0,
    discountMode: "PERCENT",
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

function unDiscountedLine(item: Line, mode: MakingGstMode, includeGst = true) {
  const manualVa = item.makingType === "FLAT" || item.pricingMode === "MANUAL";
  const calculated = calcLine({
    ...item,
    wastageAmountOverride: manualVa ? item.manualWastageAmount ?? 0 : null,
  }, gstModeForMaterial(item.metal, mode), includeGst);
  if (item.pricingMode === "CALCULATED") return calculated;
  if (item.pricingMode === "MRP") return applyMrpLineBase(calculated, Number(item.finalPrice ?? item.mrp ?? 0), includeGst);
  return applyFinalLinePrice(calculated, Number(item.finalPrice ?? 0), includeGst);
}

function pricedLine(item: Line, mode: MakingGstMode, includeGst = true) {
  return applyLineDiscount(
    unDiscountedLine(item, mode, includeGst),
    item.discountPercent,
    item.discountAmount,
    item.discountMode,
  );
}

export function BillingDesk({
  rates,
  stockItems,
  stockCount,
  makingGstMode,
  placeOfSupply,
  biller,
  canManageInvoiceNumbers,
  canOverrideBillerName,
}: {
  rates: RateRow[];
  stockItems: StockItem[];
  stockCount: number;
  makingGstMode: MakingGstMode;
  placeOfSupply: string;
  biller: { name: string; code: string; counter: string };
  canManageInvoiceNumbers: boolean;
  canOverrideBillerName: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagLookupInFlight = useRef(false);
  const scannerIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannerBurst = useRef({ lastKeyAt: 0, fastKeyCount: 0 });
  const [stockQuery, setStockQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [stockSearchResults, setStockSearchResults] = useState<StockItem[] | null>(null);
  const [additionalStockItems, setAdditionalStockItems] = useState<StockItem[]>([]);
  const [stockHasMore, setStockHasMore] = useState(stockCount > stockItems.length);
  const [searchingStock, setSearchingStock] = useState(false);
  const [loadingMoreStock, setLoadingMoreStock] = useState(false);
  const [addingQuantityGroup, setAddingQuantityGroup] = useState<string | null>(null);
  const stockSearchSequence = useRef(0);
  const [customerQuery, setCustomerQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState(false);
  const [customerChosen, setCustomerChosen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerCreateError, setCustomerCreateError] = useState<string | null>(null);
  const customerSearchSequence = useRef(0);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (scannerIdleTimer.current) clearTimeout(scannerIdleTimer.current);
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);
  }, []);
  useEffect(() => {
    const query = stockQuery.trim();
    if (!query) {
      stockSearchSequence.current += 1;
      return;
    }
    const sequence = ++stockSearchSequence.current;
    const timer = setTimeout(async () => {
      try {
        const results = await searchAvailableStockAction(query, stockFilter as "ALL" | "PER_GRAM" | "MRP");
        if (sequence === stockSearchSequence.current) {
          setStockSearchResults(results.items as StockItem[]);
          setStockHasMore(results.hasMore);
        }
      } catch {
        if (sequence === stockSearchSequence.current) {
          setStockSearchResults([]);
          setStockHasMore(false);
        }
      } finally {
        if (sequence === stockSearchSequence.current) setSearchingStock(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [stockQuery, stockFilter]);
  const [customerId, setCustomerId] = useState<string>("");
  const [purchaseHistory, setPurchaseHistory] = useState<CustomerPurchaseHistory | null>(null);
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false);
  const purchaseHistorySequence = useRef(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddr, setCustomerAddr] = useState("");
  const [customerPan, setCustomerPan] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [billerNameOverride, setBillerNameOverride] = useState(biller.name);
  const [invoiceType, setInvoiceType] = useState<"GST" | "BILL_OF_SUPPLY">("GST");
  const [billOfSupplyReason, setBillOfSupplyReason] = useState("");
  const [numberingMode, setNumberingMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [manualInvoiceSerial, setManualInvoiceSerial] = useState("");
  const [unusedInvoiceSerials, setUnusedInvoiceSerials] = useState<number[]>([]);
  const [loadingInvoiceSerials, setLoadingInvoiceSerials] = useState(false);
  const [mrpTotalInput, setMrpTotalInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountInputMode, setDiscountInputMode] = useState<DiscountMode>("PERCENT");
  const [invoiceTotalInput, setInvoiceTotalInput] = useState("");
  const [items, setItems] = useState<Line[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([...DEFAULT_HSN_CODES]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [payments, setPayments] = useState<Pay[]>([
    { key: uid(), method: "UPI", amount: 0, reference: "" },
  ]);

  useEffect(() => {
    if (!canManageInvoiceNumbers || numberingMode !== "MANUAL") {
      return;
    }
    let active = true;
    getUnusedInvoiceSerialsAction(invoiceType)
      .then((serials) => { if (active) setUnusedInvoiceSerials(serials); })
      .catch(() => { if (active) setUnusedInvoiceSerials([]); })
      .finally(() => { if (active) setLoadingInvoiceSerials(false); });
    return () => { active = false; };
  }, [canManageInvoiceNumbers, numberingMode, invoiceType]);

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

  const computed = useMemo(() => {
    const lines = items.map((item) => ({
      item,
      calc: pricedLine(item, makingGstMode, invoiceType === "GST"),
    }));
    const olds = exchanges.map((ex) => ({
      ...ex,
      ...calcExchange(ex.netWeight, ex.ratePerGram, ex.dustWeight, ex.wastageWeight),
    }));
    const oldGoldValue = r2(olds.reduce((s, ex) => s + ex.finalAmount, 0));
    const paidAmount = r2(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
    const calculatedTotals = calcInvoice(
      lines.map(({ item, calc }) => ({
        ...calc,
        stoneCharge: item.stoneCharge,
        hallmarkCharge: item.hallmarkCharge,
        otherCharge: item.otherCharge,
      })),
      oldGoldValue,
      paidAmount,
    );
    const calculatedMrpBase = r2(calculatedTotals.taxable3 + calculatedTotals.taxable5);
    const mrpTotal = mrpTotalInput === ""
      ? calculatedMrpBase
      : Math.max(0, Number(mrpTotalInput) || 0);
    const productDiscountAmount = r2(lines.reduce((sum, row) => sum + row.calc.discountAmount, 0));
    const withMrpBase = applyMrpBaseOverride(calculatedTotals, mrpTotal, invoiceType === "GST", productDiscountAmount);
    const afterDiscount = applyInvoiceDiscount(
      withMrpBase,
      discountInputMode === "PERCENT" ? Number(discountInput) || 0 : 0,
      discountInputMode === "AMOUNT" ? Number(discountInput) || 0 : 0,
      discountInputMode,
    );
    const totals = invoiceTotalInput === ""
      ? afterDiscount
      : applyInvoiceTotalOverride(afterDiscount, Number(invoiceTotalInput) || 0);
    return {
      lines,
      olds,
      totals,
      mrpTotal,
      discountPercent: afterDiscount.discountPercent,
      discountAmount: afterDiscount.discountAmount,
      productDiscountAmount,
    };
  }, [items, exchanges, payments, makingGstMode, mrpTotalInput, discountInput, discountInputMode, invoiceTotalInput, invoiceType]);

  function patchLine(key: string, patch: Partial<Line>) {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        if (patch.metal || patch.purity) {
          const found = rates.find((r) => r.metal === next.metal && r.purity === next.purity);
          if (patch.ratePerGram == null) next.ratePerGram = found?.ratePerGram ?? 0;
        }
        if (patch.netWeight != null) {
          next.netWeight = Number(Math.max(0, next.netWeight).toFixed(3));
          next.grossWeight = Number((next.stoneWeight + next.netWeight).toFixed(3));
        } else if (patch.grossWeight != null || patch.stoneWeight != null || patch.metal != null) {
          next.stoneWeight = Number(Math.max(0, next.stoneWeight).toFixed(3));
          next.grossWeight = Number(Math.max(next.stoneWeight, next.grossWeight).toFixed(3));
          next.netWeight = Number((next.grossWeight - next.stoneWeight).toFixed(3));
        }
        const baseLine = unDiscountedLine(next, makingGstMode, invoiceType === "GST");
        const base = r2(baseLine.lineTotal);
        if (next.discountMode === "AMOUNT") {
          next.discountAmount = r2(Math.min(base, Math.max(0, next.discountAmount)));
          next.discountPercent = base > 0 ? r2(next.discountAmount / base * 100) : 0;
        } else {
          next.discountPercent = Math.min(100, Math.max(0, next.discountPercent));
          next.discountAmount = r2(base * next.discountPercent / 100);
        }
        return next;
      }),
    );
  }

  function rememberHsnCode(rawCode: string) {
    const code = rawCode.trim();
    if (!code || hsnCodes.some((entry) => entry.code.toLocaleLowerCase() === code.toLocaleLowerCase())) return;
    const updated = [...hsnCodes, { code, description: "Custom HSN code" }];
    setHsnCodes(updated);
    try {
      window.localStorage.setItem(HSN_CODE_STORAGE_KEY, JSON.stringify(updated.filter((entry) => !DEFAULT_HSN_CODES.some((defaultCode) => defaultCode.code === entry.code))));
    } catch {
      // The code remains available for this invoice if local storage is unavailable.
    }
  }

  function patchLineDiscount(key: string, discountMode: DiscountMode, rawValue: string) {
    const item = items.find((row) => row.key === key);
    if (!item) return;
    const baseLine = unDiscountedLine(item, makingGstMode, invoiceType === "GST");
    const base = r2(baseLine.lineTotal);
    const value = Math.max(0, Number(rawValue) || 0);
    const discountAmount = r2(Math.min(base, discountMode === "AMOUNT" ? value : base * Math.min(100, value) / 100));
    const discountPercent = base > 0 ? r2(discountAmount / base * 100) : 0;
    patchLine(key, { discountMode, discountAmount, discountPercent });
    setInvoiceTotalInput("");
  }

  function changePricingMode(item: Line, pricingMode: Line["pricingMode"]) {
    const calculated = unDiscountedLine(item, makingGstMode).lineTotal;
    patchLine(item.key, {
      pricingMode,
      finalPrice: pricingMode === "MRP" ? (item.mrp ?? calculated) : pricingMode === "MANUAL" ? calculated : null,
      ...(pricingMode === "MANUAL" ? { manualWastageAmount: item.manualWastageAmount ?? 0 } : {}),
    });
  }

  function patchExchange(key: string, patch: Partial<Exchange>) {
    setExchanges((current) => current.map((exchange) =>
      exchange.key === key ? { ...exchange, ...patch } : exchange,
    ));
  }

  async function addByTag(event?: React.FormEvent) {
    if (event) event.preventDefault();
    if (scannerIdleTimer.current) clearTimeout(scannerIdleTimer.current);
    scannerIdleTimer.current = null;
    if (tagLookupInFlight.current) return;
    setError(null);
    const cleanedTag = tag.trim().toUpperCase();
    if (!cleanedTag) return;
    const cameFromScanner = scannerBurst.current.fastKeyCount >= 3;
    scannerBurst.current = { lastKeyAt: 0, fastKeyCount: 0 };
    tagLookupInFlight.current = true;
    try {
      const result = await lookupTagAction(cleanedTag);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (items.some((item) => item.ornamentId && item.ornamentId === result.item.ornamentId)) {
        setError(`Tag ${cleanedTag} is already on this bill.`);
        return;
      }
      setItems((current) => [...current, {
        key: uid(),
        ...result.item,
        hsn: "",
        pricingMode: result.item.mrp != null && result.item.mrp > 0 ? "MRP" : result.item.pricingMode,
        finalPrice: result.item.mrp != null && result.item.mrp > 0 ? result.item.mrp : result.item.finalPrice,
      }]);
      setTag("");
    } catch {
      setError("Could not look up that tag. Check the connection and scan again.");
    } finally {
      if (cameFromScanner) setTag("");
      tagLookupInFlight.current = false;
      window.setTimeout(() => tagInputRef.current?.focus(), 0);
    }
  }

  function trackScannerKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;
    const now = Date.now();
    scannerBurst.current = {
      lastKeyAt: now,
      fastKeyCount: now - scannerBurst.current.lastKeyAt <= 70
        ? scannerBurst.current.fastKeyCount + 1
        : 1,
    };
  }

  function updateTagInput(value: string) {
    const nextTag = value.toUpperCase();
    setTag(nextTag);
    if (scannerIdleTimer.current) clearTimeout(scannerIdleTimer.current);
    scannerIdleTimer.current = null;
    if (nextTag.trim().length < 3 || scannerBurst.current.fastKeyCount < 3) return;
    scannerIdleTimer.current = setTimeout(() => {
      scannerIdleTimer.current = null;
      void addByTag();
    }, 130);
  }

  function addStockItem(stockItem: StockItem) {
    setError(null);
    if (items.some((item) => item.ornamentId === stockItem.ornamentId)) {
      setError(`Tag ${stockItem.tagNo} is already on this bill.`);
      return;
    }
    setItems((current) => [...current, {
      key: uid(),
      ...stockItem,
      hsn: "",
      pricingMode: stockItem.mrp != null && stockItem.mrp > 0 ? "MRP" : stockItem.pricingMode,
      finalPrice: stockItem.mrp != null && stockItem.mrp > 0 ? stockItem.mrp : stockItem.finalPrice,
    }]);
    setStockQuery("");
    setStockSearchResults(null);
    setStockHasMore(stockCount > stockItems.length);
    setSearchingStock(false);
  }

  async function addStockUnit(item: Line) {
    const groupKey = stockGroupKey(item);
    if (!item.ornamentId || addingQuantityGroup === groupKey) return;
    setError(null);
    setAddingQuantityGroup(groupKey);
    try {
      const result = await addAnotherStockUnitAction({
        productCode: item.productCode,
        description: item.description,
        category: item.category,
        metal: item.metal,
        purity: item.purity,
        excludedIds: items.map((row) => row.ornamentId).filter((id): id is string => Boolean(id)),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.item) {
        setError(`No more available stock matches ${item.productCode || item.description}.`);
        return;
      }
      setItems((current) => {
        if (current.some((row) => row.ornamentId === result.item!.ornamentId)) return current;
        return [...current, {
          key: uid(),
          ...result.item!,
          pricingMode: result.item!.mrp != null && result.item!.mrp > 0 ? "MRP" : result.item!.pricingMode,
          finalPrice: result.item!.mrp != null && result.item!.mrp > 0 ? result.item!.mrp : result.item!.finalPrice,
        }];
      });
    } catch {
      setError("Could not add another stock unit. Please try again.");
    } finally {
      setAddingQuantityGroup(null);
    }
  }

  async function loadMoreStock() {
    if (loadingMoreStock || !stockHasMore) return;
    setLoadingMoreStock(true);
    try {
      const query = stockQuery.trim();
      const offset = query
        ? (stockSearchResults?.length ?? 0)
        : stockItems.length + additionalStockItems.length;
      const results = await searchAvailableStockAction(query, stockFilter as "ALL" | "PER_GRAM" | "MRP", offset);
      if (query) setStockSearchResults((current) => [...(current ?? []), ...(results.items as StockItem[])]);
      else setAdditionalStockItems((current) => [...current, ...(results.items as StockItem[])]);
      setStockHasMore(results.hasMore);
    } catch {
      setError("Could not load more stock. Check the connection and try again.");
    } finally {
      setLoadingMoreStock(false);
    }
  }

  async function lookupCustomer(value: string) {
    setCustomerQuery(value);
    setCustomerName(value);
    setCustomerId("");
    setCustomerChosen(false);
    setCustomerSearchError(false);
    setCustomerCreateError(null);
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
    setCustomerChosen(true);
    setCustomerName(row.name);
    setCustomerPhone(row.phone);
    setCustomerAddr(row.address);
    setCustomerPan(row.pan);
    setCustomerGstin(row.gstin);
    setCustomerQuery(`${row.name} · ${row.phone}`);
    setHits([]);
    setPurchaseHistory(null);
    const sequence = ++purchaseHistorySequence.current;
    if (!row.id) {
      setLoadingPurchaseHistory(false);
      return;
    }
    setLoadingPurchaseHistory(true);
    getCustomerPurchaseHistoryAction(row.id)
      .then((history) => {
        if (sequence === purchaseHistorySequence.current) setPurchaseHistory(history);
      })
      .catch(() => {
        if (sequence === purchaseHistorySequence.current) setPurchaseHistory({ invoiceCount: 0, lifetimeSpend: 0, invoices: [] });
      })
      .finally(() => {
        if (sequence === purchaseHistorySequence.current) setLoadingPurchaseHistory(false);
      });
  }

  async function createCustomerFromBill() {
    setCustomerCreateError(null);
    setCreatingCustomer(true);
    try {
      const result = await createCustomerFromBillingAction({
        name: customerName,
        phone: customerPhone,
        address: customerAddr,
        pan: customerPan,
        gstin: customerGstin,
      });
      if (!result.ok) {
        setCustomerCreateError(result.error);
        return;
      }
      pickCustomer({
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        address: result.customer.address,
        pan: result.customer.pan,
        gstin: result.customer.gstin,
      });
      setCustomerQuery("");
      setCustomerCreateError(null);
    } catch {
      setCustomerCreateError("Could not add the customer. Please try again.");
    } finally {
      setCreatingCustomer(false);
    }
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
    const missingHsnIndex = items.findIndex((item) => !item.hsn.trim());
    if (missingHsnIndex !== -1) {
      setError(`Enter an HSN code for item ${missingHsnIndex + 1}.`);
      return;
    }
    if (invoiceType === "BILL_OF_SUPPLY" && !billOfSupplyReason.trim()) {
      setError("Add the reason for issuing this Bill of Supply.");
      return;
    }
    if (numberingMode === "MANUAL" && (!manualInvoiceSerial || Number(manualInvoiceSerial) < 1)) {
      setError("Enter an unused positive invoice serial number.");
      return;
    }
    const paymentTotal = r2(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    if (paymentTotal > computed.totals.netPayable) {
      setError("Payment amounts exceed the net payable. Adjust the split before saving.");
      return;
    }
    startTransition(async () => {
      const result = await createInvoiceAction({
        invoiceType,
        billerNameOverride: canOverrideBillerName ? billerNameOverride : "",
        billOfSupplyReason,
        manualInvoiceSerial: numberingMode === "MANUAL" ? Number(manualInvoiceSerial) : null,
        customerId: customerId || null,
        customerName,
        customerPhone,
        customerAddr,
        customerPan,
        customerGstin,
        placeOfSupply,
        notes,
        mrpTotal: computed.mrpTotal,
        discountPercent: computed.discountPercent,
        discountAmount: computed.discountAmount,
        discountMode: discountInputMode,
        finalInvoiceTotal: invoiceTotalInput === "" ? null : Number(invoiceTotalInput),
        items: items.map((item) => {
          const payload: Partial<Line> = { ...item };
          delete payload.key;
          return payload;
        }),
        exchanges: exchanges
          .filter((ex) => ex.netWeight > 0)
          .map((exchange) => {
            const payload: Partial<Exchange> = { ...exchange };
            delete payload.key;
            return payload;
          }),
        payments: payments
          .filter((p) => p.amount > 0)
          .map((payment) => {
            const payload: Partial<Pay> = { ...payment };
            delete payload.key;
            return payload;
          }),
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
      <datalist id="invoice-hsn-codes">
        {hsnCodes.map((entry) => <option key={entry.code} value={entry.code} label={entry.description} />)}
      </datalist>
      <div className="space-y-5">
        <Card>
          <h2 className="font-display text-xl">Invoice type and number</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Invoice type">
              <Select value={invoiceType} onChange={(event) => { setInvoiceType(event.target.value as "GST" | "BILL_OF_SUPPLY"); setManualInvoiceSerial(""); setLoadingInvoiceSerials(canManageInvoiceNumbers && numberingMode === "MANUAL"); }}>
                <option value="GST">With GST · Tax Invoice</option>
                <option value="BILL_OF_SUPPLY">Without GST · Bill of Supply</option>
              </Select>
            </Field>
            {canManageInvoiceNumbers ? <Field label="Invoice number">
              <Select value={numberingMode} onChange={(event) => { const nextMode = event.target.value as "AUTO" | "MANUAL"; setNumberingMode(nextMode); setLoadingInvoiceSerials(canManageInvoiceNumbers && nextMode === "MANUAL"); }}>
                <option value="AUTO">Automatic</option>
                <option value="MANUAL">Enter unused serial</option>
              </Select>
            </Field> : <p className="self-end pb-2 text-xs text-stone">Invoice numbers are assigned automatically.</p>}
            {canManageInvoiceNumbers && numberingMode === "MANUAL" ? <div className="sm:col-span-2">
              <Field label={invoiceType === "GST" ? "Enter unused GST invoice serial" : "Enter unused Bill of Supply serial"} hint={`Suggestions are checked in the ${invoiceType === "GST" ? "GST invoice" : "no-GST Bill of Supply"} register only. You can type another number; duplicates in this register are blocked when saving.`}>
                <Input type="number" min="1" max="999999" step="1" value={manualInvoiceSerial} onChange={(event) => setManualInvoiceSerial(event.target.value)} placeholder="Choose or enter a serial" />
              </Field>
              <div className="mt-2 rounded-md border border-sand bg-cream/40 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone">Available unused {invoiceType === "GST" ? "GST" : "no-GST"} serials</p>
                <p className="mb-2 text-xs text-stone">The invoice date is assigned automatically between the neighboring serial dates.</p>
                {loadingInvoiceSerials ? <p className="text-xs text-stone">Checking serials…</p> : unusedInvoiceSerials.length ? <div className="flex flex-wrap gap-2">
                  {unusedInvoiceSerials.map((serial) => <button key={serial} type="button" onClick={() => setManualInvoiceSerial(String(serial))} className={`rounded border px-3 py-1.5 text-xs font-semibold tabular transition ${manualInvoiceSerial === String(serial) ? "border-royal bg-royal text-white" : "border-sand bg-white text-royal hover:border-royal"}`} aria-pressed={manualInvoiceSerial === String(serial)}>{padInvoice(serial)}</button>)}
                </div> : <p className="text-xs text-stone">Couldn’t load the suggestions. Type a serial and it will be checked when you save.</p>}
              </div>
            </div> : null}
            {invoiceType === "BILL_OF_SUPPLY" ? <Field label="Reason for no GST" hint="For eligible exempt or non-taxable supplies." className="sm:col-span-2">
              <Input value={billOfSupplyReason} onChange={(event) => setBillOfSupplyReason(event.target.value)} placeholder="Reason for issuing Bill of Supply" />
            </Field> : null}
          </div>
          <p className="mt-3 text-xs text-stone">GST and Bills of Supply use separate invoice registers and separate number sequences.</p>
          {canOverrideBillerName ? <div className="mt-3 max-w-sm"><Field label="Biller name on invoice" hint="This changes the printed name only; the signed-in administrator remains recorded as the creator.">
            <Input value={billerNameOverride} maxLength={120} onChange={(event) => setBillerNameOverride(event.target.value)} placeholder="Enter biller name" />
          </Field></div> : null}
        </Card>
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
                  purchaseHistorySequence.current += 1;
                  setPurchaseHistory(null);
                  setLoadingPurchaseHistory(false);
                  setCustomerChosen(false);
                  setCustomerQuery("");
                  setHits([]);
                }}
                type="button"
              >
                Clear customer selection
              </button>
            ) : null}
          </div>
          {customerChosen && !customerId ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
              <span className="text-stone">This customer appears on an earlier bill but is not in the customer register yet.</span>
              <Button type="button" variant="secondary" disabled={creatingCustomer || !customerPhone.trim()} onClick={() => void createCustomerFromBill()}>
                {creatingCustomer ? "Adding…" : "Save customer to register"}
              </Button>
              {customerCreateError ? <p className="w-full text-xs text-danger" role="alert">{customerCreateError}</p> : null}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Field label="Name · check existing customer">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-3 text-stone" size={16} />
                  <Input
                    className="pl-9"
                    value={customerName}
                    onChange={(e) => void lookupCustomer(e.target.value)}
                    placeholder="Enter a name to search existing customers"
                    autoComplete="off"
                  />
                </div>
              </Field>
              {!customerChosen && searchingCustomers ? (
                <p className="absolute z-20 mt-1 w-full rounded-md border border-sand bg-white px-3 py-2 text-sm text-stone shadow-lg">
                  Searching existing customers…
                </p>
              ) : null}
              {!customerChosen && !searchingCustomers && customerSearchError ? (
                <p className="absolute z-20 mt-1 w-full rounded-md border border-danger/30 bg-white px-3 py-2 text-sm text-danger shadow-lg">
                  Could not search customers. Please try again before adding a new customer.
                </p>
              ) : null}
              {!customerChosen && !searchingCustomers && !customerSearchError && customerQuery.trim().length >= 2 && hits.length === 0 ? (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-sand bg-white p-3 shadow-lg">
                  <p className="text-sm text-stone">No matching customer found. Add this customer directly to the register.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2"
                    disabled={creatingCustomer || !customerPhone.trim()}
                    onClick={() => void createCustomerFromBill()}
                  >
                    {creatingCustomer ? "Adding customer…" : "Add and use customer"}
                  </Button>
                  {!customerPhone.trim() ? <p className="mt-1 text-xs text-stone">Enter a mobile number first.</p> : null}
                  {customerCreateError ? <p className="mt-1 text-xs text-danger" role="alert">{customerCreateError}</p> : null}
                </div>
              ) : null}
              {!customerChosen && hits.length ? (
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
            <Field label="Mobile">
              <Input value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setCustomerCreateError(null); }} />
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
          {customerId ? (
            <div className="mt-5 border-t border-sand pt-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg">Previous purchases</h3>
                {purchaseHistory ? <p className="text-xs text-stone">{purchaseHistory.invoiceCount} bills · Lifetime spend {inr(purchaseHistory.lifetimeSpend)}</p> : null}
              </div>
              {loadingPurchaseHistory ? <p className="text-sm text-stone">Loading purchase history…</p> : null}
              {!loadingPurchaseHistory && purchaseHistory?.invoices.length === 0 ? <p className="text-sm text-stone">No previous completed bills found for this customer.</p> : null}
              {!loadingPurchaseHistory && purchaseHistory?.invoices.length ? (
                <div className="space-y-2">
                  {purchaseHistory.invoices.map((invoice) => (
                    <a key={invoice.id} href={`/invoices/${invoice.id}`} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sand px-3 py-2 transition hover:bg-cream">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{invoice.invoiceNo} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(invoice.date))}</span>
                        <span className="block truncate text-xs text-stone">{invoice.items.map((item) => `${item.description} (${item.netWeight.toFixed(3)} g)`).join(", ")}</span>
                      </span>
                      <span className="text-right text-sm font-semibold tabular text-ink">{inr(invoice.netPayable)}{invoice.balanceAmount > 0 ? <span className="block text-xs font-normal text-danger">Due {inr(invoice.balanceAmount)}</span> : null}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Ornaments</h2>
              <p className="text-xs text-stone">Scan an internal barcode or manufacturer QR code to add its stock item, or type the tag / product code and press Enter. Save the manufacturer QR value as Product Code on the stock item first.</p>
            </div>
            <form className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap gap-2" onSubmit={addByTag}>
              <Input
                inputRef={tagInputRef}
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={tag}
                onKeyDown={trackScannerKey}
                onChange={(e) => updateTagInput(e.target.value)}
                placeholder="SCAN BARCODE"
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
              {stockCount} in-stock {stockCount === 1 ? "item" : "items"}. Search covers tag, product code, name, HUID, category, and supplier (including MMTC).
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setAdditionalStockItems([]); router.refresh(); }}>
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={stockQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setStockQuery(value);
                  setStockSearchResults(value.trim() ? [] : null);
                  setStockHasMore(value.trim() ? false : stockCount > stockItems.length);
                  setSearchingStock(Boolean(value.trim()));
                }}
                placeholder="Search all stock by tag, name, product code, or supplier"
                className="min-w-[220px] flex-1"
              />
              <Select aria-label="Filter stock" className="min-w-[170px]" value={stockFilter} onChange={(event) => { setAdditionalStockItems([]); setStockFilter(event.target.value); setSearchingStock(Boolean(stockQuery.trim())); }}>
                <option value="ALL">All stock</option>
                <option value="PER_GRAM">Per-gram making</option>
                <option value="MRP">MRP available</option>
              </Select>
              <span className="self-center text-xs text-stone">{searchingStock ? "Searching stock…" : stockQuery.trim() ? `${stockSearchResults?.length ?? 0}${stockHasMore ? "+" : ""} matches` : `Showing ${Math.min(stockCount, stockItems.length + additionalStockItems.length)} of ${stockCount}`}</span>
            </div>
            <div className="mt-3 max-h-64 overflow-y-auto rounded border border-sand bg-white" role="listbox" aria-label="Available stock to add">
              {(stockSearchResults ?? [...stockItems, ...additionalStockItems].filter((row) => stockFilter === "ALL"
                || (stockFilter === "PER_GRAM" && row.makingType === "PER_GRAM")
                || (stockFilter === "MRP" && row.mrp != null && row.mrp > 0))).map((row) => (
                <button
                  key={row.ornamentId}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => addStockItem(row)}
                  className="flex w-full items-center justify-between gap-3 border-b border-sand px-3 py-2 text-left last:border-b-0 hover:bg-cream focus:bg-cream focus:outline-none"
                >
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{row.tagNo} · {row.description}</span><span className="block truncate text-xs text-stone">{row.metal} {row.purity} · {row.category} · {row.netWeight.toFixed(3)} g</span></span>
                  <span className="shrink-0 text-xs font-semibold text-royal">Add</span>
                </button>
              ))}
              {!searchingStock && (stockSearchResults ?? stockItems).length === 0 ? (
                <p className="px-3 py-4 text-sm text-stone">No matching in-stock items. Check the tag or name, or refresh after adding stock.</p>
              ) : null}
            </div>
            {stockHasMore && !searchingStock ? (
              <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" disabled={loadingMoreStock} onClick={() => void loadMoreStock()}>
                {loadingMoreStock ? "Loading stock…" : "Load more stock"}
              </Button>
            ) : null}
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
                    <div className="flex items-center gap-2">
                      {item.ornamentId ? (
                        <div className="flex items-center gap-1 rounded-md border border-sand px-1.5 py-1" aria-label={`Quantity in bill for ${item.description}`}>
                          <span className="px-1 text-xs text-stone">Qty</span>
                          <button type="button" aria-label={`Decrease ${item.description} quantity`} className="rounded p-1 text-ink hover:bg-sand/60" onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}>
                            <Minus size={14} />
                          </button>
                          <span className="min-w-5 text-center text-sm font-semibold">{items.filter((row) => stockGroupKey(row) === stockGroupKey(item)).length}</span>
                          <button type="button" aria-label={`Increase ${item.description} quantity`} className="rounded p-1 text-royal hover:bg-sand/60 disabled:cursor-wait disabled:opacity-50" disabled={addingQuantityGroup === stockGroupKey(item)} onClick={() => void addStockUnit(item)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Remove ${item.description} from invoice`}
                        className="text-danger p-1"
                        onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Description" className="md:col-span-2">
                      <Input
                        value={item.description}
                        onChange={(e) => patchLine(item.key, { description: e.target.value })}
                      />
                    </Field>
                    <Field label="HSN code *" hint="Required. Choose a listed code or type a new code; new codes are saved in this browser for reuse.">
                      <Input
                        required
                        list="invoice-hsn-codes"
                        value={item.hsn}
                        onFocus={loadSavedHsnCodes}
                        onChange={(e) => patchLine(item.key, { hsn: e.target.value })}
                        onBlur={(e) => rememberHsnCode(e.target.value)}
                        placeholder="Select or enter an HSN code"
                      />
                    </Field>
                    {(item.metal === "DIAMOND" || item.metal === "GOLD_PLATED") ? (
                      <Field label="Unique ID">
                        <Input value={item.tagNo} onChange={(e) => patchLine(item.key, { tagNo: e.target.value.trim() })} />
                      </Field>
                    ) : null}
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
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label="HUID">
                      <Input value={item.huid} onChange={(e) => patchLine(item.key, { huid: e.target.value.toUpperCase() })} />
                    </Field> : null}
                    <Field label="Metal / Material">
                      <Select
                        value={item.metal}
                        onChange={(e) => {
                          const metal = e.target.value;
                          const directMrpMaterial = metal === "DIAMOND" || metal === "GOLD_PLATED";
                          patchLine(item.key, {
                            metal,
                            purity: PURITIES[metal]?.[0] ?? item.purity,
                            netWeight: metal === "DIAMOND" ? item.stoneWeight : Number(Math.max(0, item.grossWeight - item.stoneWeight).toFixed(3)),
                            ...(directMrpMaterial ? { pricingMode: "MRP" as const, finalPrice: item.mrp ?? (item.pricingMode === "MRP" ? item.finalPrice : null) ?? 0 } : {}),
                          });
                        }}
                      >
                        {METALS.map((m) => (
                          <option key={m} value={m}>{labelize(m)}</option>
                        ))}
                      </Select>
                    </Field>
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label="Purity">
                      <Select value={item.purity} onChange={(e) => patchLine(item.key, { purity: e.target.value })}>
                        {(PURITIES[item.metal] ?? [item.purity]).map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </Select>
                    </Field> : null}
                    <Field label="Gross wt (g)">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.grossWeight || ""}
                        onChange={(e) => patchLine(item.key, { grossWeight: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label={item.metal === "DIAMOND" ? "LGD wt (ct)" : "Stone wt (g)"}>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.stoneWeight || ""}
                        onChange={(e) => patchLine(item.key, { stoneWeight: Number(e.target.value) })}
                      />
                    </Field>
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label={item.metal === "DIAMOND" ? "Net wt (ct)" : "Net wt (g)"}>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.netWeight || ""}
                        onChange={(e) => patchLine(item.key, { netWeight: Number(e.target.value) })}
                      />
                    </Field> : null}
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label={item.metal === "DIAMOND" ? "Rate / ct" : "Rate / g"}>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.ratePerGram || ""}
                        onChange={(e) => patchLine(item.key, { ratePerGram: Number(e.target.value) })}
                      />
                    </Field> : null}
                    <Field label="Price method">
                      <Select value={item.pricingMode} onChange={(event) => changePricingMode(item, event.target.value as Line["pricingMode"])}>
                        <option value="CALCULATED">{item.metal === "DIAMOND" ? "Regular diamond calculation" : "Per-gram calculation"}</option>
                        <option value="MRP">{item.metal === "DIAMOND" ? "Sparkle diamond · MRP + GST − discount" : item.metal === "GOLD_PLATED" ? "Gold-plated · MRP + GST − discount" : "MRP + GST − discount"}</option>
                        <option value="MANUAL">Flat amount (manual)</option>
                      </Select>
                    </Field>
                    {item.pricingMode !== "CALCULATED" ? (
                      <Field label={item.pricingMode === "MRP" ? "MRP (before GST) ₹" : "Flat selling amount ₹"} hint={item.pricingMode === "MRP" ? "3% GST is added to MRP, then the item discount is deducted." : "Enter the final flat price including GST."}>
                        <Input type="number" min="0" step="0.01" value={item.finalPrice ?? ""} onChange={(event) => patchLine(item.key, { finalPrice: Number(event.target.value) })} />
                      </Field>
                    ) : null}
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label="Making">
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
                    </Field> : null}
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label={item.makingType === "PERCENT" ? "Making percentage (0–30%)" : "Making value"}>
                      <Input aria-label={item.makingType === "PERCENT" ? "Making percentage" : "Making value"} type="number" min="0" max={item.makingType === "PERCENT" ? 30 : undefined} step="0.1" value={item.makingValue || ""} onChange={(e) => patchLine(item.key, { makingValue: Number(e.target.value) })} />
                    </Field> : null}
                    {item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED") ? null : item.makingType === "FLAT" || item.pricingMode === "MANUAL" ? (
                      <Field label="VA amount ₹" hint="Enter the value addition manually; percentage-based VA is not added for flat pricing.">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.manualWastageAmount ?? ""}
                          onChange={(event) => patchLine(item.key, { manualWastageAmount: Number(event.target.value) })}
                        />
                      </Field>
                    ) : (
                      <Field label="VA / Wastage (0–30%)">
                        <Input aria-label="VA / wastage percentage" type="number" min="0" max="30" step="0.1" value={item.wastagePercent || ""} onChange={(e) => patchLine(item.key, { wastagePercent: Number(e.target.value) })} />
                      </Field>
                    )}
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label="Stone cost ₹">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.stoneCharge || ""}
                        onChange={(e) => patchLine(item.key, { stoneCharge: Number(e.target.value) })}
                      />
                    </Field> : null}
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label="Hallmark ₹">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.hallmarkCharge || ""}
                        onChange={(e) => patchLine(item.key, { hallmarkCharge: Number(e.target.value) })}
                      />
                    </Field> : null}
                    {!(item.pricingMode === "MRP" && (item.metal === "DIAMOND" || item.metal === "GOLD_PLATED")) ? <Field label="Other charge ₹">
                      <Input type="number" min="0" step="0.01" value={item.otherCharge || ""} onChange={(event) => patchLine(item.key, { otherCharge: Number(event.target.value) })} />
                    </Field> : null}
                    <Field label="Discount %" hint="Deducted after GST from this item total.">
                      <Input
                        aria-label={`Discount percentage for ${item.tagNo || item.description || `item ${index + 1}`}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discountMode === "PERCENT" ? item.discountPercent || "" : item.discountPercent}
                        onChange={(event) => patchLineDiscount(item.key, "PERCENT", event.target.value)}
                      />
                    </Field>
                    <Field label="Discount amount ₹" hint="The percentage updates automatically.">
                      <Input
                        aria-label={`Discount amount for ${item.tagNo || item.description || `item ${index + 1}`}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discountMode === "AMOUNT" ? item.discountAmount || "" : item.discountAmount}
                        onChange={(event) => patchLineDiscount(item.key, "AMOUNT", event.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 rounded-md bg-cream/50 p-2 text-xs text-stone">
                    {item.pricingMode === "MRP" ? <span>MRP {inr(item.finalPrice ?? 0)}</span> : <>
                      <span>Metal value {inr(calc.goldValue)}</span>
                      {item.stoneCharge > 0 && <span>Stone cost {inr(item.stoneCharge)}</span>}
                      <span>VA {item.wastagePercent}% · {inr(calc.wastageAmount)}</span>
                      <span>Making {item.makingType === "PERCENT" ? `${item.makingValue}%` : ""} · {inr(calc.makingAmount)}</span>
                    </>}
                    {item.otherCharge > 0 && <span>Other {inr(item.otherCharge)}</span>}
                    <span>GST {inr(calc.gstTotal)}</span>
                    {calc.discountAmount > 0 && <span>Discount {calc.discountPercent}% − {inr(calc.discountAmount)}</span>}
                    <span className="font-semibold text-ink">{item.pricingMode === "CALCULATED" ? "Calculated total" : "Net item total"} {inr(calc.lineTotal)}</span>
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
                    <Field label="Metal / material">
                      <Select value={ex.metal} onChange={(event) => {
                        const metal = event.target.value;
                        const purity = PURITIES[metal]?.[0] ?? (metal === "SILVER" ? "925" : "22K");
                        const rate = rates.find((row) => row.metal === metal && row.purity === purity)?.ratePerGram ?? 0;
                        const description = /^old (gold|silver|diamond|platinum)$/i.test(ex.description)
                          ? `Old ${metal.toLowerCase()}`
                          : ex.description;
                        patchExchange(ex.key, { metal, purity, ratePerGram: rate, description });
                      }}>
                        <option value="GOLD">Gold</option><option value="SILVER">Silver</option><option value="DIAMOND">Diamond</option><option value="PLATINUM">Platinum</option><option value="PEARLS">Pearls</option>
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
            <div className="flex flex-wrap items-center justify-between gap-2 py-1">
              <span className="text-stone">Bill discount</span>
              <div className="flex items-center gap-1.5">
                <Input
                  id="invoice-discount-percent"
                  aria-label="Discount percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-24 text-right tabular"
                  value={discountInputMode === "PERCENT" ? discountInput : computed.discountPercent}
                  onChange={(event) => { setDiscountInputMode("PERCENT"); setDiscountInput(event.target.value); setInvoiceTotalInput(""); }}
                />
                <span className="text-xs text-stone">%</span>
                <span className="text-xs text-stone">or</span>
                <Input
                  id="invoice-discount-amount"
                  aria-label="Discount amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-28 text-right tabular"
                  value={discountInputMode === "AMOUNT" ? discountInput : computed.discountAmount}
                  onChange={(event) => { setDiscountInputMode("AMOUNT"); setDiscountInput(event.target.value); setInvoiceTotalInput(""); }}
                />
                <span className="text-xs text-stone">₹</span>
                {discountInput !== "" ? <button type="button" className="text-[10px] text-royal hover:underline" onClick={() => { setDiscountInput(""); setInvoiceTotalInput(""); }}>Reset</button> : null}
              </div>
            </div>
            {invoiceType === "GST" ? <>
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
            <Row label="GST added" value={inr(computed.totals.gstTotal)} />
            </> : null}
            {computed.productDiscountAmount > 0 ? (
              <Row label="Product discounts (after GST)" value={`− ${inr(computed.productDiscountAmount)}`} />
            ) : null}
            <Row label={`Bill discount (${computed.discountPercent}%, after GST)`} value={`− ${inr(computed.discountAmount)}`} />
            <Row label={invoiceTotalInput === "" ? "Round off" : "Adjustment / round off"} value={inr(computed.totals.roundOff)} />
            <EditableRow
              label={invoiceType === "GST" ? "MRP / base value (before GST)" : "MRP / bill value"}
              value={mrpTotalInput === "" ? computed.mrpTotal : mrpTotalInput}
              onChange={(value) => { setMrpTotalInput(value); setInvoiceTotalInput(""); }}
              onReset={() => { setMrpTotalInput(""); setInvoiceTotalInput(""); }}
              isManual={mrpTotalInput !== ""}
            />
            <EditableRow
              label="Invoice value"
              value={invoiceTotalInput === "" ? computed.totals.grandTotal : invoiceTotalInput}
              onChange={setInvoiceTotalInput}
              onReset={() => setInvoiceTotalInput("")}
              isManual={invoiceTotalInput !== ""}
              strong
            />
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
          <p className="mt-2 text-[11px] text-stone">{invoiceType === "GST" ? "GST is calculated on the full taxable amount first. Product and bill discounts are then deducted from the total." : "No GST is added to a Bill of Supply. Enter the final bill value directly."}</p>
          {invoiceType === "GST" ? <p className="mt-2 text-[11px] text-stone">
            Gold and silver use 3% GST on the full calculated value. MRP items add 3% GST to MRP. Other calculated materials: {makingGstMode === "SEPARATE_5" ? "3% on base + 5% on making" : "3% on full value"}.
          </p> : null}
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
            {pending ? "Saving bill…" : invoiceType === "GST" ? "Save GST invoice" : "Save Bill of Supply"}
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

function EditableRow({
  label,
  value,
  onChange,
  onReset,
  isManual,
  strong,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  onReset: () => void;
  isManual: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <label className={strong ? "font-semibold text-ink" : "text-stone"}>{label}</label>
      <div className="flex items-center gap-1">
        <span className="text-xs text-stone">₹</span>
        <Input
          aria-label={label}
          type="number"
          min="0"
          step="0.01"
          className={`w-32 text-right tabular ${strong ? "font-semibold" : ""}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {isManual ? (
          <button type="button" className="px-1 text-xs text-stone underline" onClick={onReset}>
            Auto
          </button>
        ) : null}
      </div>
    </div>
  );
}
