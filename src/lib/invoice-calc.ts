import { r2 } from "./money";

export type MakingType = "PER_GRAM" | "PERCENT" | "FLAT";
export type MakingGstMode = "SEPARATE_5" | "COMBINED_3";

export function gstModeForMaterial(metal: string, shopMode: MakingGstMode): MakingGstMode {
  return metal === "GOLD" || metal === "SILVER" ? "COMBINED_3" : shopMode;
}

export type LineInput = {
  netWeight: number;
  ratePerGram: number;
  makingType: MakingType;
  makingValue: number;
  wastagePercent: number;
  wastageAmountOverride?: number | null;
  stoneCharge: number;
  hallmarkCharge: number;
  otherCharge: number;
};

export type LineResult = {
  goldValue: number;
  wastageAmount: number;
  makingAmount: number;
  taxable3: number;
  taxable5: number;
  cgst3: number;
  sgst3: number;
  cgst5: number;
  sgst5: number;
  gstTotal: number;
  lineTotal: number;
};

export function calcMaking(
  goldValue: number,
  netWeight: number,
  makingType: MakingType,
  makingValue: number,
): number {
  if (makingType === "PER_GRAM") return r2(makingValue * netWeight);
  if (makingType === "PERCENT") return r2(goldValue * (makingValue / 100));
  return r2(makingValue);
}

export function calcLine(input: LineInput, mode: MakingGstMode, includeGst = true): LineResult {
  const goldValue = r2(input.netWeight * input.ratePerGram);
  const wastageAmount = input.wastageAmountOverride == null
    ? r2(goldValue * (input.wastagePercent / 100))
    : r2(Math.max(0, input.wastageAmountOverride));
  const makingAmount = calcMaking(
    goldValue,
    input.netWeight,
    input.makingType,
    input.makingValue,
  );
  const extras = r2(input.stoneCharge + input.hallmarkCharge + input.otherCharge);

  let taxable3 = 0;
  let taxable5 = 0;
  if (mode === "SEPARATE_5") {
    taxable3 = r2(goldValue + wastageAmount + extras);
    taxable5 = makingAmount;
  } else {
    taxable3 = r2(goldValue + wastageAmount + extras + makingAmount);
    taxable5 = 0;
  }

  const cgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const sgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const cgst5 = includeGst ? r2(taxable5 * 0.025) : 0;
  const sgst5 = includeGst ? r2(taxable5 * 0.025) : 0;
  const gstTotal = r2(cgst3 + sgst3 + cgst5 + sgst5);
  const lineTotal = r2(taxable3 + taxable5 + gstTotal);

  return {
    goldValue,
    wastageAmount,
    makingAmount,
    taxable3,
    taxable5,
    cgst3,
    sgst3,
    cgst5,
    sgst5,
    gstTotal,
    lineTotal,
  };
}

export function applyFinalLinePrice(line: LineResult, finalPrice: number, includeGst = true): LineResult {
  const target = r2(Math.max(0, finalPrice));
  const preTax = line.taxable3 + line.taxable5;
  const targetBase = includeGst
    ? target / (preTax > 0 ? (preTax + line.taxable3 * 0.03 + line.taxable5 * 0.05) / preTax : 1.03)
    : target;
  const taxable3 = preTax > 0 ? r2(line.taxable3 * targetBase / preTax) : r2(targetBase);
  const taxable5 = preTax > 0 ? r2(line.taxable5 * targetBase / preTax) : 0;
  const cgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const sgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const cgst5 = includeGst ? r2(taxable5 * 0.025) : 0;
  const sgst5 = includeGst ? r2(taxable5 * 0.025) : 0;
  return {
    ...line,
    taxable3,
    taxable5,
    cgst3,
    sgst3,
    cgst5,
    sgst5,
    gstTotal: r2(cgst3 + sgst3 + cgst5 + sgst5),
    lineTotal: target,
  };
}

/** Treat a product MRP as the taxable base and add 3% GST on top. */
export function applyMrpLineBase(line: LineResult, mrpBase: number, includeGst = true): LineResult {
  const taxable3 = r2(Math.max(0, mrpBase));
  const cgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const sgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const gstTotal = r2(cgst3 + sgst3);
  return {
    ...line,
    taxable3,
    taxable5: 0,
    cgst3,
    sgst3,
    cgst5: 0,
    sgst5: 0,
    gstTotal,
    lineTotal: r2(taxable3 + gstTotal),
  };
}

export type DiscountMode = "PERCENT" | "AMOUNT";

export function applyLineDiscount(
  line: LineResult,
  discountPercent: number,
  discountAmount: number,
  discountMode: DiscountMode,
  includeGst = true,
): LineResult & { discountPercent: number; discountAmount: number } {
  // Discounts are posted after GST in this billing flow. Keep the taxable base
  // and GST intact, then subtract the discount from the customer payable.
  const base = r2(Math.max(0, line.lineTotal));
  const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const requestedAmount = Math.max(0, Number(discountAmount) || 0);
  const amount = r2(Math.min(base, discountMode === "AMOUNT" ? requestedAmount : base * percent / 100));
  const appliedPercent = base > 0 ? r2(amount / base * 100) : 0;
  return {
    ...line,
    lineTotal: r2(base - amount),
    discountPercent: appliedPercent,
    discountAmount: amount,
  };
}

export function calcOldGold(
  netWeight: number,
  ratePerGram: number,
  deductionPercent: number,
): number {
  return r2(netWeight * ratePerGram * (1 - deductionPercent / 100));
}

export function calcExchange(
  netWeight: number,
  ratePerUnit: number,
  dustWeight: number,
  wastageWeight: number,
) {
  const finalNetWeight = Math.max(0, r2(netWeight - dustWeight - wastageWeight));
  return {
    finalNetWeight,
    amount: r2(netWeight * ratePerUnit),
    finalAmount: r2(finalNetWeight * ratePerUnit),
  };
}

export type InvoiceTotals = {
  goldValue: number;
  makingAmount: number;
  wastageAmount: number;
  stoneAmount: number;
  hallmarkAmount: number;
  otherAmount: number;
  taxable3: number;
  taxable5: number;
  cgst3: number;
  sgst3: number;
  cgst5: number;
  sgst5: number;
  gstTotal: number;
  beforeRound: number;
  roundOff: number;
  grandTotal: number;
  oldGoldValue: number;
  netPayable: number;
  paidAmount: number;
  balanceAmount: number;
};

export function applyInvoiceTotalOverride(totals: InvoiceTotals, invoiceTotal: number): InvoiceTotals {
  const grandTotal = r2(Math.max(0, invoiceTotal));
  const netPayable = r2(grandTotal - totals.oldGoldValue);
  return {
    ...totals,
    grandTotal,
    roundOff: r2(grandTotal - totals.beforeRound),
    netPayable,
    balanceAmount: Math.max(0, r2(netPayable - totals.paidAmount)),
  };
}

/** Treat a manually entered MRP as the taxable base, then add GST on top. */
export function applyMrpBaseOverride(totals: InvoiceTotals, mrpBase: number, includeGst = true, productDiscountAmount = 0): InvoiceTotals {
  const base = r2(Math.max(0, mrpBase));
  const currentBase = totals.taxable3 + totals.taxable5;
  const share3 = currentBase > 0 ? totals.taxable3 / currentBase : 1;
  const taxable3 = r2(base * share3);
  const taxable5 = r2(base - taxable3);
  const cgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const sgst3 = includeGst ? r2(taxable3 * 0.015) : 0;
  const cgst5 = includeGst ? r2(taxable5 * 0.025) : 0;
  const sgst5 = includeGst ? r2(taxable5 * 0.025) : 0;
  const gstTotal = r2(cgst3 + sgst3 + cgst5 + sgst5);
  const beforeRound = r2(Math.max(0, base + gstTotal - productDiscountAmount));
  const grandTotal = Math.round(beforeRound);
  const oldGoldValue = totals.oldGoldValue;
  const netPayable = r2(grandTotal - oldGoldValue);
  return {
    ...totals,
    taxable3,
    taxable5,
    cgst3,
    sgst3,
    cgst5,
    sgst5,
    gstTotal,
    beforeRound,
    roundOff: r2(grandTotal - beforeRound),
    grandTotal,
    netPayable,
    balanceAmount: Math.max(0, r2(netPayable - totals.paidAmount)),
  };
}

/** Apply the invoice discount after the taxable value and GST are calculated. */
export function applyInvoiceDiscount(
  totals: InvoiceTotals,
  discountPercent: number,
  discountAmount: number,
  discountMode: DiscountMode,
  includeGst = true,
): InvoiceTotals & { discountPercent: number; discountAmount: number } {
  // Match item discounts: show full taxable value and GST, then apply the
  // invoice discount as the final deduction from the amount due.
  const base = r2(Math.max(0, totals.beforeRound));
  const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const requestedAmount = Math.max(0, Number(discountAmount) || 0);
  const amount = r2(Math.min(base, discountMode === "AMOUNT" ? requestedAmount : base * percent / 100));
  const appliedPercent = base > 0 ? r2(amount / base * 100) : 0;
  const beforeRound = r2(base - amount);
  const grandTotal = Math.round(beforeRound);
  const netPayable = r2(grandTotal - totals.oldGoldValue);
  return {
    ...totals,
    beforeRound,
    grandTotal,
    roundOff: r2(grandTotal - beforeRound),
    netPayable,
    balanceAmount: Math.max(0, r2(netPayable - totals.paidAmount)),
    discountPercent: appliedPercent,
    discountAmount: amount,
  };
}

export function calcInvoice(
  lines: Array<
    LineResult & {
      stoneCharge: number;
      hallmarkCharge: number;
      otherCharge: number;
    }
  >,
  oldGoldValue: number,
  paidAmount: number,
): InvoiceTotals {
  const goldValue = r2(lines.reduce((s, l) => s + l.goldValue, 0));
  const makingAmount = r2(lines.reduce((s, l) => s + l.makingAmount, 0));
  const wastageAmount = r2(lines.reduce((s, l) => s + l.wastageAmount, 0));
  const stoneAmount = r2(lines.reduce((s, l) => s + l.stoneCharge, 0));
  const hallmarkAmount = r2(lines.reduce((s, l) => s + l.hallmarkCharge, 0));
  const otherAmount = r2(lines.reduce((s, l) => s + l.otherCharge, 0));
  const taxable3 = r2(lines.reduce((s, l) => s + l.taxable3, 0));
  const taxable5 = r2(lines.reduce((s, l) => s + l.taxable5, 0));
  const cgst3 = r2(lines.reduce((s, l) => s + l.cgst3, 0));
  const sgst3 = r2(lines.reduce((s, l) => s + l.sgst3, 0));
  const cgst5 = r2(lines.reduce((s, l) => s + l.cgst5, 0));
  const sgst5 = r2(lines.reduce((s, l) => s + l.sgst5, 0));
  const gstTotal = r2(cgst3 + sgst3 + cgst5 + sgst5);
  // lineTotal can be a seller-entered fixed/MRP price; it is authoritative for
  // the customer total while the tax breakdown still reflects entered details.
  const beforeRound = r2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const grandTotal = Math.round(beforeRound);
  const roundOff = r2(grandTotal - beforeRound);
  const old = r2(oldGoldValue);
  const netPayable = r2(grandTotal - old);
  const paid = r2(paidAmount);

  return {
    goldValue,
    makingAmount,
    wastageAmount,
    stoneAmount,
    hallmarkAmount,
    otherAmount,
    taxable3,
    taxable5,
    cgst3,
    sgst3,
    cgst5,
    sgst5,
    gstTotal,
    beforeRound,
    roundOff,
    grandTotal,
    oldGoldValue: old,
    netPayable,
    paidAmount: paid,
    balanceAmount: Math.max(0, r2(netPayable - paid)),
  };
}
