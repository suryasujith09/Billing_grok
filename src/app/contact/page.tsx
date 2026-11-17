import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { WebsiteLayout } from "@/components/website-layout";
import { EnquiryForm } from "@/components/enquiry-form";
import { websiteContent } from "@/lib/website-content";

export const metadata: Metadata = { title: "Contact Us", description: "Contact Twinklestar Gold & Diamonds with a jewellery enquiry.", alternates: { canonical: "/contact" }, openGraph: { url: "https://twinklestargd.com/contact" } };

export default function ContactPage() {
  return <WebsiteLayout><section className="site-page-heading contact-heading"><p className="site-kicker">WE ARE HERE TO HELP</p><h1>Let’s start a <em>conversation.</em></h1><p>A question, an idea, or something you would love to find. Send us a note.</p></section><section className="site-contact-layout section-pad"><div className="site-contact-details"><p className="site-kicker">GET IN TOUCH</p><h2>We would love<br />to hear <em>from you.</em></h2><p>Share a little about what you are looking for and our team will be in touch.</p><div className="site-contact-detail-list">{websiteContent.email && <a href={`mailto:${websiteContent.email}`}><Mail size={17} /><span><small>EMAIL</small>{websiteContent.email}</span></a>}{websiteContent.phone && <a href={`tel:${websiteContent.phone.replace(/[^+\d]/g, "")}`}><Phone size={17} /><span><small>PHONE</small>{websiteContent.phone}</span></a>}{websiteContent.address && <div><MapPin size={17} /><span><small>VISIT US</small>{websiteContent.address}</span></div>}{!websiteContent.email && !websiteContent.phone && !websiteContent.address && <p className="site-note">Contact details will appear here once confirmed and added to the site configuration.</p>}</div><span className="site-contact-mark" aria-hidden="true">✳</span></div><div className="site-contact-form-wrap"><EnquiryForm /></div></section></WebsiteLayout>;
}
