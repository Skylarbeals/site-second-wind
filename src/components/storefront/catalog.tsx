import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Flame, ArrowUpRight, Package, Layers, LockKeyhole, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { catalogOptions } from '@/lib/storefront.queries';
import workshopImage from '@/assets/print-fire-workshop.jpg';
import { useAccountSession } from './account-session';
import { SignOutButton } from '@/components/benchstock/auth-gate';
import { accountDestination } from '@/lib/customer-account';
import { useCart, cartCount } from '@/lib/cart';
import { ShoppingCart } from 'lucide-react';

export function StorefrontShell({ children }: { children: ReactNode }) {
  const { user, admin } = useAccountSession();
  const cart = useCart(); const count = cartCount(cart.lines);
  return <div className="storefront"><header className="storefront-nav"><Link to="/" className="storefront-brand"><Flame/><span>PRINT <em>&</em> FIRE</span></Link><nav aria-label="Customer navigation"><Link to="/" activeOptions={{exact:true}}>Shop</Link><Link to="/filaments">Filaments</Link><Button asChild><Link to="/quote">Get a quote <ArrowUpRight/></Link></Button><Link to="/cart" aria-label={`Cart, ${count} items`} title="Cart"><ShoppingCart size={18}/>{count>0&&<span> {count}</span>}</Link><Button asChild variant="ghost" size="icon" title={user ? admin ? 'Workshop dashboard' : 'My orders' : 'Sign in'}><Link to={user ? accountDestination(admin) : '/auth'} aria-label={user ? admin ? 'Workshop dashboard' : 'My orders' : 'Sign in'}><UserRound/></Link></Button>{user && <SignOutButton/>}</nav></header>{children}<footer className="storefront-footer"><span>Print & Fire · Made layer by layer.</span><Link to="/admin"><LockKeyhole size={14}/> Workshop sign in</Link></footer></div>;
}

export function ShopPage() {
  const { data } = useSuspenseQuery(catalogOptions);
  const cart = useCart();
  return <StorefrontShell><section className="storefront-cover"><img src={workshopImage} alt="Illustration of 3D printed objects in a workshop" width={1536} height={1024}/><div className="cover-copy"><p className="storefront-kicker">3D PRINTS · CUSTOM PARTS</p><h1>PRINT <span>&</span> FIRE</h1><p>Finished prints. One-of-a-kind ideas.<br/>Made layer by layer.</p><Button asChild size="lg"><Link to="/quote">Request a custom print <ArrowUpRight/></Link></Button></div><span className="cover-caption">Illustrative workshop image</span></section><main className="storefront-main"><header className="storefront-section-head"><div><p className="storefront-kicker">READY TO SHIP</p><h2>Current inventory</h2></div><span>{data.products.length} listings</span></header>{data.products.length === 0 ? <div className="storefront-empty"><Package/><h3>No items are listed right now.</h3><p>Have something in mind? Send a model for a custom quote.</p><Button asChild variant="outline"><Link to="/quote">Request a quote <ArrowUpRight/></Link></Button></div> : <div className="storefront-grid">{data.products.map(item => <article className="product-card" key={item.id}><div className="product-image">{item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" width={600} height={450}/> : <Package size={48}/>}<span className="product-stock">{item.quantity ? `${item.quantity} available` : 'Sold out'}</span></div><div className="product-copy"><div><h3>{item.name}</h3><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(item.price_cents/100)}</strong></div><p>{item.description}</p><Button disabled={!item.quantity} onClick={()=>{cart.add({id:item.id,name:item.name,price_cents:item.price_cents,image_url:item.image_url,max:item.quantity});}}><ShoppingCart/> {item.quantity?'Add to cart':'Sold out'}</Button></div></article>)}</div>}</main></StorefrontShell>;
}

export function FilamentsPage() {
  const { data } = useSuspenseQuery(catalogOptions);
  const [filter, setFilter] = useState('All');
  const materials = ['All', ...new Set(data.filaments.map(f => f.material))];
  return <StorefrontShell><main className="storefront-main"><header className="storefront-page-head"><p className="storefront-kicker">OUR MATERIALS</p><h1>Filaments on hand</h1><p>Choose the material and finish for your next print.</p></header><div className="storefront-filters" role="group" aria-label="Filter by material">{materials.map(m => <Button key={m} variant={filter===m?'default':'outline'} aria-pressed={filter===m} onClick={()=>setFilter(m)}>{m}</Button>)}</div>{!data.filaments.length && <div className="storefront-empty"><Layers/><h3>No filaments have been listed yet.</h3></div>}<div className="storefront-grid">{data.filaments.filter(f => filter==='All'||filter===f.material).map(f => <article className="material-card" key={f.id}><span className="material-swatch" style={{backgroundColor:f.color_hex ?? 'var(--muted)'}}/><div><h2>{f.name}</h2><p>{f.material} · {f.color}</p><span className={f.in_stock?'text-primary':'text-muted-foreground'}>{f.in_stock?'In stock':'Currently unavailable'}</span><p>{f.best_used_for}</p></div></article>)}</div><section className="storefront-callout"><div><h2>Found your material?</h2><p>Send your model for a custom quote.</p></div><Button asChild><Link to="/quote">Get a quote <ArrowUpRight/></Link></Button></section></main></StorefrontShell>;
}