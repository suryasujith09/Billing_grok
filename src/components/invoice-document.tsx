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

export function InvoiceDocument({
  invoice,
  shop,
}: {
  invoice: InvoiceDoc;
  shop: ShopDoc;
}) {
  return (
    <article className="print-sheet mx-auto max-w-[210mm] border-2 border-ink bg-white p-6 text-ink shadow-sm">
      <header className="border-b-2 border-gold pb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {shop.logoUrl ? (
              <img
                src={shop.logoUrl}
                alt={shop.name}
                className="h-16 max-w-[140px] shrink-0 object-contain rounded-sm"
              />
            ) : null}
            <div>
              <p className="text-[10px] tracking-[0.28em] text-wine uppercase">Tax invoice</p>
              <h1 className="font-display mt-1 text-3xl text-wine">{shop.name}</h1>
              {shop.legalName && shop.legalName !== shop.name ? (
                <p className="text-sm text-stone">{shop.legalName}</p>
              ) : null}
              <p className="mt-2 text-xs leading-relaxed text-stone">
                {[shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(", ")}
                <br />
                {shop.phone ? `Ph: ${shop.phone}` : ""}
                {shop.email ? ` · ${shop.email}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p>
              <span className="text-stone">GSTIN</span> {shop.gstin || "—"}
            </p>
            <p>
              <span className="text-stone">PAN</span> {shop.pan || "—"}
            </p>
            <p className="mt-3 font-display text-xl text-ink">{invoice.invoiceNo}</p>
            <p>{formatDate(invoice.date)}</p>
            {invoice.status === "CANCELLED" ? (
              <p className="mt-1 font-semibold tracking-widest text-danger uppercase">Cancelled</p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="tracking-[0.16em] text-stone uppercase">Bill to</p>
          <p className="mt-1 text-sm font-semibold">{invoice.customerName}</p>
          {invoice.customerAddr ? <p>{invoice.customerAddr}</p> : null}
          {invoice.customerPhone ? <p>Mob: {invoice.customerPhone}</p> : null}
          {invoice.customerPan ? <p>PAN: {invoice.customerPan}</p> : null}
          {invoice.customerGstin ? <p>GSTIN: {invoice.customerGstin}</p> : null}
        </div>
        <div className="text-right">
          <p>Place of supply: {invoice.placeOfSupply || shop.state}</p>
          <p>HSN: 7113 · Articles of jewellery</p>
        </div>
      </section>

      <table className="mt-4 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-cream">
            <th className="border border-sand px-2 py-1.5 text-left">#</th>
            <th className="border border-sand px-2 py-1.5 text-left">Particulars</th>
            <th className="border border-sand px-2 py-1.5">Purity</th>
            <th className="border border-sand px-2 py-1.5 text-right">Gross</th>
            <th className="border border-sand px-2 py-1.5 text-right">Net g</th>
            <th className="border border-sand px-2 py-1.5 text-right">Rate</th>
            <th className="border border-sand px-2 py-1.5 text-right">Gold</th>
            <th className="border border-sand px-2 py-1.5 text-right">Making</th>
            <th className="border border-sand px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={`${item.tagNo}-${index}`}>
              <td className="border border-sand px-2 py-1.5">{index + 1}</td>
              <td className="border border-sand px-2 py-1.5">
                <p className="font-medium">
                  {item.description}
                  {item.tagNo ? ` · ${item.tagNo}` : ""}
                </p>
                <p className="text-stone">
                  {labelize(item.category)} · {item.metal}
                  {item.huid ? ` · HUID ${item.huid}` : ""}
                  {num(item.stoneWeight) > 0 ? ` · stone ${grams(num(item.stoneWeight))}g` : ""}
                </p>
              </td>
              <td className="border border-sand px-2 py-1.5 text-center">{item.purity}</td>
              <td className="border border-sand px-2 py-1.5 text-right tabular">{grams(num(item.grossWeight))}</td>
              <td className="border border-sand px-2 py-1.5 text-right tabular">{grams(num(item.netWeight))}</td>
              <td className="border border-sand px-2 py-1.5 text-right tabular">{inr(num(item.ratePerGram), false)}</td>
              <td className="border border-sand px-2 py-1.5 text-right tabular">{inr(num(item.goldValue), false)}</td>
              <td className="border border-sand px-2 py-1.5 text-right tabular">{inr(num(item.makingAmount), false)}</td>
              <td className="border border-sand px-2 py-1.5 text-right tabular">{inr(num(item.lineTotal), false)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoice.exchanges.length ? (
        <section className="mt-4">
          <p className="text-[11px] tracking-[0.16em] text-stone uppercase">Old gold received</p>
          <table className="mt-1 w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-cream">
                <th className="border border-sand px-2 py-1 text-left">Particulars</th>
                <th className="border border-sand px-2 py-1">Purity</th>
                <th className="border border-sand px-2 py-1 text-right">Wt g</th>
                <th className="border border-sand px-2 py-1 text-right">Rate</th>
                <th className="border border-sand px-2 py-1 text-right">Deduct</th>
                <th className="border border-sand px-2 py-1 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {invoice.exchanges.map((ex, index) => (
                <tr key={index}>
                  <td className="border border-sand px-2 py-1">{ex.description}</td>
                  <td className="border border-sand px-2 py-1 text-center">{ex.purity}</td>
                  <td className="border border-sand px-2 py-1 text-right tabular">{grams(num(ex.netWeight))}</td>
                  <td className="border border-sand px-2 py-1 text-right tabular">{inr(num(ex.ratePerGram), false)}</td>
                  <td className="border border-sand px-2 py-1 text-right tabular">{num(ex.deductionPercent)}%</td>
                  <td className="border border-sand px-2 py-1 text-right tabular">{inr(num(ex.amount), false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mt-4 grid grid-cols-2 gap-6 text-xs">
        <div>
          <p className="tracking-[0.16em] text-stone uppercase">Amount in words</p>
          <p className="mt-1 font-medium">{amountInWords(num(invoice.netPayable))}</p>
          {invoice.payments.length ? (
            <div className="mt-3">
              <p className="tracking-[0.16em] text-stone uppercase">Payments</p>
              <ul className="mt-1 space-y-0.5">
                {invoice.payments.map((pay, index) => (
                  <li key={index}>
                    {labelize(pay.method)} {inr(num(pay.amount))}
                    {pay.reference ? ` · ${pay.reference}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {shop.bankName ? (
            <p className="mt-3 text-stone">
              Bank: {shop.bankName} · A/c {shop.bankAccount} · {shop.ifsc}
            </p>
          ) : null}
          {invoice.notes ? <p className="mt-3">Note: {invoice.notes}</p> : null}
        </div>
        <dl className="space-y-1">
          <Tot label="Gold value" value={inr(num(invoice.goldValue))} />
          <Tot label="Wastage" value={inr(num(invoice.wastageAmount))} />
          <Tot label="Making charges" value={inr(num(invoice.makingAmount))} />
          <Tot label="Stone / hallmark" value={inr(num(invoice.stoneAmount) + num(invoice.hallmarkAmount))} />
          <Tot label="Taxable @ 3%" value={inr(num(invoice.taxable3))} />
          <Tot label="CGST 1.5%" value={inr(num(invoice.cgst3))} />
          <Tot label="SGST 1.5%" value={inr(num(invoice.sgst3))} />
          {num(invoice.taxable5) > 0 ? (
            <>
              <Tot label="Taxable making @ 5%" value={inr(num(invoice.taxable5))} />
              <Tot label="CGST 2.5%" value={inr(num(invoice.cgst5))} />
              <Tot label="SGST 2.5%" value={inr(num(invoice.sgst5))} />
            </>
          ) : null}
          <Tot label="Round off" value={inr(num(invoice.roundOff))} />
          <Tot label="Invoice value" value={inr(num(invoice.grandTotal))} strong />
          <Tot label="Less: old gold" value={inr(num(invoice.oldGoldValue))} />
          <Tot label="Net payable" value={inr(num(invoice.netPayable))} strong />
          <Tot label="Received" value={inr(num(invoice.paidAmount))} />
          <Tot label="Balance" value={inr(num(invoice.balanceAmount))} />
        </dl>
      </section>

      <footer className="mt-8 grid grid-cols-2 gap-6 text-[11px] text-stone">
        <div>
          <p>Declaration: The particulars given above are true and correct.</p>
          {shop.terms ? <p className="mt-2">{shop.terms}</p> : null}
        </div>
        <div className="text-right">
          <p>For {shop.name}</p>
          <div className="mt-10 font-medium text-ink">Authorised signatory</div>
        </div>
      </footer>
    </article>
  );
}

function Tot({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-sm text-ink" : ""}`}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
