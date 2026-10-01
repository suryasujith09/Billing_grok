export interface TSPLPrintOptions {
  widthMm: number;
  heightMm: number;
  gapMm: number;
  density: number; // 0 to 15
  speed: number; // 2 to 6
  orientation: number; // 0 or 1
  offsetXDots?: number;
  offsetYDots?: number;
  copies?: number;
}

export interface LabelElement {
  id: string;
  fieldKey:
    | "shopName"
    | "tagNo"
    | "barcode"
    | "name"
    | "category"
    | "purity"
    | "grossWeight"
    | "netWeight"
    | "stoneWeight"
    | "diamondCarat"
    | "huid"
    | "mrp"
    | "customText";
  customText?: string;
  xMm: number;
  yMm: number;
  widthMm?: number;
  heightMm?: number;
  fontSize?: number; // 1 to 5 for TSPL standard fonts
  fontStyle?: "normal" | "bold";
  alignment?: "left" | "center" | "right";
  isVisible: boolean;
  rotation?: 0 | 90 | 180 | 270;
}

export interface LabelTemplateConfig {
  id: string;
  name: string;
  category: "GOLD" | "DIAMOND" | "SILVER" | "GENERAL" | "REPAIR";
  widthMm: number; // Tag width (e.g. 50mm or 60mm)
  heightMm: number; // Tag height (e.g. 25mm or 30mm)
  gapMm: number; // Vertical sensor gap (e.g. 3mm)
  columnsAcross?: number; // 1, 2, or 3 tags side-by-side on the paper roll
  rollWidthMm?: number; // Total paper roll width (e.g. 108mm for TVS LP 46 Dlite)
  colGapMm?: number; // Horizontal gap between tags on multi-column roll (e.g. 2mm)
  leftWingWidthMm?: number; // Butterfly tag left wing width (default 28mm)
  rightWingWidthMm?: number; // Butterfly tag right wing width (default 28mm)
  tailWidthMm?: number; // Unprintable adhesive tail loop width (default 4mm)
  elements: LabelElement[];
}

export interface ItemPrintData {
  tagNo: string;
  name: string;
  category: string;
  metal: string;
  purity: string;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  diamondCarat?: number;
  diamondPieces?: number;
  huid?: string;
  mrp?: number | null;
  shopName?: string;
  productCode?: string;
}

export const LEGACY_GOLD_DUAL_TEMPLATE_NAME = "Gold 2-Across Dual Column Roll (108×25 mm Paper Roll)";

/**
 * Converts millimeters to dots at 203 DPI (8 dots per mm).
 */
export function mmToDots(mm: number, dpi: number = 203): number {
  return Math.round((mm * dpi) / 25.4);
}

/**
 * Default preset label templates for 60x25 mm Butterfly / Dumbbell Tags & Standard Rectangular Tags.
 */
export const DEFAULT_TEMPLATES: LabelTemplateConfig[] = [
  {
    id: "preset-gold-butterfly-60x25",
    name: "Gold Jewellery Butterfly Tag (60×25 mm Single)",
    category: "GOLD",
    widthMm: 60,
    heightMm: 25,
    gapMm: 3,
    columnsAcross: 1,
    rollWidthMm: 60,
    colGapMm: 0,
    leftWingWidthMm: 28,
    rightWingWidthMm: 28,
    tailWidthMm: 4,
    elements: [
      { id: "e1", fieldKey: "shopName", customText: "SURYA GOLD", xMm: 2, yMm: 2, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e2", fieldKey: "tagNo", xMm: 2, yMm: 6, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e3", fieldKey: "barcode", xMm: 2, yMm: 10, widthMm: 24, heightMm: 11, isVisible: true, rotation: 0 },
      { id: "e4", fieldKey: "purity", xMm: 34, yMm: 2, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e5", fieldKey: "grossWeight", xMm: 34, yMm: 6, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e6", fieldKey: "netWeight", xMm: 34, yMm: 10, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e7", fieldKey: "stoneWeight", xMm: 34, yMm: 14, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e8", fieldKey: "huid", xMm: 34, yMm: 18, fontSize: 1, fontStyle: "bold", isVisible: true, rotation: 0 },
    ],
  },
  {
    id: "preset-gold-2across-108x25",
    name: "Gold Dual Four-up Sheet (108×53 mm)",
    category: "GOLD",
    widthMm: 52,
    heightMm: 25,
    gapMm: 3,
    columnsAcross: 2,
    rollWidthMm: 108,
    colGapMm: 4,
    leftWingWidthMm: 24,
    rightWingWidthMm: 24,
    tailWidthMm: 4,
    elements: [
      { id: "e1", fieldKey: "shopName", customText: "SURYA GOLD", xMm: 1, yMm: 2, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e2", fieldKey: "tagNo", xMm: 1, yMm: 6, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e3", fieldKey: "barcode", xMm: 1, yMm: 10, widthMm: 22, heightMm: 10, isVisible: true, rotation: 0 },
      { id: "e4", fieldKey: "purity", xMm: 29, yMm: 2, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e5", fieldKey: "grossWeight", xMm: 29, yMm: 6, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e6", fieldKey: "netWeight", xMm: 29, yMm: 10, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e7", fieldKey: "huid", xMm: 29, yMm: 15, fontSize: 1, fontStyle: "bold", isVisible: true, rotation: 0 },
    ],
  },
  {
    id: "preset-diamond-butterfly-60x25",
    name: "Diamond Jewellery Tag (60×25 mm Single)",
    category: "DIAMOND",
    widthMm: 60,
    heightMm: 25,
    gapMm: 3,
    columnsAcross: 1,
    rollWidthMm: 60,
    colGapMm: 0,
    leftWingWidthMm: 28,
    rightWingWidthMm: 28,
    tailWidthMm: 4,
    elements: [
      { id: "e1", fieldKey: "shopName", customText: "SURYA DIAMONDS", xMm: 2, yMm: 2, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e2", fieldKey: "tagNo", xMm: 2, yMm: 6, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e3", fieldKey: "barcode", xMm: 2, yMm: 10, widthMm: 24, heightMm: 11, isVisible: true, rotation: 0 },
      { id: "e4", fieldKey: "purity", xMm: 34, yMm: 2, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e5", fieldKey: "grossWeight", xMm: 34, yMm: 6, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e6", fieldKey: "netWeight", xMm: 34, yMm: 9, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e7", fieldKey: "diamondCarat", xMm: 34, yMm: 12, fontSize: 1, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e8", fieldKey: "mrp", xMm: 34, yMm: 16, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
    ],
  },
  {
    id: "preset-general-50x25",
    name: "General Jewellery Tag (50×25 mm Single)",
    category: "GENERAL",
    widthMm: 50,
    heightMm: 25,
    gapMm: 3,
    columnsAcross: 1,
    rollWidthMm: 50,
    colGapMm: 0,
    leftWingWidthMm: 23,
    rightWingWidthMm: 23,
    tailWidthMm: 4,
    elements: [
      { id: "e1", fieldKey: "shopName", customText: "SURYA GOLD", xMm: 2, yMm: 2, fontSize: 2, fontStyle: "bold", isVisible: true, rotation: 0 },
      { id: "e2", fieldKey: "tagNo", xMm: 2, yMm: 6, fontSize: 2, isVisible: true, rotation: 0 },
      { id: "e3", fieldKey: "barcode", xMm: 2, yMm: 10, widthMm: 20, heightMm: 11, isVisible: true, rotation: 0 },
      { id: "e4", fieldKey: "purity", xMm: 27, yMm: 2, fontSize: 2, isVisible: true, rotation: 0 },
      { id: "e5", fieldKey: "grossWeight", xMm: 27, yMm: 6, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e6", fieldKey: "netWeight", xMm: 27, yMm: 10, fontSize: 1, isVisible: true, rotation: 0 },
      { id: "e7", fieldKey: "huid", xMm: 27, yMm: 15, fontSize: 1, isVisible: true, rotation: 0 },
    ],
  },
];

/**
 * Formats data values into printable string representations.
 */
export function formatFieldValue(
  fieldKey: LabelElement["fieldKey"],
  item: ItemPrintData,
  customText?: string
): string {
  switch (fieldKey) {
    case "shopName":
      return customText || item.shopName || "SURYA GOLD";
    case "tagNo":
      return item.tagNo;
    case "name":
      return item.name;
    case "category":
      return item.category;
    case "purity":
      return `${item.metal} ${item.purity}`;
    case "grossWeight":
      return `GW: ${item.grossWeight.toFixed(3)}g`;
    case "netWeight":
      return `NW: ${item.netWeight.toFixed(3)}g`;
    case "stoneWeight":
      return item.stoneWeight > 0 ? `SW: ${item.stoneWeight.toFixed(3)}g` : "";
    case "diamondCarat":
      return item.diamondCarat && item.diamondCarat > 0
        ? `Dia: ${item.diamondCarat.toFixed(2)} ct${item.diamondPieces ? ` (${item.diamondPieces}p)` : ""}`
        : "";
    case "huid":
      return item.huid ? `HUID: ${item.huid}` : "";
    case "mrp":
      return item.mrp ? `MRP: ₹${item.mrp.toLocaleString("en-IN")}` : "";
    case "customText":
      return customText || "";
    default:
      return "";
  }
}

/** The dual-column sheet holds two label rows with the configured row gap between them. */
export function getPrintPageHeightMm(template: LabelTemplateConfig): number {
  const rowsDown = template.columnsAcross === 2 ? 2 : 1;
  return rowsDown * template.heightMm + (rowsDown - 1) * template.gapMm;
}

/**
 * Builds raw TSPL-EZ command payload for TVS Electronics LP 46 Dlite.
 * Supports single and multi-column paper rolls (1, 2, or 3 tags across the paper roll width).
 */
export function generateTsplLabel(
  item: ItemPrintData,
  template: LabelTemplateConfig,
  options: TSPLPrintOptions
): string {
  const {
    widthMm,
    heightMm,
    gapMm,
    density = 10,
    speed = 4,
    orientation = 0,
    offsetXDots = 0,
    offsetYDots = 0,
    copies = 1,
  } = options;

  const columnsAcross = Math.max(1, template.columnsAcross || 1);
  const rowsDown = columnsAcross === 2 ? 2 : 1;
  const rollWidthMm = template.rollWidthMm ?? (columnsAcross > 1 ? 108 : widthMm);
  const colGapMm = template.colGapMm ?? 2;
  const pageHeightMm = rowsDown * heightMm + (rowsDown - 1) * gapMm;

  const lines: string[] = [];

  // Setup printer paper roll size
  lines.push(`SIZE ${rollWidthMm} mm, ${pageHeightMm} mm`);
  lines.push(`GAP ${gapMm} mm, 0`);
  lines.push(`SPEED ${speed}`);
  lines.push(`DENSITY ${density}`);
  lines.push(`DIRECTION ${orientation}`);
  lines.push(`REFERENCE ${offsetXDots},${offsetYDots}`);
  lines.push(`CLS`); // Clear buffer before drawing

  // Place the designed label columns on each row of the physical sheet.
  for (let row = 0; row < rowsDown; row++) {
    for (let c = 0; c < columnsAcross; c++) {
      const colOffsetX = c * (widthMm + colGapMm);
      const rowOffsetY = row * (heightMm + gapMm);

      for (const elem of template.elements) {
        if (!elem.isVisible) continue;

        const totalXMm = colOffsetX + elem.xMm;
        const xDots = mmToDots(totalXMm);
        const yDots = mmToDots(rowOffsetY + elem.yMm);
        const rotation = elem.rotation ?? 0;

        if (elem.fieldKey === "barcode") {
          const heightDots = mmToDots(elem.heightMm || 10);
        // Approximate Code 128 width at 11 modules per encoded character plus guards.
        // Choose the narrow module from the requested width so the physical print tracks
        // the designer's barcode width instead of always using the same fixed 2/4 dots.
          const requestedWidthDots = mmToDots(elem.widthMm ?? 24);
          const moduleCount = Math.max(1, item.tagNo.length * 11 + 35);
          const narrow = Math.max(1, Math.min(4, Math.floor(requestedWidthDots / moduleCount)));
          const wide = Math.min(8, narrow * 2);
        // BARCODE x,y,"128",height,human_readable,rotation,narrow,wide,"content"
          lines.push(
            `BARCODE ${xDots},${yDots},"128",${heightDots},0,${rotation},${narrow},${wide},"${item.tagNo}"`
          );
        } else {
          const value = formatFieldValue(elem.fieldKey, item, elem.customText);
          if (!value) continue;

          const font = elem.fontSize ? String(Math.min(Math.max(elem.fontSize, 1), 5)) : "1";
          const cleanValue = value.replace(/"/g, '\\"');
          lines.push(`TEXT ${xDots},${yDots},"${font}",${rotation},1,1,"${cleanValue}"`);
        }
      }
    }
  }

  // Final print command
  lines.push(`PRINT ${copies},1`);
  lines.push("");

  return lines.join("\n");
}
