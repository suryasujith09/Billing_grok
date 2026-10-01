import React from "react";
import { amountInWords, formatDate, grams, inr, num } from "@/lib/money";
import { labelize } from "@/lib/constants";

type InvoiceDoc = {
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
    category: string;
    grossWeight: unknown;
    stoneWeight: unknown;
    netWeight: unknown;
    ratePerGram: unknown;
    goldValue: unknown;
    makingAmount: unknown;
    wastageAmount: unknown;
    stoneCharge: unknown;
    hallmarkCharge: unknown;
    otherCharge?: unknown;
    lineTotal: unknown;
  }>;
  exchanges: Array<{
    description: string;
    purity: string;
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
};

type ShopDoc = {
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

/**
 * Official BIS Hallmark — precise SVG replica of the Bureau of Indian Standards
 * triangle hallmark mark as used on certified gold jewellery in India.
 * The mark consists of: outer triangle border, inner triangle fill, vertical
 * line of purity, and the BIS text.
 */
function BisHallmarkMark({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BIS Hallmark — Bureau of Indian Standards Certified"
    >
      {/* Outer circle background */}
      <circle cx="60" cy="60" r="58" fill="#4a1518" stroke="#c4a35a" strokeWidth="3" />

      {/* Gold triangle (BIS hallmark triangle shape) */}
      <polygon
        points="60,14 104,90 16,90"
        fill="none"
        stroke="#ead08a"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Inner triangle fill — lighter */}
      <polygon
        points="60,26 96,84 24,84"
        fill="#ead08a"
        opacity="0.12"
      />

      {/* Vertical line inside triangle */}
      <line x1="60" y1="30" x2="60" y2="80" stroke="#ead08a" strokeWidth="4.5" strokeLinecap="round" />
      {/* Small diamond / dot at center */}
      <circle cx="60" cy="55" r="5.5" fill="#ead08a" />

      {/* BIS text */}
      <text
        x="60"
        y="108"
        textAnchor="middle"
        fill="#ead08a"
        fontSize="11"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        letterSpacing="2"
      >
        BIS
      </text>
    </svg>
  );
}

/**
 * 916 / 22K purity badge
 */
function PurityBadge({ label = "916 · 22K" }: { label?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={label}
    >
      <circle cx="24" cy="24" r="22" fill="#4a1518" stroke="#c4a35a" strokeWidth="2" />
      <text x="24" y="20" textAnchor="middle" fill="#ead08a" fontSize="9" fontWeight="bold" fontFamily="Arial">
        916
      </text>
      <text x="24" y="31" textAnchor="middle" fill="#ead08a" fontSize="7.5" fontFamily="Arial">
        22 KARAT
      </text>
      <text x="24" y="40" textAnchor="middle" fill="#c4a35a" fontSize="5.5" fontFamily="Arial">
        GOLD
      </text>
    </svg>
  );
}

/**
 * Decorative gold divider with diamond motif
 */
function GoldDivider() {
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c4a35a] to-[#c4a35a]" />
      <svg width="10" height="10" viewBox="0 0 10 10">
        <polygon points="5,0 10,5 5,10 0,5" fill="#c4a35a" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c4a35a] to-[#c4a35a]" />
    </div>
  );
}

/**
 * UPI QR placeholder pattern
 */
function UpiQrPattern() {
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0" fill="#4a1518">
      {/* Corner 1 (Top-Left) */}
      <rect x="5" y="5" width="26" height="26" rx="2" fill="none" stroke="#4a1518" strokeWidth="5" />
      <rect x="11" y="11" width="14" height="14" rx="1" fill="#4a1518" />
      {/* Corner 2 (Top-Right) */}
      <rect x="69" y="5" width="26" height="26" rx="2" fill="none" stroke="#4a1518" strokeWidth="5" />
      <rect x="75" y="11" width="14" height="14" rx="1" fill="#4a1518" />
      {/* Corner 3 (Bottom-Left) */}
      <rect x="5" y="69" width="26" height="26" rx="2" fill="none" stroke="#4a1518" strokeWidth="5" />
      <rect x="11" y="75" width="14" height="14" rx="1" fill="#4a1518" />
      {/* Dynamic Data Modules */}
      <rect x="36" y="8" width="6" height="6" />
      <rect x="46" y="8" width="6" height="6" />
      <rect x="56" y="14" width="6" height="6" />
      <rect x="36" y="20" width="6" height="6" />
      <rect x="48" y="26" width="6" height="6" />
      <rect x="10" y="38" width="6" height="6" />
      <rect x="22" y="38" width="6" height="6" />
      <rect x="34" y="36" width="6" height="6" />
      <rect x="44" y="44" width="12" height="12" rx="2" />
      <rect x="62" y="38" width="6" height="6" />
      <rect x="74" y="38" width="6" height="6" />
      <rect x="86" y="44" width="6" height="6" />
      <rect x="8" y="54" width="6" height="6" />
      <rect x="26" y="52" width="6" height="6" />
      <rect x="38" y="58" width="6" height="6" />
      <rect x="60" y="56" width="6" height="6" />
      <rect x="72" y="64" width="6" height="6" />
      <rect x="84" y="58" width="6" height="6" />
      <rect x="38" y="72" width="6" height="6" />
      <rect x="50" y="76" width="6" height="6" />
      <rect x="62" y="72" width="6" height="6" />
      <rect x="80" y="78" width="6" height="6" />
      <rect x="44" y="86" width="6" height="6" />
      <rect x="68" y="86" width="6" height="6" />
      <rect x="86" y="88" width="6" height="6" />
    </svg>
  );
}

export function InvoiceDocument({
  invoice,
  shop,
}: {
  invoice: InvoiceDoc;
  shop: ShopDoc;
}) {
  const logoSrc = shop.logoUrl && shop.logoUrl.trim() !== "" ? shop.logoUrl : "/logo.png";

  const totalGrossWeight = invoice.items.reduce((s, i) => s + num(i.grossWeight), 0);
  const totalStoneWeight = invoice.items.reduce((s, i) => s + num(i.stoneWeight), 0);
  const totalNetWeight = invoice.items.reduce((s, i) => s + num(i.netWeight), 0);
  const totalGoldVal = invoice.items.reduce((s, i) => s + num(i.goldValue), 0);
  const totalMakingVal = invoice.items.reduce((s, i) => s + num(i.makingAmount), 0);

  const balance = num(invoice.balanceAmount);
  const isCancelled = invoice.status === "CANCELLED";

  return (
    <article
      className="print-sheet relative mx-auto w-full max-w-[210mm] bg-white text-[#1c110c] shadow-xl"
      style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
    >
      {/* ======================================================= */}
      {/* OUTER GOLD BORDER FRAME                                 */}
      {/* ======================================================= */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: "2.5px solid #c4a35a",
          margin: "4px",
          borderRadius: "1px",
        }}
      />
      {/* Inner thin border */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: "1px solid #c4a35a",
          margin: "8px",
          opacity: 0.4,
        }}
      />
      {/* Corner ornaments */}
      {[
        "top-1.5 left-1.5",
        "top-1.5 right-1.5 -scale-x-100",
        "bottom-1.5 left-1.5 -scale-y-100",
        "bottom-1.5 right-1.5 scale-[-1]",
      ].map((pos, i) => (
        <svg
          key={i}
          width="18"
          height="18"
          viewBox="0 0 18 18"
          className={`absolute pointer-events-none ${pos}`}
          fill="none"
        >
          <path d="M1 17 L1 1 L17 1" stroke="#c4a35a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M4 14 L4 4 L14 4" stroke="#c4a35a" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        </svg>
      ))}

      {/* Cancelled watermark */}
      {isCancelled && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-10">
          <span
            className="select-none font-black tracking-widest text-red-700 uppercase"
            style={{
              fontSize: "72px",
              border: "8px solid #b91c1c",
              padding: "12px 28px",
              transform: "rotate(-12deg)",
              lineHeight: 1,
            }}
          >
            CANCELLED
          </span>
        </div>
      )}

      {/* Main content with padding */}
      <div className="relative px-7 py-6" style={{ zIndex: 1 }}>

        {/* ============================================================== */}
        {/* 1. HEADER — Shop Brand + Logo + Invoice ID + BIS Badge          */}
        {/* ============================================================== */}
        <header className="mb-1">
          {/* Gold gradient top accent bar */}
          <div
            className="mb-4 h-1.5 w-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #4a1518 0%, #c4a35a 40%, #ead08a 60%, #c4a35a 80%, #4a1518 100%)",
            }}
          />

          <div className="flex items-start justify-between gap-4">
            {/* LEFT: Logo + Shop info */}
            <div className="flex items-center gap-4">
              {/* Company Logo — prominent */}
              <div
                className="shrink-0 overflow-hidden"
                style={{
                  width: "88px",
                  height: "88px",
                  border: "2.5px solid #c4a35a",
                  borderRadius: "4px",
                  background: "#fdfbf7",
                  padding: "4px",
                  boxShadow: "0 2px 8px rgba(196,163,90,0.25)",
                }}
              >
                <img
                  src={logoSrc}
                  alt={`${shop.name} Logo`}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  crossOrigin="anonymous"
                />
              </div>

              {/* Shop name + address */}
              <div>
                <div
                  className="inline-block mb-0.5 px-2 py-0.5 text-[9px] font-bold tracking-[0.25em] uppercase"
                  style={{ background: "#4a1518", color: "#ead08a", letterSpacing: "0.22em" }}
                >
                  Jewellery House · Est. Tradition of Purity
                </div>
                <h1
                  className="font-bold leading-tight"
                  style={{
                    fontSize: "24px",
                    color: "#4a1518",
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {shop.name}
                </h1>
                {shop.legalName && shop.legalName !== shop.name && (
                  <p className="text-[11px] font-semibold" style={{ color: "#74685c" }}>
                    {shop.legalName}
                  </p>
                )}
                <p className="text-[10.5px] leading-snug mt-0.5" style={{ color: "#74685c" }}>
                  {[shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(", ")}
                  {shop.stateCode ? ` (State Code: ${shop.stateCode})` : ""}
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: "#74685c" }}>
                  {shop.phone ? `Tel: ${shop.phone}` : ""}
                  {shop.email ? ` · ${shop.email}` : ""}
                </p>
              </div>
            </div>

            {/* RIGHT: BIS Hallmark badge + Tax Invoice label + Invoice number */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* BIS Badge + 916 badge row */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <BisHallmarkMark size={52} />
                  <span
                    className="text-[7.5px] font-bold tracking-widest uppercase mt-0.5"
                    style={{ color: "#4a1518" }}
                  >
                    HALLMARKED
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <PurityBadge />
                  <span
                    className="text-[7.5px] font-bold tracking-widest uppercase mt-0.5"
                    style={{ color: "#4a1518" }}
                  >
                    CERTIFIED
                  </span>
                </div>
              </div>

              {/* Tax Invoice box */}
              <div
                className="text-center px-4 py-2 mt-1"
                style={{
                  border: "2px solid #c4a35a",
                  background: "#fdfbf7",
                  minWidth: "140px",
                }}
              >
                <p
                  className="font-bold tracking-[0.3em] uppercase"
                  style={{ fontSize: "11px", color: "#4a1518" }}
                >
                  Tax Invoice
                </p>
                <p
                  className="text-[8px] tracking-wider uppercase mt-0.5"
                  style={{ color: "#74685c" }}
                >
                  Original for Recipient
                </p>
                <div
                  className="mt-2 pt-2"
                  style={{ borderTop: "1px solid #e7dcc8" }}
                >
                  <p
                    className="font-bold"
                    style={{
                      fontSize: "15px",
                      color: "#4a1518",
                      fontFamily: "'Georgia', serif",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {invoice.invoiceNo}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#74685c" }}>
                    Date:{" "}
                    <strong style={{ color: "#1c110c" }}>{formatDate(invoice.date)}</strong>
                  </p>
                </div>
              </div>

              {/* GSTIN / PAN */}
              <div
                className="text-[10px] space-y-0.5 text-right"
                style={{ color: "#74685c" }}
              >
                <p>
                  <span className="font-semibold">GSTIN:</span>{" "}
                  <span
                    className="font-bold"
                    style={{ fontFamily: "monospace", color: "#1c110c" }}
                  >
                    {shop.gstin || "—"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">PAN:</span>{" "}
                  <span
                    className="font-bold"
                    style={{ fontFamily: "monospace", color: "#1c110c" }}
                  >
                    {shop.pan || "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom gold accent bar */}
          <div
            className="mt-4 h-px w-full"
            style={{
              background: "linear-gradient(90deg, #4a1518 0%, #c4a35a 50%, #4a1518 100%)",
            }}
          />
        </header>

        {/* ============================================================== */}
        {/* 2. BIS COMPLIANCE STRIP                                         */}
        {/* ============================================================== */}
        <section
          className="flex flex-wrap items-center justify-between gap-1 px-3 py-1.5 text-[9.5px] mt-2"
          style={{
            background: "#4a1518",
            color: "#ead08a",
          }}
        >
          <div className="flex items-center gap-2 font-bold tracking-wider uppercase">
            <BisHallmarkMark size={18} />
            <span>BIS 916 Hallmarked Jewellery</span>
          </div>
          <div className="flex items-center gap-3 text-[#d8bc78]">
            <span>✦ Certified Purity 22K/916, 18K/750</span>
            <span>✦ 6-Digit Laser HUID</span>
            <span>✦ 100% Lifetime Exchange</span>
          </div>
          <div className="font-medium">
            <span style={{ color: "#d8bc78" }}>Place of Supply: </span>
            <strong style={{ color: "#ffffff" }}>
              {invoice.placeOfSupply || shop.state}
            </strong>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. CUSTOMER DETAILS                                             */}
        {/* ============================================================== */}
        <section
          className="mt-3 grid grid-cols-2 gap-0 text-xs"
          style={{ border: "1px solid #e7dcc8", background: "#fdfbf7" }}
        >
          <div className="p-3" style={{ borderRight: "1px solid #e7dcc8" }}>
            <p
              className="text-[9.5px] font-bold tracking-[0.2em] uppercase mb-1"
              style={{ color: "#4a1518" }}
            >
              Billed To / Consignee
            </p>
            <p
              className="font-bold leading-tight"
              style={{
                fontSize: "14px",
                color: "#1c110c",
                fontFamily: "'Georgia', serif",
              }}
            >
              {invoice.customerName}
            </p>
            {invoice.customerAddr && (
              <p className="text-[10.5px] mt-0.5 leading-tight" style={{ color: "#74685c" }}>
                {invoice.customerAddr}
              </p>
            )}
            {invoice.customerPhone && (
              <p className="text-[10.5px] mt-0.5" style={{ color: "#74685c" }}>
                <span className="font-medium" style={{ color: "#1c110c" }}>Mob:</span>{" "}
                +91 {invoice.customerPhone}
              </p>
            )}
          </div>

          <div className="p-3 text-[10.5px] space-y-0.5" style={{ color: "#74685c" }}>
            <p
              className="text-[9.5px] font-bold tracking-[0.2em] uppercase mb-1"
              style={{ color: "#4a1518" }}
            >
              Tax &amp; Reference Details
            </p>
            <p>
              <span className="font-semibold" style={{ color: "#1c110c" }}>Customer PAN:</span>{" "}
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1c110c" }}>
                {invoice.customerPan || "N/A"}
              </span>
            </p>
            {invoice.customerGstin && (
              <p>
                <span className="font-semibold" style={{ color: "#1c110c" }}>Customer GSTIN:</span>{" "}
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1c110c" }}>
                  {invoice.customerGstin}
                </span>
              </p>
            )}
            <p>
              <span className="font-semibold">HSN Code:</span>{" "}
              <strong style={{ color: "#1c110c" }}>7113</strong>
              <span className="text-[9px] ml-1">(Articles of Jewellery)</span>
            </p>
            <p>
              <span className="font-semibold">Reverse Charge:</span>{" "}
              <strong style={{ color: "#1c110c" }}>No</strong>
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. ITEMIZED JEWELLERY TABLE                                     */}
        {/* ============================================================== */}
        <div className="mt-3 overflow-x-auto">
          <table
            className="w-full border-collapse"
            style={{ fontSize: "10.5px" }}
          >
            <thead>
              <tr
                style={{
                  background: "#4a1518",
                  color: "#ead08a",
                  borderBottom: "2px solid #c4a35a",
                }}
              >
                <th className="px-2 py-2 text-left font-bold" style={{ width: "24px" }}>#</th>
                <th className="px-2 py-2 text-left font-bold">Description &amp; HUID</th>
                <th className="px-2 py-2 text-center font-bold" style={{ width: "52px" }}>Purity</th>
                <th className="px-2 py-2 text-right font-bold" style={{ width: "58px" }}>Gross (g)</th>
                <th className="px-2 py-2 text-right font-bold" style={{ width: "52px" }}>Stone</th>
                <th className="px-2 py-2 text-right font-bold" style={{ width: "58px" }}>Net (g)</th>
                <th className="px-2 py-2 text-right font-bold" style={{ width: "58px" }}>Rate/g</th>
                <th className="px-2 py-2 text-right font-bold" style={{ width: "72px" }}>Gold Val</th>
                <th className="px-2 py-2 text-right font-bold" style={{ width: "60px" }}>Making</th>
                <th className="px-2 py-2 text-right font-bold" style={{ width: "76px" }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => {
                const stone = num(item.stoneWeight);
                return (
                  <tr
                    key={`${item.tagNo}-${index}`}
                    style={{
                      background: index % 2 === 1 ? "#fdfbf7" : "#ffffff",
                      borderBottom: "1px solid #e7dcc8",
                    }}
                  >
                    <td
                      className="px-2 py-1.5 align-top"
                      style={{ color: "#74685c", fontFamily: "monospace" }}
                    >
                      {index + 1}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <p className="font-semibold leading-tight" style={{ color: "#1c110c" }}>
                        {item.description}
                        {item.tagNo ? (
                          <span
                            className="ml-1.5 inline-block px-1 text-[9px] font-bold"
                            style={{
                              background: "#f4eee4",
                              color: "#4a1518",
                              fontFamily: "monospace",
                            }}
                          >
                            #{item.tagNo}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[9.5px] mt-0.5 leading-tight" style={{ color: "#74685c" }}>
                        {labelize(item.category || "Jewellery")} · {item.metal}
                        {item.huid ? (
                          <span
                            className="ml-1.5 font-bold"
                            style={{ color: "#4a1518", fontFamily: "monospace" }}
                          >
                            HUID: {item.huid}
                          </span>
                        ) : null}
                      </p>
                    </td>
                    <td className="px-2 py-1.5 text-center align-top font-bold" style={{ color: "#1c110c" }}>
                      {item.purity}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right align-top"
                      style={{ color: "#74685c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {grams(num(item.grossWeight))}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right align-top"
                      style={{ color: "#74685c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {stone > 0 ? grams(stone) : "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right align-top font-semibold"
                      style={{ color: "#1c110c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {grams(num(item.netWeight))}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right align-top"
                      style={{ color: "#74685c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {inr(num(item.ratePerGram), false)}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right align-top"
                      style={{ color: "#74685c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {inr(num(item.goldValue), false)}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right align-top"
                      style={{ color: "#74685c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {inr(num(item.makingAmount), false)}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right align-top font-bold"
                      style={{ color: "#1c110c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {inr(num(item.lineTotal), false)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: "#faf6ed",
                  borderTop: "2px solid #c4a35a",
                  fontWeight: "bold",
                }}
              >
                <td
                  colSpan={3}
                  className="px-2 py-2 text-right uppercase tracking-wide"
                  style={{
                    color: "#4a1518",
                    fontFamily: "'Georgia', serif",
                    fontSize: "10px",
                  }}
                >
                  Subtotal
                </td>
                <td
                  className="px-2 py-2 text-right"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {grams(totalGrossWeight)}
                </td>
                <td className="px-2 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {totalStoneWeight > 0 ? grams(totalStoneWeight) : "—"}
                </td>
                <td
                  className="px-2 py-2 text-right font-bold"
                  style={{ color: "#4a1518", fontVariantNumeric: "tabular-nums" }}
                >
                  {grams(totalNetWeight)}
                </td>
                <td className="px-2 py-2 text-right">—</td>
                <td
                  className="px-2 py-2 text-right"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {inr(totalGoldVal, false)}
                </td>
                <td
                  className="px-2 py-2 text-right"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {inr(totalMakingVal, false)}
                </td>
                <td
                  className="px-2 py-2 text-right font-bold"
                  style={{ color: "#4a1518", fontVariantNumeric: "tabular-nums" }}
                >
                  {inr(num(invoice.grandTotal), false)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ============================================================== */}
        {/* 5. OLD GOLD EXCHANGE (conditional)                              */}
        {/* ============================================================== */}
        {invoice.exchanges.length > 0 && (
          <section
            className="mt-3 p-3 text-[10.5px]"
            style={{ border: "1px solid #e7dcc8", background: "#fdfbf7" }}
          >
            <div
              className="flex items-center justify-between pb-1.5 mb-2"
              style={{ borderBottom: "1px solid #e7dcc8" }}
            >
              <p
                className="font-bold tracking-wide uppercase"
                style={{
                  color: "#4a1518",
                  fontFamily: "'Georgia', serif",
                  fontSize: "11px",
                }}
              >
                Old Gold Exchange / Purchase Voucher
              </p>
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: "#74685c" }}
              >
                Trade-in Value Adjusted Against Invoice
              </span>
            </div>
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr
                  className="uppercase text-[9px]"
                  style={{ color: "#74685c", borderBottom: "1px solid #e7dcc8" }}
                >
                  <th className="py-1 text-left">Description</th>
                  <th className="py-1 text-center">Purity</th>
                  <th className="py-1 text-right">Net Wt (g)</th>
                  <th className="py-1 text-right">Rate / g</th>
                  <th className="py-1 text-right">Deduct %</th>
                  <th className="py-1 text-right">Net Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.exchanges.map((ex, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f0e8d8" }}>
                    <td className="py-1 font-medium" style={{ color: "#1c110c" }}>
                      {ex.description}
                    </td>
                    <td className="py-1 text-center" style={{ color: "#74685c" }}>
                      {ex.purity}
                    </td>
                    <td
                      className="py-1 text-right"
                      style={{ fontVariantNumeric: "tabular-nums", color: "#74685c" }}
                    >
                      {grams(num(ex.netWeight))}
                    </td>
                    <td
                      className="py-1 text-right"
                      style={{ fontVariantNumeric: "tabular-nums", color: "#74685c" }}
                    >
                      {inr(num(ex.ratePerGram), false)}
                    </td>
                    <td
                      className="py-1 text-right"
                      style={{ color: "#74685c" }}
                    >
                      {num(ex.deductionPercent)}%
                    </td>
                    <td
                      className="py-1 text-right font-semibold"
                      style={{ color: "#2f6b4f", fontVariantNumeric: "tabular-nums" }}
                    >
                      − {inr(num(ex.amount), false)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ============================================================== */}
        {/* 6. FINANCIAL SUMMARY                                            */}
        {/* ============================================================== */}
        <section className="mt-3 grid grid-cols-2 gap-4 text-xs">
          {/* LEFT: Amount in words + payments + bank details */}
          <div className="flex flex-col gap-3">
            {/* Amount in words */}
            <div
              className="p-2.5"
              style={{ border: "1px solid #e7dcc8", background: "#faf7f2" }}
            >
              <p
                className="text-[9.5px] font-bold tracking-wider uppercase mb-0.5"
                style={{ color: "#4a1518" }}
              >
                Amount Chargeable (in words)
              </p>
              <p
                className="font-bold capitalize leading-snug"
                style={{
                  fontSize: "12px",
                  color: "#1c110c",
                  fontFamily: "'Georgia', serif",
                }}
              >
                {amountInWords(num(invoice.netPayable))}
              </p>
            </div>

            {/* Payment settlements */}
            {invoice.payments.length > 0 && (
              <div
                className="p-2.5 text-[10.5px]"
                style={{ border: "1px solid #e7dcc8", background: "#ffffff" }}
              >
                <p
                  className="text-[9.5px] font-bold tracking-wider uppercase mb-1"
                  style={{ color: "#74685c" }}
                >
                  Payment Settlements
                </p>
                <div className="space-y-1">
                  {invoice.payments.map((p, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                      style={{ color: "#1c110c" }}
                    >
                      <span>
                        <strong style={{ color: "#4a1518" }}>{labelize(p.method)}</strong>
                        {p.reference ? (
                          <span style={{ color: "#74685c" }}> · Ref: {p.reference}</span>
                        ) : ""}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {inr(num(p.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bank + UPI QR */}
            {shop.bankName && (
              <div
                className="flex items-center justify-between gap-3 p-2.5 text-[10px]"
                style={{ border: "1px solid #c4a35a", background: "#fdfbf7" }}
              >
                <div>
                  <p className="font-bold tracking-wider uppercase mb-0.5" style={{ color: "#4a1518" }}>
                    Bank / UPI Settlement
                  </p>
                  <p className="leading-loose" style={{ color: "#74685c" }}>
                    <strong style={{ color: "#1c110c" }}>{shop.bankName}</strong>
                    <br />
                    A/c: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1c110c" }}>{shop.bankAccount}</span>
                    <br />
                    IFSC: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1c110c" }}>{shop.ifsc}</span>
                  </p>
                  <p className="font-semibold mt-1" style={{ color: "#c4a35a" }}>
                    Scan QR to pay via UPI
                  </p>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <UpiQrPattern />
                  <span
                    className="text-[7px] tracking-widest uppercase mt-0.5 font-bold"
                    style={{ color: "#74685c" }}
                  >
                    BHIM · UPI
                  </span>
                </div>
              </div>
            )}

            {invoice.notes ? (
              <p className="text-[9.5px] italic" style={{ color: "#74685c" }}>
                <strong>Note:</strong> {invoice.notes}
              </p>
            ) : null}
          </div>

          {/* RIGHT: Tax breakdown + totals */}
          <div
            className="p-3 space-y-1.5 text-[10.5px]"
            style={{ border: "1px solid #e7dcc8", background: "#faf7f2" }}
          >
            <Row label="Gold &amp; Metal Value" value={inr(num(invoice.goldValue))} muted />
            <Row label="Making &amp; Crafting Charges" value={inr(num(invoice.makingAmount))} muted />
            {num(invoice.wastageAmount) > 0 && (
              <Row label="Wastage Allowance" value={inr(num(invoice.wastageAmount))} muted />
            )}
            {num(invoice.stoneAmount) + num(invoice.hallmarkAmount) + num(invoice.otherAmount) > 0 && (
              <Row
                label="Stone, Hallmarking &amp; Extra Charges"
                value={inr(
                  num(invoice.stoneAmount) + num(invoice.hallmarkAmount) + num(invoice.otherAmount)
                )}
                muted
              />
            )}

            <div className="border-t my-1" style={{ borderColor: "#e7dcc8" }} />

            <Row label="Taxable Value @ 3% (Jewellery)" value={inr(num(invoice.taxable3))} />
            <Row label="• CGST @ 1.5%" value={inr(num(invoice.cgst3))} muted indent />
            <Row label="• SGST @ 1.5%" value={inr(num(invoice.sgst3))} muted indent />

            {num(invoice.taxable5) > 0 && (
              <>
                <Row label="Taxable Value @ 5% (Making Service)" value={inr(num(invoice.taxable5))} />
                <Row label="• CGST @ 2.5%" value={inr(num(invoice.cgst5))} muted indent />
                <Row label="• SGST @ 2.5%" value={inr(num(invoice.sgst5))} muted indent />
              </>
            )}

            {num(invoice.roundOff) !== 0 && (
              <Row label="Round Off Adjustment" value={inr(num(invoice.roundOff))} muted />
            )}

            <div className="border-t my-1" style={{ borderColor: "#c4a35a", opacity: 0.5 }} />

            <Row label="Invoice Value (Incl. GST)" value={inr(num(invoice.grandTotal))} bold />

            {num(invoice.oldGoldValue) > 0 && (
              <Row
                label="Less: Old Gold Exchange Credit"
                value={`− ${inr(num(invoice.oldGoldValue))}`}
                green
              />
            )}

            {/* NET PAYABLE — highlight banner */}
            <div
              className="mt-2 flex items-center justify-between px-3 py-2.5 font-bold"
              style={{
                background: "#4a1518",
                color: "#ead08a",
              }}
            >
              <span className="text-[11px] tracking-wide uppercase">Net Amount Payable</span>
              <span
                className="text-[15px]"
                style={{
                  fontFamily: "'Georgia', serif",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.03em",
                }}
              >
                {inr(num(invoice.netPayable))}
              </span>
            </div>

            <div className="pt-1 flex justify-between text-[10.5px]" style={{ color: "#74685c" }}>
              <span>Amount Received</span>
              <span
                className="font-semibold"
                style={{ color: "#1c110c", fontVariantNumeric: "tabular-nums" }}
              >
                {inr(num(invoice.paidAmount))}
              </span>
            </div>

            <div
              className="flex justify-between text-[10.5px] font-bold"
              style={{ color: balance > 0 ? "#9b2335" : "#2f6b4f" }}
            >
              <span>Balance Due</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {balance > 0 ? inr(balance) : "NIL (PAID IN FULL)"}
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 7. FOOTER — Terms, Signatures                                   */}
        {/* ============================================================== */}
        <footer
          className="mt-4 pt-3 text-[9.5px]"
          style={{ borderTop: "2px solid #c4a35a", color: "#74685c" }}
        >
          {/* Gold accent */}
          <div
            className="mb-3 h-px"
            style={{
              background: "linear-gradient(90deg, #4a1518, #c4a35a 50%, #4a1518)",
              opacity: 0.4,
            }}
          />

          <div className="grid grid-cols-2 gap-6">
            {/* Terms */}
            <div>
              <p
                className="font-bold uppercase tracking-wider mb-0.5"
                style={{ color: "#1c110c", fontSize: "9.5px" }}
              >
                Terms &amp; Conditions / Customer Declaration
              </p>
              <p className="leading-relaxed">
                1. {shop.terms || "Goods once sold cannot be returned. Exchange permitted as per prevailing shop policy."}
                <br />
                2. Weight, purity, and BIS HUID verified &amp; accepted by the customer.
                <br />
                3. Disputes subject to local judicial jurisdiction only.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="flex flex-col justify-end" style={{ paddingTop: "32px" }}>
                <div
                  className="pt-1 font-medium"
                  style={{ borderTop: "1px solid #c4a35a", color: "#1c110c" }}
                >
                  Customer Signature
                </div>
              </div>
              <div className="flex flex-col justify-end" style={{ paddingTop: "32px" }}>
                {/* Shop logo small in signature block */}
                <div className="flex justify-center mb-1">
                  <img
                    src={logoSrc}
                    alt={shop.name}
                    style={{ height: "28px", objectFit: "contain", opacity: 0.7 }}
                    crossOrigin="anonymous"
                  />
                </div>
                <p className="text-[8px] font-bold uppercase mb-0.5" style={{ color: "#4a1518" }}>
                  For {shop.name}
                </p>
                <div
                  className="pt-1 font-semibold"
                  style={{ borderTop: "1px solid #c4a35a", color: "#1c110c" }}
                >
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>

          {/* Bottom legend: logos side-by-side */}
          <div
            className="mt-3 pt-2 flex items-center justify-between"
            style={{ borderTop: "1px solid #e7dcc8" }}
          >
            <div className="flex items-center gap-3">
              <img
                src={logoSrc}
                alt={shop.name}
                style={{ height: "22px", objectFit: "contain" }}
                crossOrigin="anonymous"
              />
              <span
                className="text-[9px] font-bold"
                style={{ color: "#4a1518" }}
              >
                {shop.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BisHallmarkMark size={20} />
              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "#4a1518" }}>
                BIS Hallmarked · 916 Certified
              </span>
              <PurityBadge />
            </div>
            <p className="text-[8.5px] text-center" style={{ color: "#74685c" }}>
              Computer-generated tax invoice
              <br />
              <span className="text-[7.5px]">Issued under GST Rules, 2017</span>
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Helper: Financial row component                                      */
/* ------------------------------------------------------------------ */
function Row({
  label,
  value,
  muted = false,
  bold = false,
  green = false,
  indent = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  green?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className="flex justify-between"
      style={{
        color: green ? "#2f6b4f" : muted ? "#74685c" : "#1c110c",
        fontWeight: bold ? 700 : green ? 600 : 400,
        paddingLeft: indent ? "12px" : "0",
        fontSize: indent ? "10px" : "10.5px",
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: label }} />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
