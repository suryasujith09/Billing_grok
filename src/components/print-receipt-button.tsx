"use client";

export function PrintReceiptButton() {
  return <button type="button" onClick={() => window.print()} className="no-print rounded bg-royal-deep px-4 py-2 text-sm font-semibold text-white">Print / Save PDF</button>;
}
