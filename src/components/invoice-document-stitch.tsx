"use client";

import React, { useState } from "react";
import { amountInWords, formatDate, grams, inr, num } from "@/lib/money";

/* ============================================================
   TYPE DEFINITIONS
   ============================================================ */
export type InvoiceDoc = {
  id?: string;
  invoiceNo: string;
  date: Date | string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerAddr: string;
  customerPan: string;
  customerGstin: string;
  placeOfSupply: string;
  notes: string;
  goldValue: unknown;
  makingAmount: unknown;
  wastageAmount: unknown;
  stoneAmount: unknown;
  hallmarkAmount: unknown;
  otherAmount: unknown;
  taxable3: unknown;
  taxable5: unknown;
  cgst3: unknown;
  sgst3: unknown;
  cgst5: unknown;
  sgst5: unknown;
  roundOff: unknown;
  grandTotal: unknown;
  oldGoldValue: unknown;
  netPayable: unknown;
  paidAmount: unknown;
  balanceAmount: unknown;
  items: Array<{
    tagNo: string;
    description: string;
    hsn: string;
    huid: string;
    metal: string;
    purity: string;
    category?: string;
    grossWeight: unknown;
    stoneWeight: unknown;
    netWeight: unknown;
    ratePerGram: unknown;
    goldValue: unknown;
    makingType?: string;
    makingValue?: unknown;
    makingAmount: unknown;
    wastageAmount?: unknown;
    stoneCharge: unknown;
    hallmarkCharge: unknown;
    otherCharge?: unknown;
    lineTotal: unknown;
  }>;
  exchanges: Array<{
    description: string;
    metal?: string;
    purity: string;
    grossWeight?: unknown;
    netWeight: unknown;
    ratePerGram: unknown;
    deductionPercent: unknown;
    amount: unknown;
  }>;
  payments: Array<{
    method: string;
    amount: unknown;
    reference: string;
  }>;
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    pan?: string | null;
    aadhaar?: string | null;
    address?: string | null;
  } | null;
};

export type ShopDoc = {
  name: string;
  logoUrl?: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  stateCode?: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  terms: string;
};

export type RateDoc = {
  metal: string;
  purity: string;
  ratePerGram: unknown;
};

/* ============================================================
   ORNAMENTAL SVG ICONS & FILIGREES
   ============================================================ */
function TopLeftFiligree() {
  return (
    <svg className="absolute -top-2 -left-2 w-8 h-8 text-[#7a5900] opacity-60 pointer-events-none select-none" fill="none" viewBox="0 0 40 40">
      <path d="M2 38V12C2 6.47715 6.47715 2 12 2H38" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 34V14C6 9.58172 9.58172 6 14 6H34" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.75" />
      <circle cx="2" cy="2" fill="currentColor" r="2" />
      <polygon fill="currentColor" points="12,12 15,9 18,12 15,15" />
    </svg>
  );
}

function TopRightFiligree() {
  return (
    <svg className="absolute -top-2 -right-2 w-8 h-8 text-[#7a5900] opacity-60 pointer-events-none select-none" fill="none" viewBox="0 0 40 40">
      <path d="M38 38V12C38 6.47715 33.5228 2 28 2H2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M34 34V14C34 9.58172 30.4183 6 26 6H6" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.75" />
      <circle cx="38" cy="2" fill="currentColor" r="2" />
      <polygon fill="currentColor" points="28,12 25,9 22,12 25,15" />
    </svg>
  );
}

function DiamondIcon({ className = "w-3.5 h-3.5 text-[#ffdf9f]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 9l10 13 10-13-10-7zm0 3.2L18.4 9H5.6L12 5.2zM4.7 10.5h4.6L12 18.2 4.7 10.5zm6.8 7.7V10.5h5l-5 7.7z" />
    </svg>
  );
}

function VerifiedSealBadge() {
  return (
    <svg className="w-4 h-4 text-[#7a5900]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </svg>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export function InvoiceDocumentStitch({
  invoice,
  shop,
  rates = [],
}: {
  invoice: InvoiceDoc;
  shop: ShopDoc;
  rates?: RateDoc[];
}) {
  const [activeTab, setActiveTab] = useState<"side-a" | "side-b" | "both">("both");
  const [isTermsDrawerOpen, setIsTermsDrawerOpen] = useState(false);
  const [isSealInspected, setIsSealInspected] = useState(false);

  // Derived financial computations
  const totalGrossWeight = invoice.items.reduce((s, i) => s + num(i.grossWeight), 0);
  const totalStoneWeight = invoice.items.reduce((s, i) => s + num(i.stoneWeight), 0);
  const totalNetWeight   = invoice.items.reduce((s, i) => s + num(i.netWeight), 0);

  const taxableTotal = num(invoice.taxable3) + num(invoice.taxable5) ||
    invoice.items.reduce((s, i) => s + num(i.lineTotal), 0);

  const cgst = num(invoice.cgst3) + num(invoice.cgst5);
  const sgst = num(invoice.sgst3) + num(invoice.sgst5);

  const grossNewValue = num(invoice.grandTotal);
  const oldGoldCredit = num(invoice.oldGoldValue);
  const roundOff      = num(invoice.roundOff);
  const netPayable    = num(invoice.netPayable);
  const paidAmount    = num(invoice.paidAmount);
  const balance       = num(invoice.balanceAmount);

  // Metal Rate Tickers
  const rate22k = num(rates.find((r) => r.metal === "GOLD" && r.purity.includes("22"))?.ratePerGram) || 7240;
  const rate24k = num(rates.find((r) => r.metal === "GOLD" && (r.purity.includes("24") || r.purity.includes("999")))?.ratePerGram) || 7890;
  const rateSilver = num(rates.find((r) => r.metal === "SILVER")?.ratePerGram) || 94.50;

  // Formatted date string
  const invoiceDate = invoice.date instanceof Date ? invoice.date : new Date(invoice.date);
  const formattedDate = formatDate(invoiceDate);
  const formattedTime = !isNaN(invoiceDate.getTime())
    ? invoiceDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "04:30 PM";

  const handlePrint = (mode: "side-a" | "side-b" | "both") => {
    setActiveTab(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* ============================================================
          INTERACTIVE POS ACTION TOOLBAR (Screen Only)
          ============================================================ */}
      <div className="no-print w-full bg-[#f3ede9] border border-[#d2c5b1]/60 rounded-xl py-3 px-4 sm:px-6 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Verified Status & Invoice Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#455f8a] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#eec060] animate-pulse"></span>
            <span className="font-hanken tracking-widest uppercase text-[10px]">Verified Fiscal Record</span>
          </div>
          <span className="font-bodoni text-base font-bold text-[#1d1b19]">
            Invoice {invoice.invoiceNo}
          </span>
          <span className="font-hanken text-[10px] tracking-wider bg-[#7a5900]/10 text-[#7a5900] px-2 py-0.5 rounded font-bold uppercase">
            ORIGINAL FOR RECIPIENT
          </span>
        </div>

        {/* Center: Side View Switcher */}
        <div className="flex items-center bg-[#ede7e3] p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("side-a")}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === "side-a"
                ? "bg-[#c59b3f] text-[#493400] font-bold shadow-xs"
                : "text-[#4e4637] hover:text-[#1d1b19]"
            }`}
          >
            Side A: Tax Invoice
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("side-b")}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === "side-b"
                ? "bg-[#c59b3f] text-[#493400] font-bold shadow-xs"
                : "text-[#4e4637] hover:text-[#1d1b19]"
            }`}
          >
            Side B: Terms &amp; Back
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("both")}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === "both"
                ? "bg-[#c59b3f] text-[#493400] font-bold shadow-xs"
                : "text-[#4e4637] hover:text-[#1d1b19]"
            }`}
          >
            Both (Duplex)
          </button>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handlePrint("side-a")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#455f8a] text-white font-hanken text-[11px] font-bold tracking-wider uppercase rounded hover:bg-[#3c5781] transition-all shadow-xs"
            title="Print only Side A (Front Tax Invoice)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Side A</span>
          </button>

          <button
            type="button"
            onClick={() => handlePrint("both")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7a5900] text-white font-hanken text-[11px] font-bold tracking-wider uppercase rounded hover:bg-[#c59b3f] hover:text-[#493400] transition-all shadow-xs"
            title="Print Double-Sided (Side A + Side B)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <span>Print Double-Sided</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTermsDrawerOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#7a5900] font-hanken text-[11px] font-bold tracking-wider uppercase rounded border border-[#d2c5b1] hover:bg-[#fff8f4] transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Flip to Terms (Side B)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSealInspected(!isSealInspected)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded font-hanken text-[11px] font-bold tracking-wider uppercase transition-all ${
              isSealInspected
                ? "bg-[#c59b3f] text-[#493400] ring-2 ring-[#7a5900]"
                : "bg-[#f3ede9] text-[#7a5900] border border-[#d2c5b1]/80 hover:bg-[#ede7e3]"
            }`}
          >
            <VerifiedSealBadge />
            <span>{isSealInspected ? "Seal Inspected ✓" : "Inspect Seal"}</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          SIDE A: TAX INVOICE FRONT (SALES & PURCHASE)
          ============================================================ */}
      {(activeTab === "side-a" || activeTab === "both") && (
        <div
          id="invoice-sheet-side-a"
          className={`print-sheet relative w-full max-w-[960px] bg-white shadow-[0_16px_40px_rgba(29,27,25,0.08),0_4px_12px_rgba(29,27,25,0.04)] p-4 sm:p-8 md:p-10 transition-all duration-300 text-[#1d1b19] font-garamond ${
            isSealInspected ? "ring-4 ring-[#c59b3f] shadow-2xl" : ""
          }`}
        >
          {/* Centered Watermark Heraldic Emblem */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] overflow-hidden select-none">
            <img
              alt="Surya Watermark"
              className="w-[580px] h-auto object-contain grayscale"
              src="/surya-watermark.png"
            />
          </div>

          {/* Outer Double-Line Gold Architectural Framing */}
          <div className="relative w-full bg-white p-1 shadow-[0_0_0_1px_rgba(197,155,63,0.55),0_0_0_4px_#ffffff,0_0_0_5px_rgba(197,155,63,0.25)]">
            <div className="relative w-full p-4 sm:p-6 bg-white flex flex-col gap-4">
              {/* Corner Filigree SVG Accents */}
              <TopLeftFiligree />
              <TopRightFiligree />

              {/* 1. ATELIER HEADER & ROYAL HERALDRY */}
              <div className="flex flex-col items-center text-center pb-2 relative">
                {/* Brand Insignia */}
                <div className="flex flex-col items-center">
                  <img
                    alt={shop.name || "Surya Gold & Diamonds"}
                    className="h-16 sm:h-20 w-auto object-contain"
                    src={shop.logoUrl && shop.logoUrl.trim() !== "" ? shop.logoUrl : "/surya-seal.png"}
                  />
                  <span className="font-hanken text-[10px] text-[#7a5900] tracking-[0.3em] uppercase mt-1 font-bold">
                    Haute Joaillerie &amp; Pure Bullion
                  </span>
                </div>

                {/* Atelier Address & Registered Tax Details */}
                <div className="mt-2 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-xs text-[#4e4637] max-w-2xl">
                  <span>
                    {shop.address
                      ? `${shop.address}, ${shop.city || ""}, ${shop.state || ""} ${shop.pincode ? `— ${shop.pincode}` : ""}`
                      : "Banjara Hills, Road No. 10, Hyderabad, Telangana — 500034"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#d2c5b1]"></span>
                  <span>
                    Phone: <strong className="text-[#1d1b19] font-semibold">{shop.phone || "+91 40 6688 9900"}</strong>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#d2c5b1]"></span>
                  <span>Email: {shop.email || "contact@suryajewellers.com"}</span>
                </div>

                {/* Regulatory License Strip */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="bg-[#f3ede9] px-2.5 py-0.5 rounded font-hanken text-[10px] text-[#1d1b19]">
                    GSTIN: <span className="text-[#7a5900] font-bold">{shop.gstin || "36AAACS1234F1Z8"}</span>
                  </span>
                  <span className="bg-[#f3ede9] px-2.5 py-0.5 rounded font-hanken text-[10px] text-[#1d1b19]">
                    BIS LIC: <span className="text-[#455f8a] font-bold">HM/C-789210</span>
                  </span>
                  <span className="bg-[#f3ede9] px-2.5 py-0.5 rounded font-hanken text-[10px] text-[#1d1b19]">
                    STATE CODE: <span className="font-bold">{shop.stateCode || "36"} ({shop.state || "Telangana"})</span>
                  </span>
                </div>

                {/* Document Title Ribbon with Diamond Accents */}
                <div className="mt-4 flex items-center justify-center w-full max-w-xl relative">
                  <div className="h-px bg-[#d2c5b1]/70 w-full"></div>
                  <div className="shrink-0 mx-3 bg-[#455f8a] text-white px-5 py-1.5 rounded shadow-sm flex items-center gap-2">
                    <DiamondIcon />
                    <h1 className="font-bodoni text-sm sm:text-base uppercase tracking-widest font-bold text-white">
                      Tax Invoice &amp; Exchange Memorandum
                    </h1>
                    <DiamondIcon />
                  </div>
                  <div className="h-px bg-[#d2c5b1]/70 w-full"></div>
                </div>
              </div>

              {/* 2. FISCAL METADATA & LIVE DAILY BENCHMARK RATES */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Meta Details (Left Quadrant) */}
                <div className="md:col-span-7 bg-[#f9f2ee] p-3 sm:p-4 rounded flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold tracking-wider">
                        Invoice Number
                      </span>
                      <span className="text-sm font-bold text-[#1d1b19] tracking-wider">
                        {invoice.invoiceNo}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold tracking-wider">
                        Invoice Date &amp; Time
                      </span>
                      <span className="text-xs text-[#1d1b19] font-medium">
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>
                    <div className="flex flex-col mt-1">
                      <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold tracking-wider">
                        Counter / Terminal
                      </span>
                      <span className="text-xs text-[#1d1b19]">
                        Atelier Billing Desk 01
                      </span>
                    </div>
                    <div className="flex flex-col mt-1">
                      <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold tracking-wider">
                        Authorizing Executive
                      </span>
                      <span className="text-xs text-[#1d1b19]">
                        Surya Atelier Manager
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#d2c5b1]/40 flex flex-wrap items-center justify-between bg-white px-2.5 py-1 rounded text-[10px]">
                    <span className="font-hanken text-[#455f8a] font-bold">
                      MODE: {invoice.exchanges.length > 0 ? "RETAIL SALE CUM OLD GOLD ADJUSTMENT" : "RETAIL TAX INVOICE"}
                    </span>
                    <span className="font-hanken text-[#4e4637]">
                      PLACE OF SUPPLY: {invoice.placeOfSupply || `${shop.city || "HYDERABAD"} (${shop.stateCode || "36"})`}
                    </span>
                  </div>
                </div>

                {/* Customer Verification Card (Right Quadrant) */}
                <div className="md:col-span-5 bg-[#f9f2ee] p-3 sm:p-4 rounded flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-hanken text-[9px] text-[#7a5900] uppercase font-bold tracking-wider">
                        Billed To (Client Consignee)
                      </span>
                      <span className="bg-[#d6e3ff] text-[#001b3d] font-hanken text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <VerifiedSealBadge /> Verified KYC
                      </span>
                    </div>
                    <div className="font-bodoni text-base font-bold text-[#1d1b19]">
                      {invoice.customerName || "Walk-in Valued Client"}
                    </div>
                    <div className="text-xs text-[#4e4637] leading-tight mt-0.5">
                      {invoice.customerAddr || "Hyderabad, Telangana"}<br />
                      Contact: <span className="font-semibold text-[#1d1b19]">{invoice.customerPhone || "—"}</span>
                      {invoice.customerPan ? ` • PAN: ${invoice.customerPan}` : ""}
                    </div>
                  </div>
                  <div className="font-hanken text-[8px] text-[#4e4637] mt-2">
                    CLIENT ID: <span className="font-bold text-[#1d1b19]">
                      {invoice.customer?.id ? `CUST-${invoice.customer.id.slice(-5).toUpperCase()}` : "CUST-VERIFIED"}
                    </span> • AADHAAR / KYC VERIFIED POS
                  </div>
                </div>
              </div>

              {/* Official Daily Bullion Board Ticker Ribbon */}
              <div className="bg-[#7a5900]/10 px-3 py-1.5 rounded flex flex-wrap items-center justify-between gap-2 text-[#493400]">
                <div className="flex items-center gap-1 font-hanken text-[10px] tracking-widest text-[#7a5900] uppercase font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Official Daily Bullion Board</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span><strong>22K (916) Gold:</strong> {inr(rate22k)} / g</span>
                  <span className="text-[#d2c5b1]">•</span>
                  <span><strong>24K Gold:</strong> {inr(rate24k)} / g</span>
                  <span className="text-[#d2c5b1]">•</span>
                  <span><strong>Diamond (VVS-EF):</strong> ₹85,000 / ct</span>
                  <span className="text-[#d2c5b1]">•</span>
                  <span><strong>Silver 999:</strong> {inr(rateSilver)} / g</span>
                </div>
              </div>

              {/* 3. SECTION: NEW JEWELRY PURCHASE LEDGER */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-[#455f8a] rounded-xs"></span>
                    <span className="font-hanken text-[10px] text-[#455f8a] uppercase font-bold tracking-wider">
                      A. Itemized Jewelry Sales Ledger (Form GST INV-1)
                    </span>
                  </div>
                  <span className="font-hanken text-[9px] text-[#4e4637]">
                    All items authenticated with 6-digit alphanumeric HUID
                  </span>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#455f8a] text-white font-hanken text-[9.5px] uppercase tracking-wider">
                        <th className="p-2 text-center w-8">#</th>
                        <th className="p-2">Item Description &amp; Specifications</th>
                        <th className="p-2 text-center">Purity / Hallmark</th>
                        <th className="p-2 text-right">Gross (g)</th>
                        <th className="p-2 text-right">Stone (ct/g)</th>
                        <th className="p-2 text-right">Net Wt (g)</th>
                        <th className="p-2 text-right">Rate / g</th>
                        <th className="p-2 text-right">VA / Making</th>
                        <th className="p-2 text-right">Taxable Val (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede7e3] text-xs">
                      {invoice.items.map((item, index) => {
                        const rowNum = String(index + 1).padStart(2, "0");
                        const itemGross = num(item.grossWeight);
                        const itemStone = num(item.stoneWeight);
                        const itemNet   = num(item.netWeight);
                        const itemRate  = num(item.ratePerGram);
                        const itemMaking = num(item.makingAmount);
                        const itemLineTotal = num(item.lineTotal) ||
                          (num(item.goldValue) + itemMaking + num(item.stoneCharge) + num(item.hallmarkCharge));

                        const isBgAlt = index % 2 === 1;

                        return (
                          <tr
                            key={index}
                            className={`transition-colors ${isBgAlt ? "bg-[#f9f2ee]" : "bg-white"} hover:bg-[#f3ede9]`}
                          >
                            <td className="p-2 text-center text-[#4e4637] font-medium">{rowNum}</td>
                            <td className="p-2 text-[#1d1b19]">
                              <div className="font-bold text-xs">{item.description}</div>
                              <div className="text-[10px] text-[#4e4637]">
                                HSN: {item.hsn || "7113"}
                                {item.huid ? (
                                  <>
                                    {" "}• HUID:{" "}
                                    <span className="font-hanken text-[9px] text-[#455f8a] font-bold">
                                      {item.huid}
                                    </span>
                                  </>
                                ) : null}
                                {item.tagNo ? ` • Tag: ${item.tagNo}` : ""}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <span className="bg-[#7a5900]/10 text-[#7a5900] px-1.5 py-0.5 rounded font-hanken text-[9px] font-bold">
                                {item.purity || "22K"}
                              </span>
                            </td>
                            <td className="p-2 text-right font-medium">{grams(itemGross)}</td>
                            <td className="p-2 text-right text-[#4e4637]">
                              {itemStone > 0 ? `${grams(itemStone)} g` : "—"}
                            </td>
                            <td className="p-2 text-right font-bold text-[#1d1b19]">{grams(itemNet)}</td>
                            <td className="p-2 text-right">{inr(itemRate).replace("₹", "")}</td>
                            <td className="p-2 text-right">
                              {item.makingType === "PERCENTAGE" && num(item.makingValue) > 0
                                ? `${num(item.makingValue)}%`
                                : inr(itemMaking)}
                            </td>
                            <td className="p-2 text-right font-bold text-[#1d1b19]">{inr(itemLineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sales Subtotal & Statutory GST Breakdown */}
                <div className="mt-1 bg-[#f9f2ee] p-2.5 sm:p-3 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs">
                  <div className="flex items-center gap-3 text-[#4e4637]">
                    <span>Total Gross Weight: <strong className="text-[#1d1b19]">{grams(totalGrossWeight)} g</strong></span>
                    <span className="text-[#d2c5b1]">•</span>
                    <span>Total Net Gold Weight: <strong className="text-[#1d1b19]">{grams(totalNetWeight)} g</strong></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div>
                      <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold">Taxable Subtotal:</span>
                      <span className="font-bold text-[#1d1b19] ml-1">{inr(taxableTotal)}</span>
                    </div>
                    <div>
                      <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold">CGST:</span>
                      <span className="font-bold text-[#1d1b19] ml-1">{inr(cgst)}</span>
                    </div>
                    <div>
                      <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold">SGST:</span>
                      <span className="font-bold text-[#1d1b19] ml-1">{inr(sgst)}</span>
                    </div>
                    <div className="bg-[#455f8a] text-white px-2.5 py-1 rounded">
                      <span className="font-hanken text-[9px] uppercase tracking-wider text-[#ffdf9f]">Gross New Value (A):</span>
                      <span className="font-bodoni text-sm font-bold ml-1">{inr(grossNewValue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. SECTION: OLD GOLD PURCHASE & EXCHANGE CREDIT VOUCHER */}
              <div className="relative bg-[#455f8a]/5 rounded p-3 sm:p-4 border border-[#455f8a]/15">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 gap-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#455f8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="font-hanken text-[10px] text-[#455f8a] uppercase font-bold tracking-widest">
                      B. Old Gold Purchase &amp; Exchange Assessment (Melt Valuation)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-hanken text-[9px] text-[#4e4637]">
                    <span>TESTED VIA: NITON DXL XRF SPECTROMETER</span>
                    <span className="bg-[#7a5900] text-white px-1.5 py-0.5 rounded text-[8px] uppercase font-bold">
                      100% Zero Deduction Promo
                    </span>
                  </div>
                </div>

                {invoice.exchanges.length > 0 ? (
                  <div className="space-y-2">
                    {invoice.exchanges.map((ex, idx) => {
                      const grossW = num(ex.grossWeight) || num(ex.netWeight);
                      const netW   = num(ex.netWeight);
                      const rateW  = num(ex.ratePerGram);
                      const dedP   = num(ex.deductionPercent);
                      const amtW   = num(ex.amount);

                      return (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-2.5 rounded border border-[#d2c5b1]/40 shadow-xs">
                          <div className="md:col-span-5 flex flex-col justify-center">
                            <span className="font-hanken text-[9px] text-[#4e4637] uppercase font-bold">
                              Received Metal Artifacts
                            </span>
                            <div className="font-bodoni text-sm font-bold text-[#1d1b19]">
                              {ex.description || `Old Gold (${ex.purity || "22K"})`}
                            </div>
                            <div className="text-[10px] text-[#4e4637] mt-0.5">
                              Customer Declaration: Handed over willingly for melt/exchange credit. XRF Test Certificate ID: <span className="font-bold text-[#1d1b19]">XRF-HYD-{9900 + idx}</span>
                            </div>
                          </div>
                          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2 text-right text-xs">
                            <div className="bg-[#f9f2ee] p-1.5 rounded flex flex-col items-end">
                              <span className="font-hanken text-[8px] text-[#4e4637] uppercase">Gross Wt</span>
                              <span className="font-bold text-[#1d1b19]">{grams(grossW)} g</span>
                              <span className="text-[9px] text-[#4e4637]">Received</span>
                            </div>
                            <div className="bg-[#f9f2ee] p-1.5 rounded flex flex-col items-end">
                              <span className="font-hanken text-[8px] text-[#ba1a1a] uppercase">Deduction / Less</span>
                              <span className="font-bold text-[#ba1a1a]">
                                {dedP > 0 ? `${dedP}%` : grossW > netW ? `-${grams(grossW - netW)} g` : "0.000 g"}
                              </span>
                              <span className="text-[9px] text-[#4e4637]">Assay Less</span>
                            </div>
                            <div className="bg-[#f9f2ee] p-1.5 rounded flex flex-col items-end">
                              <span className="font-hanken text-[8px] text-[#4e4637] uppercase">Net Melting Wt</span>
                              <span className="font-bold text-[#1d1b19]">{grams(netW)} g</span>
                              <span className="text-[9px] text-[#455f8a] font-bold">{ex.purity || "22K Purity"}</span>
                            </div>
                            <div className="bg-[#7a5900]/10 p-1.5 rounded flex flex-col items-end">
                              <span className="font-hanken text-[8px] text-[#7a5900] uppercase">Buyback Rate</span>
                              <span className="font-bold text-[#1d1b19]">{inr(rateW)} / g</span>
                              <span className="text-[9px] text-[#7a5900] font-bold">Spot Valuation</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 bg-white px-3 py-2 rounded text-xs border border-[#d2c5b1]/40">
                      <div className="flex items-center gap-3 text-[#4e4637]">
                        <span>Assaying &amp; Melting Service Fee: <strong className="text-[#1d1b19]">₹0.00 (Waived for Exchange)</strong></span>
                        <span className="text-[#d2c5b1]">•</span>
                        <span className="text-[10px]">Formula: Total Net Melt Weight × Buyback Spot Rate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-hanken text-[10px] text-[#455f8a] font-bold uppercase tracking-wider">
                          Total Old Gold Credit Voucher (B):
                        </span>
                        <span className="font-bodoni text-base font-bold text-[#455f8a]">
                          {inr(oldGoldCredit)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded border border-[#d2c5b1]/40 flex items-center justify-between text-xs text-[#4e4637]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#7a5900] font-bold">No Old Gold Handed Over:</span>
                      <span>This transaction does not include old jewellery melting or trade-in exchange credit.</span>
                    </div>
                    <div className="font-hanken text-[10px] font-bold text-[#455f8a]">
                      CREDIT VOUCHER (B): ₹0.00
                    </div>
                  </div>
                )}
              </div>

              {/* 5. FINAL SETTLEMENT & NET PAYABLE SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                {/* Left: Payment Receipts & Authentication Badges */}
                <div className="md:col-span-6 bg-[#f9f2ee] p-3 sm:p-4 rounded flex flex-col justify-between">
                  <div>
                    <span className="font-hanken text-[9px] text-[#7a5900] uppercase font-bold tracking-wider">
                      Payment Mode &amp; Audit Reference
                    </span>
                    <div className="mt-2 space-y-1.5 text-xs">
                      {invoice.payments && invoice.payments.length > 0 ? (
                        invoice.payments.map((p, pIdx) => (
                          <div key={pIdx} className="flex justify-between items-center py-0.5 border-b border-[#d2c5b1]/30">
                            <span className="flex items-center gap-1.5 text-[#4e4637]">
                              <svg className="w-3.5 h-3.5 text-[#455f8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              <span>{p.method} {p.reference ? `(Ref: ${p.reference})` : ""}</span>
                            </span>
                            <span className="font-bold text-[#1d1b19]">{inr(num(p.amount))}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[#4e4637] italic">No digital payments recorded against this invoice.</div>
                      )}

                      <div className="flex justify-between items-center py-1 bg-white px-2 rounded mt-1">
                        <span className="text-[#4e4637] font-hanken text-[9px] uppercase font-bold">Total Settled Assets:</span>
                        <span className="font-bold text-[#7a5900]">
                          {inr(paidAmount)} {balance <= 0 ? "(PAID IN FULL)" : `(BALANCE DUE: ${inr(balance)})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hallmarking Regulatory Stamps */}
                  <div className="mt-4 pt-3 border-t border-[#d2c5b1]/40 flex flex-wrap items-center justify-between gap-2 text-[#4e4637]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#7a5900]/10 flex items-center justify-center text-[#7a5900] font-bold text-xs border border-[#7a5900]/30">
                        BIS
                      </div>
                      <div className="flex flex-col">
                        <span className="font-hanken text-[8px] font-bold text-[#1d1b19] uppercase">BIS 916 Standard</span>
                        <span className="text-[9px] text-[#4e4637]">Assayed Govt Certified</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#455f8a]/10 flex items-center justify-center text-[#455f8a] font-bold text-xs border border-[#455f8a]/30">
                        IGI
                      </div>
                      <div className="flex flex-col">
                        <span className="font-hanken text-[8px] font-bold text-[#1d1b19] uppercase">Natural Diamonds</span>
                        <span className="text-[9px] text-[#4e4637]">Conflict-free Certified</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-[#d2c5b1]/40">
                      <VerifiedSealBadge />
                      <span className="font-hanken text-[8px] font-bold text-[#7a5900] uppercase">100% Buyback Assurance</span>
                    </div>
                  </div>
                </div>

                {/* Right: The Net Settlement Calculation Box (High Visual Weight in Royal Secondary Blue) */}
                <div className="md:col-span-6 bg-[#455f8a] text-white p-3 sm:p-4 rounded flex flex-col justify-between shadow-md">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[#d6e3ff]">
                      <span>Gross New Jewelry Value (A):</span>
                      <span className="font-medium text-white">{inr(grossNewValue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#ffdf9f]">
                      <span>Less: Old Gold Purchase Credit (B):</span>
                      <span className="font-medium text-[#ffdf9f]">- {inr(oldGoldCredit)}</span>
                    </div>
                    {roundOff !== 0 && (
                      <div className="flex justify-between items-center text-[#d6e3ff]">
                        <span>Rounding Adjustment:</span>
                        <span className="font-medium text-white">{roundOff > 0 ? `+ ${inr(roundOff)}` : `- ${inr(Math.abs(roundOff))}`}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-white/20">
                      <span className="font-hanken text-[9.5px] tracking-widest text-[#ffdea1] uppercase font-bold">
                        Final Net Payable By Customer
                      </span>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="font-bodoni text-xl sm:text-2xl font-bold text-white tracking-wide">
                          {inr(netPayable)}
                        </span>
                        <span className="font-hanken text-[9px] text-[#ffdf9f] bg-white/15 px-2 py-0.5 rounded font-bold">
                          {balance <= 0 ? "BALANCE NIL" : `DUE: ${inr(balance)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount in Words */}
                  <div className="mt-3 bg-white/10 p-2 rounded">
                    <span className="font-hanken text-[8px] uppercase tracking-wider text-[#d6e3ff] block">
                      Amount in words:
                    </span>
                    <span className="font-bodoni text-xs italic text-white block leading-tight mt-0.5">
                      {amountInWords(netPayable)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. LEGAL DECLARATION & SIGNATURE BLOCKS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                {/* Declarations & Statutory Disclaimers */}
                <div className="md:col-span-7 flex flex-col justify-between text-xs text-[#4e4637] space-y-1.5">
                  <p>
                    <strong>Statutory Tax Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Certified 100% BIS 916 Hallmarked Jewellery &amp; IGI Certified Diamonds.
                  </p>
                  <p>
                    <strong>Exchange &amp; Buyback Warranty:</strong> Gold value credited based on net precious metal content verified by XRF spectrometer test. Handcrafted stones, lac, and enamel calculated at strictly zero gold weight value.
                  </p>
                  <p className="font-bold text-[#7a5900]">
                    Printed on both sides. Please refer to reverse side (Side B) for complete Surya Gold &amp; Diamonds Warranty, Lifetime Maintenance &amp; Dispute Jurisdiction terms.
                  </p>

                  <div className="mt-4 pt-3 flex items-center gap-4">
                    <div className="w-44 border-b border-[#d2c5b1] pb-1">
                      <span className="text-xs text-[#4e4637] block italic">
                        {invoice.customerName || "Customer Name"}
                      </span>
                    </div>
                    <span className="font-hanken text-[8px] text-[#4e4637] uppercase font-bold">
                      Customer Acknowledgment &amp; Acceptance Signature
                    </span>
                  </div>
                </div>

                {/* Signatory Authority & Ornate Gold Stamp */}
                <div className="md:col-span-5 flex flex-col items-center justify-between text-center relative bg-[#f9f2ee] p-4 rounded border border-[#d2c5b1]/40">
                  {/* Subtle Hand-Stamped Authenticity Seal Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-85 rotate-[-4deg] select-none">
                    <div className="w-32 h-32 rounded-full border-2 border-[#7a5900]/40 p-1 flex flex-col items-center justify-center text-[#7a5900]">
                      <div className="w-full h-full rounded-full border border-dashed border-[#7a5900]/40 flex flex-col items-center justify-center p-2">
                        <VerifiedSealBadge />
                        <span className="font-hanken text-[7px] tracking-widest font-bold uppercase mt-0.5">Surya Atelier</span>
                        <span className="font-hanken text-[6px] text-[#455f8a] font-bold uppercase">AUTHENTICATED</span>
                        <span className="text-[7px] text-[#4e4637]">{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full text-right font-hanken text-[9px] text-[#4e4637]">
                    TELANGANA JURISDICTION
                  </div>

                  <div className="my-5">
                    {/* Artistic Signature Wave */}
                    <svg className="w-36 h-8 text-[#455f8a] opacity-70" fill="none" viewBox="0 0 160 35">
                      <path d="M5 25C25 5 45 32 65 18C85 4 105 30 125 15C135 7 145 28 155 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div className="w-full pt-1">
                    <span className="font-hanken text-[10px] text-[#1d1b19] font-bold uppercase block tracking-wider">
                      For {shop.name || "Surya Gold & Diamonds"}
                    </span>
                    <span className="font-hanken text-[8px] text-[#4e4637] uppercase tracking-widest">
                      Authorized Signatory / Atelier Manager
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Micro-Bar Code & Document Verification String */}
              <div className="pt-2 border-t border-[#d2c5b1]/40 flex flex-col sm:flex-row items-center justify-between gap-1 text-[9px] text-[#4e4637]">
                <div className="flex items-center gap-2">
                  <span>SECURITY HASH: 9a2e-{invoice.invoiceNo.toLowerCase().replace(/[^a-z0-9]/g, "")}-7113</span>
                  <span className="text-[#d2c5b1]">•</span>
                  <span>DOC REF: SGD-A4-INV-2025-V2</span>
                </div>
                <div className="flex items-center gap-2 font-hanken text-[8px] uppercase tracking-widest text-[#7a5900] font-bold">
                  <span>Archival Cotton Rag Grade Stationery</span>
                  <span className="text-[#d2c5b1]">•</span>
                  <span>Page 1 of 2 (Side A)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SIDE B: TERMS & CONDITIONS BACK (SIDE B)
          ============================================================ */}
      {(activeTab === "side-b" || activeTab === "both") && (
        <div
          id="invoice-sheet-side-b"
          className={`print-sheet relative w-full max-w-[960px] bg-white shadow-[0_16px_40px_rgba(29,27,25,0.08),0_4px_12px_rgba(29,27,25,0.04)] p-4 sm:p-8 md:p-10 transition-all duration-300 text-[#1d1b19] font-garamond ${
            activeTab === "both" ? "mt-8 page-break-before" : ""
          }`}
        >
          {/* Faint Gold Insignia Watermark Centered */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
            <img
              alt="Surya Watermark Insignia"
              className="w-[520px] h-[520px] object-contain opacity-[0.038] mix-blend-multiply"
              src="/surya-watermark.png"
            />
          </div>

          {/* Outer Double Filigree Decorative Framing */}
          <div className="relative z-10 w-full p-[3px] bg-[#7a5900]/20 rounded-none">
            <div className="w-full p-[2px] bg-white">
              <div className="w-full p-4 sm:p-6 bg-white relative">
                {/* Corner Geometric Filigree Accents */}
                <TopLeftFiligree />
                <TopRightFiligree />

                {/* HEADER SECTION */}
                <header className="flex flex-col items-center text-center pb-3">
                  {/* Top Alignment Indicator */}
                  <div className="w-full flex items-center justify-between pb-1 text-[#4e4637] font-hanken text-[9px]">
                    <span className="tracking-widest">[ REVERSE SIDE - SIDE B | DUPLEX PRINT ALIGNED ]</span>
                    <span className="tracking-widest">SHEET SERIAL: SGD/DOC/2025-REV</span>
                  </div>

                  {/* Brand Emblem & Title */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="w-10 h-10 p-0.5 rounded-full bg-[#f3ede9] flex items-center justify-center shadow-xs">
                      <img
                        alt="Surya Logo"
                        className="w-8 h-8 object-contain"
                        src={shop.logoUrl || "/surya-seal.png"}
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <h1 className="font-bodoni text-lg tracking-wider text-[#1d1b19] uppercase font-bold">
                        {shop.name || "SURYA GOLD & DIAMONDS"}
                      </h1>
                      <span className="font-hanken text-[9px] text-[#7a5900] tracking-widest uppercase font-bold">
                        ATELIER DE HAUTE JOAILLERIE • EST. 1984
                      </span>
                    </div>
                  </div>

                  {/* Ornamental Gold Filigree Center Divider */}
                  <div className="w-full max-w-md my-1 flex items-center justify-center gap-2">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c59b3f] to-[#7a5900]"></span>
                    <span className="text-[#7a5900] font-bodoni rotate-45 inline-block text-[10px]">◆</span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#c59b3f] to-[#7a5900]"></span>
                  </div>

                  <div className="space-y-0.5">
                    <h2 className="font-bodoni text-base text-[#455f8a] uppercase font-bold tracking-widest">
                      TERMS &amp; CONDITIONS: SURYA GOLD AND DIAMONDS
                    </h2>
                    <p className="text-xs text-[#4e4637] italic">
                      Official Customer Charter, Purity Assurance, Exchange &amp; Buyback Regulations
                    </p>
                  </div>
                </header>

                {/* 2-COLUMN STRUCTURED LEGAL PRINT BODY */}
                <main className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2 text-justify text-xs leading-relaxed">
                  {/* COLUMN 1 */}
                  <div className="flex flex-col gap-3">
                    {/* SECTION 1: GENERAL */}
                    <section className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#455f8a] text-white font-hanken text-[9px] flex items-center justify-center font-bold">
                          1
                        </span>
                        <h3 className="font-bodoni text-xs uppercase text-[#455f8a] font-bold">
                          GENERAL TERMS
                        </h3>
                      </div>
                      <ul className="space-y-1 text-[#1d1b19]">
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>The name <strong>Surya Gold and Diamonds</strong> stands for uncompromising purity, heritage artistry, and trust.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>All transactions are valid only against a verified computer-generated Tax Invoice. Hand-written slips or informal receipts are null and void.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>Delivery of products paid via local cheque, DD, or digital transfer (NEFT/RTGS/UPI) will be made strictly after confirmed realization of funds into our institutional account.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <div>
                            <strong>Rate Booking (Fixed):</strong> Customers may fix the gold/silver rate by paying a 75% advance for jewelry and 100% advance for coins. The delivery will be honored at the booked rate, provided the product is collected within 30 calendar days. After 30 days, Surya Gold and Diamonds reserves the right to cancel the order and refund the amount after deducting applicable value addition and making charges.
                          </div>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span><strong>Rate Booking (Non-Fixed):</strong> If an advance of only 25% is paid, the benchmark gold rate prevailing at the time of final payment and physical delivery shall apply without exception.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>The weight of precious metal is considered as nett weight only, strictly excluding pearls, uncut/cut stones, enameling (Meenakari), dust, lacquer, or extraneous synthetic materials.</span>
                        </li>
                      </ul>
                    </section>

                    {/* SECTION 2: OLD GOLD EXCHANGE POLICY */}
                    <section className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#455f8a] text-white font-hanken text-[9px] flex items-center justify-center font-bold">
                          2
                        </span>
                        <h3 className="font-bodoni text-xs uppercase text-[#455f8a] font-bold">
                          OLD GOLD EXCHANGE POLICY
                        </h3>
                      </div>
                      <ul className="space-y-1 text-[#1d1b19]">
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>Surya Gold and Diamonds accepts genuine old gold ornaments and certified bullion for exchange against new showroom purchases.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span><strong>Valuation:</strong> Old gold will be objectively valued based on prevailing market buy-rates of the transaction date following an electronic purity check (Niton DXL XRF Spectrometer test).</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span><strong>Adjustment:</strong> The approved gross valuation of the old gold will be directly credited and deducted from the invoice value of the new jewelry selected.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span><strong>Balance Payment:</strong> The customer shall settle the balance difference (new purchase value minus certified old gold credit), including statutory GST.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>Purity testing and physical melting of old ornaments will be performed in the direct presence of the customer. Our post-test valuation is final and legally binding.</span>
                        </li>
                      </ul>
                    </section>

                    {/* SECTION 3: EXCHANGE POLICY (NEW ORNAMENTS) */}
                    <section className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#455f8a] text-white font-hanken text-[9px] flex items-center justify-center font-bold">
                          3
                        </span>
                        <h3 className="font-bodoni text-xs uppercase text-[#455f8a] font-bold">
                          EXCHANGE POLICY (NEW ORNAMENTS)
                        </h3>
                      </div>
                      <ul className="space-y-1 text-[#1d1b19]">
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>Jewelry may be exchanged at our atelier within <strong>SEVEN (7) calendar days</strong> from the date of invoice, provided the piece is presented in original mint condition with intact hallmark tags and original bill.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>If the returned ornament is inspected and found tampered with, resized, altered, re-soldered, or damaged, appropriate metallurgical deductions will apply.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>Replacement items must equal or exceed the full value of the returned item. Incremental weight or price delta will be billed at the prevailing spot rate of the exchange day.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>For Diamond, Polki, or Platinum items, an additional deduction of <strong>2.5%</strong> will be applied against the invoice value if the original gemological certificate (IGI/GIA) is not submitted upon return.</span>
                        </li>
                      </ul>
                    </section>
                  </div>

                  {/* COLUMN 2 */}
                  <div className="flex flex-col gap-3">
                    {/* SECTION 4: BUYBACK & REFUND POLICY */}
                    <section className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#455f8a] text-white font-hanken text-[9px] flex items-center justify-center font-bold">
                          4
                        </span>
                        <h3 className="font-bodoni text-xs uppercase text-[#455f8a] font-bold">
                          BUYBACK &amp; REFUND POLICY
                        </h3>
                      </div>
                      <p className="text-[#1d1b19]">
                        Any return of product for cash or bank disbursement will incur standard institutional depreciation deductions as tabulated:
                      </p>

                      {/* Deductions Table */}
                      <div className="bg-[#f9f2ee] rounded overflow-hidden border border-[#d2c5b1]/40">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#455f8a] text-white font-hanken text-[9px] uppercase">
                            <tr>
                              <th className="py-1 px-2.5">Category</th>
                              <th className="py-1 px-2.5 text-right">Applicable Deduction</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ede7e3]">
                            <tr className="bg-white">
                              <td className="py-1 px-2.5 font-medium">Studded &amp; Diamond Jewelry</td>
                              <td className="py-1 px-2.5 text-right text-[#ba1a1a] font-bold">15% deduction on total value</td>
                            </tr>
                            <tr className="bg-[#f9f2ee]">
                              <td className="py-1 px-2.5 font-medium">Gold &amp; Silver Bullion Coins</td>
                              <td className="py-1 px-2.5 text-right font-bold">1% on prevailing metal rate</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="py-1 px-2.5 font-medium">Plain Gold Jewelry (22K / 18K)</td>
                              <td className="py-1 px-2.5 text-right font-bold">3% on gold value + making/taxes</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="p-2 bg-[#ffdea1]/30 rounded text-[#5c4300] flex items-start gap-1.5 border border-[#c59b3f]/40">
                        <svg className="w-4 h-4 text-[#7a5900] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>
                          <strong>Statutory Bank Regulation:</strong> As per RBI and IT guidelines, payments for returns/buybacks exceeding <strong>Rs. 10,000/-</strong> will be disbursed solely via RTGS/NEFT to the verified customer bank account within 5 banking business days.
                        </span>
                      </div>
                    </section>

                    {/* SECTION 5: WARRANTY & CERTIFICATION */}
                    <section className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#455f8a] text-white font-hanken text-[9px] flex items-center justify-center font-bold">
                          5
                        </span>
                        <h3 className="font-bodoni text-xs uppercase text-[#455f8a] font-bold">
                          WARRANTY &amp; CERTIFICATION
                        </h3>
                      </div>
                      <ul className="space-y-1 text-[#1d1b19]">
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span><strong>BIS Hallmark:</strong> Every piece of gold jewelry crafted by Surya Gold and Diamonds carries the mandatory Bureau of Indian Standards (BIS) Hallmark along with a laser-engraved 6-character alpha-numeric Hallmark Unique Identification (HUID) code.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>Warranty for timepieces, luxury writing instruments, and third-party branded luxury goods is governed strictly by original manufacturer guarantees.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span>Silver gifting articles and commemorative artifacts once sold are eligible for replacement under the 7-day exchange clause but cannot be surrendered for cash refund.</span>
                        </li>
                      </ul>
                    </section>

                    {/* SECTION 6: PRIVACY & DISPUTES */}
                    <section className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#455f8a] text-white font-hanken text-[9px] flex items-center justify-center font-bold">
                          6
                        </span>
                        <h3 className="font-bodoni text-xs uppercase text-[#455f8a] font-bold">
                          PRIVACY &amp; JURISDICTION
                        </h3>
                      </div>
                      <ul className="space-y-1 text-[#1d1b19]">
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span><strong>Customer Privacy:</strong> We maintain strict confidentiality protocols and do not disclose or distribute your Personally Identifiable Information (PII) or transaction records to third-party entities.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-[#7a5900] mt-1 text-[8px]">•</span>
                          <span><strong>Jurisdiction:</strong> Any dispute arising out of or in connection with this transaction shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana.</span>
                        </li>
                      </ul>
                    </section>
                  </div>
                </main>

                {/* Footer Stamp & Archival Details */}
                <div className="mt-4 pt-3 border-t border-[#d2c5b1]/40 flex flex-col sm:flex-row items-center justify-between gap-1 text-[9px] text-[#4e4637]">
                  <div className="flex items-center gap-2">
                    <span>SECURITY CODE: SGD-REV-CHARTER-2025</span>
                    <span className="text-[#d2c5b1]">•</span>
                    <span>ATELIER AUTHENTICATION SEAL: ACTIVE</span>
                  </div>
                  <div className="flex items-center gap-2 font-hanken text-[8px] uppercase tracking-widest text-[#7a5900] font-bold">
                    <span>Archival Cotton Rag Grade Stationery</span>
                    <span className="text-[#d2c5b1]">•</span>
                    <span>Page 2 of 2 (Side B)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          INTERACTIVE SLIDE-OVER DRAWER MODAL (Side B Preview)
          ============================================================ */}
      {isTermsDrawerOpen && (
        <div
          className="no-print fixed inset-0 z-50 bg-[#32302e]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTermsDrawerOpen(false);
          }}
        >
          <div className="bg-white max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl p-6 flex flex-col gap-4 border border-[#d2c5b1]">
            <div className="flex items-center justify-between pb-2 border-b border-[#d2c5b1]/40 bg-[#f9f2ee] -mx-6 -mt-6 p-4 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#455f8a] text-white flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div>
                  <h2 className="font-bodoni text-base font-bold text-[#1d1b19]">
                    Side B: Terms of Warranty &amp; Valuation Policy
                  </h2>
                  <span className="font-hanken text-[10px] text-[#7a5900] tracking-widest uppercase font-bold">
                    Surya Gold &amp; Diamonds Atelier Legal Charter
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsDrawerOpen(false)}
                className="p-1 rounded-full text-[#4e4637] hover:text-[#1d1b19] hover:bg-[#ede7e3] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="font-garamond text-xs space-y-3 leading-relaxed text-[#1d1b19]">
              <div>
                <h3 className="font-hanken text-[10px] text-[#455f8a] uppercase font-bold">
                  1. Lifetime Exchange &amp; Buyback Policy
                </h3>
                <p className="text-[#4e4637]">
                  Gold &amp; Diamond jewelry purchased under this invoice qualifies for 100% lifetime value exchange against current benchmark gold rates at the date of presentation, minus stone depreciation and standard assay melting parameters. Plain gold items are eligible for 100% exchange credit against new ornaments.
                </p>
              </div>

              <div>
                <h3 className="font-hanken text-[10px] text-[#455f8a] uppercase font-bold">
                  2. BIS Hallmark &amp; HUID Authenticity
                </h3>
                <p className="text-[#4e4637]">
                  Every precious item sold by Surya Gold &amp; Diamonds carries a statutory 6-digit alphanumeric Hallmark Unique Identification (HUID) laser-engraved with the Bureau of Indian Standards (BIS) emblem. Customers can verify authenticity instantaneously using the BIS Care mobile application.
                </p>
              </div>

              <div>
                <h3 className="font-hanken text-[10px] text-[#455f8a] uppercase font-bold">
                  3. Old Gold Assaying &amp; Valuation Norms
                </h3>
                <p className="text-[#4e4637]">
                  Old gold accepted for purchase or exchange credit is subject to computerised X-ray Fluorescence (XRF) non-destructive spectroscopic assay testing. All weight deductions on account of dirt, lac, strings, glass, or extraneous stones are agreed upon prior to melt valuation and are legally binding.
                </p>
              </div>

              <div>
                <h3 className="font-hanken text-[10px] text-[#455f8a] uppercase font-bold">
                  4. Dispute Jurisdiction
                </h3>
                <p className="text-[#4e4637]">
                  All transactions covered under this invoice are governed by the laws of India. Any legal proceedings or disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#d2c5b1]/40">
              <button
                type="button"
                onClick={() => {
                  setIsTermsDrawerOpen(false);
                  handlePrint("side-b");
                }}
                className="px-4 py-2 bg-[#455f8a] text-white font-hanken text-xs font-bold tracking-wider uppercase rounded shadow-xs hover:bg-[#3c5781] transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Reverse Side (Side B)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTermsDrawerOpen(false)}
                className="px-4 py-2 bg-[#f3ede9] text-[#1d1b19] font-hanken text-xs font-semibold rounded hover:bg-[#ede7e3] transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
