"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Gem,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShoppingBag,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "./ui";
import { logoutAction } from "@/lib/auth-actions";
import type { Role } from "@/lib/session";

const ALL_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard, adminOnly: false },
  { href: "/billing", label: "New Bill", icon: Receipt, adminOnly: false },
  { href: "/invoices", label: "Invoices", icon: BookOpen, adminOnly: false },
  { href: "/inventory", label: "Stock", icon: Gem, adminOnly: false },
  { href: "/customers", label: "Customers", icon: Users, adminOnly: false },
  { href: "/reports", label: "Reports", icon: ShoppingBag, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

function NavLinks({
  role,
  onItemClick,
  mobile = false,
}: {
  role: Role;
  onItemClick?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const nav = ALL_NAV.filter((item) => !item.adminOnly || role === "admin");

  return (
    <>
      {nav.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
              mobile && "gap-3.5 px-3.5 py-3 text-base min-h-[44px]",
              active
                ? "bg-gold/20 font-semibold text-gold-bright"
                : "text-cream/80 hover:bg-white/5 hover:text-cream",
            )}
          >
            <Icon size={mobile ? 20 : 18} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function UserBadge({ role, username }: { role: Role; username: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 mb-1">
      <ShieldCheck
        size={15}
        className={role === "admin" ? "text-gold-bright" : "text-cream/50"}
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-cream truncate">{username}</p>
        <p className="text-[10px] text-cream/40 capitalize">{role}</p>
      </div>
    </div>
  );
}

function LogoutButton({ mobile = false }: { mobile?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-cream/60 transition hover:bg-white/5 hover:text-cream",
          mobile && "gap-3.5 px-3.5 py-3 text-base min-h-[44px]",
        )}
      >
        <LogOut size={mobile ? 20 : 18} />
        Sign out
      </button>
    </form>
  );
}

export function Sidebar({
  shopName,
  role,
  username,
  mobileOpen,
  onCloseMobile,
}: {
  shopName: string;
  role: Role;
  username: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-royal-deep text-cream md:flex">
        <div className="border-b border-white/10 px-5 py-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-gold/40 p-1 shadow-xs">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.25em] text-gold-soft uppercase">Jewellery House</p>
            <p className="font-display truncate text-lg font-bold leading-tight text-gold-bright">{shopName}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <NavLinks role={role} />
        </nav>
        <div className="border-t border-white/10 p-3 space-y-1">
          <UserBadge role={role} username={username} />
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile Drawer Menu & Overlay */}
      {mobileOpen ? (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 left-0 flex w-72 max-w-full flex-col bg-royal-deep text-cream shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-gold/40 p-1">
                  <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] tracking-[0.22em] text-gold-soft uppercase">Jewellery House</p>
                  <p className="font-display truncate text-base font-bold text-gold-bright">{shopName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-cream/70 hover:bg-white/10 hover:text-cream"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <NavLinks role={role} onItemClick={onCloseMobile} mobile />
            </nav>

            <div className="border-t border-white/10 p-3 space-y-1">
              <UserBadge role={role} username={username} />
              <LogoutButton mobile />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
