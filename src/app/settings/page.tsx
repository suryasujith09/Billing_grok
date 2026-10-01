import { getLatestRates, getShop } from "@/lib/queries";
import { getPrinterSettings, getLabelTemplates, type PrinterSettingsData } from "@/lib/printer-actions";
import { num } from "@/lib/money";
import { RateForm, ShopForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { PrinterSettingsForm } from "@/components/printer-settings-form";
import { LabelDesigner } from "@/components/label-designer";
import { SettingsTabs } from "@/components/settings-tabs";

export default async function SettingsPage() {
  const [shop, rates, printerSettings, templates] = await Promise.all([
    getShop(),
    getLatestRates(),
    getPrinterSettings(),
    getLabelTemplates(),
  ]);

  const rateRows = rates.map((r) => ({
    metal: r.metal,
    purity: r.purity,
    ratePerGram: num(r.ratePerGram),
  }));

  const initialSettings: Omit<PrinterSettingsData, "id" | "shopId"> = {
    printerName: printerSettings.printerName,
    driverMode: printerSettings.driverMode === "WINDOWS_DRIVER" ? "WINDOWS_DRIVER" : "TSPL",
    connectionType: printerSettings.connectionType === "USB" || printerSettings.connectionType === "NETWORK"
      ? printerSettings.connectionType
      : "AGENT",
    density: printerSettings.density,
    speed: printerSettings.speed,
    orientation: printerSettings.orientation,
    offsetX: printerSettings.offsetX,
    offsetY: printerSettings.offsetY,
    copies: printerSettings.copies,
    labelWidthMm: printerSettings.labelWidthMm,
    labelHeightMm: printerSettings.labelHeightMm,
    gapMm: printerSettings.gapMm,
    agentUrl: printerSettings.agentUrl,
    agentToken: printerSettings.agentToken,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings, Printer & Label Designer"
        subtitle="Manage shop profile, daily rates, TVS Electronics LP 46 Dlite thermal printer, and barcode tag templates."
      />

      <SettingsTabs
        shopProfileView={
          <div className="space-y-6 max-w-4xl">
            <Card>
              <h2 className="font-display text-xl font-semibold text-ink border-b border-sand pb-3 mb-4">
                Daily Metal Board Rates (₹/g)
              </h2>
              <RateForm rates={rateRows} />
            </Card>

            <Card>
              <h2 className="font-display text-xl font-semibold text-ink border-b border-sand pb-3 mb-4">
                Jewellery House & Tax Profile
              </h2>
              <ShopForm shop={shop} />
            </Card>
          </div>
        }
        printerSettingsView={<PrinterSettingsForm initialSettings={initialSettings} />}
        labelDesignerView={<LabelDesigner initialTemplates={templates} />}
      />
    </div>
  );
}
