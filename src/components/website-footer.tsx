import Link from "next/link";
import { websiteContent } from "@/lib/website-content";

export function WebsiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-main">
      <div className="site-footer-brand"><div><strong>TWINKLESTAR</strong><small>GOLD &amp; DIAMONDS</small></div><p>{websiteContent.companyName}</p></div>
      <div><h2>Explore</h2><Link href="/about">About us</Link><Link href="/collections">Collections</Link><Link href="/services">Our services</Link></div>
      <div><h2>Connect</h2>{websiteContent.email ? <a href={`mailto:${websiteContent.email}`}>{websiteContent.email}</a> : <Link href="/contact">Send an enquiry</Link>}{websiteContent.phone && <a href={`tel:${websiteContent.phone.replace(/[^+\d]/g, "")}`}>{websiteContent.phone}</a>}{websiteContent.address && <p>{websiteContent.address}</p>}</div>
      <div><h2>For our team</h2><Link href="/software/login">Software Login ↗</Link></div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} {websiteContent.companyName}</span></div>
  </footer>;
}
