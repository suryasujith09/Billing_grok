import { getLatestRates, getShop } from "@/lib/queries";
import { inr } from "@/lib/money";
import { ClientShell } from "./client-shell";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [shop, rates] = await Promise.all([getShop(), getLatestRates()]);
  const gold22 = rates.find((r) => r.metal === "GOLD" && r.purity === "22K");
  const gold24 = rates.find((r) => r.metal === "GOLD" && r.purity === "24K");
  const gold18 = rates.find((r) => r.metal === "GOLD" && r.purity === "18K");
  const silver = rates.find((r) => r.metal === "SILVER" && (r.purity === "999" || r.purity === "925"));

  const ratesFormatted = [
    { label: "24K", value: gold24 ? inr(Number(gold24.ratePerGram)) : "—" },
    { label: "22K", value: gold22 ? inr(Number(gold22.ratePerGram)) : "—" },
    { label: "18K", value: gold18 ? inr(Number(gold18.ratePerGram)) : "—" },
    { label: "Silver", value: silver ? inr(Number(silver.ratePerGram)) : "—" },
  ];

  return (
    <ClientShell shopName={shop.name} ratesFormatted={ratesFormatted}>
      {children}
    </ClientShell>
  );
}
