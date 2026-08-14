import { getLatestRates, getShop } from "@/lib/queries";
import { BillingDesk } from "@/components/billing-desk";
import { PageHeader } from "@/components/ui";

export default async function BillingPage() {
  const [shop, rates] = await Promise.all([getShop(), getLatestRates()]);
  const rateRows = rates.map((r) => ({
    metal: r.metal,
    purity: r.purity,
    ratePerGram: Number(r.ratePerGram),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Counter Terminal"
        title="New GST Invoice"
        subtitle="Itemized jewellery bill calculation, stock barcode lookup, old gold trade-in, and GST invoice generation."
      />
      <BillingDesk
        rates={rateRows}
        makingGstMode={shop.makingGstMode as any}
        placeOfSupply={shop.state}
      />
    </div>
  );
}
