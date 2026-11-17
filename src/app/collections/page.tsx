import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WebsiteLayout } from "@/components/website-layout";
import { collections } from "@/lib/website-content";

export const metadata: Metadata = { title: "Collections", description: "Explore gold, diamond and silver jewellery at Twinklestar Gold & Diamonds.", alternates: { canonical: "/collections" }, openGraph: { url: "https://twinklestargd.com/collections" } };

export default function CollectionsPage() {
  return <WebsiteLayout><section className="site-page-heading"><p className="site-kicker">A WORLD OF POSSIBILITY</p><h1>Find your <em>forever.</em></h1><p>Explore jewellery in gold, diamonds and silver. For questions about a piece, we would love to hear from you.</p></section><section className="site-collections-page section-pad"><div className="site-collection-grid">{collections.map((item, i) => <article className={`site-collection-card card-${i + 1}`} key={item.name}><div className="site-collection-image" style={{ backgroundImage: `url('${item.image}')` }} role="img" aria-label={item.alt} /><div className="site-collection-caption"><span>0{i + 1} / COLLECTION</span><h2>{item.name}</h2><p>{item.description}</p><Link className="site-text-link" href="/contact">Ask us about {item.name.toLowerCase()} <ArrowRight size={15} /></Link></div></article>)}</div><p className="site-note">Collection imagery is illustrative. Please contact our team for current selection and availability.</p></section><section className="site-inner-cta"><h2>Have a piece in <em>mind?</em></h2><Link className="site-button site-button-dark" href="/contact">Make an enquiry <ArrowRight size={16} /></Link></section></WebsiteLayout>;
}
