"use client";

import { useState } from "react";
import { Sliders, Printer, Tag } from "lucide-react";

interface SettingsTabsProps {
  shopProfileView: React.ReactNode;
  printerSettingsView: React.ReactNode;
  labelDesignerView: React.ReactNode;
}

export function SettingsTabs({
  shopProfileView,
  printerSettingsView,
  labelDesignerView,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "printer" | "designer">("profile");

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "profile"
              ? "bg-gold text-royal-deep shadow-md"
              : "bg-white/5 text-cream/80 hover:bg-white/10 hover:text-cream"
          }`}
        >
          <Sliders size={16} /> Rates & Shop Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("printer")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "printer"
              ? "bg-gold text-royal-deep shadow-md"
              : "bg-white/5 text-cream/80 hover:bg-white/10 hover:text-cream"
          }`}
        >
          <Printer size={16} /> TVS LP 46 Dlite Printer Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("designer")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "designer"
              ? "bg-gold text-royal-deep shadow-md"
              : "bg-white/5 text-cream/80 hover:bg-white/10 hover:text-cream"
          }`}
        >
          <Tag size={16} /> Label Template Designer
        </button>
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === "profile" && shopProfileView}
        {activeTab === "printer" && printerSettingsView}
        {activeTab === "designer" && labelDesignerView}
      </div>
    </div>
  );
}
