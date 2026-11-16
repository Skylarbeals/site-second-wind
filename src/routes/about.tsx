import { createFileRoute, Link } from '@tanstack/react-router';
import { Flame, Lightbulb, Wrench, Heart, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorefrontShell } from '@/components/storefront/catalog';
export const Route = createFileRoute('/about')({
  head:()=>({meta:[{title:'About us — Print & Fire'},{name:'description',content:'Meet Print & Fire, a small 3D printing workshop that prints, finds and designs custom parts.'},{property:'og:title',content:'About us — Print & Fire'},{property:'og:description',content:'Meet Print & Fire, a small 3D printing workshop that prints, finds and designs custom parts.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: AboutPage,
});
function AboutPage() {
  const values=[{icon:Flame,t:'Made layer by layer',d:'Every print is set up, checked and finished by hand in our own workshop.'},{icon:Lightbulb,t:'Ideas welcome',d:'No model? No problem. We help you find an existing design or create one from scratch.'},{icon:Wrench,t:'Engineering ready',d:'From everyday PLA to engineering materials, with your own layer height, infill and orientation.'},{icon:Heart,t:'Small team, real people',d:'You talk directly with the two of us who run the printers.'}];
  return <StorefrontShell><main className="storefront-main"><header className="storefront-page-head"><p className="storefront-kicker">WHO WE ARE</p><h1>About Print & Fire</h1><p>We’re a small, two-person 3D printing workshop that turns ideas, sketches and blueprints into real parts — from gifts and décor to functional engineering pieces.</p></header><div className="about-grid">{values.map(v=><article className="about-card" key={v.t}><v.icon/><h2>{v.t}</h2><p>{v.d}</p></article>)}</div><section className="storefront-callout"><div><h2>Have something in mind?</h2><p>Send a model, or just tell us the idea.</p></div><Button asChild><Link to="/quote">Get a quote <ArrowUpRight/></Link></Button></section></main></StorefrontShell>;
}
