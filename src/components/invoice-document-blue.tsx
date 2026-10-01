import React from "react";
import { amountInWords, formatDate, grams, inr, num } from "@/lib/money";
import { labelize } from "@/lib/constants";

/* ============================================================
   TYPE DEFINITIONS  (same contract as InvoiceDocument)
   ============================================================ */
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

/* ============================================================
   COLOUR PALETTE  — Royal Blue × Gold × White
   ============================================================ */
const C = {
  navy:      "#0d1f4a",   // deepest navy — header bg, table header
  royal:     "#1a3a7c",   // royal blue — accents, strips
  blue:      "#2756b3",   // mid-blue — section labels
  skyLight:  "#e8effc",   // very light blue — row alternate, section bg
  skyPale:   "#f4f7fe",   // near-white blue — paper bg
  gold:      "#c4a35a",   // gold — borders, ornaments
  goldBright:"#ead08a",   // bright gold — header text on dark bg
  goldSoft:  "#d8bc78",   // soft gold — mid elements
  white:     "#ffffff",
  ink:       "#0d1a35",   // deep blue-black text
  muted:     "#4a5a82",   // muted blue-grey text
  ok:        "#1a6b45",   // green for paid
  danger:    "#9b2335",   // red for balance due
} as const;

/* ============================================================
   SVG ATOMS
   ============================================================ */

/** BIS Hallmark in navy + gold */
function BisHallmarkMark({ size = 52 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 120 120" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BIS Hallmark — Bureau of Indian Standards Certified"
    >
      <circle cx="60" cy="60" r="58" fill={C.navy} stroke={C.gold} strokeWidth="3" />
      <polygon points="60,14 104,90 16,90" fill="none" stroke={C.goldBright} strokeWidth="5" strokeLinejoin="round" />
      <polygon points="60,26 96,84 24,84" fill={C.goldBright} opacity="0.10" />
      <line x1="60" y1="30" x2="60" y2="80" stroke={C.goldBright} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="60" cy="55" r="5.5" fill={C.goldBright} />
      <text x="60" y="108" textAnchor="middle" fill={C.goldBright} fontSize="11"
        fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="2">BIS</text>
    </svg>
  );
}

/** 916 / 22K purity badge in navy + gold */
function PurityBadge() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill={C.navy} stroke={C.gold} strokeWidth="2" />
      <text x="24" y="20" textAnchor="middle" fill={C.goldBright} fontSize="9" fontWeight="bold" fontFamily="Arial">916</text>
      <text x="24" y="31" textAnchor="middle" fill={C.goldBright} fontSize="7.5" fontFamily="Arial">22 KARAT</text>
      <text x="24" y="40" textAnchor="middle" fill={C.gold} fontSize="5.5" fontFamily="Arial">GOLD</text>
    </svg>
  );
}

/** Decorative diamond ornament for section dividers */
function DiamondDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "6px 0" }}>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, transparent, ${C.gold})` }} />
      <svg width="10" height="10" viewBox="0 0 10 10">
        <polygon points="5,0 10,5 5,10 0,5" fill={C.gold} />
      </svg>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
    </div>
  );
}

/** Star / sparkle motif used in header */
function Sparkle({ size = 14, color = C.goldBright }: { size?: number; color?: string }) {
  const h = size / 2;
  const q = size / 4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={`${h},0 ${h + q * 0.3},${h - q * 0.3} ${size},${h} ${h + q * 0.3},${h + q * 0.3} ${h},${size} ${h - q * 0.3},${h + q * 0.3} 0,${h} ${h - q * 0.3},${h - q * 0.3}`}
        fill={color}
      />
    </svg>
  );
}

/** Corner filigree ornament */
function CornerFiligree({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="28" height="28" viewBox="0 0 28 28" fill="none"
      style={{ transform: flip ? "scale(-1,-1)" : undefined }}
    >
      <path d="M1 27 L1 4 Q1 1 4 1 L27 1" stroke={C.gold} strokeWidth="2" strokeLinecap="round" />
      <path d="M5 24 L5 7 Q5 5 7 5 L24 5" stroke={C.gold} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      <circle cx="5" cy="5" r="2" fill={C.gold} />
    </svg>
  );
}

/** UPI QR pattern in blue */
function UpiQrPattern() {
  return (
    <svg viewBox="0 0 100 100" style={{ height: "76px", width: "76px" }} fill={C.navy}>
      <rect x="5" y="5" width="26" height="26" rx="2" fill="none" stroke={C.navy} strokeWidth="5" />
      <rect x="11" y="11" width="14" height="14" rx="1" fill={C.navy} />
      <rect x="69" y="5" width="26" height="26" rx="2" fill="none" stroke={C.navy} strokeWidth="5" />
      <rect x="75" y="11" width="14" height="14" rx="1" fill={C.navy} />
      <rect x="5" y="69" width="26" height="26" rx="2" fill="none" stroke={C.navy} strokeWidth="5" />
      <rect x="11" y="75" width="14" height="14" rx="1" fill={C.navy} />
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

/* ============================================================
   MAIN INVOICE COMPONENT
   ============================================================ */
export function InvoiceDocumentBlue({
  invoice,
  shop,
}: {
  invoice: InvoiceDoc;
  shop: ShopDoc;
}) {
  const logoSrc = shop.logoUrl && shop.logoUrl.trim() !== "" ? shop.logoUrl : "/logo.png";

  const totalGrossWeight = invoice.items.reduce((s, i) => s + num(i.grossWeight), 0);
  const totalStoneWeight = invoice.items.reduce((s, i) => s + num(i.stoneWeight), 0);
  const totalNetWeight   = invoice.items.reduce((s, i) => s + num(i.netWeight),   0);
  const totalGoldVal     = invoice.items.reduce((s, i) => s + num(i.goldValue),   0);
  const totalMakingVal   = invoice.items.reduce((s, i) => s + num(i.makingAmount),0);

  const balance     = num(invoice.balanceAmount);
  const isCancelled = invoice.status === "CANCELLED";

  const ss: React.CSSProperties = { fontFamily: "'Segoe UI', Arial, sans-serif" };

  return (
    <article
      className="print-sheet relative mx-auto w-full max-w-[210mm] bg-white shadow-2xl"
      style={{ ...ss, color: C.ink, background: C.white }}
    >
      {/* ──────────────────────────────────────────────── */}
      {/* GOLD DOUBLE-FRAME BORDER                        */}
      {/* ──────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: "4px",
        border: `2.5px solid ${C.gold}`, pointerEvents: "none", zIndex: 5,
      }} />
      <div style={{
        position: "absolute", inset: "9px",
        border: `0.8px solid ${C.gold}`, opacity: 0.35, pointerEvents: "none", zIndex: 5,
      }} />

      {/* Corner filigree ornaments */}
      <div style={{ position: "absolute", top: "2px", left: "2px", zIndex: 6, pointerEvents: "none" }}>
        <CornerFiligree />
      </div>
      <div style={{ position: "absolute", top: "2px", right: "2px", zIndex: 6, pointerEvents: "none" }}>
        <CornerFiligree flip />
      </div>
      <div style={{ position: "absolute", bottom: "2px", left: "2px", zIndex: 6, pointerEvents: "none",
        transform: "scaleY(-1)" }}>
        <CornerFiligree />
      </div>
      <div style={{ position: "absolute", bottom: "2px", right: "2px", zIndex: 6, pointerEvents: "none",
        transform: "scale(-1,-1)" }}>
        <CornerFiligree flip />
      </div>

      {/* CANCELLED watermark */}
      {isCancelled && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.09, pointerEvents: "none",
        }}>
          <span style={{
            fontSize: "72px", fontWeight: 900, color: C.danger,
            border: `8px solid ${C.danger}`, padding: "12px 28px",
            transform: "rotate(-12deg)", letterSpacing: "6px", lineHeight: 1,
          }}>
            CANCELLED
          </span>
        </div>
      )}

      {/* ================================================================ */}
      {/* 1. HEADER — Dark Navy with gold accents                          */}
      {/* ================================================================ */}
      <header style={{ background: C.navy, position: "relative", overflow: "hidden" }}>
        {/* Subtle dot-grid pattern overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.06,
          backgroundImage: `radial-gradient(${C.gold} 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }} />

        {/* Gold top accent line */}
        <div style={{
          height: "4px",
          background: `linear-gradient(90deg, ${C.navy} 0%, ${C.gold} 30%, ${C.goldBright} 50%, ${C.gold} 70%, ${C.navy} 100%)`,
        }} />

        <div style={{ padding: "20px 28px 16px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>

            {/* LEFT: Logo + Shop info */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Logo box */}
              <div style={{
                width: "90px", height: "90px", flexShrink: 0,
                border: `2.5px solid ${C.gold}`,
                background: C.white,
                padding: "5px",
                boxShadow: `0 0 20px rgba(196,163,90,0.4), 0 0 0 1px rgba(196,163,90,0.2)`,
              }}>
                <img
                  src={logoSrc}
                  alt={`${shop.name} Logo`}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  crossOrigin="anonymous"
                />
              </div>

              {/* Shop text */}
              <div>
                {/* Luxury label */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <Sparkle size={10} />
                  <span style={{
                    fontSize: "8px", fontWeight: 700, letterSpacing: "0.28em",
                    color: C.goldSoft, textTransform: "uppercase",
                  }}>
                    Fine Jewellery House
                  </span>
                  <Sparkle size={10} />
                </div>

                {/* Shop name */}
                <h1 style={{
                  fontSize: "26px", fontWeight: 800, color: C.white, margin: 0,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  letterSpacing: "-0.3px", lineHeight: 1.1,
                  textShadow: `0 0 24px rgba(196,163,90,0.3)`,
                }}>
                  {shop.name}
                </h1>

                {shop.legalName && shop.legalName !== shop.name && (
                  <p style={{ fontSize: "10px", color: C.goldSoft, margin: "2px 0 0", fontWeight: 600 }}>
                    {shop.legalName}
                  </p>
                )}

                <p style={{ fontSize: "10px", color: "#a0b4d8", margin: "4px 0 0", lineHeight: 1.4 }}>
                  {[shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(", ")}
                  {shop.stateCode ? ` (State Code: ${shop.stateCode})` : ""}
                </p>
                <p style={{ fontSize: "10px", color: "#a0b4d8", margin: "2px 0 0" }}>
                  {shop.phone ? `Tel: ${shop.phone}` : ""}
                  {shop.email ? ` · ${shop.email}` : ""}
                </p>
              </div>
            </div>

            {/* RIGHT: Badges + Invoice ID */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
              {/* BIS + 916 badges */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <BisHallmarkMark size={50} />
                  <span style={{ fontSize: "7px", color: C.goldSoft, letterSpacing: "0.2em",
                    fontWeight: 700, textTransform: "uppercase", marginTop: "2px" }}>
                    HALLMARKED
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <PurityBadge />
                  <span style={{ fontSize: "7px", color: C.goldSoft, letterSpacing: "0.2em",
                    fontWeight: 700, textTransform: "uppercase", marginTop: "2px" }}>
                    CERTIFIED
                  </span>
                </div>
              </div>

              {/* Invoice ID Box */}
              <div style={{
                border: `1.5px solid ${C.gold}`,
                background: "rgba(255,255,255,0.07)",
                padding: "8px 14px",
                textAlign: "center",
                minWidth: "150px",
                backdropFilter: "blur(4px)",
              }}>
                <p style={{ fontSize: "8px", fontWeight: 700, color: C.goldSoft,
                  letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>
                  Tax Invoice
                </p>
                <p style={{ fontSize: "7.5px", color: "#8ca5cc", margin: "1px 0 6px",
                  letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Original for Recipient
                </p>
                <div style={{ borderTop: `1px solid rgba(196,163,90,0.4)`, paddingTop: "6px" }}>
                  <p style={{
                    fontSize: "16px", fontWeight: 800, color: C.goldBright, margin: 0,
                    fontFamily: "'Georgia', serif", letterSpacing: "0.04em",
                  }}>
                    {invoice.invoiceNo}
                  </p>
                  <p style={{ fontSize: "9.5px", color: "#a0b4d8", margin: "2px 0 0" }}>
                    Date: <strong style={{ color: C.white }}>{formatDate(invoice.date)}</strong>
                  </p>
                </div>
              </div>

              {/* GSTIN / PAN */}
              <div style={{ fontSize: "9.5px", textAlign: "right", color: "#8ca5cc", lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}>
                  <span style={{ fontWeight: 600 }}>GSTIN: </span>
                  <span style={{ fontFamily: "monospace", color: C.white, fontWeight: 700 }}>
                    {shop.gstin || "—"}
                  </span>
                </p>
                <p style={{ margin: 0 }}>
                  <span style={{ fontWeight: 600 }}>PAN: </span>
                  <span style={{ fontFamily: "monospace", color: C.white, fontWeight: 700 }}>
                    {shop.pan || "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gold bottom accent bar */}
        <div style={{
          height: "3px",
          background: `linear-gradient(90deg, ${C.navy} 0%, ${C.gold} 30%, ${C.goldBright} 50%, ${C.gold} 70%, ${C.navy} 100%)`,
        }} />
      </header>

      {/* Main white/light-blue content area */}
      <div style={{ padding: "14px 22px 18px" }}>

        {/* ================================================================ */}
        {/* 2. BIS COMPLIANCE STRIP — Royal blue band                        */}
        {/* ================================================================ */}
        <section style={{
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between", gap: "6px",
          background: C.royal, color: C.goldBright,
          padding: "7px 14px", fontSize: "9px", marginBottom: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700,
            letterSpacing: "0.15em", textTransform: "uppercase" }}>
            <BisHallmarkMark size={18} />
            <span>BIS 916 Hallmarked Jewellery</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: C.goldSoft }}>
            <span>◆ Certified Purity 22K/916 &amp; 18K/750</span>
            <span>◆ 6-Digit Laser HUID</span>
            <span>◆ 100% Lifetime Exchange</span>
          </div>
          <div>
            <span style={{ color: C.goldSoft }}>Place of Supply: </span>
            <strong style={{ color: C.white }}>{invoice.placeOfSupply || shop.state}</strong>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 3. CUSTOMER DETAILS — light-blue card                            */}
        {/* ================================================================ */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          border: `1px solid ${C.gold}`,
          marginBottom: "12px",
        }}>
          {/* Billed To */}
          <div style={{
            padding: "10px 14px",
            borderRight: `1px solid rgba(196,163,90,0.3)`,
            background: C.skyPale,
          }}>
            <SectionLabel>Billed To / Consignee</SectionLabel>
            <p style={{
              fontSize: "15px", fontWeight: 800, color: C.navy, margin: "3px 0 3px",
              fontFamily: "'Georgia', serif",
            }}>
              {invoice.customerName}
            </p>
            {invoice.customerAddr && (
              <p style={{ fontSize: "10.5px", color: C.muted, margin: "2px 0", lineHeight: 1.4 }}>
                {invoice.customerAddr}
              </p>
            )}
            {invoice.customerPhone && (
              <p style={{ fontSize: "10.5px", color: C.muted, margin: "2px 0" }}>
                <span style={{ fontWeight: 600, color: C.navy }}>Mob:</span>{" "}
                +91 {invoice.customerPhone}
              </p>
            )}
          </div>

          {/* Tax details */}
          <div style={{ padding: "10px 14px", background: C.skyPale }}>
            <SectionLabel>Tax &amp; Reference Details</SectionLabel>
            <div style={{ fontSize: "10.5px", color: C.muted, lineHeight: 1.8, marginTop: "4px" }}>
              <p style={{ margin: 0 }}>
                <span style={{ fontWeight: 600, color: C.navy }}>Customer PAN: </span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.ink }}>
                  {invoice.customerPan || "N/A"}
                </span>
              </p>
              {invoice.customerGstin && (
                <p style={{ margin: 0 }}>
                  <span style={{ fontWeight: 600, color: C.navy }}>GSTIN: </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.ink }}>
                    {invoice.customerGstin}
                  </span>
                </p>
              )}
              <p style={{ margin: 0 }}>
                <span style={{ fontWeight: 600, color: C.navy }}>HSN Code: </span>
                <strong style={{ color: C.ink }}>7113</strong>
                <span style={{ fontSize: "9px" }}> (Articles of Jewellery)</span>
              </p>
              <p style={{ margin: 0 }}>
                <span style={{ fontWeight: 600, color: C.navy }}>Reverse Charge: </span>
                <strong style={{ color: C.ink }}>No</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 4. ITEMISED JEWELLERY TABLE                                      */}
        {/* ================================================================ */}
        <div style={{ overflowX: "auto", marginBottom: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
            <thead>
              <tr style={{ background: C.navy, color: C.goldBright }}>
                {[
                  ["#",          "left",   "22px"],
                  ["Description & HUID", "left",  "auto"],
                  ["Purity",     "center", "50px"],
                  ["Gross (g)",  "right",  "58px"],
                  ["Stone",      "right",  "50px"],
                  ["Net (g)",    "right",  "56px"],
                  ["Rate/g",     "right",  "56px"],
                  ["Gold Val",   "right",  "70px"],
                  ["Making",     "right",  "60px"],
                  ["Line Total", "right",  "76px"],
                ].map(([label, align, w], i) => (
                  <th
                    key={i}
                    style={{
                      padding: "8px 7px", fontWeight: 700, textAlign: align as "left" | "center" | "right",
                      width: w, borderBottom: `2px solid ${C.gold}`,
                      fontSize: "10px", letterSpacing: "0.02em",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => {
                const stone = num(item.stoneWeight);
                return (
                  <tr
                    key={`${item.tagNo}-${index}`}
                    style={{
                      background: index % 2 === 1 ? C.skyLight : C.white,
                      borderBottom: `1px solid ${C.skyLight}`,
                    }}
                  >
                    <td style={{ padding: "7px", color: C.muted, fontFamily: "monospace", verticalAlign: "top" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "7px", verticalAlign: "top" }}>
                      <p style={{ fontWeight: 700, color: C.navy, margin: 0, lineHeight: 1.3 }}>
                        {item.description}
                        {item.tagNo && (
                          <span style={{
                            marginLeft: "6px", fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700,
                            background: C.skyLight, color: C.royal, padding: "1px 4px",
                            border: `1px solid ${C.gold}`,
                          }}>
                            #{item.tagNo}
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: "9.5px", color: C.muted, margin: "2px 0 0", lineHeight: 1.3 }}>
                        {labelize(item.category || "Jewellery")} · {item.metal}
                        {item.huid && (
                          <span style={{ marginLeft: "6px", fontFamily: "monospace", fontWeight: 700, color: C.royal }}>
                            HUID: {item.huid}
                          </span>
                        )}
                      </p>
                    </td>
                    <Td align="center" bold>{item.purity}</Td>
                    <Td align="right" muted tab>{grams(num(item.grossWeight))}</Td>
                    <Td align="right" muted tab>{stone > 0 ? grams(stone) : "—"}</Td>
                    <Td align="right" bold tab>{grams(num(item.netWeight))}</Td>
                    <Td align="right" muted tab>{inr(num(item.ratePerGram), false)}</Td>
                    <Td align="right" muted tab>{inr(num(item.goldValue), false)}</Td>
                    <Td align="right" muted tab>{inr(num(item.makingAmount), false)}</Td>
                    <Td align="right" bold tab>{inr(num(item.lineTotal), false)}</Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: C.skyLight, borderTop: `2px solid ${C.gold}`, fontWeight: 700 }}>
                <td colSpan={3} style={{
                  padding: "7px", textAlign: "right", color: C.navy,
                  fontFamily: "'Georgia', serif", fontSize: "10px",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  Subtotal
                </td>
                <Td align="right" tab>{grams(totalGrossWeight)}</Td>
                <Td align="right" tab>{totalStoneWeight > 0 ? grams(totalStoneWeight) : "—"}</Td>
                <Td align="right" navy tab>{grams(totalNetWeight)}</Td>
                <Td align="right">—</Td>
                <Td align="right" tab>{inr(totalGoldVal, false)}</Td>
                <Td align="right" tab>{inr(totalMakingVal, false)}</Td>
                <Td align="right" navy tab>{inr(num(invoice.grandTotal), false)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ================================================================ */}
        {/* 5. OLD GOLD EXCHANGE (conditional)                               */}
        {/* ================================================================ */}
        {invoice.exchanges.length > 0 && (
          <section style={{
            border: `1px solid ${C.gold}`, background: C.skyPale,
            padding: "10px 14px", marginBottom: "12px",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingBottom: "6px", marginBottom: "8px",
              borderBottom: `1px solid rgba(196,163,90,0.3)`,
            }}>
              <p style={{
                fontWeight: 700, color: C.navy, margin: 0,
                fontFamily: "'Georgia', serif", fontSize: "11px",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Old Gold Exchange / Purchase Voucher
              </p>
              <span style={{ fontSize: "8.5px", color: C.muted, textTransform: "uppercase",
                fontWeight: 600, letterSpacing: "0.1em" }}>
                Trade-in Value Adjusted Against Invoice
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
              <thead>
                <tr style={{ color: C.muted, fontSize: "9px", textTransform: "uppercase",
                  borderBottom: `1px solid rgba(196,163,90,0.3)` }}>
                  {["Description","Purity","Net Wt (g)","Rate / g","Deduct %","Net Credit (₹)"].map((h,i) => (
                    <th key={i} style={{ padding: "4px 0", textAlign: i < 2 ? "left" : "right", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.exchanges.map((ex, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eaf0fc" }}>
                    <td style={{ padding: "4px 0", fontWeight: 600, color: C.navy }}>{ex.description}</td>
                    <td style={{ padding: "4px 0", color: C.muted }}>{ex.purity}</td>
                    <td style={{ padding: "4px 0", textAlign: "right", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{grams(num(ex.netWeight))}</td>
                    <td style={{ padding: "4px 0", textAlign: "right", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{inr(num(ex.ratePerGram), false)}</td>
                    <td style={{ padding: "4px 0", textAlign: "right", color: C.muted }}>{num(ex.deductionPercent)}%</td>
                    <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600, color: C.ok, fontVariantNumeric: "tabular-nums" }}>
                      − {inr(num(ex.amount), false)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ================================================================ */}
        {/* 6. FINANCIAL SUMMARY                                             */}
        {/* ================================================================ */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>

          {/* LEFT: words + payments + bank */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

            {/* Amount in words */}
            <div style={{
              padding: "10px", border: `1px solid ${C.gold}`,
              background: C.skyPale,
            }}>
              <p style={{ fontSize: "8.5px", fontWeight: 700, color: C.royal,
                letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 3px" }}>
                Amount Chargeable (in words)
              </p>
              <p style={{
                fontSize: "12.5px", fontWeight: 700, color: C.navy,
                fontFamily: "'Georgia', serif", margin: 0, textTransform: "capitalize", lineHeight: 1.4,
              }}>
                {amountInWords(num(invoice.netPayable))}
              </p>
            </div>

            {/* Payments */}
            {invoice.payments.length > 0 && (
              <div style={{ padding: "10px", border: `1px solid #d0daf0`, background: C.white }}>
                <p style={{ fontSize: "8.5px", fontWeight: 700, color: C.muted,
                  letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Payment Settlements
                </p>
                {invoice.payments.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: "10.5px", color: C.ink, marginBottom: "3px",
                  }}>
                    <span>
                      <strong style={{ color: C.royal }}>{labelize(p.method)}</strong>
                      {p.reference && <span style={{ color: C.muted }}> · Ref: {p.reference}</span>}
                    </span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {inr(num(p.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bank + UPI QR */}
            {shop.bankName && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "10px", padding: "10px",
                border: `1px solid ${C.gold}`, background: C.skyPale,
              }}>
                <div>
                  <p style={{ fontSize: "8.5px", fontWeight: 700, color: C.royal,
                    letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 4px" }}>
                    Bank / UPI Settlement
                  </p>
                  <p style={{ fontSize: "10px", color: C.muted, lineHeight: 1.7, margin: 0 }}>
                    <strong style={{ color: C.navy }}>{shop.bankName}</strong><br />
                    A/c:{" "}
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.ink }}>
                      {shop.bankAccount}
                    </span><br />
                    IFSC:{" "}
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.ink }}>
                      {shop.ifsc}
                    </span>
                  </p>
                  <p style={{ fontSize: "9px", fontWeight: 600, color: C.gold, margin: "4px 0 0" }}>
                    Scan QR to pay via UPI
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <UpiQrPattern />
                  <span style={{ fontSize: "7px", color: C.muted, letterSpacing: "0.2em",
                    textTransform: "uppercase", fontWeight: 700, marginTop: "2px" }}>
                    BHIM · UPI
                  </span>
                </div>
              </div>
            )}

            {invoice.notes && (
              <p style={{ fontSize: "9.5px", color: C.muted, fontStyle: "italic", margin: 0 }}>
                <strong>Note:</strong> {invoice.notes}
              </p>
            )}
          </div>

          {/* RIGHT: Tax breakdown */}
          <div style={{
            padding: "12px 14px", border: `1px solid ${C.gold}`,
            background: C.skyPale, fontSize: "10.5px",
          }}>
            <BRow label="Gold &amp; Metal Value"             value={inr(num(invoice.goldValue))}     muted />
            <BRow label="Making &amp; Crafting Charges"      value={inr(num(invoice.makingAmount))}  muted />
            {num(invoice.wastageAmount) > 0 && (
              <BRow label="Wastage Allowance" value={inr(num(invoice.wastageAmount))} muted />
            )}
            {num(invoice.stoneAmount) + num(invoice.hallmarkAmount) + num(invoice.otherAmount) > 0 && (
              <BRow
                label="Stone, Hallmarking &amp; Extra"
                value={inr(num(invoice.stoneAmount) + num(invoice.hallmarkAmount) + num(invoice.otherAmount))}
                muted
              />
            )}

            <Divider />

            <BRow label="Taxable Value @ 3% (Jewellery)"     value={inr(num(invoice.taxable3))} />
            <BRow label="• CGST @ 1.5%"                      value={inr(num(invoice.cgst3))}   muted indent />
            <BRow label="• SGST @ 1.5%"                      value={inr(num(invoice.sgst3))}   muted indent />

            {num(invoice.taxable5) > 0 && (<>
              <BRow label="Taxable Value @ 5% (Making)"      value={inr(num(invoice.taxable5))} />
              <BRow label="• CGST @ 2.5%"                    value={inr(num(invoice.cgst5))}   muted indent />
              <BRow label="• SGST @ 2.5%"                    value={inr(num(invoice.sgst5))}   muted indent />
            </>)}

            {num(invoice.roundOff) !== 0 && (
              <BRow label="Round Off"  value={inr(num(invoice.roundOff))} muted />
            )}

            <Divider gold />

            <BRow label="Invoice Value (Incl. GST)" value={inr(num(invoice.grandTotal))} bold />

            {num(invoice.oldGoldValue) > 0 && (
              <BRow
                label="Less: Old Gold Exchange Credit"
                value={`− ${inr(num(invoice.oldGoldValue))}`}
                green
              />
            )}

            {/* NET PAYABLE — gradient blue banner */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              margin: "8px 0 0",
              background: `linear-gradient(135deg, ${C.navy} 0%, ${C.royal} 100%)`,
              padding: "10px 12px",
              borderLeft: `4px solid ${C.gold}`,
            }}>
              <span style={{
                fontSize: "10px", fontWeight: 700, color: C.goldBright,
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                Net Amount Payable
              </span>
              <span style={{
                fontSize: "16px", fontWeight: 800, color: C.goldBright,
                fontFamily: "'Georgia', serif", fontVariantNumeric: "tabular-nums",
              }}>
                {inr(num(invoice.netPayable))}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between",
              fontSize: "10px", color: C.muted, padding: "5px 0 2px" }}>
              <span>Amount Received</span>
              <span style={{ fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {inr(num(invoice.paidAmount))}
              </span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: "10.5px", fontWeight: 700,
              color: balance > 0 ? C.danger : C.ok,
            }}>
              <span>Balance Due</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {balance > 0 ? inr(balance) : "NIL (PAID IN FULL)"}
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 7. FOOTER — Terms + Signatures                                   */}
        {/* ================================================================ */}
        <footer style={{ borderTop: `2px solid ${C.gold}`, paddingTop: "10px" }}>
          {/* Accent line */}
          <div style={{
            height: "1px", marginBottom: "10px", opacity: 0.35,
            background: `linear-gradient(90deg, ${C.navy}, ${C.gold} 50%, ${C.navy})`,
          }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Terms */}
            <div>
              <p style={{ fontSize: "9px", fontWeight: 700, color: C.navy,
                textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>
                Terms &amp; Conditions / Customer Declaration
              </p>
              <p style={{ fontSize: "9px", color: C.muted, lineHeight: 1.7, margin: 0 }}>
                1. {shop.terms || "Goods once sold cannot be returned. Exchange permitted as per prevailing shop policy."}<br />
                2. Weight, purity, and BIS HUID verified &amp; accepted by the customer.<br />
                3. Disputes subject to local judicial jurisdiction only.
              </p>
            </div>

            {/* Signature boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingTop: "28px" }}>
                <div style={{ borderTop: `1px solid ${C.gold}`, paddingTop: "4px",
                  fontSize: "9.5px", fontWeight: 600, color: C.ink }}>
                  Customer Signature
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingTop: "28px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
                  <img
                    src={logoSrc} alt={shop.name}
                    style={{ height: "26px", objectFit: "contain", opacity: 0.65 }}
                    crossOrigin="anonymous"
                  />
                </div>
                <p style={{ fontSize: "8px", fontWeight: 700, color: C.royal,
                  textTransform: "uppercase", margin: "0 0 2px" }}>
                  For {shop.name}
                </p>
                <div style={{ borderTop: `1px solid ${C.gold}`, paddingTop: "4px",
                  fontSize: "9.5px", fontWeight: 600, color: C.ink }}>
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>

          {/* Bottom legend row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: "10px", paddingTop: "8px",
            borderTop: `1px solid rgba(196,163,90,0.3)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img src={logoSrc} alt={shop.name}
                style={{ height: "20px", objectFit: "contain" }} crossOrigin="anonymous" />
              <span style={{ fontSize: "9px", fontWeight: 700, color: C.navy }}>{shop.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BisHallmarkMark size={20} />
              <span style={{ fontSize: "7.5px", fontWeight: 700, color: C.navy,
                textTransform: "uppercase", letterSpacing: "0.18em" }}>
                BIS Hallmarked · 916 Certified
              </span>
              <PurityBadge />
            </div>
            <p style={{ fontSize: "8px", textAlign: "center", color: C.muted, margin: 0, lineHeight: 1.5 }}>
              Computer-generated tax invoice<br />
              <span style={{ fontSize: "7px" }}>Issued under GST Rules, 2017</span>
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}

/* ============================================================
   SMALL HELPER COMPONENTS
   ============================================================ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "8.5px", fontWeight: 700, color: C.royal,
      letterSpacing: "0.22em", textTransform: "uppercase", margin: 0,
    }}>
      {children}
    </p>
  );
}

function Td({
  children, align = "left", bold = false, muted = false,
  navy = false, tab = false,
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  bold?: boolean; muted?: boolean; navy?: boolean; tab?: boolean;
}) {
  return (
    <td style={{
      padding: "7px",
      textAlign: align,
      verticalAlign: "top",
      fontWeight: bold || navy ? 700 : 400,
      color: navy ? C.navy : muted ? C.muted : C.ink,
      fontVariantNumeric: tab ? "tabular-nums" : undefined,
    }}>
      {children}
    </td>
  );
}

function BRow({
  label, value, muted = false, bold = false, green = false, indent = false,
}: {
  label: string; value: string;
  muted?: boolean; bold?: boolean; green?: boolean; indent?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      marginBottom: "3px",
      paddingLeft: indent ? "12px" : 0,
      fontSize: indent ? "10px" : "10.5px",
      fontWeight: bold ? 700 : green ? 600 : 400,
      color: green ? C.ok : muted ? C.muted : C.ink,
    }}>
      <span dangerouslySetInnerHTML={{ __html: label }} />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function Divider({ gold = false }: { gold?: boolean }) {
  return (
    <div style={{
      height: "1px", margin: "5px 0",
      background: gold ? `rgba(196,163,90,0.5)` : `rgba(208,218,240,0.8)`,
    }} />
  );
}
