"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { isValidTagBarcode } from "./tag-generator";
import { getSession } from "./session";
import {
  DEFAULT_TEMPLATES,
  generateTsplLabel,
  LEGACY_GOLD_DUAL_TEMPLATE_NAME,
  type ItemPrintData,
  type LabelElement,
  type LabelTemplateConfig,
  type TSPLPrintOptions,
} from "./tspl-engine";
import { getShop } from "./queries";
import { num } from "./money";

export interface PrinterSettingsData {
  id?: string;
  shopId: string;
  printerName: string;
  driverMode: "TSPL" | "WINDOWS_DRIVER";
  connectionType: "AGENT" | "USB" | "NETWORK";
  density: number;
  speed: number;
  orientation: number;
  offsetX: number;
  offsetY: number;
  copies: number;
  labelWidthMm: number;
  labelHeightMm: number;
  gapMm: number;
  agentUrl: string;
  agentToken: string;
}

async function ensurePrinterSettings(shopId: string) {
  let settings = await prisma.printerSettings.findFirst({
    where: { shopId },
  });

  if (!settings) {
    settings = await prisma.printerSettings.create({
      data: {
        shopId,
        printerName: "SNBC TVSE LP46 Dlite BPLE",
        driverMode: "TSPL",
        connectionType: "AGENT",
        density: 10,
        speed: 4,
        orientation: 0,
        offsetX: 0,
        offsetY: 0,
        copies: 1,
        labelWidthMm: 60,
        labelHeightMm: 25,
        gapMm: 3,
        agentUrl: "http://127.0.0.1:9191",
        agentToken: "surya-print-secret-token",
        isDefault: true,
      },
    });
  }

  return settings;
}

export async function getPrinterSettings(shopId = "default") {
  const session = await getSession();
  if (session?.role !== "admin") {
    throw new Error("Only administrators can view printer settings.");
  }
  return ensurePrinterSettings(shopId);
}

export async function savePrinterSettingsAction(
  data: Partial<PrinterSettingsData>
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can modify printer settings." };
  }

  const shopId = data.shopId || "default";
  const numeric = {
    density: Number(data.density ?? 10),
    speed: Number(data.speed ?? 4),
    orientation: Number(data.orientation ?? 0),
    offsetX: Number(data.offsetX ?? 0),
    offsetY: Number(data.offsetY ?? 0),
    copies: Number(data.copies ?? 1),
    labelWidthMm: Number(data.labelWidthMm ?? 60),
    labelHeightMm: Number(data.labelHeightMm ?? 25),
    gapMm: Number(data.gapMm ?? 3),
  };
  if (!Object.values(numeric).every(Number.isFinite) ||
      numeric.density < 0 || numeric.density > 15 || !Number.isInteger(numeric.density) ||
      numeric.speed < 2 || numeric.speed > 6 ||
      ![0, 1].includes(numeric.orientation) ||
      numeric.copies < 1 || numeric.copies > 10 || !Number.isInteger(numeric.copies) ||
      numeric.labelWidthMm <= 0 || numeric.labelWidthMm > 200 ||
      numeric.labelHeightMm <= 0 || numeric.labelHeightMm > 200 ||
      numeric.gapMm < 0 || numeric.gapMm > 50) {
    return { ok: false, error: "Check the printer density, speed, copies, orientation, and label dimensions." };
  }
  const agentUrl = data.agentUrl ?? "http://127.0.0.1:9191";
  try {
    const parsedAgentUrl = new URL(agentUrl);
    if (!["http:", "https:"].includes(parsedAgentUrl.protocol)) throw new Error("Invalid protocol");
  } catch {
    return { ok: false, error: "Enter a valid HTTP or HTTPS Print Agent URL." };
  }

  try {
    const existing = await prisma.printerSettings.findFirst({ where: { shopId } });
    if (existing) {
      await prisma.printerSettings.update({
        where: { id: existing.id },
        data: {
          printerName: data.printerName ?? "TVS LP 46 Dlite",
          driverMode: data.driverMode ?? "TSPL",
          connectionType: data.connectionType ?? "AGENT",
          ...numeric,
          agentUrl,
          agentToken: data.agentToken ?? "surya-print-secret-token",
        },
      });
    } else {
      await prisma.printerSettings.create({
        data: {
          shopId,
          printerName: data.printerName ?? "TVS LP 46 Dlite",
          driverMode: data.driverMode ?? "TSPL",
          connectionType: data.connectionType ?? "AGENT",
          ...numeric,
          agentUrl,
          agentToken: data.agentToken ?? "surya-print-secret-token",
        },
      });
    }

    revalidatePath("/settings");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save printer settings",
    };
  }
}

function repairLegacyPresetLayout<T extends {
  name: string; widthMm: number; heightMm: number; columnsAcross: number;
  rollWidthMm: number; colGapMm: number; leftWingWidthMm: number;
  rightWingWidthMm: number; tailWidthMm: number; elements: string;
}>(template: T): T {
  let elements: LabelElement[];
  try { elements = JSON.parse(template.elements) as LabelElement[]; } catch { return template; }
  const preset = DEFAULT_TEMPLATES.find((candidate) =>
    (candidate.name === template.name || template.name === LEGACY_GOLD_DUAL_TEMPLATE_NAME) && candidate.widthMm === template.widthMm &&
    candidate.heightMm === template.heightMm && JSON.stringify(candidate.elements) === JSON.stringify(elements)
  );
  const hasOldPrismaDefaults = template.columnsAcross === 1 && template.rollWidthMm === 60 &&
    template.colGapMm === 2 && template.leftWingWidthMm === 28 &&
    template.rightWingWidthMm === 28 && template.tailWidthMm === 4;
  if (!preset) return template;
  if (!hasOldPrismaDefaults && template.name === preset.name) return template;
  return {
    ...template,
    name: preset.name,
    ...(hasOldPrismaDefaults ? {
      columnsAcross: preset.columnsAcross ?? 1,
      rollWidthMm: preset.rollWidthMm ?? preset.widthMm,
      colGapMm: preset.colGapMm ?? 2,
      leftWingWidthMm: preset.leftWingWidthMm ?? 28,
      rightWingWidthMm: preset.rightWingWidthMm ?? 28,
      tailWidthMm: preset.tailWidthMm ?? 4,
    } : {}),
  };
}

export async function getLabelTemplates(shopId = "default") {
  const session = await getSession();
  if (!session) throw new Error("Sign in to view label templates.");

  const dbTemplates = await prisma.labelTemplate.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
  });

  if (dbTemplates.length === 0) {
    // Seed preset default templates
    await prisma.$transaction(
      DEFAULT_TEMPLATES.map((tmpl) =>
        prisma.labelTemplate.create({
          data: {
            shopId,
            name: tmpl.name,
            category: tmpl.category,
            widthMm: tmpl.widthMm,
            heightMm: tmpl.heightMm,
            gapMm: tmpl.gapMm,
            columnsAcross: tmpl.columnsAcross ?? 1,
            rollWidthMm: tmpl.rollWidthMm ?? tmpl.widthMm,
            colGapMm: tmpl.colGapMm ?? 2,
            leftWingWidthMm: tmpl.leftWingWidthMm ?? 28,
            rightWingWidthMm: tmpl.rightWingWidthMm ?? 28,
            tailWidthMm: tmpl.tailWidthMm ?? 4,
            elements: JSON.stringify(tmpl.elements),
            isDefault: tmpl.id === "preset-gold-butterfly-60x25",
          },
        })
      )
    );

    const seeded = await prisma.labelTemplate.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
    return seeded.map(repairLegacyPresetLayout);
  }

  return dbTemplates.map(repairLegacyPresetLayout);
}

export async function saveLabelTemplateAction(data: {
  id?: string;
  name: string;
  category: "GOLD" | "DIAMOND" | "SILVER" | "GENERAL" | "REPAIR";
  widthMm: number;
  heightMm: number;
  gapMm: number;
  columnsAcross?: number;
  rollWidthMm?: number;
  colGapMm?: number;
  leftWingWidthMm?: number;
  rightWingWidthMm?: number;
  tailWidthMm?: number;
  elements: LabelElement[];
  isDefault?: boolean;
}) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can save label templates." };
  }

  if (!data.name.trim() || !Array.isArray(data.elements)) {
    return { ok: false, error: "Template name and label elements are required." };
  }
  if (![data.widthMm, data.heightMm, data.gapMm].every(Number.isFinite) ||
      data.widthMm <= 0 || data.heightMm <= 0 || data.gapMm < 0) {
    return { ok: false, error: "Label dimensions must be positive and the media gap cannot be negative." };
  }

  const shopId = "default";
  const elementsJson = JSON.stringify(data.elements);

  const layoutFields = {
    columnsAcross: data.columnsAcross ?? 1,
    rollWidthMm: data.rollWidthMm ?? data.widthMm,
    colGapMm: data.colGapMm ?? 2,
    leftWingWidthMm: data.leftWingWidthMm ?? 28,
    rightWingWidthMm: data.rightWingWidthMm ?? 28,
    tailWidthMm: data.tailWidthMm ?? 4,
  };

  try {
    if (data.isDefault) {
      // Clear other default flags
      await prisma.labelTemplate.updateMany({
        where: { shopId },
        data: { isDefault: false },
      });
    }

    let saved;
    if (data.id && !data.id.startsWith("preset-")) {
      saved = await prisma.labelTemplate.update({
        where: { id: data.id },
        data: {
          name: data.name,
          category: data.category,
          widthMm: data.widthMm,
          heightMm: data.heightMm,
          gapMm: data.gapMm,
          ...layoutFields,
          elements: elementsJson,
          isDefault: Boolean(data.isDefault),
        },
      });
    } else {
      saved = await prisma.labelTemplate.create({
        data: {
          shopId,
          name: data.name,
          category: data.category,
          widthMm: data.widthMm,
          heightMm: data.heightMm,
          gapMm: data.gapMm,
          ...layoutFields,
          elements: elementsJson,
          isDefault: Boolean(data.isDefault),
        },
      });
    }

    revalidatePath("/settings");
    revalidatePath("/inventory");
    return { ok: true, id: saved.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save label template",
    };
  }
}


export async function deleteLabelTemplateAction(id: string) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can delete templates." };
  }

  try {
    await prisma.labelTemplate.delete({ where: { id } });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not delete template",
    };
  }
}

export async function printTagAction(opts: {
  ornamentId?: string;
  tagNo?: string;
  templateId?: string;
  copies?: number;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sign in before printing tags." };
  if (opts.copies !== undefined && (!Number.isInteger(opts.copies) || opts.copies < 1 || opts.copies > 10)) {
    return { ok: false as const, error: "Print copies must be a whole number from 1 to 10." };
  }
  const shop = await getShop();
  const settings = await ensurePrinterSettings("default");

  const tagSearch = opts.tagNo?.trim().toUpperCase();
  const ornament = opts.ornamentId
    ? await prisma.ornament.findUnique({ where: { id: opts.ornamentId } })
    : tagSearch
    ? await prisma.ornament.findFirst({ where: { tagNo: tagSearch } })
    : null;

  if (!ornament) {
    return { ok: false as const, error: "Jewellery item not found for printing" };
  }
  if (!isValidTagBarcode(ornament.tagNo)) {
    return { ok: false as const, error: `Tag ${ornament.tagNo} is not a valid Code 128 barcode value. Edit the tag number before printing.` };
  }

  // Fetch or resolve template
  const templates = await getLabelTemplates();
  let templateConfig: LabelTemplateConfig;

  const foundTemplate = opts.templateId
    ? templates.find((t) => t.id === opts.templateId)
    : templates.find((t) => t.isDefault) || templates[0];

  if (opts.templateId && !foundTemplate) {
    return { ok: false as const, error: "Label template not found." };
  }

  if (foundTemplate) {
    try {
      templateConfig = {
        id: foundTemplate.id,
        name: foundTemplate.name,
        category: foundTemplate.category as LabelTemplateConfig["category"],
        widthMm: foundTemplate.widthMm,
        heightMm: foundTemplate.heightMm,
        gapMm: foundTemplate.gapMm,
        columnsAcross: foundTemplate.columnsAcross,
        rollWidthMm: foundTemplate.rollWidthMm,
        colGapMm: foundTemplate.colGapMm,
        leftWingWidthMm: foundTemplate.leftWingWidthMm,
        rightWingWidthMm: foundTemplate.rightWingWidthMm,
        tailWidthMm: foundTemplate.tailWidthMm,
        elements: JSON.parse(foundTemplate.elements),
      };
    } catch {
      templateConfig = DEFAULT_TEMPLATES[0];
    }
  } else {
    templateConfig = DEFAULT_TEMPLATES[0];
  }

  const printItem: ItemPrintData = {
    tagNo: ornament.tagNo,
    name: ornament.name,
    category: ornament.category,
    metal: ornament.metal,
    purity: ornament.purity,
    grossWeight: num(ornament.grossWeight),
    netWeight: num(ornament.netWeight),
    stoneWeight: num(ornament.stoneWeight),
    diamondCarat: num(ornament.diamondCarat),
    diamondPieces: ornament.diamondPieces,
    huid: ornament.huid,
    mrp: ornament.mrp ? num(ornament.mrp) : null,
    shopName: shop.name,
    productCode: ornament.productCode,
  };

  const printCopies = opts.copies ?? settings.copies ?? 1;

  const tsplOptions: TSPLPrintOptions = {
    widthMm: templateConfig.widthMm || settings.labelWidthMm,
    heightMm: templateConfig.heightMm || settings.labelHeightMm,
    gapMm: templateConfig.gapMm || settings.gapMm,
    density: settings.density,
    speed: settings.speed,
    orientation: settings.orientation,
    offsetXDots: settings.offsetX,
    offsetYDots: settings.offsetY,
    copies: printCopies,
  };

  const tsplData = generateTsplLabel(printItem, templateConfig, tsplOptions);

  return {
    ok: true as const,
    tagNo: ornament.tagNo,
    job: {
      ornamentId: ornament.id,
      tagNo: ornament.tagNo,
      printerName: settings.printerName,
      templateId: templateConfig.id,
      copies: printCopies,
      agentUrl: settings.agentUrl,
      agentToken: settings.agentToken,
      tsplData,
    },
  };
}

export async function printTestLabelAction(template: LabelTemplateConfig) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false as const, error: "Only administrators can send a test label." };
  }

  const columns = template?.columnsAcross ?? 1;
  const rollWidth = template?.rollWidthMm ?? template?.widthMm;
  const columnGap = template?.colGapMm ?? 2;
  if (!template || !Array.isArray(template.elements) || template.widthMm <= 0 || template.heightMm <= 0 ||
    template.widthMm > 108 || template.heightMm > 300 || template.gapMm < 0 || template.gapMm > 20 ||
    !Number.isInteger(columns) || columns < 1 || columns > 3 || !Number.isFinite(rollWidth) ||
    rollWidth <= 0 || rollWidth > 108 || columns * template.widthMm + (columns - 1) * columnGap > rollWidth ||
    template.elements.some((element) => !Number.isFinite(element.xMm) || !Number.isFinite(element.yMm) ||
      element.xMm < 0 || element.yMm < 0 || element.xMm >= template.widthMm || element.yMm >= template.heightMm ||
      element.fieldKey === "barcode" && ((element.widthMm ?? 24) <= 0 || (element.heightMm ?? 10) <= 0 ||
        element.xMm + (element.widthMm ?? 24) > template.widthMm || element.yMm + (element.heightMm ?? 10) > template.heightMm))) {
    return { ok: false as const, error: "The selected label template is invalid." };
  }

  const settings = await ensurePrinterSettings("default");
  const shop = await getShop();
  const sampleItem: ItemPrintData = {
    tagNo: "SGD26RG00001",
    name: "22K Gold Ring",
    category: "RING",
    metal: "GOLD",
    purity: "22K916",
    grossWeight: 4.52,
    netWeight: 4.2,
    stoneWeight: 0.32,
    huid: "H12345",
    shopName: shop.name,
    productCode: "RG-001",
  };
  const copies = 1;
  const tsplData = generateTsplLabel(sampleItem, template, {
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    gapMm: template.gapMm,
    density: settings.density,
    speed: settings.speed,
    orientation: settings.orientation,
    offsetXDots: settings.offsetX,
    offsetYDots: settings.offsetY,
    copies,
  });

  return {
    ok: true as const,
    job: {
      tagNo: sampleItem.tagNo,
      printerName: settings.printerName,
      templateId: template.id,
      copies,
      agentUrl: settings.agentUrl,
      agentToken: settings.agentToken,
      tsplData,
    },
  };
}

export async function recordTagPrintResultAction(opts: {
  ornamentId: string;
  templateId: string;
  copies: number;
  error?: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in before recording a print job." };
  if (!Number.isInteger(opts.copies) || opts.copies < 1 || opts.copies > 10) {
    return { ok: false, error: "Print copies must be a whole number from 1 to 10." };
  }
  const ornament = await prisma.ornament.findUnique({ where: { id: opts.ornamentId } });
  if (!ornament) return { ok: false, error: "Jewellery item not found after printing." };
  const settings = await ensurePrinterSettings("default");
  const success = !opts.error;

  await prisma.printLog.create({
    data: {
      shopId: "default",
      ornamentId: ornament.id,
      tagNo: ornament.tagNo,
      printerName: settings.printerName,
      templateId: opts.templateId,
      printedBy: session.username,
      status: success ? "SUCCESS" : "FAILED",
      copies: opts.copies,
      errorMessage: opts.error?.slice(0, 1000) ?? "",
    },
  });
  if (success) {
    await prisma.ornament.update({
      where: { id: ornament.id },
      data: {
        printCount: { increment: opts.copies },
        lastPrintedAt: new Date(),
        printedBy: session.username,
      },
    });
  }
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${ornament.id}`);
  return {
    ok: success,
    error: opts.error,
  };
}

export async function recordTestPrintResultAction(opts: {
  templateId: string;
  error?: string;
}) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can record a test label." };
  }
  const settings = await ensurePrinterSettings("default");
  await prisma.printLog.create({
    data: {
      shopId: "default",
      tagNo: "SGD26RG00001",
      printerName: settings.printerName,
      templateId: opts.templateId,
      printedBy: session.username,
      status: opts.error ? "FAILED" : "SUCCESS",
      errorMessage: opts.error?.slice(0, 1000) ?? "",
    },
  });
  return { ok: !opts.error, error: opts.error };
}

export async function getPrintHistory(tagNo?: string) {
  const session = await getSession();
  if (!session) throw new Error("Sign in to view print history.");

  return prisma.printLog.findMany({
    where: tagNo ? { tagNo } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
