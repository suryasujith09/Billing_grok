"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Gem,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { cn } from "./ui";

export const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/billing", label: "New bill", icon: Receipt },
  { href: "/invoices", label: "Invoices", icon: BookOpen },
  { href: "/inventory", label: "Stock", icon: Gem },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: ShoppingBag },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  shopName,
  mobileOpen,
  onCloseMobile,
}: {
  shopName: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-wine-deep text-cream md:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-[10px] tracking-[0.28em] text-gold-soft uppercase">Jewellery house</p>
          <p className="font-display mt-2 text-[22px] leading-tight text-gold-bright">{shopName}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-gold/20 font-medium text-gold-bright"
                    : "text-cream/80 hover:bg-white/5 hover:text-cream",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-cream/50">
          Counter billing · GST · HUID
        </div>
      </aside>

      {/* Mobile Drawer Menu & Overlay */}
      {mobileOpen ? (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-wine-deep text-cream shadow-2xl pb-safe">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] tracking-[0.28em] text-gold-soft uppercase">Jewellery house</p>
                <p className="font-display mt-1 text-xl font-medium text-gold-bright">{shopName}</p>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-md p-2 text-cream/70 hover:bg-white/10 hover:text-cream"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-3.5 rounded-md px-3.5 py-3 text-base transition min-h-[44px]",
                      active
                        ? "bg-gold/20 font-semibold text-gold-bright"
                        : "text-cream/90 hover:bg-white/10 hover:text-cream",
                    )}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 px-5 py-4 text-xs text-cream/50">
              Counter billing · GST · HUID
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
