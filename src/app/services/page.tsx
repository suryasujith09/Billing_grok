import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WebsiteLayout } from "@/components/website-layout";
import { services } from "@/lib/website-content";

export const metadata: Metadata = { title: "Our Services", description: "Talk with Twinklestar Gold & Diamonds about jewellery, selection and your visit.", alternates: { canonical: "/services" }, openGraph: { url: "https://twinklestargd.com/services" } };

export default function ServicesPage() {
  return <WebsiteLayout><section className="site-inner-hero service-hero"><div><p className="site-kicker site-kicker-light">A PERSONAL TOUCH</p><h1>Here for the<br /><em>little details.</em></h1><p>Good jewellery starts with a conversation.</p></div></section><section className="site-services-intro section-pad"><div className="site-section-index">01 <span>—</span> HOW WE CAN HELP</div><div><p className="site-kicker">YOUR QUESTIONS ARE WELCOME</p><h2>A considered experience,<br /><em>at your pace.</em></h2><p>Choosing jewellery is a personal decision. Reach out to our team to discuss what you are looking for, ask about the collections or plan your next step.</p></div></section><section className="site-services-list">{services.map((service) => <article key={service.number}><span>{service.number}</span><div><h2>{service.title}</h2><p>{service.description}</p></div><Link href="/contact" aria-label={`Contact us: ${service.title}`}><ArrowRight size={18} /></Link></article>)}</section><section className="site-inner-cta"><h2>Tell us what you <em>need.</em></h2><Link className="site-button site-button-gold" href="/contact">Get in touch <ArrowRight size={16} /></Link></section></WebsiteLayout>;
}
