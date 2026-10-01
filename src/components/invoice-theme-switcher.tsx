"use client";

import { useState } from "react";
import { InvoiceDocument } from "@/components/invoice-document";
import { InvoiceDocumentBlue } from "@/components/invoice-document-blue";
import { InvoiceDocumentStitch, RateDoc } from "@/components/invoice-document-stitch";

type InvoiceDoc = Parameters<typeof InvoiceDocument>[0]["invoice"];
type ShopDoc    = Parameters<typeof InvoiceDocument>[0]["shop"];

const THEMES = [
  {
    id: "surya-stitch",
    label: "Surya Haute Joaillerie (Stitch)",
    desc: "Luxury Atelier — Gold filigree, Side A & B Archival Print",
    preview: ["#7a5900", "#455f8a", "#c59b3f"],
  },
  {
    id: "royal-gold",
    label: "Royal & Gold",
    desc: "Classic jewellery — deep royal with gold accents",
    preview: ["#4a1518", "#c4a35a", "#ead08a"],
  },
  {
    id: "blue-gold",
    label: "Royal Blue & Gold",
    desc: "Luxury sapphire — navy & royal blue with gold",
    preview: ["#0d1f4a", "#1a3a7c", "#c4a35a"],
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export function InvoiceThemeSwitcher({
  invoice,
  shop,
  rates = [],
}: {
  invoice: InvoiceDoc;
  shop: ShopDoc;
  rates?: RateDoc[];
}) {
  const [theme, setTheme] = useState<ThemeId>("surya-stitch");

  return (
    <div>
      {/* Theme picker — screen only, hides on print */}
      <div
        className="no-print mb-4 flex items-center gap-3 rounded-xl border border-[#e7dcc8] bg-white/70 backdrop-blur px-4 py-3 shadow-sm"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone">
          Invoice Theme:
        </span>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              title={t.desc}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                theme === t.id
                  ? "border-[#c4a35a] bg-[#fdf8f0] text-[#7a5900] shadow-sm ring-1 ring-[#c4a35a]/40 font-bold"
                  : "border-[#e0d8cc] bg-white text-stone hover:border-[#c4a35a]/60 hover:bg-[#fdfaf5]"
              }`}
            >
              {/* Colour swatches */}
              <span className="flex gap-0.5">
                {t.preview.map((c, i) => (
                  <span
                    key={i}
                    style={{ background: c }}
                    className="inline-block h-3 w-3 rounded-full border border-white/60"
                  />
                ))}
              </span>
              {t.label}
              {theme === t.id && (
                <span className="ml-0.5 text-[#7a5900]">✓</span>
              )}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-stone/60 italic hidden sm:block">
          Theme only affects screen &amp; PDF — not data
        </span>
      </div>

      {/* Render chosen theme */}
      {theme === "surya-stitch" ? (
        <InvoiceDocumentStitch invoice={invoice} shop={shop} rates={rates} />
      ) : theme === "royal-gold" ? (
        <InvoiceDocument invoice={invoice} shop={shop} />
      ) : (
        <InvoiceDocumentBlue invoice={invoice} shop={shop} />
      )}
    </div>
  );
}
