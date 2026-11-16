import { useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertCircle, Check, ExternalLink, X, CirclePlay, ClipboardList, Hourglass, History, Plus, Trash2 } from 'lucide-react';
import { availableGramsOf, useInventory, type PrintOrder } from '@/lib/inventory';
import { CustomerRequests } from './customer-requests';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
const shortDate = (s?: string) => (s ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(s)) : '—');
const byNewest = (key: keyof PrintOrder) => (a: PrintOrder, b: PrintOrder) => +new Date(String(b[key] ?? b.date)) - +new Date(String(a[key] ?? a.date));

function Lane({ id, kicker, title, icon, count, empty, children }: { id: string; kicker: string; title: string; icon: ReactNode; count: number; empty: string; children: ReactNode }) {
  return (
    <section className="panel board-lane" aria-labelledby={`${id}-heading`} data-testid={`lane-${id}`}>
      <div className="board-lane-head">
        <div className="board-lane-icon">{icon}</div>
        <div><div className="eyebrow">{kicker}</div><h2 id={`${id}-heading`} className="section-title" style={{ margin: '5px 0 0' }}>{title} <span className="board-count">{count}</span></h2></div>
      </div>
      {count === 0 ? <div className="board-empty">{empty}</div> : children}
    </section>
  );
}

function OrderLine({ order, children, meta }: { order: PrintOrder; children?: ReactNode; meta: string }) {
  return (
    <div className="board-row" data-testid={`board-order-${order.id}`}>
      <div style={{ minWidth: 0 }}>
        <div className="item-name">{order.orderName}{order.source && <span className="badge" style={{ marginLeft: 8 }}>{order.source}</span>}</div>
        {(order.payout !== undefined || order.shipBy) && <div className="item-meta">{order.payout !== undefined && `Payout ${money(order.payout)}`}{order.payout !== undefined && order.shipBy && ' · '}{order.shipBy && `Ship by ${new Date(order.shipBy + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</div>}
        <div className="item-meta">{order.materialName} · {order.grams.toLocaleString()} g · {money(order.materialCost)}</div>
        {order.printTimeSeconds !== undefined && order.printerRunningCost !== undefined && <div className="item-meta">Print estimate {Math.floor(order.printTimeSeconds / 3600)}h {Math.floor(order.printTimeSeconds % 3600 / 60)}m · Printer running {money(order.printerRunningCost)} · Printer + filament {money(order.printerRunningCost + order.materialCost)}</div>}
        <div className="item-meta">{meta}</div>
      </div>
      {children && <div className="board-actions">{children}</div>}
    </div>
  );
}

export function OrderBoardPage() {
  const inv = useInventory();
  const [error, setError] = useState('');
  const [external, setExternal] = useState(false);
  const inProgress = useMemo(() => inv.orders.filter((o) => o.status === 'in_progress').sort(byNewest('startedAt')), [inv.orders]);
  const queued = useMemo(() => inv.orders.filter((o) => o.status === 'queued').sort((a, b) => +new Date(a.date) - +new Date(b.date)), [inv.orders]);
  const past = useMemo(() => inv.orders.filter((o) => o.status === 'completed').sort(byNewest('completedAt')), [inv.orders]);

  const run = (fn: () => void) => { setError(''); try { fn(); } catch (e) { setError(e instanceof Error ? e.message : 'That change could not be saved.'); } };
  const gramsLeft = (order: PrintOrder) => { const item = inv.items.find((i) => i.id === order.materialItemId); return item ? availableGramsOf(item) : 0; };

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
        <div><div className="page-kicker">Print floor</div><h1 className="page-title">Order board</h1><p className="page-desc">What's printing, what's waiting, and what's done. Filament comes off stock when an order starts.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setExternal(true)} data-testid="button-external-job"><ExternalLink size={15} /> Add external job</button>
          <Link to="/orders" className="btn btn-primary" data-testid="button-new-order"><Plus size={15} /> New order</Link>
        </div>
      </div>
      {error && <div role="alert" className="badge badge-low board-alert" data-testid="error-board"><AlertCircle size={13} /> {error}</div>}
      <div className="board-grid">
        <Lane id="in-progress" kicker="On the printer" title="In progress" icon={<CirclePlay size={17} />} count={inProgress.length} empty="Nothing is printing right now.">
          {inProgress.map((o) => (
            <OrderLine key={o.id} order={o} meta={`Started ${shortDate(o.startedAt)}`}>
              <button className="btn btn-primary" onClick={() => run(() => inv.completeOrder(o.id))} data-testid={`button-complete-${o.id}`}><Check size={14} /> Mark complete</button>
            </OrderLine>
          ))}
        </Lane>
        <Lane id="not-started" kicker="In, not started" title="Not started" icon={<Hourglass size={17} />} count={queued.length} empty="No orders waiting to start.">
          {queued.map((o) => {
            const left = gramsLeft(o);
            const short = o.grams > left;
            return (
              <OrderLine key={o.id} order={o} meta={short ? `Needs ${o.grams} g · only ${left} g in stock` : `Added ${shortDate(o.date)}`}>
                <button className="btn btn-amber" onClick={() => run(() => inv.startOrder(o.id))} data-testid={`button-start-${o.id}`}><CirclePlay size={14} /> Start</button>
                <button className="icon-btn" aria-label={`Remove ${o.orderName}`} title="Remove order" onClick={() => { if (window.confirm(`Remove ${o.orderName}?`)) run(() => inv.removeOrder(o.id)); }} data-testid={`button-remove-${o.id}`}><Trash2 size={14} /></button>
              </OrderLine>
            );
          })}
        </Lane>
        <Lane id="past" kicker="Finished" title="Past orders" icon={<History size={17} />} count={past.length} empty="Completed orders will show here.">
          {past.map((o) => <OrderLine key={o.id} order={o} meta={`Completed ${shortDate(o.completedAt ?? o.date)}`} />)}
        </Lane>
      </div>
      {external && <ExternalJobModal onClose={() => setExternal(false)} />}
      <CustomerRequests />
      <div className="board-foot"><ClipboardList size={13} /> {inv.orders.length} orders · saved to your shop</div>
    </div>
  );
}

const SOURCES = ['Hotend Labs', 'Craftcloud', 'Etsy', 'Other'];

function ExternalJobModal({ onClose }: { onClose: () => void }) {
  const inv = useInventory();
  const filament = inv.items.filter((i) => i.kind === 'material' && i.unit.trim().toLowerCase() === 'kg');
  const [source, setSource] = useState(SOURCES[0]!);
  const [other, setOther] = useState('');
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [payout, setPayout] = useState('');
  const [shipBy, setShipBy] = useState('');
  const [materialItemId, setMaterial] = useState(filament[0]?.id ?? '');
  const [err, setErr] = useState('');
  const save = (status: 'queued' | 'in_progress') => {
    setErr('');
    try {
      inv.addOrder({ orderName: name, grams: Number(grams), materialItemId, status, source: source === 'Other' ? other || 'External' : source, ...(payout ? { payout: Number(payout) } : {}), ...(shipBy ? { shipBy } : {}) });
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save this job.'); }
  };
  const field = (label: string, input: ReactNode) => <label className="field" style={{ display: 'block', marginBottom: 12 }}><span className="field-label">{label}</span>{input}</label>;
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="external-title">
        <div className="modal-head"><div><div className="eyebrow">Third-party site</div><h2 id="external-title" className="section-title" style={{ margin: '5px 0 0' }}>Add external job</h2></div><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        <form className="modal-body" onSubmit={(e) => { e.preventDefault(); save('queued'); }}>
          {field('Source', <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>)}
          {source === 'Other' && field('Site name', <input className="input" maxLength={60} value={other} onChange={(e) => setOther(e.target.value)} placeholder="e.g. Slant 3D" />)}
          {field('Part / file name', <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. bracket_v4.3mf" />)}
          {field('Filament from inventory', <select className="input" required value={materialItemId} onChange={(e) => setMaterial(e.target.value)}><option value="">Choose filament</option>{filament.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.quantity} kg</option>)}</select>)}
          {field('Estimated filament (grams)', <input className="input" required type="number" min="1" step="1" value={grams} onChange={(e) => setGrams(e.target.value)} />)}
          {field('Payout (USD, optional)', <input className="input" type="number" min="0" step="0.01" value={payout} onChange={(e) => setPayout(e.target.value)} />)}
          {field('Ship-by date (optional)', <input className="input" type="date" value={shipBy} onChange={(e) => setShipBy(e.target.value)} />)}
          {!filament.length && <p className="page-desc">Add a filament spool to Inventory first.</p>}
          {err && <div role="alert" className="badge badge-low"><AlertCircle size={13} /> {err}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-amber" disabled={!filament.length} onClick={() => save('in_progress')}><CirclePlay size={14} /> Add & start now</button>
            <button type="submit" className="btn btn-primary" disabled={!filament.length}><Plus size={14} /> Add to queue</button>
          </div>
        </form>
      </section>
    </div>
  );
}
