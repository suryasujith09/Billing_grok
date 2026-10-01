import { prisma } from "@/lib/db";
import { getLatestRates } from "@/lib/queries";
import { inr } from "@/lib/money";
import { getSession } from "@/lib/session";
import { headers } from "next/headers";
import { ClientShell } from "./client-shell";

export async function AppShell({ children }: { children: React.ReactNode }) {
  // Determine the current pathname without relying on usePathname (server component)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? "";

  // On the login page, skip heavy DB calls — no sidebar or board ticker needed
  if (pathname.startsWith("/login")) {
    return <ClientShell shopName="" ratesFormatted={[]} role="counter" username="">{children}</ClientShell>;
  }

  const [shopRecord, rates, session] = await Promise.all([
    // Safe lookup — don't throw if no shop record yet (first boot)
    prisma.shop.findUnique({ where: { id: "default" } }),
    getLatestRates(),
    getSession(),
  ]);

  const shopName = shopRecord?.name ?? "Surya Gold & Diamonds";

  const gold22 = rates.find((r) => r.metal === "GOLD" && r.purity === "22K");
  const gold24 = rates.find((r) => r.metal === "GOLD" && r.purity === "24K");
  const gold18 = rates.find((r) => r.metal === "GOLD" && r.purity === "18K");
  const silver = rates.find(
    (r) => r.metal === "SILVER" && (r.purity === "999" || r.purity === "925"),
  );

  const ratesFormatted = [
    { label: "24K", value: gold24 ? inr(Number(gold24.ratePerGram)) : "—" },
    { label: "22K", value: gold22 ? inr(Number(gold22.ratePerGram)) : "—" },
    { label: "18K", value: gold18 ? inr(Number(gold18.ratePerGram)) : "—" },
    { label: "Silver", value: silver ? inr(Number(silver.ratePerGram)) : "—" },
  ];

  return (
    <ClientShell
      shopName={shopName}
      ratesFormatted={ratesFormatted}
      role={session?.role ?? "counter"}
      username={session?.username ?? ""}
    >
      {children}
    </ClientShell>
  );
}
