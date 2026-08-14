import { r2 } from "./money";

export type MakingType = "PER_GRAM" | "PERCENT" | "FLAT";
export type MakingGstMode = "SEPARATE_5" | "COMBINED_3";

export type LineInput = {
  netWeight: number;
  ratePerGram: number;
  makingType: MakingType;
  makingValue: number;
  wastagePercent: number;
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

export function calcLine(input: LineInput, mode: MakingGstMode): LineResult {
  const goldValue = r2(input.netWeight * input.ratePerGram);
  const wastageAmount = r2(goldValue * (input.wastagePercent / 100));
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

  const cgst3 = r2(taxable3 * 0.015);
  const sgst3 = r2(taxable3 * 0.015);
  const cgst5 = r2(taxable5 * 0.025);
  const sgst5 = r2(taxable5 * 0.025);
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

export function calcOldGold(
  netWeight: number,
  ratePerGram: number,
  deductionPercent: number,
): number {
  return r2(netWeight * ratePerGram * (1 - deductionPercent / 100));
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
  const beforeRound = r2(taxable3 + taxable5 + gstTotal);
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
    balanceAmount: r2(netPayable - paid),
  };
}
