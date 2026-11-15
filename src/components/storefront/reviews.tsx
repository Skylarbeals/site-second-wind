import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Star, ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { StorefrontShell } from './catalog';
import { useAccountSession } from './account-session';

type Review = { id: string; author_name: string; rating: number; body: string; photo_path: string | null; created_at: string; photo?: string };

function Stars({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  return <span className="review-stars" role={onPick ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(n => onPick
    ? <button type="button" key={n} role="radio" aria-checked={value===n} aria-label={`${n} star${n>1?'s':''}`} onClick={() => onPick(n)}><Star className={n<=value?'on':''}/></button>
    : <Star key={n} className={n<=value?'on':''}/>)}</span>;
}

export function ReviewsPage() {
  const { user, admin } = useAccountSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', rating: 0, body: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    const rows = await Promise.all((data ?? []).map(async r => {
      if (!r.photo_path) return r;
      const s = await supabase.storage.from('review-photos').createSignedUrl(r.photo_path, 3600);
      return { ...r, photo: s.data?.signedUrl };
    }));
    setReviews(rows); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!user) return; setError('');
    if (form.rating < 1) { setError('Pick a star rating.'); return; }
    if (file && (!file.type.startsWith('image/') || file.size > 10*1024*1024)) { setError('Photo must be an image up to 10 MB.'); return; }
    setBusy(true);
    try {
      let photo_path: string | null = null;
      if (file) { const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, ''); photo_path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from('review-photos').upload(photo_path, file, { contentType: file.type }); if (up.error) throw new Error('Could not upload photo.'); }
      const r = await supabase.from('reviews').insert({ user_id: user.id, author_name: form.name.trim(), rating: form.rating, body: form.body.trim(), photo_path });
      if (r.error) throw new Error('Could not post your review.');
      setForm({ name: '', rating: 0, body: '' }); setFile(null); setDone(true); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); } finally { setBusy(false); }
  };
  const remove = async (id: string) => { if (!window.confirm('Delete this review?')) return; await supabase.from('reviews').delete().eq('id', id); await load(); };
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return <StorefrontShell><main className="storefront-main"><header className="storefront-page-head"><p className="storefront-kicker">CUSTOMER REVIEWS</p><h1>What people say</h1>{reviews.length > 0 && <p><Stars value={Math.round(avg)}/> {avg.toFixed(1)} from {reviews.length} review{reviews.length>1?'s':''}</p>}</header>
    <section className="review-form-wrap">{!user ? <p className="quote-account-note"><Link to="/auth">Sign in or create an account</Link> to leave a review.</p> : done ? <p className="quote-account-note">Thanks for your review! <button className="link-button" onClick={() => setDone(false)}>Write another</button></p> :
      <form className="quote-form review-form" onSubmit={submit}><h2>Leave a review</h2>
        <label>Your name<input required maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
        <div><span className="review-label">Rating</span><Stars value={form.rating} onPick={n => setForm({ ...form, rating: n })}/></div>
        <label>Your review<textarea required maxLength={2000} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}/></label>
        <div className="product-photo-actions"><Button type="button" variant="outline" onClick={() => document.getElementById('review-photo')?.click()}><ImagePlus/>{file ? file.name : 'Add a photo (optional)'}</Button>{file && <Button type="button" variant="ghost" onClick={() => setFile(null)}>Remove</Button>}</div>
        <input id="review-photo" type="file" accept="image/*" hidden onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }}/>
        {error && <p className="quote-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post review'}</Button></form>}</section>
    {loading ? <p>Loading reviews…</p> : reviews.length === 0 ? <div className="storefront-empty"><Star/><h3>No reviews yet — be the first!</h3></div> :
      <div className="storefront-grid">{reviews.map(r => <article className="product-card" key={r.id}>{r.photo && <div className="product-image"><img src={r.photo} alt={`Photo from ${r.author_name}`} loading="lazy"/></div>}<div className="product-copy"><div><h3>{r.author_name}</h3>{admin && <Button variant="ghost" size="icon" aria-label="Delete review" onClick={() => void remove(r.id)}><Trash2/></Button>}</div><Stars value={r.rating}/><p>{r.body}</p><small className="review-date">{new Date(r.created_at).toLocaleDateString()}</small></div></article>)}</div>}
  </main></StorefrontShell>;
}

export function ContactPage() {
  return <StorefrontShell><main className="storefront-main"><header className="storefront-page-head"><p className="storefront-kicker">CONTACT US</p><h1>Get in touch</h1><p>Questions about an order, a custom part, or a bulk job? We'd love to hear from you.</p></header>
    <div className="storefront-grid">
      <article className="material-card"><div><h2>Email</h2><p>Coming soon</p></div></article>
      <article className="material-card"><div><h2>Phone</h2><p>Coming soon</p></div></article>
      <article className="material-card"><div><h2>Hours</h2><p>Coming soon</p></div></article>
    </div>
    <section className="storefront-callout"><div><h2>Already have an order with us?</h2><p>Sign in to your account to message us directly about it.</p></div><Button asChild><Link to="/auth">Sign in</Link></Button></section>
  </main></StorefrontShell>;
}
