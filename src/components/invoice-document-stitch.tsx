"use client";

import { useState } from "react";
import Image from "next/image";
import { amountInWords, formatDate, grams, inr, num } from "@/lib/money";

export type InvoiceDoc = {
  id?: string; invoiceNo: string; date: Date | string; status: string;
  customerName: string; customerPhone: string; customerAddr: string; customerPan: string; customerGstin: string; placeOfSupply: string; notes: string;
  goldValue: unknown; makingAmount: unknown; wastageAmount: unknown; stoneAmount: unknown; hallmarkAmount: unknown; otherAmount: unknown;
  taxable3: unknown; taxable5: unknown; cgst3: unknown; sgst3: unknown; cgst5: unknown; sgst5: unknown;
  roundOff: unknown; grandTotal: unknown; oldGoldValue: unknown; netPayable: unknown; paidAmount: unknown; balanceAmount: unknown;
  items: Array<{ tagNo: string; description: string; hsn: string; huid: string; metal: string; purity: string; category?: string; grossWeight: unknown; stoneWeight: unknown; netWeight: unknown; ratePerGram: unknown; goldValue: unknown; taxable3: unknown; taxable5: unknown; makingType?: string; makingValue?: unknown; makingAmount: unknown; wastageAmount?: unknown; stoneCharge: unknown; hallmarkCharge: unknown; otherAmount?: unknown; lineTotal: unknown }>;
  exchanges: Array<{ description: string; metal?: string; purity: string; grossWeight?: unknown; netWeight: unknown; ratePerGram: unknown; deductionPercent: unknown; amount: unknown }>;
  payments: Array<{ method: string; amount: unknown; reference: string }>;
};
export type ShopDoc = { name: string; logoUrl?: string; legalName: string; address: string; city: string; state: string; stateCode?: string; pincode: string; phone: string; email: string; gstin: string; pan: string; bankName: string; bankAccount: string; ifsc: string; terms: string };
const cash = (value: unknown) => inr(num(value));

const terms = [
  { title: "General terms", points: [
    <>The name <strong>Surya Gold and Diamonds</strong> stands for uncompromising purity, heritage artistry, and trust.</>,
    <>All transactions are valid only against a verified computer-generated Tax Invoice. Hand-written slips or informal receipts are null and void.</>,
    <>Delivery of products paid via local cheque, DD, or digital transfer (NEFT/RTGS/UPI) will be made strictly after confirmed realization of funds into our institutional account.</>,
    <><strong>Rate Booking (Fixed):</strong> Customers may fix the gold/silver rate by paying a 75% advance for jewelry and 100% advance for coins. The delivery will be honored at the booked rate, provided the product is collected within 30 calendar days. After 30 days, Surya Gold and Diamonds reserves the right to cancel the order and refund the amount after deducting applicable value addition and making charges.</>,
    <><strong>Rate Booking (Non-Fixed):</strong> If an advance of only 25% is paid, the benchmark gold rate prevailing at the time of final payment and physical delivery shall apply without exception.</>,
    <>The weight of precious metal is considered as nett weight only, strictly excluding pearls, uncut/cut stones, enameling (Meenakari), dust, lacquer, or extraneous synthetic materials.</>,
  ]},
  { title: "Old gold exchange policy", points: [
    <>Surya Gold and Diamonds accepts genuine old gold ornaments and certified bullion for exchange against new showroom purchases.</>,
    <><strong>Valuation:</strong> Old gold will be objectively valued based on prevailing market buy-rates of the transaction date following an electronic purity check (Niton DXL XRF Spectrometer test).</>,
    <><strong>Adjustment:</strong> The approved gross valuation of the old gold will be directly credited and deducted from the invoice value of the new jewelry selected.</>,
    <><strong>Balance Payment:</strong> The customer shall settle the balance difference (new purchase value minus certified old gold credit), including statutory GST.</>,
    <>Purity testing and physical melting of old ornaments will be performed in the direct presence of the customer. Our post-test valuation is final and legally binding.</>,
  ]},
  { title: "Exchange policy (new ornaments)", points: [
    <>Jewelry may be exchanged at our atelier within <strong>SEVEN (7) calendar days</strong> from the date of invoice, provided the piece is presented in original mint condition with intact hallmark tags and original bill.</>,
    <>If the returned ornament is inspected and found tampered with, resized, altered, re-soldered, or damaged, appropriate metallurgical deductions will apply.</>,
    <>Replacement items must equal or exceed the full value of the returned item. Incremental weight or price delta will be billed at the prevailing spot rate of the exchange day.</>,
    <>For Diamond, Polki, or Platinum items, an additional deduction of <strong>2.5%</strong> will be applied against the invoice value if the original gemological certificate (IGI/GIA) is not submitted upon return.</>,
  ]},
  { title: "Buyback & refund policy", points: [
    <>Any return of product for cash or bank disbursement will incur standard institutional depreciation deductions as tabulated:</>,
    <><strong>Statutory Bank Regulation:</strong> As per RBI and IT guidelines, payments for returns/buybacks exceeding Rs. 10,000/- will be disbursed solely via RTGS/NEFT to the verified customer bank account within 5 banking business days.</>,
  ]},
  { title: "Warranty & certification", points: [
    <><strong>BIS Hallmark:</strong> Every piece of gold jewelry crafted by Surya Gold and Diamonds carries the mandatory Bureau of Indian Standards (BIS) Hallmark along with a laser-engraved 6-character alpha-numeric Hallmark Unique Identification (HUID) code.</>,
    <>Warranty for timepieces, luxury writing instruments, and third-party branded luxury goods is governed strictly by original manufacturer guarantees.</>,
    <>Silver gifting articles and commemorative artifacts once sold are eligible for replacement under the 7-day exchange clause but cannot be surrendered for cash refund.</>,
  ]},
  { title: "Privacy & jurisdiction", points: [
    <><strong>Customer Privacy:</strong> We maintain strict confidentiality protocols and do not disclose or distribute your Personally Identifiable Information (PII) or transaction records to third-party entities.</>,
    <><strong>Jurisdiction:</strong> Any dispute arising out of or in connection with this transaction shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana.</>,
  ]},
];

export function InvoiceDocumentStitch({ invoice, shop }: { invoice: InvoiceDoc; shop: ShopDoc }) {
  const [mode, setMode] = useState<"front" | "back" | "both">("both");
  const [drawer, setDrawer] = useState(false);
  const date = invoice.date instanceof Date ? invoice.date : new Date(invoice.date);
  const validDate = Number.isNaN(date.getTime()) ? "" : `${formatDate(date)} · ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  const gross = invoice.items.reduce((sum, item) => sum + num(item.grossWeight), 0);
  const stones = invoice.items.reduce((sum, item) => sum + num(item.stoneWeight), 0);
  const net = invoice.items.reduce((sum, item) => sum + num(item.netWeight), 0);
  const subtotal = num(invoice.taxable3) + num(invoice.taxable5);
  const cgst = num(invoice.cgst3) + num(invoice.cgst5);
  const sgst = num(invoice.sgst3) + num(invoice.sgst5);
  const due = num(invoice.balanceAmount);
  const shopName = shop.name || "Surya Gold and Diamonds";
  const address = [shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(", ");
  const print = (selected: typeof mode) => { setMode(selected); window.setTimeout(() => window.print(), 100); };

  return <div className="sg-invoice-wrap">
    <div className="no-print sg-invoice-toolbar">
      <div><strong>Invoice {invoice.invoiceNo}</strong><span>Choose a side. Your Windows print window lets you select an installed printer.</span></div>
      <div className="sg-actions">
        <button onClick={() => setMode("front")} aria-pressed={mode === "front"}>Front only</button>
        <button onClick={() => setMode("back")} aria-pressed={mode === "back"}>Terms only</button>
        <button className="primary" onClick={() => setMode("both")} aria-pressed={mode === "both"}>Front + back</button>
        <button className="primary" onClick={() => print(mode)}>Choose Printer / Save PDF</button>
        <button onClick={() => setDrawer(true)}>Preview terms</button>
      </div>
    </div>

    {(mode === "front" || mode === "both") && <article id="invoice-sheet-side-a" className="sg-sheet sg-front">
      <header className="sg-brand">
        <Image src={shop.logoUrl?.trim() || "/logo.png"} alt={`${shopName} logo`} width={88} height={88} unoptimized />
        <div className="sg-brand-copy"><div className="sg-eyebrow">TAX INVOICE</div><h1>{shopName}</h1>
          {address && <p>{address}</p>}
          <p>{[shop.phone && `Phone ${shop.phone}`, shop.email, shop.gstin && `GSTIN ${shop.gstin}`].filter(Boolean).join("  •  ")}</p>
        </div>
      <div className="sg-invoice-meta"><span>Invoice no.</span><strong>{invoice.invoiceNo}</strong><span>Date</span><strong>{validDate}</strong></div>
      </header>

      <section className="sg-customer"><div><span className="sg-label">BILLED TO</span><strong>{invoice.customerName || "Walk-in customer"}</strong><span>{invoice.customerAddr || "Address not provided"}</span></div>
        <div><span className="sg-label">CONTACT</span><strong>{invoice.customerPhone || "—"}</strong>{invoice.customerGstin && <span>GSTIN {invoice.customerGstin}</span>}{invoice.customerPan && <span>PAN {invoice.customerPan}</span>}</div>
        <div><span className="sg-label">PLACE OF SUPPLY</span><strong>{invoice.placeOfSupply || [shop.city, shop.state].filter(Boolean).join(", ") || "—"}</strong></div>
      </section>

      <div className="sg-table-wrap"><table className="sg-items"><thead><tr><th>#</th><th>ITEM DESCRIPTION</th><th>PURITY</th><th>GROSS</th><th>STONE</th><th>NET WT</th><th>RATE / G</th><th>MAKING</th><th>GST / VAT</th><th className="right">AMOUNT</th></tr></thead>
        <tbody>{invoice.items.map((item, i) => <tr key={`${item.tagNo}-${i}`}>
          <td>{String(i + 1).padStart(2, "0")}</td><td><strong>{item.description || item.category || item.metal || "Jewellery"}</strong><small>{[item.tagNo && `Tag ${item.tagNo}`, item.hsn && `HSN ${item.hsn}`, item.huid && `HUID ${item.huid}`].filter(Boolean).join(" · ")}</small></td>
          <td>{item.purity || item.metal || "—"}</td><td>{grams(num(item.grossWeight))} g</td><td>{grams(num(item.stoneWeight))} g</td><td>{grams(num(item.netWeight))} g</td><td>{cash(item.ratePerGram)}</td><td>{cash(item.makingAmount)}</td><td className="sg-tax-cell">{num(item.taxable3) > 0 && <span>3% · {cash(num(item.taxable3) * 0.03)}</span>}{num(item.taxable5) > 0 && <span>5% · {cash(num(item.taxable5) * 0.05)}</span>}{num(item.taxable3) <= 0 && num(item.taxable5) <= 0 && <span>—</span>}</td><td className="right">{cash(item.lineTotal)}</td>
        </tr>)}</tbody>
        <tfoot><tr><td colSpan={3}>TOTAL WEIGHT</td><td>{grams(gross)} g</td><td>{grams(stones)} g</td><td>{grams(net)} g</td><td colSpan={4}></td></tr></tfoot>
      </table></div>

      <div className="sg-lower">
        <section className="sg-payment"><h2>PAYMENT DETAILS</h2>
          {invoice.payments.length ? invoice.payments.map((p, i) => <div className="sg-line" key={`${p.method}-${i}`}><span>{p.method}{p.reference ? ` · ${p.reference}` : ""}</span><strong>{cash(p.amount)}</strong></div>) : <p>No payments recorded.</p>}
          {invoice.exchanges.map((ex, i) => <div className="sg-line" key={`exchange-${i}`}><span>Old gold · {ex.description} ({ex.purity}, {grams(num(ex.netWeight))} g)</span><strong>− {cash(ex.amount)}</strong></div>)}
          {invoice.notes && <p className="sg-note">{invoice.notes}</p>}
        </section>
        <section className="sg-totals"><div className="sg-line"><span>Taxable value</span><strong>{cash(subtotal || invoice.items.reduce((sum, item) => sum + num(item.lineTotal), 0))}</strong></div>
          {(cgst || sgst) ? <><div className="sg-line"><span>CGST</span><strong>{cash(cgst)}</strong></div><div className="sg-line"><span>SGST</span><strong>{cash(sgst)}</strong></div></> : null}
          {num(invoice.roundOff) !== 0 && <div className="sg-line"><span>Round off</span><strong>{cash(invoice.roundOff)}</strong></div>}
          <div className="sg-grand"><span>Invoice total</span><strong>{cash(invoice.grandTotal)}</strong></div>
          {num(invoice.oldGoldValue) > 0 && <div className="sg-line"><span>Less: old gold credit</span><strong>− {cash(invoice.oldGoldValue)}</strong></div>}
          <div className="sg-payable"><span>NET PAYABLE</span><strong>{cash(invoice.netPayable)}</strong></div>
          <div className="sg-line"><span>Paid</span><strong>{cash(invoice.paidAmount)}</strong></div>
          <div className={`sg-line ${due > 0 ? "sg-due" : ""}`}><span>{due > 0 ? "Balance due" : "Balance"}</span><strong>{cash(due)}</strong></div>
        </section>
      </div>
      <div className="sg-words"><span>Amount in words</span><strong>{amountInWords(num(invoice.netPayable))}</strong></div>
      <div className="sg-declaration"><span>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Gold value credited is based on net precious metal content. Please refer to the reverse for terms and conditions.</span><strong>Customer signature</strong><strong>For {shopName}<small>Authorized signatory</small></strong></div>
      <div className="sg-credentials"><div className="sg-bis"><Image src="/bis-mark.png" alt="Bureau of Indian Standards mark" width={156} height={88} unoptimized /><span>BIS HALLMARK</span></div><div className="sg-twinkle"><Image src="/twinklestar-mark.png" alt="Twinkle Star mark" width={240} height={160} unoptimized /><strong>Twinkle Star<br />Gold &amp; Diamonds LLP</strong></div></div>
      <footer className="sg-footer"><span>{shopName}{shop.pan ? ` · PAN ${shop.pan}` : ""}</span><span>1 / 2 · CUSTOMER COPY</span></footer>
    </article>}

    {(mode === "back" || mode === "both") && <article id="invoice-sheet-side-b" className={`sg-sheet sg-back ${mode === "both" ? "sg-page-break" : ""}`}>
      <header className="sg-back-head"><Image src={shop.logoUrl?.trim() || "/logo.png"} alt="" width={64} height={64} unoptimized /><div><span className="sg-eyebrow">CUSTOMER CARE · KEEP FOR YOUR RECORDS</span><h2>{shopName}</h2><p>{address}{shop.phone ? ` · ${shop.phone}` : ""}</p></div><div className="sg-page-label">INVOICE<br/><strong>{invoice.invoiceNo}</strong><br/>REVERSE</div></header>
      <div className="sg-back-title"><span>THE CUSTOMER CHARTER</span><h1>Terms &amp; Conditions</h1><p>Purity assurance · exchange · buyback · customer care</p></div>
      <main className="sg-terms-grid">{terms.map((section, i) => <section className="sg-term" key={section.title}><h3><span>{String(i + 1).padStart(2, "0")}</span>{section.title}</h3><ul>{section.points.map((point, j) => <li key={j}>{point}</li>)}</ul></section>)}
        <section className="sg-buyback-table"><h3>Buyback deductions</h3><table><thead><tr><th>Category</th><th>Applicable deduction</th></tr></thead><tbody><tr><td>Studded &amp; Diamond Jewelry</td><td>15% deduction on total value</td></tr><tr><td>Gold &amp; Silver Bullion Coins</td><td>1% on prevailing metal rate</td></tr><tr><td>Plain Gold Jewelry (22K / 18K)</td><td>3% on gold value + making/taxes</td></tr></tbody></table></section>
      </main>
      <footer className="sg-footer"><span>{shopName}{shop.gstin ? ` · GSTIN ${shop.gstin}` : ""}</span><span>2 / 2 · TERMS &amp; CONDITIONS</span></footer>
    </article>}

    {drawer && <div className="no-print sg-modal" role="dialog" aria-modal="true" aria-labelledby="sg-modal-title"><div className="sg-modal-card"><button className="sg-modal-close" onClick={() => setDrawer(false)} aria-label="Close">×</button><span className="sg-eyebrow">{shopName}</span><h2 id="sg-modal-title">Terms &amp; Conditions</h2><div className="sg-modal-terms">{terms.map((s) => <section key={s.title}><h3>{s.title}</h3><ul>{s.points.map((p, i) => <li key={i}>{p}</li>)}</ul></section>)}</div><button className="primary" onClick={() => { setDrawer(false); print("back"); }}>Print terms side</button></div></div>}
  </div>;
}
