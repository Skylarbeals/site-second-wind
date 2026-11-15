import { useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertCircle, Check, CirclePlay, ClipboardList, Hourglass, History, Plus, Trash2 } from 'lucide-react';
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
        <div className="item-name">{order.orderName}</div>
        <div className="item-meta">{order.materialName} · {order.grams.toLocaleString()} g · {money(order.materialCost)}</div>
        <div className="item-meta">{meta}</div>
      </div>
      {children && <div className="board-actions">{children}</div>}
    </div>
  );
}

export function OrderBoardPage() {
  const inv = useInventory();
  const [error, setError] = useState('');
  const inProgress = useMemo(() => inv.orders.filter((o) => o.status === 'in_progress').sort(byNewest('startedAt')), [inv.orders]);
  const queued = useMemo(() => inv.orders.filter((o) => o.status === 'queued').sort((a, b) => +new Date(a.date) - +new Date(b.date)), [inv.orders]);
  const past = useMemo(() => inv.orders.filter((o) => o.status === 'completed').sort(byNewest('completedAt')), [inv.orders]);

  const run = (fn: () => void) => { setError(''); try { fn(); } catch (e) { setError(e instanceof Error ? e.message : 'That change could not be saved.'); } };
  const gramsLeft = (order: PrintOrder) => { const item = inv.items.find((i) => i.id === order.materialItemId); return item ? availableGramsOf(item) : 0; };

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
        <div><div className="page-kicker">Print floor</div><h1 className="page-title">Order board</h1><p className="page-desc">What's printing, what's waiting, and what's done. Filament comes off stock when an order starts.</p></div>
        <Link to="/orders" className="btn btn-primary" data-testid="button-new-order"><Plus size={15} /> New order</Link>
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
      <CustomerRequests />
      <div className="board-foot"><ClipboardList size={13} /> {inv.orders.length} orders · saved to your shop</div>
    </div>
  );
}
