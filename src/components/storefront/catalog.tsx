import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Flame, ArrowUpRight, Package, Layers, LockKeyhole, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { catalogOptions } from '@/lib/storefront.queries';
import workshopImage from '@/assets/print-fire-workshop-pro.jpg';
import { useAccountSession } from './account-session';
import { SignOutButton } from '@/components/benchstock/auth-gate';
import { accountDestination } from '@/lib/customer-account';
import { useCart, cartCount } from '@/lib/cart';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { readColors, type Product } from '@/lib/storefront';
import { Swatches } from '@/components/benchstock/color-options-field';

export function StorefrontShell({ children }: { children: ReactNode }) {
  const { user, admin } = useAccountSession();
  const cart = useCart(); const count = cartCount(cart.lines);
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="storefront"><header className={`storefront-nav${menuOpen?' menu-open':''}`}><Link to="/" className="storefront-brand" onClick={()=>setMenuOpen(false)}><Flame/><span>PRINT <em>&</em> FIRE</span></Link><div className="mobile-nav-actions"><Link to="/cart" aria-label={`Cart, ${count} items`} onClick={()=>setMenuOpen(false)}><ShoppingCart size={20}/>{count>0&&<span className="cart-badge">{count}</span>}</Link><button type="button" className="menu-toggle" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(o=>!o)}>{menuOpen?<X/>:<Menu/>}</button></div><nav aria-label="Customer navigation" onClick={(e)=>{if((e.target as HTMLElement).closest('a'))setMenuOpen(false);}}><Link to="/" activeOptions={{exact:true}}>Shop</Link><Link to="/filaments">Filaments</Link><Link to="/reviews">Reviews</Link><Link to="/contact">Contact us</Link><Button asChild><Link to="/quote">Get a quote <ArrowUpRight/></Link></Button><Link to="/cart" aria-label={`Cart, ${count} items`} title="Cart"><ShoppingCart size={18}/>{count>0&&<span> {count}</span>}</Link><Button asChild variant="ghost" size="icon" title={user ? admin ? 'Workshop dashboard' : 'My orders' : 'Sign in'}><Link to={user ? accountDestination(admin) : '/auth'} aria-label={user ? admin ? 'Workshop dashboard' : 'My orders' : 'Sign in'}><UserRound/><span className="mobile-menu-label">{user ? admin ? 'Workshop dashboard' : 'My orders' : 'Sign in'}</span></Link></Button>{user && <SignOutButton/>}</nav></header>{children}<footer className="storefront-footer"><span>Print & Fire · Made layer by layer.</span><Link to="/admin"><LockKeyhole size={14}/> Workshop sign in</Link></footer></div>;
}

export function ShopPage() {
  const { data } = useSuspenseQuery(catalogOptions);
  const cart = useCart();
  return <StorefrontShell><section className="storefront-cover"><img src={workshopImage} alt="Illustration of 3D printed objects in a workshop" width={1536} height={1024}/><div className="cover-copy"><p className="storefront-kicker">3D PRINTS · CUSTOM PARTS</p><h1>PRINT <span>&</span> FIRE</h1><p>Finished prints. One-of-a-kind ideas.<br/>Made layer by layer.</p><Button asChild size="lg"><Link to="/quote">Request a custom print <ArrowUpRight/></Link></Button></div><span className="cover-caption">Illustrative workshop image</span></section><main className="storefront-main"><header className="storefront-section-head"><div><p className="storefront-kicker">READY TO SHIP</p><h2>Current inventory</h2></div><span>{data.products.length} listings</span></header>{data.products.length === 0 ? <div className="storefront-empty"><Package/><h3>No items are listed right now.</h3><p>Have something in mind? Send a model for a custom quote.</p><Button asChild variant="outline"><Link to="/quote">Request a quote <ArrowUpRight/></Link></Button></div> : <div className="storefront-grid">{data.products.map(item => <ProductCard key={item.id} item={item} add={cart.add}/>)}</div>}</main></StorefrontShell>;
}

export function FilamentsPage() {
  const { data } = useSuspenseQuery(catalogOptions);
  const [tab, setTab] = useState<'basic'|'advanced'>('basic');
  const list = data.filaments.filter(f => (f.category ?? 'basic') === tab);
  return <StorefrontShell><main className="storefront-main"><header className="storefront-page-head"><p className="storefront-kicker">OUR MATERIALS</p><h1>Filaments on hand</h1><p>Choose the material and finish for your next print.</p></header><div className="storefront-filters" role="tablist" aria-label="Material type"><Button role="tab" aria-selected={tab==='basic'} variant={tab==='basic'?'default':'outline'} onClick={()=>setTab('basic')}>Basic filaments</Button><Button role="tab" aria-selected={tab==='advanced'} variant={tab==='advanced'?'default':'outline'} onClick={()=>setTab('advanced')}>Advanced materials</Button></div><p className="material-tab-intro">{tab==='basic'?'Everyday materials for prototypes, decor, gifts and display pieces.':'Industrial and engineering materials for strong, heat-resistant and functional parts.'}</p>{!list.length && <div className="storefront-empty"><Layers/><h3>No {tab==='basic'?'basic filaments':'advanced materials'} have been listed yet.</h3></div>}<div className="material-grid">{list.map(f => <article className="material-card" key={f.id}><span className="material-swatch" style={{backgroundColor:f.color_hex ?? 'var(--muted)'}}/><div><h2>{f.name}</h2><p>{f.material}</p><Swatches colors={readColors(f.colors,{name:f.color,hex:f.color_hex,in_stock:f.in_stock})}/><span className={f.in_stock?'text-primary':'text-muted-foreground'}>{f.in_stock?'In stock':'Currently unavailable'}</span><p>{f.best_used_for}</p></div></article>)}</div><section className="storefront-callout"><div><h2>Found your material?</h2><p>Send your model for a custom quote.</p></div><Button asChild><Link to="/quote">Get a quote <ArrowUpRight/></Link></Button></section></main></StorefrontShell>;
}
function ProductCard({ item, add }: { item: Product; add: ReturnType<typeof useCart>['add'] }) {
  const colors = readColors(item.colors);
  const [color, setColor] = useState(colors.find(c => c.in_stock)?.name ?? '');
  const [custom, setCustom] = useState(false); const [customColor, setCustomColor] = useState('');
  const needsColor = colors.length > 0;
  const wanted = customColor.trim().slice(0, 60);
  const canAdd = custom ? !!wanted : !!item.quantity && (!needsColor || !!color);
  const addToCart = () => custom
    ? add({ id: `${item.id}::custom::${wanted.toLowerCase()}`, name: `${item.name} — Custom color: ${wanted} (printed to order)`, price_cents: item.price_cents, image_url: item.image_url, max: 20 })
    : add({ id: color ? `${item.id}::${color}` : item.id, name: color ? `${item.name} — ${color}` : item.name, price_cents: item.price_cents, image_url: item.image_url, max: item.quantity });
  return <article className="product-card"><div className="product-image">{item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" width={600} height={450}/> : <Package size={48}/>}<span className="product-stock">{item.quantity ? `${item.quantity} available` : 'Sold out'}</span></div><div className="product-copy"><div><h3>{item.name}</h3><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(item.price_cents/100)}</strong></div><p>{item.description}</p>
    {!custom && needsColor && <><Swatches colors={colors} selected={color} onSelect={setColor}/><p className="text-muted-foreground">{color ? `Color: ${color}` : 'No colors available'}</p></>}
    <label className="stock-checkbox"><input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)}/> I want a different color</label>
    {custom && <label className="custom-color-field">Which color?<input maxLength={60} value={customColor} onChange={e => setCustomColor(e.target.value)} placeholder="e.g. Glow-in-the-dark green"/><span className="text-muted-foreground">We'll print a fresh copy in this color.</span></label>}
    <Button disabled={!canAdd} onClick={addToCart}><ShoppingCart/> {custom ? 'Add custom color to cart' : item.quantity ? 'Add to cart' : 'Sold out'}</Button></div></article>;
}
