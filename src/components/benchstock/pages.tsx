import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { KanbanSquare, CirclePlay, Activity, AlertTriangle, Archive, ArrowDownToLine, ArrowLeftRight, ArrowUpRight, Box, Check, ChevronRight, CirclePlus, ClipboardList, Download, FileUp, Filter, Gauge, Layers3, Package, Plus, Printer, Search, Settings2, Shapes, Trash2, X } from 'lucide-react';
import { useInventory, type InventoryItem, type Kind, type RollWeightKg, type StockChange } from '@/lib/inventory';

const navItems = [
  { href:'/', label:'Overview', icon:Gauge },
  { href:'/inventory', label:'Inventory', icon:Package },
  { href:'/orders', label:'Orders', icon:ClipboardList },
  { href:'/order-board', label:'Order board', icon:KanbanSquare },
  { href:'/settings', label:'Settings', icon:Settings2 },
] as const;
const money = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const dateTime = (s:string) => new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(s));
const dateShort = (s:string) => new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(s));
const rollSizes:RollWeightKg[]=[0.5,1,2,3];
const stockValue=(i:InventoryItem)=>i.kind==='material'&&i.unit.trim().toLowerCase()==='kg'?(i.quantity/(i.rollWeightKg??1))*i.unitCost:i.quantity*i.unitCost;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation({ select: (l) => l.pathname });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return <div className="app-shell">
    <aside className="side-rail" aria-label="Primary navigation">
      <Link to="/" className="brand-mark" data-testid="link-brand">
        <div className="brand-icon"><Printer size={21}/></div>
        <div className="brand-copy"><div className="brand-name">Benchstock</div><div className="brand-sub">Print shop inventory</div></div>
      </Link>
      <div className="nav-label">WORKSPACE</div>
      {navItems.map(({href,label,icon:Icon})=><Link key={href} to={href} className={`nav-link ${location===href?'active':''}`} aria-current={location===href?'page':undefined} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={17}/><span>{label}</span></Link>)}
      <div className="rail-foot"><span className="local-dot"/>Saved on this device<br/>No account required</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb">Workshop / {(navItems.find(n=>n.href===location)?.label??(location==='/activity'?'Activity':'Page'))}</div><div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#78837d'}}><span className="local-dot"/> Local mode</div></header>
      {hydrated ? children : null}
    </main>
    <nav className="mobile-nav" aria-label="Primary navigation">{navItems.map(({href,label,icon:Icon})=><Link key={href} to={href} className={`nav-link ${location===href?'active':''}`} data-testid={`mobile-nav-${label.toLowerCase()}`}><Icon size={17}/><span>{label}</span></Link>)}</nav>
  </div>;
}


function Header({ kicker, title, description, action }: { kicker:string;title:string;description:string;action?:ReactNode }) {
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:18,marginBottom:27,flexWrap:'wrap'}}>
    <div><div className="page-kicker">{kicker}</div><h1 className="page-title">{title}</h1><p className="page-desc">{description}</p></div>{action}
  </div>;
}
function Metric({ label, value, note, icon:Icon, accent }: {label:string;value:string|number;note:string;icon:typeof Package;accent?:boolean}) {
  return <div className="stat-panel" data-testid={`metric-${label.toLowerCase().replaceAll(' ','-')}`}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span className="eyebrow">{label}</span><Icon size={17} color={accent?'#bb7335':'#87918b'}/></div><div className="stat-value" style={accent?{color:'#b56732'}:{}}>{value}</div><div className="stat-note">{note}</div></div>;
}
export function Overview() {
  const inv=useInventory();
  const low=useMemo(()=>inv.items.filter(i=>i.quantity<=i.threshold).sort((a,b)=>(a.quantity/a.threshold)-(b.quantity/b.threshold)),[inv.items]);
  const healthyItems=inv.items.filter(i=>i.quantity>i.threshold).length;
  const current=inv.orders.filter(o=>o.status==='in_progress').sort((a,b)=>+new Date(b.startedAt??b.date)-+new Date(a.startedAt??a.date));
  const waiting=inv.orders.filter(o=>o.status==='queued').length;
  return <div className="page-wrap">
    <Header kicker={`${new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date())} · Shop floor`} title="Good work starts in stock." description="A clear read on what’s here, what’s running low, and what moved." action={<Link to="/inventory" className="btn btn-primary" data-testid="button-open-inventory"><Plus size={15}/> Manage inventory</Link>}/>
    <section className="hero-band" style={{marginBottom:18}} data-testid="panel-shop-status">
      <div style={{position:'relative',zIndex:1,display:'flex',justifyContent:'space-between',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <div><div className="eyebrow" style={{color:'#eab15c'}}>SHOP FLOOR SNAPSHOT</div><div className="hero-title">{low.length?`${low.length} ${low.length===1?'item needs':'items need'} a restock.`:'Everything is above its reorder point.'}</div><div className="hero-copy">Your workshop inventory, without the paperwork. Changes stay right here on this device.</div></div>
        <Link to={low.length?'/inventory':'/activity'} className="btn btn-amber" data-testid="button-review-stock">{low.length?'Review low stock':'View recent activity'} <ArrowUpRight size={15}/></Link>
      </div>
    </section>
    <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:24}}>
      <Metric label="Tracked items" value={inv.items.length} note="Distinct stock lines" icon={Layers3}/>
      <Metric label="Healthy items" value={healthyItems} note="Above reorder point" icon={Box}/>
      <Metric label="Reorder soon" value={low.length} note="At or below threshold" icon={AlertTriangle} accent={low.length>0}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.2fr) minmax(280px,.8fr)',gap:16}}>
      <section className="panel" aria-labelledby="low-stock-heading">
        <div style={{padding:'19px 20px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h2 id="low-stock-heading" className="section-title" style={{margin:'7px 0 0'}}>Reorder watch</h2></div><Link to="/inventory" className="btn btn-quiet" data-testid="link-view-inventory">All inventory <ChevronRight size={15}/></Link></div>
        {low.length===0?<div className="empty-state"><div className="empty-icon"><Check size={20}/></div><div className="item-name">Stock levels look good</div><p className="page-desc">Nothing has reached its reorder point.</p></div>:<div className="table-wrap"><table className="data-table" style={{minWidth:0}}><thead><tr><th>Item</th><th>On hand</th><th>Threshold</th><th>Status</th></tr></thead><tbody>{low.slice(0,6).map(i=><tr key={i.id} data-testid={`row-low-stock-${i.id}`}><td><div className="item-name">{i.name}</div><div className="item-meta">{i.sku}</div></td><td><strong>{i.quantity} {i.unit}</strong></td><td>{i.threshold} {i.unit}</td><td><span className="badge badge-low"><AlertTriangle size={11}/> Reorder</span></td></tr>)}</tbody></table></div>}
      </section>
      <section className="panel" aria-labelledby="recent-heading">
        <div style={{padding:'19px 20px 8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div className="eyebrow">ON THE PRINTER</div><h2 id="recent-heading" className="section-title" style={{margin:'7px 0 0'}}>Current orders</h2></div><Link to="/order-board" className="btn btn-quiet" aria-label="Open order board" data-testid="link-order-board-overview"><ChevronRight size={16}/></Link></div>
        {current.length===0?<div className="empty-state"><div className="empty-icon"><CirclePlay size={20}/></div><div className="item-name">No orders in progress</div><p className="page-desc">{waiting?`${waiting} not started on the Order board.`:'Start an order on the Orders page.'}</p></div>:current.slice(0,6).map(o=><div className="current-order-row" key={o.id} data-testid={`current-order-${o.id}`}><div className="current-order-icon"><Printer size={14}/></div><div style={{minWidth:0,flex:1}}><div className="item-name" style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.orderName}</div><div className="item-meta">{o.materialName} · {o.grams.toLocaleString()} g{o.startedAt?` · started ${dateTime(o.startedAt)}`:''}</div></div><div className="activity-amount" style={{fontSize:11,color:'#ff9a4d'}}>{money(o.materialCost)}</div></div>)}
      </section>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:19,color:'#8a8e94',font:'10px ui-monospace,monospace'}}><span>{inv.orders.filter(o=>o.status==='in_progress').length} IN PROGRESS · {inv.orders.filter(o=>o.status==='queued').length} NOT STARTED</span><span>{inv.items.filter(i=>i.kind==='material').length} materials / {inv.items.filter(i=>i.kind==='tool').length} tools / {inv.items.filter(i=>i.kind==='consumable').length} consumables</span></div>
  </div>;
}

type ModalMode = {type:'item';item?:InventoryItem}|{type:'adjust';item:InventoryItem}|null;
export function InventoryPage() {
  const inv=useInventory();
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState('all');
  const [stockFilter,setStockFilter]=useState('all');
  const [modal,setModal]=useState<ModalMode>(null);
  const inventoryTabs=[{value:'all',label:'All items'},{value:'material',label:'Materials'},{value:'tool',label:'Tools'},{value:'consumable',label:'Consumables'}];
  const visible=useMemo(()=>inv.items.filter(i=>{
    const text=`${i.name} ${i.sku} ${i.material} ${i.color} ${i.location} ${i.supplier}`.toLowerCase();
    return (!query||text.includes(query.toLowerCase()))&&(kind==='all'||i.kind===kind)&&(stockFilter==='all'||(stockFilter==='low'?i.quantity<=i.threshold:i.quantity>i.threshold));
  }).sort((a,b)=>a.name.localeCompare(b.name)),[inv.items,query,kind,stockFilter]);
  const remove=(item:InventoryItem)=>{if(window.confirm(`Delete ${item.name}? This cannot be undone.`))inv.deleteItem(item.id);};
  return <div className="page-wrap">
    <Header kicker="Stock ledger" title="Inventory" description="Every spool, spare and ready-to-ship print in one practical list." action={<button className="btn btn-primary" onClick={()=>setModal({type:'item'})} data-testid="button-add-item"><CirclePlus size={15}/> Add item</button>}/>
    <div className="inventory-tabs" role="group" aria-label="Inventory categories" data-testid="filter-inventory-kind">
      {inventoryTabs.map(tab=><button key={tab.value} type="button" className={`inventory-tab ${kind===tab.value?'active':''}`} aria-pressed={kind===tab.value} onClick={()=>setKind(tab.value)} data-testid={`tab-inventory-${tab.value.replaceAll(' ','-')}`}>{tab.label}<span className="inventory-tab-count">{tab.value==='all'?inv.items.length:inv.items.filter(item=>item.kind===tab.value).length}</span></button>)}
    </div>
    <div style={{display:'flex',gap:9,flexWrap:'wrap',alignItems:'center',marginBottom:14}}>
      <div className="searchbox"><Search size={15}/><input className="input" aria-label="Search inventory" placeholder="Search name, SKU, location…" value={query} onChange={e=>setQuery(e.target.value)} data-testid="input-inventory-search"/></div>
      <select className="select" aria-label="Filter by stock level" value={stockFilter} onChange={e=>setStockFilter(e.target.value)} style={{width:'auto',minWidth:145}} data-testid="filter-stock-level"><option value="all">Any stock level</option><option value="low">Needs reorder</option><option value="healthy">Above threshold</option></select>
      <span style={{font:'10px ui-monospace,monospace',color:'#8a8e94',marginLeft:'auto'}} data-testid="text-inventory-count">{visible.length} OF {inv.items.length} ITEMS</span>
    </div>
    <section className="panel">
      {visible.length===0?<div className="empty-state"><div className="empty-icon"><Filter size={20}/></div><div className="item-name">{inv.items.length?'No matches in this view':'Your inventory is ready for its first item'}</div><p className="page-desc">{inv.items.length?'Try another search or clear a filter.':'Add a spool, tool or consumable to get started.'}</p>{!inv.items.length&&<button className="btn btn-primary" style={{marginTop:15}} onClick={()=>setModal({type:'item'})} data-testid="button-empty-add"><Plus size={15}/> Add first item</button>}</div>:
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Stock item</th><th>Type</th><th>On hand</th><th>Cost</th><th>Stock value</th><th>Location</th><th>Stock state</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(item=><tr key={item.id} data-testid={`row-inventory-${item.id}`}><td><div className="item-name">{item.name}</div><div className="item-meta">{item.sku} · {item.material}{item.color?` · ${item.color}`:''}</div></td><td><span className="badge">{item.kind}</span></td><td><strong style={{fontFamily:'ui-monospace,monospace'}}>{item.quantity} {item.unit}</strong><div className="item-meta">Reorder at {item.threshold}</div></td><td><strong>{money(item.unitCost)}</strong><div className="item-meta">{item.kind==='material'&&item.unit.trim().toLowerCase()==='kg'?`Per ${item.rollWeightKg??1} kg roll`:`Per item`}</div></td><td><strong>{money(stockValue(item))}</strong></td><td>{item.location||'—'}</td><td><span className={`badge ${item.quantity<=item.threshold?'badge-low':'badge-ok'}`}>{item.quantity<=item.threshold?'Reorder':'In stock'}</span></td><td><div style={{display:'flex',gap:5,justifyContent:'flex-end'}}><button className="icon-btn" title={`Adjust stock for ${item.name}`} aria-label={`Adjust stock for ${item.name}`} onClick={()=>setModal({type:'adjust',item})} data-testid={`button-adjust-${item.id}`}><ArrowLeftRight size={14}/></button><button className="icon-btn" title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} onClick={()=>setModal({type:'item',item})} data-testid={`button-edit-${item.id}`}><Settings2 size={14}/></button><button className="icon-btn" title={`Delete ${item.name}`} aria-label={`Delete ${item.name}`} onClick={()=>remove(item)} data-testid={`button-delete-${item.id}`}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div>}
    </section>
    <div style={{marginTop:12,font:'10px ui-monospace,monospace',color:'#8a8e94'}}>ALL CHANGES ARE SAVED IN THIS BROWSER</div>
    {modal?.type==='item'&&<ItemModal item={modal.item} onClose={()=>setModal(null)} onSave={data=>{modal.item?inv.editItem({...data,id:modal.item.id,updatedAt:new Date().toISOString()}):inv.addItem(data);setModal(null)}}/>}
    {modal?.type==='adjust'&&<AdjustModal item={modal.item} onClose={()=>setModal(null)} onSave={(amount,note)=>{inv.adjustStock(modal.item,amount,note);setModal(null)}}/>}
  </div>;
}

type ItemDraft=Omit<InventoryItem,'id'|'updatedAt'>;
const blankDraft:ItemDraft={name:'',sku:'',kind:'material',material:'',color:'',quantity:0,unit:'kg',threshold:0,unitCost:0,rollWeightKg:1,location:'',supplier:''};
function ItemModal({item,onClose,onSave}:{item?:InventoryItem|undefined;onClose:()=>void;onSave:(data:ItemDraft)=>void}) {
  const [form,setForm]=useState<ItemDraft>(item?{...item}:blankDraft);
  const [error,setError]=useState('');
  const isFilament=form.kind==='material'&&form.unit.trim().toLowerCase()==='kg';
  const field=(key:keyof ItemDraft,label:string,type='text',placeholder='')=><label className="field"><span className="field-label">{label}</span><input className="input" type={type} step={type==='number'?'any':undefined} min={type==='number'?'0':undefined} value={String(form[key]??'')} placeholder={placeholder} onChange={e=>setForm({...form,[key]:type==='number'?Number(e.target.value):e.target.value})} data-testid={`input-item-${key}`}/></label>;
  const submit=(e:FormEvent)=>{e.preventDefault();if(!form.name.trim()||!form.sku.trim()){setError('Item name and SKU are required.');return;}onSave({...form,name:form.name.trim(),sku:form.sku.trim(),quantity:Math.max(0,Number(form.quantity)||0),threshold:Math.max(0,Number(form.threshold)||0),unitCost:Math.max(0,Number(form.unitCost)||0),rollWeightKg:isFilament?(form.rollWeightKg??1):undefined});};
  const chooseRollSize=(weight:RollWeightKg)=>setForm(current=>({...current,rollWeightKg:weight,...(item?{}:{quantity:weight})}));
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="item-modal-title" data-testid="dialog-item-form"><div className="modal-head"><div><div className="eyebrow">{item?'REVISE STOCK RECORD':'NEW STOCK RECORD'}</div><h2 className="section-title" id="item-modal-title" style={{fontSize:21,margin:'7px 0 0'}}>{item?'Edit item':'Add inventory item'}</h2></div><button className="icon-btn" aria-label="Close form" onClick={onClose} data-testid="button-close-item-form"><X size={16}/></button></div><form className="modal-body" onSubmit={submit}><div className="form-grid">
    {field('name','Item name','text','e.g. PLA — Matte black')}{field('sku','SKU','text','FIL-PLA-BLK')}
     <label className="field"><span className="field-label">Kind</span><select className="select" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as Kind})} data-testid="select-item-kind"><option value="material">Material</option><option value="tool">Tool</option><option value="consumable">Consumable</option></select></label>
    {field('material','Material / base','text','PLA, PETG, steel…')}{field('color','Color / finish','text','Matte black')}
     {isFilament&&<div className="field span-2"><span className="field-label">Spool size</span><div className="weight-options" role="group" aria-label="Filament spool size">{rollSizes.map(weight=><button type="button" key={weight} className={`weight-option ${(form.rollWeightKg??1)===weight?'active':''}`} aria-pressed={(form.rollWeightKg??1)===weight} onClick={()=>chooseRollSize(weight)} data-testid={`button-spool-size-${String(weight).replace('.','-')}`}>{weight} kg</button>)}</div><div className="item-meta">Select the full roll size; enter remaining stock below.</div></div>}
     {field('quantity',isFilament?'Quantity on hand (kg)':'Quantity on hand','number')}{field('unit','Unit','text','kg, L, pcs')}
     {field('threshold','Reorder threshold','number')}{field('unitCost',isFilament?'Cost per roll (USD)':'Cost per item (USD)','number')}
    {field('location','Storage location','text','Rack A · 01')}{field('supplier','Supplier','text','Supplier or in-house')}
    </div>{error&&<div role="alert" style={{color:'#ff6b5a',fontSize:12,marginTop:12}}>{error}</div>}<div className="modal-actions"><button type="button" className="btn" onClick={onClose} data-testid="button-cancel-item">Cancel</button><button className="btn btn-primary" type="submit" data-testid="button-save-item"><Check size={14}/>{item?'Save changes':'Add item'}</button></div></form></section></div>;
}
function AdjustModal({item,onClose,onSave}:{item:InventoryItem;onClose:()=>void;onSave:(amount:number,note:string)=>void}) {
  const [amount,setAmount]=useState('');const [note,setNote]=useState('');const [error,setError]=useState('');
  const submit=(e:FormEvent)=>{e.preventDefault();const delta=Number(amount);if(!Number.isFinite(delta)||delta===0){setError('Enter a non-zero stock change.');return;}if(item.quantity+delta<0){setError('This adjustment would take stock below zero.');return;}onSave(delta,note.trim()||'Manual stock adjustment');};
   return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="adjust-title"><div className="modal-head"><div><div className="eyebrow">QUICK STOCK MOVEMENT</div><h2 className="section-title" id="adjust-title" style={{fontSize:21,margin:'7px 0 0'}}>Adjust quantity</h2></div><button className="icon-btn" aria-label="Close adjustment" onClick={onClose} data-testid="button-close-adjust"><X size={16}/></button></div><form className="modal-body" onSubmit={submit}><div style={{background:'#292b30',padding:14,borderRadius:8,marginBottom:17}}><div className="item-name">{item.name}</div><div className="item-meta">Current on hand: {item.quantity} {item.unit}</div></div><div className="form-grid"><label className="field"><span className="field-label">Change amount ({item.unit}; use − to remove)</span><input className="input" type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="+2 or −0.5" autoFocus data-testid="input-adjust-amount"/></label><label className="field"><span className="field-label">Note for activity history</span><input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Received delivery, used for print…" data-testid="input-adjust-note"/></label></div>{error&&<div role="alert" style={{color:'#ff9b8e',fontSize:12,marginTop:12}}>{error}</div>}<div className="modal-actions"><button type="button" className="btn" onClick={onClose} data-testid="button-cancel-adjust">Cancel</button><button className="btn btn-primary" type="submit" data-testid="button-save-adjust"><ArrowLeftRight size={14}/> Record movement</button></div></form></section></div>;
}

export function ActivityPage() {
  const inv=useInventory();const [query,setQuery]=useState('');
  const rows=useMemo(()=>inv.history.slice().sort((a,b)=>+new Date(b.date)-+new Date(a.date)).filter(x=>`${x.itemName} ${x.note}`.toLowerCase().includes(query.toLowerCase())),[inv.history,query]);
  const groups=useMemo(()=>rows.reduce<Record<string,StockChange[]>>((acc,x)=>{const d=dateShort(x.date);(acc[d]??=[]).push(x);return acc;},{}),[rows]);
   return <div className="page-wrap"><Header kicker="Change log" title="Activity" description="A dated record of every stock movement made in this browser." action={<div className="badge"><span className="local-dot"/> Local history</div>}/>
    <div style={{display:'flex',gap:9,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}><div className="searchbox"><Search size={15}/><input className="input" aria-label="Search activity" placeholder="Find an item or note…" value={query} onChange={e=>setQuery(e.target.value)} data-testid="input-activity-search"/></div><span style={{font:'10px ui-monospace,monospace',color:'#8a8e94',marginLeft:'auto'}} data-testid="text-activity-count">{rows.length} CHANGES</span></div>
     {rows.length===0?<section className="panel empty-state"><div className="empty-icon"><Activity size={20}/></div><div className="item-name">{inv.history.length?'No matching changes':'No stock changes recorded'}</div><p className="page-desc">{inv.history.length?'Try a different item or note.':'Stock adjustments, new item balances and receipts will show here.'}</p></section>:Object.entries(groups).map(([day,entries])=><section key={day} style={{marginBottom:19}}><div className="eyebrow" style={{padding:'0 0 8px 4px'}}>{day}</div><div className="panel">{entries.map(entry=><div className="activity-row" key={entry.id} data-testid={`row-activity-${entry.id}`}><div className="activity-date">{dateTime(entry.date)}</div><div><div className="item-name">{entry.itemName}</div><div className="item-meta">{entry.note||'Stock changed'} · resulting balance {entry.resultingQuantity}</div></div><div className="activity-amount" style={{color:entry.change>=0?'#ff9c4a':'#a8abb2'}}>{entry.change>0?'+':''}{entry.change}</div></div>)}</div></section>)}
  </div>;
}

export function SettingsPage() {
  const inv=useInventory();const fileRef=useRef<HTMLInputElement>(null);const [message,setMessage]=useState('');const [error,setError]=useState('');
  const download=(name:string,content:string,type:string)=>{const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);};
  const exportJson=()=>{download(`benchstock-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({items:inv.items,history:inv.history,orders:inv.orders},null,2),'application/json');setMessage('Backup downloaded. Keep it somewhere safe.');setError('');};
  const csvCell=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
  const exportCsv=()=>{const headers=['id','name','sku','kind','material','color','quantity','unit','threshold','unitCost','rollWeightKg','location','supplier','updatedAt'];const content=[headers.join(','),...inv.items.map(item=>headers.map(key=>csvCell(item[key as keyof InventoryItem])).join(','))].join('\n');download(`benchstock-inventory-${new Date().toISOString().slice(0,10)}.csv`,content,'text/csv;charset=utf-8');setMessage('Inventory CSV downloaded.');setError('');};
   const importFile=async(file?:File)=>{if(!file)return;if(!window.confirm('Restore this backup? It will replace the inventory and activity history currently saved in this browser.')){if(fileRef.current)fileRef.current.value='';return;}try{inv.importStore(JSON.parse(await file.text()));setMessage('Backup restored successfully.');setError('');}catch(e){setError(e instanceof Error?e.message:'Could not read that backup file.');setMessage('');}if(fileRef.current)fileRef.current.value='';};
  return <div className="page-wrap"><Header kicker="Local preferences" title="Settings" description="Your records belong to this browser. Take a backup whenever you need one."/>
    <div style={{maxWidth:840,display:'grid',gap:15}}>
       <section className="panel" style={{padding:22}}><div style={{display:'flex',gap:15,alignItems:'flex-start'}}><div className="empty-icon" style={{margin:0,flex:'0 0 auto'}}><Archive size={20}/></div><div style={{flex:1}}><div className="eyebrow">YOUR DATA</div><h2 className="section-title" style={{margin:'7px 0'}}>Stored locally, by design.</h2><p className="page-desc" style={{lineHeight:1.8,maxWidth:600}}>Benchstock saves inventory, orders and stock movement to this browser’s local storage. No account, server or sync. Clearing browser data will remove it, so download a backup before switching devices.</p><div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:17}}><button className="btn btn-primary" onClick={exportJson} data-testid="button-export-json"><Download size={15}/> Export full backup</button><button className="btn" onClick={()=>fileRef.current?.click()} data-testid="button-import-json"><FileUp size={15}/> Restore backup</button><input ref={fileRef} type="file" accept="application/json,.json" aria-label="Choose Benchstock JSON backup" style={{display:'none'}} onChange={e=>void importFile(e.target.files?.[0])} data-testid="input-import-file"/></div></div></div></section>
       <section className="panel" style={{padding:22}}><div className="eyebrow">SPREADSHEET FRIENDLY</div><h2 className="section-title" style={{margin:'7px 0'}}>Export inventory as CSV</h2><p className="page-desc" style={{lineHeight:1.7}}>A flat snapshot of your current stock records. Activity history and orders are included in the full JSON backup.</p><button className="btn" style={{marginTop:15}} onClick={exportCsv} data-testid="button-export-csv"><Download size={15}/> Download inventory CSV</button></section>
       <section style={{padding:'13px 2px',display:'flex',justifyContent:'space-between',borderTop:'1px solid #35373c',color:'#a3a5ab',fontSize:11}}><span><span className="local-dot"/>This browser only</span><span>{inv.items.length} items · {inv.orders.length} orders · {inv.history.length} stock changes</span></section>
      {message&&<div role="status" className="badge badge-ok" style={{width:'fit-content',padding:'9px 12px'}} data-testid="status-settings">{message}</div>}
      {error&&<div role="alert" className="badge badge-low" style={{width:'fit-content',padding:'9px 12px'}} data-testid="error-settings">{error}</div>}
    </div>
  </div>;
}
