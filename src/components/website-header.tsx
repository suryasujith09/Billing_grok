"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { websiteContent } from "@/lib/website-content";

const links = [
  ["Home", "/"], ["About Us", "/about"], ["Collections", "/collections"],
  ["Our Services", "/services"], ["Contact Us", "/contact"],
] as const;

export function WebsiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="site-header-inner">
      <Link href="/" className="site-brand" aria-label={`${websiteContent.companyName} home`} onClick={() => setOpen(false)}>
        <span><strong>TWINKLESTAR</strong><small>GOLD &amp; DIAMONDS</small></span>
      </Link>
      <button className="site-menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={`site-nav${open ? " is-open" : ""}`} aria-label="Main navigation">
        {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link className="site-login" href="/software/login" onClick={() => setOpen(false)}>Software Login <span aria-hidden="true">↗</span></Link>
      </nav>
    </div>
  </header>;
}
