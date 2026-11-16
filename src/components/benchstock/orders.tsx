import { useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowDownRight, Check, CircleDollarSign, ClipboardList, Package, Plus, Printer, Scale } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { availableGramsOf, filamentLabel, calcMaterialCost, useInventory, type OrderStatus } from '@/lib/inventory';

export const statusLabel: Record<OrderStatus, string> = { queued: 'Not started', in_progress: 'In progress', completed: 'Completed' };

const money = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);

const orderDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export default function OrdersPage() {
  const inventory = useInventory();
  const availableMaterials = useMemo(
    () => inventory.items
      .filter((item) => item.kind === 'material' && item.unit.trim().toLowerCase() === 'kg')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
    [inventory.items],
  );
  const [orderName, setOrderName] = useState('');
  const [grams, setGrams] = useState('');
  const [materialItemId, setMaterialItemId] = useState('');
  const [startNow, setStartNow] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedMaterial = availableMaterials.find((item) => item.id === materialItemId);
  const parsedGrams = Number(grams);
  const enteredValidGrams = grams.trim() !== '' && Number.isInteger(parsedGrams) && parsedGrams > 0;
  const availableGrams = selectedMaterial ? availableGramsOf(selectedMaterial) : 0;
  const isInsufficient = Boolean(startNow && selectedMaterial && enteredValidGrams && parsedGrams > availableGrams);
  const estimatedCost = selectedMaterial && enteredValidGrams
    ? calcMaterialCost(parsedGrams, selectedMaterial.unitCost, selectedMaterial.rollWeightKg)
    : null;

  const sortedOrders = useMemo(
    () => inventory.orders.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [inventory.orders],
  );
  const startedOrders = sortedOrders.filter((order) => order.status !== 'queued');
  const totalGrams = startedOrders.reduce((sum, order) => sum + order.grams, 0);
  const totalCost = startedOrders.reduce((sum, order) => sum + order.materialCost, 0);

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!orderName.trim()) {
      setError('Add an order name so this print is easy to find later.');
      return;
    }
    if (!grams.trim() || !Number.isFinite(parsedGrams) || parsedGrams <= 0) {
      setError('Enter a whole number of grams greater than zero.');
      return;
    }
    if (!selectedMaterial) {
      setError(availableMaterials.length ? 'Choose a filament item.' : 'Add a filament item to inventory first.');
      return;
    }
    if (startNow && parsedGrams > availableGrams) {
      setError(`Only ${availableGrams} g is available in ${selectedMaterial.name}.`);
      return;
    }

    try {
      const savedOrder = inventory.addOrder({
        orderName: orderName.trim(),
        grams: parsedGrams,
        materialItemId: selectedMaterial.id,
        status: startNow ? 'in_progress' : 'queued',
      });
      setSuccess(startNow
        ? `${savedOrder.orderName} is in progress. ${savedOrder.grams} g deducted from stock.`
        : `${savedOrder.orderName} added as not started. Stock will be deducted when you start it.`);
      setOrderName('');
      setGrams('');
      setMaterialItemId('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The order could not be saved. Check stock and try again.');
    }
  };

  return (
    <div className="page-wrap orders-page">
      <header className="orders-heading">
        <div>
          <div className="orders-kicker"><span className="orders-kicker-mark" /> WORKSHOP LEDGER / PRINT ORDERS</div>
          <h1 className="page-title">Orders</h1>
          <p className="page-desc">Log a print. Start it now, or keep it in line until you're ready.</p>
        </div>
        <div className="orders-local-note"><span className="local-dot" />Saved on this device</div>
      </header>

      <section className="orders-summary" aria-label="Order totals">
        <div className="orders-summary-item">
          <span className="orders-summary-label">Recorded prints</span>
          <strong>{sortedOrders.length}</strong>
          <span className="orders-summary-foot">Orders in this ledger</span>
        </div>
        <div className="orders-summary-item">
          <span className="orders-summary-label">Material used</span>
          <strong>{totalGrams.toLocaleString()}<small> g</small></strong>
          <span className="orders-summary-foot">Orders started or finished</span>
        </div>
        <div className="orders-summary-item orders-summary-cost">
          <span className="orders-summary-label">Recorded material cost</span>
          <strong>{money(totalCost)}</strong>
          <span className="orders-summary-foot">Based on inventory roll cost</span>
        </div>
      </section>

      <div className="orders-layout">
        <section className="orders-form-panel" aria-labelledby="new-order-heading">
          <div className="orders-form-top">
            <div className="orders-icon-chip"><Printer size={18} /></div>
            <div>
              <div className="orders-eyebrow">NEW ENTRY</div>
              <h2 id="new-order-heading">Record a print</h2>
            </div>
          </div>
          <p className="orders-form-intro">Select the exact filament record used. Filament is deducted from stock when the order goes into progress.</p>

          {!availableMaterials.length && (
            <div className="orders-notice orders-notice-warning" role="status" data-testid="status-no-filament">
              <AlertCircle size={17} />
              <div><strong>No filament available</strong><span>Add a filament item (a material measured in kg) on the Inventory page before recording an order.</span></div>
            </div>
          )}

          <form onSubmit={submitOrder} noValidate>
            <label className="field orders-field">
              <span className="field-label">Order name</span>
              <input
                className="input"
                value={orderName}
                onChange={(event) => { setOrderName(event.target.value); setError(''); setSuccess(''); }}
                placeholder="e.g. Desk cable clips"
                autoComplete="off"
                data-testid="input-order-name"
                aria-invalid={Boolean(error && !orderName.trim())}
              />
            </label>
            <label className="field orders-field">
              <span className="field-label">Filament inventory item</span>
              <select
                className="select"
                value={materialItemId}
                onChange={(event) => { setMaterialItemId(event.target.value); setError(''); setSuccess(''); }}
                disabled={!availableMaterials.length}
                data-testid="select-order-material"
              >
                <option value="">Select filament</option>
                {availableMaterials.map((item) => (
                  <option value={item.id} key={item.id}>
                    {filamentLabel(item)}
                  </option>
                ))}
              </select>
              {selectedMaterial && (
                <span className="orders-material-meta" data-testid="text-selected-material">
                  {selectedMaterial.sku && <>SKU {selectedMaterial.sku} <i /> </>}{selectedMaterial.material} <i /> {selectedMaterial.color} <i /> {availableGrams.toLocaleString()} g available
                </span>
              )}
            </label>
            <label className="field orders-field">
              <span className="field-label">Filament used</span>
              <div className="orders-weight-input">
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={grams}
                  onChange={(event) => { setGrams(event.target.value); setError(''); setSuccess(''); }}
                  placeholder="0"
                  data-testid="input-order-grams"
                  aria-invalid={Boolean(error && (!enteredValidGrams || isInsufficient))}
                />
                <span>GRAMS</span>
              </div>
              {isInsufficient && <span className="orders-inline-error" role="status">Only {availableGrams.toLocaleString()} g available for this item.</span>}
            </label>

            <div className="field orders-field">
              <span className="field-label">Stage</span>
              <div className="weight-options" role="group" aria-label="Order stage">
                <button type="button" className={`weight-option ${startNow ? 'active' : ''}`} aria-pressed={startNow} onClick={() => { setStartNow(true); setError(''); }} data-testid="button-stage-start">In progress now</button>
                <button type="button" className={`weight-option ${!startNow ? 'active' : ''}`} aria-pressed={!startNow} onClick={() => { setStartNow(false); setError(''); }} data-testid="button-stage-queue">Not started yet</button>
              </div>
            </div>
            <div className="orders-estimate" aria-live="polite" data-testid="panel-order-estimate">
              <div className="orders-estimate-copy">
                <span className="orders-estimate-label"><CircleDollarSign size={15} /> Material cost estimate</span>
                <span className="orders-estimate-detail">
                  {selectedMaterial && enteredValidGrams
                    ? `${parsedGrams.toLocaleString()} g × ${money(selectedMaterial.unitCost)} per ${selectedMaterial.rollWeightKg ?? 1} kg roll`
                    : 'Choose a filament and enter grams to see an estimate'}
                </span>
              </div>
              <strong>{estimatedCost === null ? '—' : money(estimatedCost)}</strong>
            </div>

            {error && <div className="orders-notice orders-notice-error" role="alert" data-testid="error-order-form"><AlertCircle size={16} /><span>{error}</span></div>}
            {success && <div className="orders-notice orders-notice-success" role="status" data-testid="status-order-saved"><Check size={16} /><span>{success}</span></div>}

            <button className="btn btn-primary orders-submit" type="submit" disabled={!availableMaterials.length} data-testid="button-save-order">
              <Plus size={16} /> {startNow ? 'Start order' : 'Add to not started'}
            </button>
            <p className="orders-submit-note"><ArrowDownRight size={13} /> {startNow ? 'Stock is deducted when you save' : 'No stock is used until you start it on the Order board'}</p>
          </form>
        </section>

        <section className="orders-list-panel" aria-labelledby="orders-list-heading">
          <div className="orders-list-header">
            <div>
              <div className="orders-eyebrow">THE PAPER TRAIL</div>
              <h2 id="orders-list-heading">Saved orders <span>{sortedOrders.length}</span></h2>
            </div>
            <Link to="/order-board" className="orders-list-tag" data-testid="link-order-board"><ClipboardList size={14} /> ORDER BOARD</Link>
          </div>
          {!sortedOrders.length ? (
            <div className="orders-empty" data-testid="empty-orders">
              <div className="orders-empty-icon"><Package size={22} /></div>
              <div className="orders-empty-title">No prints on the books</div>
              <p>Once you record an order, its filament, weight and material cost will show up here.</p>
            </div>
          ) : (
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr><th>Print order</th><th>Filament</th><th>Grams</th><th>Cost</th><th>Stage</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr key={order.id} data-testid={`row-order-${order.id}`}>
                      <td><strong className="orders-order-name">{order.orderName}</strong><span className="orders-order-material">{order.materialName}</span></td>
                      <td><span className="orders-material-name">{order.material}</span><span className="orders-color"><i />{order.color}</span></td>
                      <td className="orders-mono">{order.grams.toLocaleString()} g</td>
                      <td className="orders-price">{money(order.materialCost)}</td>
                      <td><span className={`order-stage order-stage-${order.status}`}>{statusLabel[order.status]}</span></td>
                      <td className="orders-date">{orderDate(order.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="orders-mobile-list">
                {sortedOrders.map((order) => (
                  <article className="orders-mobile-card" key={order.id} data-testid={`card-order-${order.id}`}>
                    <div className="orders-mobile-card-top"><strong>{order.orderName}</strong><span>{money(order.materialCost)}</span></div>
                    <div className="orders-mobile-card-material">{order.materialName}</div>
                    <div className="orders-mobile-card-bottom">
                      <span>{order.material} <i /> {order.color}</span>
                      <span>{order.grams.toLocaleString()} g</span>
                      <span>{statusLabel[order.status]}</span>
                      <span>{orderDate(order.date)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="orders-footnote"><Scale size={13} /> Costs use the selected inventory item’s unit cost and roll weight. Entries stay in this browser.</footer>
    </div>
  );
}
