import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { FileUp, Send, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { catalogOptions } from '@/lib/storefront.queries';
import { quoteDetailsSchema, validateModel } from '@/lib/storefront';
import { StorefrontShell } from './catalog';
import { useAccountSession } from './account-session';

export function QuotePage() {
  const { data } = useSuspenseQuery(catalogOptions);
  const filaments = data.filaments.filter(f=>f.in_stock);
  const [selection,setSelection] = useState(filaments[0]?.id ?? '');
  const [name,setName] = useState(''); const [email,setEmail] = useState('');
  const [material,setMaterial] = useState(''); const [color,setColor] = useState('');
  const [comment,setComment] = useState(''); const [file,setFile] = useState<File|null>(null);
  const [error,setError] = useState(''); const [busy,setBusy] = useState(false); const [done,setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { user } = useAccountSession();
  useEffect(() => { if (user?.email) setEmail(user.email); }, [user?.email]);
  const selected = filaments.find(f=>f.id===selection);
  const choose = (model?: File) => { if (!model) return; try { validateModel(model); setFile(model); setError(''); } catch(e) {setFile(null);setError(e instanceof Error?e.message:'Invalid model.');} };
  const submit = async (event:FormEvent) => {
    event.preventDefault(); setError('');
    const parsed = quoteDetailsSchema.safeParse({customer_name:name,customer_email:email,material:selected?.material ?? material,color:selected?.color ?? color,comment});
    if (!parsed.success) {setError(parsed.error.issues[0]?.message ?? 'Check your details.');return;}
    if (!file) {setError('Please attach your 3D model.');return;}
    try {
      validateModel(file); setBusy(true);
      const id=crypto.randomUUID(); const safeName=file.name.replace(/[^A-Za-z0-9._-]/g,'_').toLowerCase();
      const path=`${id}/${safeName}`;
      const upload=await supabase.storage.from('quote-files').upload(path,file,{contentType:'application/octet-stream',upsert:false});
      if(upload.error) throw new Error('Your file could not be uploaded. Please try again.');
      const saved=await supabase.from('quote_requests').insert({...parsed.data,id,file_path:path,file_name:file.name});
      if(saved.error) throw new Error('Your request could not be saved. Please try again.');
      setDone(true);
    } catch(e) {setError(e instanceof Error?e.message:'Could not send your request.');} finally {setBusy(false);}
  };
  return <StorefrontShell><main className="storefront-main quote-main"><header className="storefront-page-head"><p className="storefront-kicker">YOUR IDEA, OUR PRINTERS</p><h1>Request a custom quote</h1><p>Send your model, material choice, and the details that matter.</p></header>{done ? <section className="quote-success" role="status"><CheckCircle2 size={40}/><h2>Request received.</h2><p>Your model and details are with our workshop team.</p><p>We’ll contact you at {email} about your quote.</p>{user && <Button asChild variant="outline"><Link to="/account">View my orders</Link></Button>}<Button onClick={()=>{setDone(false);setFile(null);setComment('');}}>Send another request</Button></section> : <form onSubmit={submit} className="quote-form">{!user && <p className="quote-account-note"><Link to="/auth">Sign in or create an account</Link> to track this request and exchange messages.</p>}<fieldset disabled={busy}><div className="quote-fields"><label>Your name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>Email<input required type="email" maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>{filaments.length ? <label className="quote-wide">Material and color<select value={selection} onChange={e=>setSelection(e.target.value)}>{filaments.map(f=><option key={f.id} value={f.id}>{f.material} · {f.color} — {f.name}</option>)}</select></label> : <><label>Preferred material<input required maxLength={60} value={material} onChange={e=>setMaterial(e.target.value)} placeholder="e.g. PLA, PETG, or advice needed"/></label><label>Preferred color<input required maxLength={60} value={color} onChange={e=>setColor(e.target.value)} placeholder="e.g. Black"/></label></>}</div>{selected && <p className="selected-material">{selected.best_used_for}</p>}<div className="model-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)choose(e.dataTransfer.files[0]);}}><FileUp size={32}/><h2>{file?.name ?? 'Your 3D model'}</h2><p>{file ? `${(file.size/1024).toFixed(1)} KB` : 'STL, 3MF, OBJ, STEP, STP · Up to 50 MB'}</p><Button type="button" variant="outline" onClick={()=>input.current?.click()}>{file?'Replace model':'Choose model'}</Button>{file && <Button type="button" variant="ghost" size="icon" title="Remove model" aria-label="Remove model" onClick={()=>setFile(null)}><X/></Button>}<input ref={input} type="file" accept=".stl,.3mf,.obj,.step,.stp" aria-label="Upload 3D model" hidden onChange={e=>choose(e.target.files?.[0])}/></div><label>Comments (optional)<textarea maxLength={1000} rows={5} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Dimensions, finish, quantity, or deadlines…"/></label><p className="comment-count">{comment.length}/1000</p></fieldset>{error && <p role="alert" className="quote-error">{error}</p>}<div className="quote-submit"><p>Files are kept private; only our workshop team can download them.</p><Button type="submit" disabled={busy}><Send/>{busy?'Sending request…':'Request my quote'}</Button></div></form>}</main></StorefrontShell>;
}