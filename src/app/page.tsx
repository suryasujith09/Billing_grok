import Link from "next/link";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { WebsiteLayout } from "@/components/website-layout";
import { collections } from "@/lib/website-content";

export const metadata = { alternates: { canonical: "/" }, openGraph: { url: "https://twinklestargd.com" } };

export default function HomePage() {
  return <WebsiteLayout>
    <section className="site-hero">
      <div className="site-hero-image" role="img" aria-label="A close view of elegant gold jewellery" />
      <div className="site-hero-shade" />
      <div className="site-hero-content"><p className="site-kicker site-kicker-light"><span /> A JEWELLERY HOUSE</p><h1>Made to be<br /><em>remembered.</em></h1><p className="site-hero-copy">A little light, a lasting feeling. Discover jewellery for the moments that stay with you.</p><div className="site-hero-actions"><Link className="site-button site-button-gold" href="/collections">Explore collections <ArrowRight size={16} /></Link><Link className="site-text-link light" href="/contact">Speak with us <span>↗</span></Link></div></div>
      <a href="#discover" className="site-hero-scroll"><ArrowDown size={15} /> DISCOVER TWINKLESTAR</a>
      <div className="site-hero-side-note">GOLD · DIAMONDS · SILVER</div>
    </section>
    <section className="site-intro section-pad" id="discover"><div className="site-section-index">01 <span>—</span> A NOTE FROM US</div><div className="site-intro-copy"><p className="site-kicker">THE ART OF THE EVERYDAY</p><h2>Some things are<br />worth <em>keeping close.</em></h2><p>Twinklestar Gold &amp; Diamonds is a place to discover jewellery with meaning. From a quiet detail to a piece for a milestone, we invite you to find something that feels like yours.</p><Link className="site-text-link" href="/about">A little about us <ArrowRight size={15} /></Link></div><div className="site-intro-art"><div className="site-intro-art-image" /><span>KEEP WHAT<br />MAKES YOU<br /><em>SHINE.</em></span><Sparkles className="site-sparkle" size={22} /></div></section>
    <section className="site-collections section-pad"><div className="site-collections-head"><div><p className="site-kicker">02 — FIND YOUR FEELING</p><h2>Explore the <em>collections</em></h2></div><Link className="site-text-link" href="/collections">View all collections <ArrowRight size={15} /></Link></div><div className="site-collection-grid">{collections.map((item, i) => <Link href="/collections" className={`site-collection-card card-${i + 1}`} key={item.name}><div className="site-collection-image" style={{ backgroundImage: `url('${item.image}')` }} role="img" aria-label={item.alt} /><div className="site-collection-caption"><span>0{i + 1} / COLLECTION</span><h3>{item.name}</h3><p>{item.description}</p><span className="site-round-arrow"><ArrowRight size={17} /></span></div></Link>)}</div></section>
    <section className="site-promise"><div className="site-promise-image" role="img" aria-label="Jewellery being carefully arranged" /><div className="site-promise-copy"><p className="site-kicker site-kicker-light">03 — THE TWINKLESTAR WAY</p><h2>Chosen with care.<br /><em>Worn your way.</em></h2><p>Jewellery is personal. We believe the experience of finding it should be too. Take your time, ask questions and let us help you find the piece that feels right.</p><Link className="site-button site-button-outline" href="/services">How we can help <ArrowRight size={16} /></Link></div></section>
    <section className="site-contact-cta"><div className="site-section-index">04 <span>—</span> YOUR STORY, YOUR WAY</div><p className="site-kicker">WE WOULD LOVE TO HEAR FROM YOU</p><h2>Looking for something <em>special?</em></h2><p>Share what you have in mind. We are here to help you take the next step.</p><Link className="site-button site-button-dark" href="/contact">Start a conversation <ArrowRight size={16} /></Link><div className="site-cta-orbit" aria-hidden="true">✳</div></section>
  </WebsiteLayout>;
}
