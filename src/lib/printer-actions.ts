"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { isValidTagBarcode } from "./tag-generator";
import { getSession } from "./session";
import {
  DEFAULT_TEMPLATES,
  generateTsplLabel,
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
            elements: JSON.stringify(tmpl.elements),
            isDefault: tmpl.id === "preset-gold-butterfly-60x25",
          },
        })
      )
    );

    return prisma.labelTemplate.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
  }

  return dbTemplates;
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
  if (!session) return { ok: false, error: "Sign in before printing tags." };
  if (opts.copies !== undefined && (!Number.isInteger(opts.copies) || opts.copies < 1 || opts.copies > 10)) {
    return { ok: false, error: "Print copies must be a whole number from 1 to 10." };
  }
  const username = session?.username || "counter-user";
  const shop = await getShop();
  const settings = await ensurePrinterSettings("default");

  const tagSearch = opts.tagNo?.trim().toUpperCase();
  const ornament = opts.ornamentId
    ? await prisma.ornament.findUnique({ where: { id: opts.ornamentId } })
    : tagSearch
    ? await prisma.ornament.findFirst({ where: { tagNo: tagSearch } })
    : null;

  if (!ornament) {
    return { ok: false, error: "Jewellery item not found for printing" };
  }
  if (!isValidTagBarcode(ornament.tagNo)) {
    return { ok: false, error: `Tag ${ornament.tagNo} is not a valid Code 128 barcode value. Edit the tag number before printing.` };
  }

  // Fetch or resolve template
  const templates = await getLabelTemplates();
  let templateConfig: LabelTemplateConfig;

  const foundTemplate = opts.templateId
    ? templates.find((t) => t.id === opts.templateId)
    : templates.find((t) => t.isDefault) || templates[0];

  if (opts.templateId && !foundTemplate) {
    return { ok: false, error: "Label template not found." };
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

  const printCopies = opts.copies || settings.copies || 1;

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

  let printSuccess = false;
  let errorMsg = "";

  try {
    const response = await fetch(`${settings.agentUrl}/print/tspl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.agentToken}`,
      },
      body: JSON.stringify({
        printerName: settings.printerName,
        tsplData,
        copies: printCopies,
      }),
      cache: "no-store",
    });

    if (response.ok) {
      const resJson = await response.json();
      printSuccess = resJson.ok === true;
    } else {
      const errRes = await response.json().catch(() => ({}));
      errorMsg = errRes.error || `HTTP ${response.status} from Windows Print Agent`;
    }
  } catch (err) {
    errorMsg = `Could not reach Windows Print Agent at ${settings.agentUrl}. Ensure agent is running. (${err instanceof Error ? err.message : String(err)})`;
  }

  // Audit Logging
  await prisma.printLog.create({
    data: {
      shopId: "default",
      ornamentId: ornament.id,
      tagNo: ornament.tagNo,
      printerName: settings.printerName,
      templateId: templateConfig.id,
      printedBy: username,
      status: printSuccess ? "SUCCESS" : "FAILED",
      copies: printCopies,
      errorMessage: errorMsg,
    },
  });

  if (printSuccess) {
    await prisma.ornament.update({
      where: { id: ornament.id },
      data: {
        printCount: { increment: printCopies },
        lastPrintedAt: new Date(),
        printedBy: username,
      },
    });
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${ornament.id}`);

  return {
    ok: printSuccess,
    tsplData,
    error: printSuccess ? undefined : errorMsg,
    tagNo: ornament.tagNo,
  };
}

export async function printTestLabelAction(template: LabelTemplateConfig) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { ok: false, error: "Only administrators can send a test label." };
  }

  if (!template || !Array.isArray(template.elements) || template.widthMm <= 0 || template.heightMm <= 0) {
    return { ok: false, error: "The selected label template is invalid." };
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
  const tsplData = generateTsplLabel(sampleItem, template, {
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    gapMm: template.gapMm,
    density: settings.density,
    speed: settings.speed,
    orientation: settings.orientation,
    offsetXDots: settings.offsetX,
    offsetYDots: settings.offsetY,
    copies: 1,
  });

  let errorMessage = "";
  let printSuccess = false;
  try {
    const response = await fetch(`${settings.agentUrl}/print/tspl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.agentToken}`,
      },
      body: JSON.stringify({ printerName: settings.printerName, tsplData, copies: 1 }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    printSuccess = response.ok && result.ok === true;
    if (!printSuccess) errorMessage = result.error || `HTTP ${response.status} from Windows Print Agent`;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not reach Windows Print Agent.";
  }

  await prisma.printLog.create({
    data: {
      shopId: "default",
      tagNo: sampleItem.tagNo,
      printerName: settings.printerName,
      templateId: template.id,
      printedBy: session.username,
      status: printSuccess ? "SUCCESS" : "FAILED",
      errorMessage,
    },
  });

  return { ok: printSuccess, error: printSuccess ? undefined : errorMessage };
}

export async function bulkPrintTagsAction(opts: {
  ornamentIds: string[];
  templateId?: string;
  copies?: number;
}) {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sign in before printing tags.", total: 0, successCount: 0, failCount: 0, errors: [] as string[] };
  }
  const results = {
    total: opts.ornamentIds?.length || 0,
    successCount: 0,
    failCount: 0,
    errors: [] as string[],
  };

  if (!opts.ornamentIds || opts.ornamentIds.length === 0) {
    return {
      ok: false,
      error: "No items selected for bulk printing",
      ...results,
    };
  }

  for (const id of opts.ornamentIds) {
    const res = await printTagAction({
      ornamentId: id,
      templateId: opts.templateId,
      copies: opts.copies,
    });

    if (res.ok) {
      results.successCount++;
    } else {
      results.failCount++;
      if (res.error) results.errors.push(`${res.tagNo || id}: ${res.error}`);
    }
  }

  revalidatePath("/inventory");
  return {
    ok: results.failCount === 0,
    ...results,
  };
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
