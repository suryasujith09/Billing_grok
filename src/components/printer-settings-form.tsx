"use client";

import { useState, useEffect, useCallback } from "react";
import { savePrinterSettingsAction, type PrinterSettingsData } from "@/lib/printer-actions";
import { Printer, RefreshCw, CheckCircle2, AlertTriangle, Play, ShieldAlert } from "lucide-react";

interface PrinterSettingsProps {
  initialSettings: Omit<PrinterSettingsData, "shopId" | "id">;
}

export function PrinterSettingsForm({ initialSettings }: PrinterSettingsProps) {
  const [settings, setSettings] = useState<PrinterSettingsData>({ ...initialSettings, shopId: "default" });
  const [agentStatus, setAgentStatus] = useState<"checking" | "online" | "offline">("checking");
  const [printers, setPrinters] = useState<{ name: string; status: string; isDefault: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const checkAgentHealth = useCallback(async () => {
    setAgentStatus("checking");
    try {
      const res = await fetch(`${settings.agentUrl}/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setAgentStatus("online");
        if (data.printers && Array.isArray(data.printers)) {
          setPrinters(data.printers);
        }
      } else {
        setAgentStatus("offline");
      }
    } catch {
      setAgentStatus("offline");
    }
  }, [settings.agentUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => void checkAgentHealth(), 0);
    return () => window.clearTimeout(timer);
  }, [checkAgentHealth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await savePrinterSettingsAction(settings);
    setLoading(false);

    if (res.ok) {
      setMessage({ type: "success", text: "Printer settings saved successfully." });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to save settings." });
    }
  };

  const handleTestPrint = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const sampleTspl = `
SIZE ${settings.labelWidthMm} mm, ${settings.labelHeightMm} mm
GAP ${settings.gapMm} mm, 0
SPEED ${settings.speed}
DENSITY ${settings.density}
DIRECTION ${settings.orientation}
REFERENCE ${settings.offsetX},${settings.offsetY}
CLS
TEXT 16,16,"2",0,1,1,"SURYA GOLD & DIAMONDS"
TEXT 16,48,"2",0,1,1,"TEST TAG: SGD26RG00001"
BARCODE 16,80,"128",80,0,0,2,4,"SGD26RG00001"
TEXT 250,16,"2",0,1,1,"22K916"
TEXT 250,48,"1",0,1,1,"GW: 4.520g"
TEXT 250,72,"1",0,1,1,"NW: 4.200g"
PRINT 1,1
`.trim();

      const response = await fetch(`${settings.agentUrl}/print/tspl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.agentToken}`,
        },
        body: JSON.stringify({
          printerName: settings.printerName,
          tsplData: sampleTspl,
          copies: 1,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok === true) {
        setMessage({ type: "success", text: `Test label sent to ${settings.printerName} successfully!` });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send test label to printer." });
      }
    } catch {
      setMessage({
        type: "error",
        text: `Error connecting to Print Agent at ${settings.agentUrl}. Make sure 'npm run print-agent' is running on the local PC.`,
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Agent Connectivity Status Card */}
      <div className="rounded-xl border border-white/10 bg-royal-card p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                agentStatus === "online"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : agentStatus === "offline"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              <Printer size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-cream">TVS LP 46 Dlite Thermal Print Agent</h3>
              <p className="text-xs text-cream/60">
                Local Windows spooler bridge on {settings.agentUrl}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                agentStatus === "online"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : agentStatus === "offline"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {agentStatus === "online" ? (
                <>
                  <CheckCircle2 size={14} /> Agent Connected
                </>
              ) : agentStatus === "offline" ? (
                <>
                  <AlertTriangle size={14} /> Agent Offline
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Checking...
                </>
              )}
            </span>
            <button
              type="button"
              onClick={checkAgentHealth}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-cream/80 hover:bg-white/5 hover:text-cream transition"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {agentStatus === "offline" && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Local Print Agent Not Detected</p>
              <p className="mt-0.5 text-amber-200/80">
                To print directly to USB connected TVS LP 46 Dlite printer on Windows 11, run:
                <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 font-mono text-amber-100">npm run print-agent</code>
                or start <code className="font-mono">node src/print-agent/index.mjs</code>.
              </p>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 text-sm font-medium border ${
            message.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-royal-card p-6 shadow-lg space-y-6">
          <h2 className="text-lg font-bold text-gold-bright border-b border-white/10 pb-3">
            Hardware & Spooler Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Target Windows Printer
              </label>
              {printers.length > 0 ? (
                <select
                  value={settings.printerName}
                  onChange={(e) => setSettings({ ...settings, printerName: e.target.value })}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
                >
                  {printers.map((p) => (
                    <option key={p.name} value={p.name} className="bg-royal-deep text-cream">
                      {p.name} ({p.status}) {p.isDefault ? "[Default]" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={settings.printerName}
                  onChange={(e) => setSettings({ ...settings, printerName: e.target.value })}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
                  placeholder="e.g. TVS LP 46 Dlite"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Printer Language / Driver Mode
              </label>
              <select
                value={settings.driverMode}
                onChange={(e) => setSettings({ ...settings, driverMode: e.target.value as PrinterSettingsData["driverMode"] })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              >
                <option value="TSPL" className="bg-royal-deep text-cream">
                  TSPL-EZ Raw Command Mode (Recommended for TVS LP 46 Dlite)
                </option>
                <option value="WINDOWS_DRIVER" className="bg-royal-deep text-cream">
                  Windows Graphics Driver Mode
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Print Density (0 - 15)
              </label>
              <input
                type="number"
                min={0}
                max={15}
                value={settings.density}
                onChange={(e) => setSettings({ ...settings, density: Number(e.target.value) })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
              <span className="text-[10px] text-cream/40">Higher values produce darker thermal text. Default: 10</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Print Speed (2 - 6 ips)
              </label>
              <input
                type="number"
                min={2}
                max={6}
                value={settings.speed}
                onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
              <span className="text-[10px] text-cream/40">Speed in inches per second. Recommended: 4 ips</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Label Width (mm)
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.labelWidthMm}
                onChange={(e) => setSettings({ ...settings, labelWidthMm: Number(e.target.value) })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Label Height (mm)
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.labelHeightMm}
                onChange={(e) => setSettings({ ...settings, labelHeightMm: Number(e.target.value) })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Media Gap (mm)
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.gapMm}
                onChange={(e) => setSettings({ ...settings, gapMm: Number(e.target.value) })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Default Print Copies
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.copies}
                onChange={(e) => setSettings({ ...settings, copies: Number(e.target.value) })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Local Print Agent URL
              </label>
              <input
                type="text"
                value={settings.agentUrl}
                onChange={(e) => setSettings({ ...settings, agentUrl: e.target.value })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1">
                Agent Security Auth Token
              </label>
              <input
                type="password"
                value={settings.agentToken}
                onChange={(e) => setSettings({ ...settings, agentToken: e.target.value })}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold-bright hover:bg-gold/20 transition disabled:opacity-50"
          >
            <Play size={16} /> Print Test Label (TVS LP 46 Dlite)
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-bold text-royal-deep hover:bg-gold-bright transition shadow-md disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Printer Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
