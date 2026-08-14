import { getLatestRates, getShop } from "@/lib/queries";
import { num } from "@/lib/money";
import { RateForm, ShopForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";

export default async function SettingsPage() {
  const [shop, rates] = await Promise.all([getShop(), getLatestRates()]);

  const rateRows = rates.map((r) => ({
    metal: r.metal,
    purity: r.purity,
    ratePerGram: num(r.ratePerGram),
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Configuration"
        title="Settings & Metal Board Rates"
        subtitle="Manage shop profile, legal tax details, GST calculation strategy, and daily gold/silver rates."
      />

      {/* Metal Board Rates Form */}
      <Card>
        <h2 className="font-display text-xl font-semibold text-ink border-b border-sand pb-3 mb-4">
          Daily Metal Board Rates (₹/g)
        </h2>
        <RateForm rates={rateRows} />
      </Card>

      {/* Shop Profile Form */}
      <Card>
        <h2 className="font-display text-xl font-semibold text-ink border-b border-sand pb-3 mb-4">
          Jewellery House & Tax Profile
        </h2>
        <ShopForm shop={shop} />
      </Card>
    </div>
  );
}
