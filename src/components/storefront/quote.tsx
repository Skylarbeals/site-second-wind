import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { FileUp, Send, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { catalogOptions } from '@/lib/storefront.queries';
import { quoteDetailsSchema, validateModel, readColors, MODEL_EXTENSIONS, ADVANCED_EXTENSIONS, SLICEABLE_EXTENSIONS, advancedSettingsSchema } from '@/lib/storefront';
import { StorefrontShell } from './catalog';
import { useAccountSession } from './account-session';

type Mode = 'model' | 'design_help' | 'advanced';
const INTROS: Record<Mode,string> = {
  model: 'Have a 3D model ready? Send it with your material choice.',
  design_help: 'Not sure what you need? Describe your idea or problem — we’ll help you find an existing design or create one for you. A file is optional.',
  advanced: 'Set your own print settings and attach full blueprints, CAD drawings, or callout sheets.',
};
const safe = (name:string) => name.replace(/[^A-Za-z0-9._-]/g,'_').toLowerCase();

function DropZone({ file, setFile, allowed, title, busy, onError }: { file: File|null; setFile:(f:File|null)=>void; allowed:string[]; title:string; busy:boolean; onError:(m:string)=>void }) {
  const input = useRef<HTMLInputElement>(null);
  const choose = (f?: File) => { if (!f) return; try { validateModel(f, allowed); setFile(f); onError(''); } catch(e) { setFile(null); onError(e instanceof Error?e.message:'Invalid file.'); } };
  return <div className="model-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)choose(e.dataTransfer.files[0]);}}><FileUp size={32}/><h2>{file?.name ?? title}</h2><p>{file ? `${(file.size/1024).toFixed(1)} KB` : `${allowed.map(e=>e.toUpperCase()).join(', ')} · Up to 50 MB`}</p><Button type="button" variant="outline" onClick={()=>input.current?.click()}>{file?'Replace file':'Choose file'}</Button>{file && <Button type="button" variant="ghost" size="icon" title="Remove file" aria-label={`Remove ${title}`} onClick={()=>setFile(null)}><X/></Button>}<input ref={input} type="file" accept={allowed.map(e=>`.${e}`).join(',')} aria-label={`Upload ${title}`} hidden onChange={e=>choose(e.target.files?.[0])}/></div>;
}

export function QuotePage() {
  const { data } = useSuspenseQuery(catalogOptions);
  const filaments = data.filaments.filter(f=>f.in_stock).flatMap(f=>readColors(f.colors,{name:f.color,hex:f.color_hex,in_stock:f.in_stock}).filter(c=>c.in_stock).map(c=>({...f,id:`${f.id}::${c.name}`,color:c.name})));
  const [mode,setMode] = useState<Mode>('model');
  const [selection,setSelection] = useState(filaments[0]?.id ?? '');
  const [name,setName] = useState(''); const [email,setEmail] = useState('');
  const [material,setMaterial] = useState(''); const [color,setColor] = useState('');
  const [comment,setComment] = useState(''); const [file,setFile] = useState<File|null>(null); const [blueprint,setBlueprint] = useState<File|null>(null);
  const [layer,setLayer] = useState('0.2'); const [infill,setInfill] = useState('20'); const [orientation,setOrientation] = useState('');
  const [error,setError] = useState(''); const [busy,setBusy] = useState(false); const [done,setDone] = useState(false);
  const { user } = useAccountSession();
  useEffect(() => { if (user?.email) setEmail(user.email); }, [user?.email]);
  const selected = filaments.find(f=>f.id===selection);
  const allowed = mode==='advanced' ? ADVANCED_EXTENSIONS : MODEL_EXTENSIONS;
  const switchMode = (m:Mode) => { setMode(m); setFile(null); setBlueprint(null); setError(''); };
  const submit = async (event:FormEvent) => {
    event.preventDefault(); setError('');
    const parsed = quoteDetailsSchema.safeParse({customer_name:name,customer_email:email,material:selected?.material ?? (material || (mode==='design_help'?'Advice needed':'')),color:selected?.color ?? (color || (mode==='design_help'?'Advice needed':'')),comment});
    if (!parsed.success) {setError(parsed.error.issues[0]?.message ?? 'Check your details.');return;}
    if (mode==='design_help' && !comment.trim()) {setError('Please describe what you are looking for.');return;}
    if (mode!=='design_help' && !file) {setError('Please attach your file.');return;}
    const settings = advancedSettingsSchema.safeParse({layer_height:mode==='advanced'&&layer?Number(layer):null,infill_percent:mode==='advanced'&&infill!==''?Number(infill):null,orientation:mode==='advanced'&&orientation.trim()?orientation:null});
    if (!settings.success) {setError('Layer height must be 0.04–0.4 mm and infill 0–100%.');return;}
    try {
      setBusy(true);
      const id=crypto.randomUUID(); let path=''; let blueprintPath: string|null=null;
      if (file) { validateModel(file, allowed); path=`${id}/${safe(file.name)}`; const up=await supabase.storage.from('quote-files').upload(path,file,{contentType:'application/octet-stream',upsert:false}); if(up.error) throw new Error('Your file could not be uploaded. Please try again.'); }
      if (blueprint) { validateModel(blueprint, ADVANCED_EXTENSIONS); blueprintPath=`${id}/blueprint-${safe(blueprint.name)}`; const up=await supabase.storage.from('quote-files').upload(blueprintPath,blueprint,{contentType:'application/octet-stream',upsert:false}); if(up.error) throw new Error('Your blueprint could not be uploaded. Please try again.'); }
      const ext = file?.name.split('.').pop()?.toLowerCase() ?? '';
      const saved=await supabase.from('quote_requests').insert({...parsed.data,...settings.data,id,request_type:mode,file_path:path,file_name:file?.name ?? 'No file — design help',blueprint_path:blueprintPath,blueprint_name:blueprint?.name ?? null,slice_status:SLICEABLE_EXTENSIONS.includes(ext)?'pending':'skipped'});
      if(saved.error) throw new Error('Your request could not be saved. Please try again.');
      setDone(true);
    } catch(e) {setError(e instanceof Error?e.message:'Could not send your request.');} finally {setBusy(false);}
  };
  return <StorefrontShell><main className="storefront-main quote-main"><header className="storefront-page-head"><p className="storefront-kicker">YOUR IDEA, OUR PRINTERS</p><h1>Request a custom quote</h1><p>Send your model, material choice, and the details that matter.</p></header>{done ? <section className="quote-success" role="status"><CheckCircle2 size={40}/><h2>Request received.</h2><p>Your details are with our workshop team.</p><p>We’ll contact you at {email} about your quote.</p>{user && <Button asChild variant="outline"><Link to="/account">View my orders</Link></Button>}<Button onClick={()=>{setDone(false);setFile(null);setBlueprint(null);setComment('');}}>Send another request</Button></section> : <form onSubmit={submit} className="quote-form"><div className="storefront-filters" role="tablist" aria-label="Order type">{([['model','I have a model'],['design_help','Help me find or design it'],['advanced','Advanced']] as const).map(([m,l])=><Button key={m} type="button" role="tab" aria-selected={mode===m} variant={mode===m?'default':'outline'} onClick={()=>switchMode(m)}>{l}</Button>)}</div><p className="material-tab-intro">{INTROS[mode]}</p>{!user && <p className="quote-account-note"><Link to="/auth">Sign in or create an account</Link> to track this request and exchange messages.</p>}<fieldset disabled={busy}><div className="quote-fields"><label>Your name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>Email<input required type="email" maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>{filaments.length ? <label className="quote-wide">Material and color<select value={selection} onChange={e=>setSelection(e.target.value)}>{filaments.map(f=><option key={f.id} value={f.id}>{f.material} · {f.color} — {f.name}</option>)}</select></label> : <><label>Preferred material<input required={mode!=='design_help'} maxLength={60} value={material} onChange={e=>setMaterial(e.target.value)} placeholder="e.g. PLA, PETG, or advice needed"/></label><label>Preferred color<input required={mode!=='design_help'} maxLength={60} value={color} onChange={e=>setColor(e.target.value)} placeholder="e.g. Black"/></label></>}{mode==='advanced' && <><label>Layer height (mm)<input type="number" min="0.04" max="0.4" step="0.01" value={layer} onChange={e=>setLayer(e.target.value)}/></label><label>Infill (%)<input type="number" min="0" max="100" step="1" value={infill} onChange={e=>setInfill(e.target.value)}/></label><label className="quote-wide">Print / layer orientation<input maxLength={200} value={orientation} onChange={e=>setOrientation(e.target.value)} placeholder="e.g. Lay flat on largest face, layers perpendicular to load"/></label></>}</div>{selected && <p className="selected-material">{selected.best_used_for}</p>}{mode==='design_help' ? <DropZone file={file} setFile={setFile} allowed={ADVANCED_EXTENSIONS} title="Reference photo or sketch (optional)" busy={busy} onError={setError}/> : <DropZone file={file} setFile={setFile} allowed={allowed} title={mode==='advanced'?'Your model or CAD file':'Your 3D model'} busy={busy} onError={setError}/>}{mode==='advanced' && <DropZone file={blueprint} setFile={setBlueprint} allowed={ADVANCED_EXTENSIONS} title="Blueprint / callout drawing (optional)" busy={busy} onError={setError}/>}<label>{mode==='design_help'?'Describe what you need':'Comments (optional)'}<textarea required={mode==='design_help'} maxLength={1000} rows={5} value={comment} onChange={e=>setComment(e.target.value)} placeholder={mode==='design_help'?'What is it for? Rough size, links to similar items, how it should work…':'Dimensions, finish, quantity, tolerances, or deadlines…'}/></label><p className="comment-count">{comment.length}/1000</p></fieldset>{error && <p role="alert" className="quote-error">{error}</p>}<div className="quote-submit"><p>Files are kept private; only our workshop team can download them.</p><Button type="submit" disabled={busy}><Send/>{busy?'Sending request…':'Request my quote'}</Button></div></form>}</main></StorefrontShell>;
}
