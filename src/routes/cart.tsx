import { createFileRoute, Link } from '@tanstack/react-router';
import { Minus, Plus, ShoppingCart, Trash2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorefrontShell } from '@/components/storefront/catalog';
import { useCart, cartTotal } from '@/lib/cart';

export const Route = createFileRoute('/cart')({
  head: () => ({ meta: [
    { title: 'Your cart — Print & Fire' },
    { name: 'description', content: 'Review the 3D prints in your Print & Fire cart.' },
    { property: 'og:title', content: 'Your cart — Print & Fire' },
    { property: 'og:description', content: 'Review the 3D prints in your Print & Fire cart.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: CartPage,
});

const usd = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100);

function CartPage() {
  const { lines, setQty, clear } = useCart();
  return <StorefrontShell><main className="storefront-main"><header className="storefront-page-head"><p className="storefront-kicker">YOUR CART</p><h1>Shopping cart</h1></header>
    {lines.length === 0 ? <div className="storefront-empty"><ShoppingCart/><h3>Your cart is empty.</h3><Button asChild variant="outline"><Link to="/">Browse prints <ArrowUpRight/></Link></Button></div> : <>
      <div>{lines.map(l => <article className="catalog-row" key={l.id}><div><h3>{l.name}</h3><p>{usd(l.price_cents)} each · {usd(l.price_cents * l.qty)}</p></div><div>
        <Button variant="ghost" size="icon" aria-label={`Fewer ${l.name}`} onClick={() => setQty(l.id, l.qty - 1)}><Minus/></Button>
        <span aria-label="Quantity">{l.qty}</span>
        <Button variant="ghost" size="icon" aria-label={`More ${l.name}`} disabled={l.qty >= l.max} onClick={() => setQty(l.id, l.qty + 1)}><Plus/></Button>
        <Button variant="ghost" size="icon" aria-label={`Remove ${l.name}`} onClick={() => setQty(l.id, 0)}><Trash2/></Button></div></article>)}</div>
      <section className="storefront-callout"><div><h2>Total: {usd(cartTotal(lines))}</h2><p>Online checkout is coming soon. Want these now? Send us a request.</p></div><div style={{ display: 'flex', gap: 8 }}><Button variant="outline" onClick={clear}>Empty cart</Button><Button disabled title="Coming soon">Checkout (coming soon)</Button></div></section>
    </>}</main></StorefrontShell>;
}
