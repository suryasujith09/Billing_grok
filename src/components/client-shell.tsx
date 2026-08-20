"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Receipt } from "lucide-react";
import { Sidebar } from "./sidebar";
import type { Role } from "@/lib/session";

export function ClientShell({
  shopName,
  ratesFormatted,
  role,
  username,
  children,
}: {
  shopName: string;
  ratesFormatted: { label: string; value: string }[];
  role: Role;
  username: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <div className="flex min-h-screen">
        <Sidebar
          shopName={shopName}
          role={role}
          username={username}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Navigation Header */}
          <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-wine-deep px-4 py-3 text-cream md:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md p-2 text-cream/90 hover:bg-white/10 hover:text-cream"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
              <div>
                <p className="text-[9px] tracking-[0.2em] text-gold-soft uppercase">Jewellery house</p>
                <p className="font-display max-w-[170px] truncate text-base font-semibold text-gold-bright sm:max-w-xs">
                  {shopName}
                </p>
              </div>
            </div>
            <Link
              href="/billing"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-gold/20 px-3 py-1.5 text-xs font-semibold text-gold-bright hover:bg-gold/30"
            >
              <Receipt size={15} />
              <span>Bill</span>
            </Link>
          </header>

          {/* Today's Board Ticker (Scrollable on Mobile) */}
          <div className="no-print flex items-center justify-between gap-3 border-b border-sand bg-ink px-4 py-2 text-cream md:px-6">
            <p className="font-display shrink-0 text-xs tracking-wide text-gold-bright md:text-sm">
              Today&apos;s board
            </p>
            <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-x-4 gap-y-1 overflow-x-auto text-xs tabular md:gap-x-5 md:justify-end">
              {ratesFormatted.map((rate) => (
                <span key={rate.label} className="inline-flex shrink-0 items-baseline gap-1">
                  <span className="text-[10px] tracking-[0.12em] text-gold-soft uppercase md:text-xs">
                    {rate.label}
                  </span>
                  <span className="font-medium text-cream">{rate.value}/g</span>
                </span>
              ))}
              {role === "admin" && (
                <Link
                  href="/settings#rates"
                  className="shrink-0 text-[11px] text-gold-soft underline underline-offset-2 hover:text-gold-bright md:text-xs"
                >
                  Update
                </Link>
              )}
            </div>
          </div>

          <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 pb-safe">{children}</main>
        </div>
      </div>
    </div>
  );
}
