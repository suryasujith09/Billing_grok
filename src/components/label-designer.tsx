"use client";

import { useEffect, useId, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import {
  saveLabelTemplateAction,
  deleteLabelTemplateAction,
  printTestLabelAction,
  recordTestPrintResultAction,
} from "@/lib/printer-actions";
import { sendToPrintAgent } from "./print-agent-client";
import {
  DEFAULT_TEMPLATES,
  formatFieldValue,
  getPrintPageHeightMm,
  LEGACY_GOLD_DUAL_TEMPLATE_NAME,
  type LabelElement,
  type LabelTemplateConfig,
} from "@/lib/tspl-engine";
import {
  Copy,
  Plus,
  Printer,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Columns,
  FilePlus2,
} from "lucide-react";

interface LabelDesignerProps {
  initialTemplates: Array<{
    id: string;
    name: string;
    category: string;
    widthMm: number;
    heightMm: number;
    gapMm: number;
    columnsAcross?: number | null;
    rollWidthMm?: number | null;
    colGapMm?: number | null;
    leftWingWidthMm?: number | null;
    rightWingWidthMm?: number | null;
    tailWidthMm?: number | null;
    elements: string | LabelElement[];
  }>;
}

function Code128Preview({ value, width, height }: { value: string; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: false,
        width: 1.5,
        height: 38,
        margin: 2,
      });
    } catch {
      svgRef.current.replaceChildren();
    }
  }, [value]);

  return (
    <svg
      ref={svgRef}
      width={`${width}px`}
      height={`${height}px`}
      role="img"
      aria-label={`Code 128 barcode preview for ${value}`}
      className="bg-white"
      style={{ width: `${width}px`, height: `${height}px` }}
      preserveAspectRatio="none"
    />
  );
}

const SAMPLE_DEMO_ITEM = {
  tagNo: "SGD26RG00001",
  name: "22K Gold Ladies Ring",
  category: "RING",
  metal: "GOLD",
  purity: "22K916",
  grossWeight: 4.52,
  netWeight: 4.2,
  stoneWeight: 0.32,
  diamondCarat: 0.45,
  diamondPieces: 12,
  huid: "H98234",
  mrp: 34500,
  shopName: "SURYA GOLD & DIAMONDS",
  productCode: "RG-001",
};

const AVAILABLE_FIELDS: { key: LabelElement["fieldKey"]; label: string }[] = [
  { key: "shopName", label: "Company / Shop Name" },
  { key: "tagNo", label: "Unique Tag ID" },
  { key: "barcode", label: "Barcode 128" },
  { key: "purity", label: "Metal & Purity (e.g. 22K916)" },
  { key: "grossWeight", label: "Gross Weight (GW)" },
  { key: "netWeight", label: "Net Weight (NW)" },
  { key: "stoneWeight", label: "Stone Weight (SW)" },
  { key: "diamondCarat", label: "Diamond Carats / Pcs" },
  { key: "huid", label: "HUID Hallmarking Code" },
  { key: "mrp", label: "MRP Price" },
  { key: "name", label: "Item Description" },
  { key: "category", label: "Category" },
  { key: "customText", label: "Custom Text" },
];

export function LabelDesigner({ initialTemplates }: LabelDesignerProps) {
  const idPrefix = useId();
  const nextId = useRef(0);
  const parsedTemplates: LabelTemplateConfig[] = initialTemplates.map((t) => {
    const elements = typeof t.elements === "string" ? JSON.parse(t.elements) : t.elements;
    // Earlier seeded rows stored Prisma's geometry defaults rather than each preset's
    // actual roll layout. Recover those known presets in the editor until saved again.
    const preset = DEFAULT_TEMPLATES.find((candidate) =>
      (candidate.name === t.name || t.name === LEGACY_GOLD_DUAL_TEMPLATE_NAME) && candidate.widthMm === t.widthMm &&
      candidate.heightMm === t.heightMm && JSON.stringify(candidate.elements) === JSON.stringify(elements)
    );
    const hasOldPrismaDefaults = (t.columnsAcross == null || t.columnsAcross === 1) &&
      (t.rollWidthMm == null || t.rollWidthMm === 60) && (t.colGapMm == null || t.colGapMm === 2) &&
      (t.leftWingWidthMm == null || t.leftWingWidthMm === 28) &&
      (t.rightWingWidthMm == null || t.rightWingWidthMm === 28) &&
      (t.tailWidthMm == null || t.tailWidthMm === 4);
    const recoveredPreset = hasOldPrismaDefaults ? preset : undefined;
    return {
      id: t.id,
      name: preset?.name ?? t.name,
      category: t.category as LabelTemplateConfig["category"],
      widthMm: t.widthMm,
      heightMm: t.heightMm,
      gapMm: t.gapMm,
      columnsAcross: recoveredPreset?.columnsAcross ?? t.columnsAcross ?? 1,
      rollWidthMm: recoveredPreset?.rollWidthMm ?? t.rollWidthMm ?? t.widthMm,
      colGapMm: recoveredPreset?.colGapMm ?? t.colGapMm ?? 2,
      leftWingWidthMm: recoveredPreset?.leftWingWidthMm ?? t.leftWingWidthMm ?? 28,
      rightWingWidthMm: recoveredPreset?.rightWingWidthMm ?? t.rightWingWidthMm ?? 28,
      tailWidthMm: recoveredPreset?.tailWidthMm ?? t.tailWidthMm ?? 4,
      elements,
    };
  });

  const [templates, setTemplates] = useState<LabelTemplateConfig[]>(
    parsedTemplates.length > 0 ? parsedTemplates : DEFAULT_TEMPLATES
  );
  const [persistedTemplateIds, setPersistedTemplateIds] = useState(
    () => new Set(initialTemplates.map((template) => template.id))
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || DEFAULT_TEMPLATES[0].id
  );
  const [activeTemplate, setActiveTemplate] = useState<LabelTemplateConfig>(
    templates.find((t) => t.id === selectedTemplateId) || templates[0] || DEFAULT_TEMPLATES[0]
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>("e3");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const dragRef = useRef<{ id: string; pointerX: number; pointerY: number; xMm: number; yMm: number } | null>(null);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find((t) => t.id === id);
    if (found) setActiveTemplate(found);
  };

  const handleUpdateElement = (elemId: string, updates: Partial<LabelElement>) => {
    setActiveTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === elemId ? { ...el, ...updates } : el)),
    }));
  };

  const handleNudge = (dxMm: number, dyMm: number) => {
    if (!selectedElementId) return;
    const elem = activeTemplate.elements.find((e) => e.id === selectedElementId);
    if (!elem) return;
    handleUpdateElement(selectedElementId, {
      xMm: Number(Math.max(0, elem.xMm + dxMm).toFixed(1)),
      yMm: Number(Math.max(0, elem.yMm + dyMm).toFixed(1)),
    });
  };

  const handleAddElement = (fieldKey: LabelElement["fieldKey"]) => {
    const newId = `${idPrefix}_elem_${++nextId.current}`;
    const newElem: LabelElement = {
      id: newId,
      fieldKey,
      xMm: 2,
      yMm: 2,
      widthMm: fieldKey === "barcode" ? 24 : undefined,
      heightMm: fieldKey === "barcode" ? 10 : undefined,
      fontSize: 2,
      isVisible: true,
      rotation: 0,
    };
    setActiveTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, newElem],
    }));
    setSelectedElementId(newId);
  };

  const handleDeleteElement = (elemId: string) => {
    setActiveTemplate((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== elemId),
    }));
    if (selectedElementId === elemId) setSelectedElementId(null);
  };

  const handleSaveTemplate = async () => {
    setLoading(true);
    setMessage(null);
    const res = await saveLabelTemplateAction({
      id: activeTemplate.id,
      name: activeTemplate.name,
      category: activeTemplate.category,
      widthMm: activeTemplate.widthMm,
      heightMm: activeTemplate.heightMm,
      gapMm: activeTemplate.gapMm,
      columnsAcross: activeTemplate.columnsAcross ?? 1,
      rollWidthMm: activeTemplate.rollWidthMm ?? activeTemplate.widthMm,
      colGapMm: activeTemplate.colGapMm ?? 2,
      leftWingWidthMm: activeTemplate.leftWingWidthMm ?? 28,
      rightWingWidthMm: activeTemplate.rightWingWidthMm ?? 28,
      tailWidthMm: activeTemplate.tailWidthMm ?? 4,
      elements: activeTemplate.elements,
    });
    setLoading(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Template saved successfully!" });
      if (res.id) {
        setPersistedTemplateIds((prev) => new Set(prev).add(res.id!));
        setActiveTemplate((prev) => ({ ...prev, id: res.id! }));
        setSelectedTemplateId(res.id);
        setTemplates((prev) => prev.map((template) =>
          template.id === activeTemplate.id ? { ...template, ...activeTemplate, id: res.id! } : template
        ));
      }
    } else {
      setMessage({ type: "error", text: res.error || "Failed to save template." });
    }
  };

  const handleDuplicateTemplate = () => {
    const dup: LabelTemplateConfig = {
      ...activeTemplate,
      id: `preset-${idPrefix}_copy_${++nextId.current}`,
      name: `${activeTemplate.name} (Copy)`,
    };
    setTemplates((prev) => [...prev, dup]);
    setActiveTemplate(dup);
    setSelectedTemplateId(dup.id);
  };

  const handleNewTemplate = () => {
    const id = `preset-${idPrefix}_new_${++nextId.current}`;
    const template: LabelTemplateConfig = {
      id, name: "My Custom Label", category: "GENERAL", widthMm: 50,
      heightMm: 25, gapMm: 3, columnsAcross: 1, rollWidthMm: 50,
      colGapMm: 0, leftWingWidthMm: 23, rightWingWidthMm: 23, tailWidthMm: 4,
      elements: [],
    };
    setTemplates((prev) => [...prev, template]);
    setActiveTemplate(template);
    setSelectedTemplateId(id);
    setSelectedElementId(null);
    setMessage(null);
  };

  const handleDeleteTemplate = async () => {
    const savedTemplate = persistedTemplateIds.has(activeTemplate.id);
    if (savedTemplate) {
      setLoading(true);
      const result = await deleteLabelTemplateAction(activeTemplate.id);
      setLoading(false);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error || "Could not delete template." });
        return;
      }
    }

    const remaining = templates.filter((template) => template.id !== activeTemplate.id);
    const nextTemplate = remaining[0] || DEFAULT_TEMPLATES[0];
    setTemplates(remaining.length ? remaining : [nextTemplate]);
    setActiveTemplate(nextTemplate);
    setSelectedTemplateId(nextTemplate.id);
    setMessage({ type: "success", text: "Template deleted." });
  };

  const handleTestPrint = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const prepared = await printTestLabelAction(activeTemplate);
      if (!prepared.ok) {
        setMessage({ type: "error", text: prepared.error || "Could not prepare test label." });
        return;
      }
      const delivery = await sendToPrintAgent(prepared.job);
      await recordTestPrintResultAction({
        templateId: prepared.job.templateId,
        error: delivery.ok ? undefined : delivery.error,
      });
      setMessage(delivery.ok
        ? { type: "success", text: `Test label (${SAMPLE_DEMO_ITEM.tagNo}) sent to ${prepared.job.printerName}!` }
        : { type: "error", text: delivery.error || "Could not print test label." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not print test label." });
    } finally {
      setLoading(false);
    }
  };

  // Fit the printable web into the preview while retaining real millimeter proportions.
  const SCALE = Math.min(6.5, 560 / Math.max(1, activeTemplate.rollWidthMm ?? activeTemplate.widthMm));
  const columnsCount = Math.max(1, activeTemplate.columnsAcross || 1);
  const rowsCount = columnsCount === 2 ? 2 : 1;
  const rollWidthMm = activeTemplate.rollWidthMm ?? (columnsCount > 1 ? 108 : activeTemplate.widthMm);
  const colGapMm = activeTemplate.colGapMm ?? 2;
  const layoutWidthMm = columnsCount * activeTemplate.widthMm + (columnsCount - 1) * colGapMm;
  const invalidLayout = !Number.isFinite(rollWidthMm) || rollWidthMm <= 0 || rollWidthMm > 108 ||
    !Number.isFinite(activeTemplate.widthMm) || activeTemplate.widthMm <= 0 ||
    !Number.isFinite(activeTemplate.heightMm) || activeTemplate.heightMm <= 0 ||
    !Number.isFinite(activeTemplate.gapMm) || activeTemplate.gapMm < 0 ||
    (activeTemplate.leftWingWidthMm ?? 28) + (activeTemplate.tailWidthMm ?? 4) + (activeTemplate.rightWingWidthMm ?? 28) > activeTemplate.widthMm ||
    layoutWidthMm > rollWidthMm || activeTemplate.elements.some((element) =>
      element.xMm < 0 || element.yMm < 0 || element.xMm >= activeTemplate.widthMm ||
      element.yMm >= activeTemplate.heightMm ||
      element.fieldKey === "barcode" && ((element.widthMm ?? 24) + element.xMm > activeTemplate.widthMm ||
        (element.heightMm ?? 10) + element.yMm > activeTemplate.heightMm)
    );

  const rollWidthPx = rollWidthMm * SCALE;
  const tagWidthPx = activeTemplate.widthMm * SCALE;
  const tagHeightPx = activeTemplate.heightMm * SCALE;

  const activeElement = activeTemplate.elements.find((e) => e.id === selectedElementId);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-royal-card p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-cream/70">Label Template:</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-cream focus:border-gold focus:outline-hidden"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id} className="bg-royal-deep text-cream">
                {t.name} ({t.rollWidthMm || t.widthMm}mm Roll Width)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewTemplate}
            className="flex items-center gap-1.5 rounded-md border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold-bright hover:bg-gold/10 transition"
          >
            <FilePlus2 size={14} /> New Template
          </button>
          <button
            type="button"
            onClick={handleDuplicateTemplate}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-cream/80 hover:bg-white/5 hover:text-cream transition"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            type="button"
            onClick={handleDeleteTemplate}
            disabled={loading || templates.length <= 1}
            className="flex items-center gap-1.5 rounded-md border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition disabled:opacity-40"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={loading || invalidLayout}
            className="flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-bright hover:bg-gold/20 transition disabled:opacity-50"
          >
            <Printer size={14} /> {columnsCount === 2 ? "Test Print (4-up)" : "Test Print (TVS LP46 Dlite)"}
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={loading || invalidLayout}
            className="flex items-center gap-1.5 rounded-md bg-gold px-4 py-1.5 text-xs font-bold text-royal-deep hover:bg-gold-bright transition shadow-md disabled:opacity-50"
          >
            <Save size={14} /> Save Template
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-xs font-medium border flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}
      {invalidLayout && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          This layout does not fit the selected roll. Check that the roll is up to 108 mm wide, the labels and gaps fit across it, and every field stays inside its label.
        </div>
      )}

      {/* Main Designer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Roll & Tag Geometry Configuration */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-white/10 bg-royal-card p-4 shadow-lg space-y-4">
            <h3 className="font-bold text-gold-bright text-sm border-b border-white/10 pb-2 flex items-center gap-1.5">
              <Columns size={15} /> Paper Roll & Columns Setup
            </h3>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">Template Name</label>
              <input
                type="text"
                value={activeTemplate.name}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, name: e.target.value })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">Category</label>
              <select
                value={activeTemplate.category}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, category: e.target.value as LabelTemplateConfig["category"] })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden"
              >
                {["GOLD", "DIAMOND", "SILVER", "GENERAL", "REPAIR"].map((category) =>
                  <option key={category} value={category} className="bg-royal-deep">{category}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">Columns Across Roll</label>
              <select
                value={columnsCount}
                onChange={(e) =>
                  setActiveTemplate({ ...activeTemplate, columnsAcross: Number(e.target.value) })
                }
                className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden"
              >
                <option value={1} className="bg-royal-deep">1 Tag per Row (Single Column Roll)</option>
                <option value={2} className="bg-royal-deep">2 Tags per Row (2-Across Dual Column)</option>
                <option value={3} className="bg-royal-deep">3 Tags per Row (3-Across Triple Column)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Paper Roll Width (mm)</label>
                <input
                  type="number"
                  value={rollWidthMm}
                  onChange={(e) =>
                    setActiveTemplate({ ...activeTemplate, rollWidthMm: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Column Gap (mm)</label>
                <input
                  type="number"
                  value={colGapMm}
                  onChange={(e) =>
                    setActiveTemplate({ ...activeTemplate, colGapMm: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Label Gap / Feed (mm)</label>
                <input type="number" min="0" step="0.5" value={activeTemplate.gapMm}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, gapMm: Number(e.target.value) })}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Tail / Unprintable (mm)</label>
                <input type="number" min="0" step="0.5" value={activeTemplate.tailWidthMm ?? 4}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, tailWidthMm: Number(e.target.value) })}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Left Wing (mm)</label>
                <input type="number" min="0" step="0.5" value={activeTemplate.leftWingWidthMm ?? 28}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, leftWingWidthMm: Number(e.target.value) })}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Right Wing (mm)</label>
                <input type="number" min="0" step="0.5" value={activeTemplate.rightWingWidthMm ?? 28}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, rightWingWidthMm: Number(e.target.value) })}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Single Tag Width (mm)</label>
                <input
                  type="number"
                  value={activeTemplate.widthMm}
                  onChange={(e) =>
                    setActiveTemplate({ ...activeTemplate, widthMm: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cream/70 mb-1">Tag Height (mm)</label>
                <input
                  type="number"
                  value={activeTemplate.heightMm}
                  onChange={(e) =>
                    setActiveTemplate({ ...activeTemplate, heightMm: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-cream focus:border-gold focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Add Fields Panel */}
          <div className="rounded-xl border border-white/10 bg-royal-card p-4 shadow-lg space-y-3">
            <h3 className="font-bold text-gold-bright text-sm border-b border-white/10 pb-2">
              Add Fields to Tag
            </h3>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {AVAILABLE_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleAddElement(f.key)}
                  className="w-full flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-cream hover:bg-gold/20 hover:border-gold/40 transition text-left"
                >
                  <span>{f.label}</span>
                  <Plus size={13} className="text-gold" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel: Full Paper Roll Web Alignment Canvas */}
        <div className="lg:col-span-6 flex flex-col items-center justify-start rounded-xl border border-white/10 bg-black/50 p-6 shadow-inner min-h-[440px] overflow-x-auto">
          <div className="w-full flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gold-bright uppercase tracking-wider">
                Paper Roll Web Alignment Display ({rollWidthMm} × {getPrintPageHeightMm(activeTemplate)} mm Print Page)
              </span>
              <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold-bright">
                {columnsCount} Column{columnsCount > 1 ? "s Across" : " Roll"}
              </span>
              {columnsCount === 2 && <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">4 labels · 2 × 2</span>}
            </div>
            <span className="text-[10px] text-cream/50">Scale: 1mm = {SCALE.toFixed(1)}px</span>
          </div>

          {/* Full Physical Paper Roll Media Container */}
          <div
            className="relative bg-slate-200 border-2 border-slate-400 rounded-sm shadow-2xl p-2 transition-all"
            style={{
              width: `${rollWidthPx + 16}px`,
              minHeight: `${tagHeightPx + 40}px`,
            }}
          >
            {/* Top Perforation / Feed Direction Marker */}
            <div className="w-full text-center text-[9px] font-mono text-slate-500 mb-1 border-b border-dashed border-slate-400 pb-0.5">
              ▲ THERMAL FEED DIRECTION (TVS LP 46 Dlite 203 DPI) ▲
            </div>

            {/* Paper Web Area */}
            <div
              className="relative bg-white border border-slate-300 overflow-hidden"
              style={{
                width: `${rollWidthPx}px`,
                height: `${tagHeightPx * rowsCount + (rowsCount - 1) * (activeTemplate.gapMm ?? 3) * SCALE}px`,
              }}
            >
              {/* Render Tag Columns across the roll */}
              {Array.from({ length: columnsCount * rowsCount }).map((_, index) => {
                const rowIdx = Math.floor(index / columnsCount);
                const colIdx = index % columnsCount;
                const isFirstCol = rowIdx === 0 && colIdx === 0;

                return (
                  <div
                    key={colIdx}
                  className={`absolute top-0 bg-amber-50/40 border border-amber-400/80 shadow-xs overflow-hidden ${
                      !isFirstCol ? "opacity-90" : ""
                    }`}
                    style={{
                      left: `${colIdx * (activeTemplate.widthMm + colGapMm) * SCALE}px`,
                      top: `${rowIdx * (activeTemplate.heightMm + (activeTemplate.gapMm ?? 3)) * SCALE}px`,
                      width: `${tagWidthPx}px`,
                      height: `${tagHeightPx}px`,
                    }}
                  >
                    {/* Tag Column Label Indicator */}
                    <div className="absolute top-0.5 right-1 z-30 pointer-events-none">
                      <span className="text-[8px] font-mono font-bold bg-amber-200/80 text-amber-900 px-1 rounded">
                        {rowsCount > 1 ? `ROW ${rowIdx + 1} · ` : ""}COL {colIdx + 1}
                      </span>
                    </div>

                    {/* Butterfly Tag Adhesive Tail Loop Marker (Unprintable Zone) */}
                    <div
                      className="absolute top-0 bottom-0 bg-amber-100/70 border-x border-dashed border-amber-400/90 flex items-center justify-center pointer-events-none z-0"
                      style={{
                        left: `${(activeTemplate.leftWingWidthMm ?? 28) * SCALE}px`,
                        width: `${(activeTemplate.tailWidthMm ?? 4) * SCALE}px`,
                      }}
                    >
                      {(activeTemplate.tailWidthMm ?? 4) > 0 && <span className="text-[8px] font-bold text-amber-800 -rotate-90 whitespace-nowrap opacity-60">Tail (Adhesive)</span>}
                    </div>
                    <div aria-hidden="true" className="absolute top-0 bottom-0 border-l border-dotted border-slate-500/50 pointer-events-none z-0"
                      style={{ left: `${(activeTemplate.widthMm - (activeTemplate.rightWingWidthMm ?? 28)) * SCALE}px` }} />

                    {/* Render Elements inside this column */}
                    {activeTemplate.elements.map((elem) => {
                      if (!elem.isVisible) return null;
                      const isSelected = isFirstCol && elem.id === selectedElementId;
                      const val = formatFieldValue(elem.fieldKey, SAMPLE_DEMO_ITEM, elem.customText);

                      return (
                        <div
                          key={elem.id}
                          onClick={() => {
                            if (isFirstCol) setSelectedElementId(elem.id);
                          }}
                          onPointerDown={(event) => {
                            if (!isFirstCol || event.button !== 0) return;
                            event.currentTarget.setPointerCapture(event.pointerId);
                            dragRef.current = { id: elem.id, pointerX: event.clientX, pointerY: event.clientY, xMm: elem.xMm, yMm: elem.yMm };
                            setSelectedElementId(elem.id);
                          }}
                          onPointerMove={(event) => {
                            const drag = dragRef.current;
                            if (!isFirstCol || !drag || drag.id !== elem.id) return;
                            const maxX = Math.max(0, activeTemplate.widthMm - (elem.fieldKey === "barcode" ? (elem.widthMm ?? 24) : 1));
                            const maxY = Math.max(0, activeTemplate.heightMm - (elem.fieldKey === "barcode" ? (elem.heightMm ?? 10) : 1));
                            handleUpdateElement(elem.id, {
                              xMm: Number(Math.min(maxX, Math.max(0, drag.xMm + (event.clientX - drag.pointerX) / SCALE)).toFixed(1)),
                              yMm: Number(Math.min(maxY, Math.max(0, drag.yMm + (event.clientY - drag.pointerY) / SCALE)).toFixed(1)),
                            });
                          }}
                          onPointerUp={(event) => {
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                            dragRef.current = null;
                          }}
                          className={`absolute transition select-none ${
                            isFirstCol ? "cursor-move touch-none" : "pointer-events-none"
                          } ${
                            isSelected
                              ? "ring-2 ring-gold bg-amber-200/60 shadow-md z-20"
                              : "hover:ring-1 hover:ring-blue-400/60 z-10"
                          }`}
                          style={{
                            left: `${elem.xMm * SCALE}px`,
                            top: `${elem.yMm * SCALE}px`,
                          }}
                        >
                          {elem.fieldKey === "barcode" ? (
                            <div className="flex flex-col items-center bg-white p-0.5 border border-black/40 shadow-xs">
                              <Code128Preview
                                value={SAMPLE_DEMO_ITEM.tagNo}
                                width={(elem.widthMm || 24) * SCALE}
                                height={(elem.heightMm || 10) * SCALE}
                              />
                            </div>
                          ) : (
                            <span
                              className={`text-black whitespace-nowrap block font-sans ${
                                elem.fontStyle === "bold" ? "font-bold" : "font-normal"
                              }`}
                              style={{
                                fontSize: `${(elem.fontSize || 2) * 3.8}px`,
                                lineHeight: 1.1,
                              }}
                            >
                              {val || `[${elem.fieldKey}]`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom Sensor Gap Marker */}
            <div className="w-full text-center text-[9px] font-mono text-slate-500 mt-1 border-t border-dashed border-slate-400 pt-0.5">
              GAP SENSOR MARKER ({activeTemplate.gapMm ?? 3} mm GAP)
            </div>
          </div>

          <p className="text-[11px] text-cream/60 mt-4 text-center">
            Drag fields on the first label to position them. The preview uses sample product data; a test print sends one sample layout to the printer.
          </p>
        </div>

        {/* Right Panel: Nudge Controls & Element Inspector */}
        <div className="lg:col-span-3 space-y-4">
          {/* Precise Nudge Pad */}
          <div className="rounded-xl border border-white/10 bg-royal-card p-4 shadow-lg space-y-3">
            <h3 className="font-bold text-gold-bright text-sm border-b border-white/10 pb-2 flex items-center justify-between">
              <span>Precise Nudge Pad</span>
              <span className="text-[10px] text-cream/50">±0.5 mm steps</span>
            </h3>

            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <button
                type="button"
                onClick={() => handleNudge(0, -0.5)}
                disabled={!selectedElementId}
                className="flex h-8 w-12 items-center justify-center rounded bg-white/10 text-cream hover:bg-gold hover:text-royal-deep transition disabled:opacity-30"
                title="Nudge Up 0.5mm"
              >
                <ArrowUp size={16} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNudge(-0.5, 0)}
                  disabled={!selectedElementId}
                  className="flex h-12 w-8 items-center justify-center rounded bg-white/10 text-cream hover:bg-gold hover:text-royal-deep transition disabled:opacity-30"
                  title="Nudge Left 0.5mm"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-black/40 text-[10px] font-mono font-bold text-gold-bright">
                  MOVE
                </div>
                <button
                  type="button"
                  onClick={() => handleNudge(0.5, 0)}
                  disabled={!selectedElementId}
                  className="flex h-12 w-8 items-center justify-center rounded bg-white/10 text-cream hover:bg-gold hover:text-royal-deep transition disabled:opacity-30"
                  title="Nudge Right 0.5mm"
                >
                  <ArrowRight size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleNudge(0, 0.5)}
                disabled={!selectedElementId}
                className="flex h-8 w-12 items-center justify-center rounded bg-white/10 text-cream hover:bg-gold hover:text-royal-deep transition disabled:opacity-30"
                title="Nudge Down 0.5mm"
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </div>

          {/* Element Inspector */}
          <div className="rounded-xl border border-white/10 bg-royal-card p-4 shadow-lg space-y-4">
            <h3 className="font-bold text-gold-bright text-sm border-b border-white/10 pb-2">
              Element Inspector
            </h3>

            {activeElement ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cream">
                    {AVAILABLE_FIELDS.find((f) => f.key === activeElement.fieldKey)?.label ||
                      activeElement.fieldKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteElement(activeElement.id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Remove field"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {activeElement.fieldKey === "customText" && (
                  <div>
                    <label className="block text-xs font-semibold text-cream/70 mb-1">
                      Custom Text Value
                    </label>
                    <input
                      type="text"
                      value={activeElement.customText || ""}
                      onChange={(e) =>
                        handleUpdateElement(activeElement.id, { customText: e.target.value })
                      }
                      className="w-full rounded-md border border-white/15 bg-black/40 px-2.5 py-1 text-xs text-cream focus:border-gold focus:outline-hidden"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-cream/70 mb-1">X Pos (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeElement.xMm}
                      onChange={(e) =>
                        handleUpdateElement(activeElement.id, { xMm: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-cream focus:border-gold focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-cream/70 mb-1">Y Pos (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeElement.yMm}
                      onChange={(e) =>
                        handleUpdateElement(activeElement.id, { yMm: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-cream focus:border-gold focus:outline-hidden"
                    />
                  </div>
                </div>

                {activeElement.fieldKey === "barcode" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-cream/70 mb-1">Barcode Width (mm)</label>
                      <input type="number" min="5" step="0.5" value={activeElement.widthMm ?? 24}
                        onChange={(e) => handleUpdateElement(activeElement.id, { widthMm: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-cream focus:border-gold focus:outline-hidden" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cream/70 mb-1">Barcode Height (mm)</label>
                      <input type="number" min="3" step="0.5" value={activeElement.heightMm ?? 10}
                        onChange={(e) => handleUpdateElement(activeElement.id, { heightMm: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-cream focus:border-gold focus:outline-hidden" />
                    </div>
                  </div>
                )}

                {activeElement.fieldKey !== "barcode" && (
                  <div>
                    <label className="block text-xs font-semibold text-cream/70 mb-1">Font Size (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={activeElement.fontSize || 2}
                      onChange={(e) =>
                        handleUpdateElement(activeElement.id, { fontSize: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-cream focus:border-gold focus:outline-hidden"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-cream/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeElement.fontStyle === "bold"}
                      onChange={(e) =>
                        handleUpdateElement(activeElement.id, {
                          fontStyle: e.target.checked ? "bold" : "normal",
                        })
                      }
                      className="rounded border-white/20 bg-black/40 text-gold"
                    />
                    Bold Text
                  </label>

                  <label className="flex items-center gap-2 text-xs text-cream/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeElement.isVisible}
                      onChange={(e) =>
                        handleUpdateElement(activeElement.id, { isVisible: e.target.checked })
                      }
                      className="rounded border-white/20 bg-black/40 text-gold"
                    />
                    Visible
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-xs text-cream/40 italic">Select an element on Column 1 to inspect and align.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
