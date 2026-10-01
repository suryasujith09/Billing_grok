"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { formatFieldValue, getPrintPageHeightMm, type ItemPrintData, type LabelTemplateConfig } from "@/lib/tspl-engine";

function Barcode({ value, width, height }: { value: string; width: number; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, { format: "CODE128", displayValue: false, width: 1.5, height: 38, margin: 2 });
    } catch {
      ref.current.replaceChildren();
    }
  }, [value]);
  return <svg ref={ref} role="img" aria-label={`Code 128 barcode for ${value}`} style={{ width, height }} className="bg-white" preserveAspectRatio="none" />;
}

export function InventoryLabelPreview({ template, item }: { template: LabelTemplateConfig; item: ItemPrintData }) {
  const columns = Math.max(1, template.columnsAcross ?? 1);
  const rows = columns === 2 ? 2 : 1;
  const rollWidth = template.rollWidthMm ?? template.widthMm;
  const pageHeightMm = getPrintPageHeightMm(template);
  const scale = Math.min(6, 420 / rollWidth);
  const tailWidth = template.tailWidthMm ?? 4;

  return (
    <div className="w-full overflow-x-auto rounded-lg bg-slate-200 p-3">
      <div className="mx-auto border border-slate-400 bg-white p-1.5" style={{ width: rollWidth * scale + 12 }}>
        <div className="mb-1 border-b border-dashed border-slate-400 pb-1 text-center text-[9px] font-mono text-slate-500">
          ▲ PRINT PAGE · {rollWidth} × {pageHeightMm} mm ▲
        </div>
        <div className="relative overflow-hidden border border-slate-300 bg-white" style={{
          width: rollWidth * scale,
          height: pageHeightMm * scale,
        }}>
          {Array.from({ length: rows * columns }, (_, index) => {
            const row = Math.floor(index / columns);
            const column = index % columns;
            return <div key={`${row}-${column}`} className="absolute overflow-hidden border border-amber-400/70 bg-amber-50/20" style={{
              left: (column * (template.widthMm + (template.colGapMm ?? 2))) * scale,
              top: row * (template.heightMm + template.gapMm) * scale,
              width: template.widthMm * scale,
              height: template.heightMm * scale,
            }}>
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-x border-dashed border-amber-400/70 bg-amber-100/60" style={{
                left: (template.leftWingWidthMm ?? 28) * scale,
                width: tailWidth * scale,
              }} />
              {template.elements.filter((element) => element.isVisible).map((element) => {
                const value = formatFieldValue(element.fieldKey, item, element.customText);
                if (!value && element.fieldKey !== "barcode") return null;
                return (
                  <div key={element.id} className="absolute z-10 overflow-hidden text-black" style={{
                    left: element.xMm * scale,
                    top: element.yMm * scale,
                    maxWidth: Math.max(0, (template.widthMm - element.xMm) * scale),
                    fontSize: `${(element.fontSize ?? 2) * 2.2}px`,
                    lineHeight: 1.1,
                    fontWeight: element.fontStyle === "bold" ? 700 : 400,
                    whiteSpace: "nowrap",
                  }}>
                    {element.fieldKey === "barcode"
                      ? <Barcode value={item.tagNo} width={(element.widthMm ?? 24) * scale} height={(element.heightMm ?? 10) * scale} />
                      : value}
                  </div>
                );
              })}
            </div>;
          })}
        </div>
        <div className="mt-1 border-t border-dashed border-slate-400 pt-1 text-center text-[9px] font-mono text-slate-500">
          {columns === 2 ? "4 LABELS · 2 ACROSS × 2 FEED ROWS" : "LABEL FEED GAP"} · {template.gapMm} mm
        </div>
      </div>
    </div>
  );
}
