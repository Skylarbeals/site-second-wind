import { useEffect, useState } from 'react';

export type Kind = 'material' | 'tool' | 'consumable';
export type RollWeightKg = 0.5 | 1 | 2 | 3;
export type InventoryItem = {
  id: string; name: string; sku: string; kind: Kind; material: string; color: string;
  quantity: number; unit: string; threshold: number; unitCost: number; location: string;
  supplier: string; updatedAt: string; rollWeightKg?: RollWeightKg | undefined;
};
export type StockChange = {
  id: string; itemId: string; itemName: string; date: string; change: number;
  resultingQuantity: number; note: string;
};
/** queued = in but not started (no stock used yet); in_progress = filament deducted; completed = past order. */
export type OrderStatus = 'queued' | 'in_progress' | 'completed';
export type PrintOrder = {
  id: string; orderName: string; grams: number; materialItemId: string;
  materialName: string; material: string; color: string; materialCost: number; date: string;
  status: OrderStatus; startedAt?: string | undefined; completedAt?: string | undefined;
};
export type NewPrintOrder = Pick<PrintOrder, 'orderName' | 'grams' | 'materialItemId'> & { status: 'queued' | 'in_progress' };
export type Store = { items: InventoryItem[]; history: StockChange[]; orders: PrintOrder[] };
const STORAGE_KEY = 'benchstock-local-v1';
const UPDATED = 'benchstock-change';
const ROLL_WEIGHTS: RollWeightKg[] = [0.5, 1, 2, 3];
const ORDER_STATUSES: OrderStatus[] = ['queued', 'in_progress', 'completed'];

/** Material cost for a print: roll price scaled by grams used. Rolls without a valid size count as 1 kg. */
export function calcMaterialCost(grams: number, rollCost: number, rollWeightKg?: number): number {
  const weight = rollWeightKg && ROLL_WEIGHTS.includes(rollWeightKg as RollWeightKg) ? rollWeightKg : 1;
  return Math.round((grams * rollCost / (weight * 1000)) * 100) / 100;
}

const EMPTY_STORE: Store = { items: [], history: [], orders: [] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- validates untrusted backup JSON field by field
function isRecord(value: unknown): value is any {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateStore(value: unknown): Store {
  if (!isRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.history)) {
    throw new Error('This backup does not contain inventory items and activity history.');
  }

  const deletedIds = new Set(
    value.items.filter((entry: unknown) => isRecord(entry) && entry.kind === 'finished product').map((entry: unknown) => (entry as Record<string, unknown>)["id"]),
  );
  const validKinds: Kind[] = ['material', 'tool', 'consumable'];
  const items = value.items.filter((entry: unknown) => !isRecord(entry) || entry.kind !== 'finished product').map((entry: unknown): InventoryItem => {
    if (!isRecord(entry)) throw new Error('This backup contains an invalid inventory item.');
    const textFields = ['id', 'name', 'sku', 'material', 'color', 'unit', 'location', 'supplier', 'updatedAt'] as const;
    const isLegacySupply = entry.kind === 'supply';
    const isKnownBuildPlate = entry.sku === 'SUP-PEI-250' &&
      (entry.kind === 'supply' || entry.kind === 'consumable');
    const kind = isKnownBuildPlate ? 'tool' : isLegacySupply ? 'consumable' : entry.kind;
    if (
      textFields.some((field) => typeof entry[field] !== 'string') ||
      !validKinds.includes(kind as Kind) ||
      !['quantity', 'threshold', 'unitCost'].every(
        (field) => typeof entry[field] === 'number' && Number.isFinite(entry[field]) && entry[field] >= 0,
      ) ||
      (entry.rollWeightKg !== undefined && !ROLL_WEIGHTS.includes(entry.rollWeightKg as RollWeightKg))
    ) {
      throw new Error('This backup contains an inventory item with missing or invalid fields.');
    }
    return {
      ...entry,
      kind,
      ...(kind === 'material' && typeof entry.unit === 'string' && entry.unit.trim().toLowerCase() === 'kg' && typeof entry.rollWeightKg !== 'number' ? { rollWeightKg: 1 } : {}),
    } as unknown as InventoryItem;
  });

  const history = value.history.filter((entry: unknown) => !isRecord(entry) || !deletedIds.has(entry.itemId)).map((entry: unknown): StockChange => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.itemId !== 'string' ||
      typeof entry.itemName !== 'string' ||
      typeof entry.date !== 'string' ||
      Number.isNaN(Date.parse(entry.date)) ||
      typeof entry.change !== 'number' ||
      !Number.isFinite(entry.change) ||
      typeof entry.resultingQuantity !== 'number' ||
      !Number.isFinite(entry.resultingQuantity) ||
      entry.resultingQuantity < 0 ||
      typeof entry.note !== 'string'
    ) {
      throw new Error('This backup contains an invalid activity record.');
    }
    return entry as unknown as StockChange;
  });

  const orders = Array.isArray(value.orders) ? value.orders.map((entry: unknown): PrintOrder => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.orderName !== 'string' ||
      typeof entry.materialItemId !== 'string' ||
      typeof entry.materialName !== 'string' ||
      typeof entry.material !== 'string' ||
      typeof entry.color !== 'string' ||
      typeof entry.date !== 'string' ||
      Number.isNaN(Date.parse(entry.date)) ||
      typeof entry.grams !== 'number' ||
      !Number.isFinite(entry.grams) ||
      entry.grams <= 0 ||
      typeof entry.materialCost !== 'number' ||
      !Number.isFinite(entry.materialCost) ||
      entry.materialCost < 0
    ) {
      throw new Error('This backup contains an invalid print order.');
    }
    const status: OrderStatus = ORDER_STATUSES.includes(entry.status) ? entry.status : 'completed';
    return { ...entry, status } as unknown as PrintOrder;
  }) : [];

  return { items, history, orders };
}

// Sample records shipped with earlier versions; removed once so real inventory starts clean.
const STARTER_ITEM_IDS = new Set(['it-pla-black','it-petg-clear','it-pla-sage','it-resin-grey','it-nozzle','it-buildplate','it-gluestick','it-caliper','it-flush-cutters']);
const STARTER_HISTORY_IDS = new Set(['hist-1','hist-3']);
const STARTER_CLEARED_KEY = 'benchstock-starter-cleared';
const starter: Store = { items: [], history: [], orders: [] };

export function removeStarterData(store: Store): Store {
  return {
    ...store,
    items: store.items.filter((item) => !STARTER_ITEM_IDS.has(item.id)),
    history: store.history.filter((entry) => !STARTER_HISTORY_IDS.has(entry.id) && !STARTER_ITEM_IDS.has(entry.itemId)),
    orders: store.orders.filter((order) => !STARTER_ITEM_IDS.has(order.materialItemId)),
  };
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { localStorage.setItem(STARTER_CLEARED_KEY, '1'); localStorage.setItem(STORAGE_KEY, JSON.stringify(starter)); return starter; }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.items) && Array.isArray(parsed.history)) {
      let migrated = false;
      const deletedIds = new Set(
        parsed.items.filter((item: unknown) => isRecord(item) && item.kind === 'finished product').map((item: Record<string, unknown>) => item["id"]),
      );
      const items = parsed.items.filter((item: unknown) => !isRecord(item) || item.kind !== 'finished product').map((item: unknown) => {
        if (isRecord(item) && item.kind === 'material' && typeof item.unit === 'string' && item.unit.trim().toLowerCase() === 'kg' && !ROLL_WEIGHTS.includes(item.rollWeightKg as RollWeightKg)) {
          migrated = true;
          return { ...item, rollWeightKg: 1 };
        }
        if (
          isRecord(item) &&
          (item.kind === 'supply' || (item.kind === 'consumable' && item.sku === 'SUP-PEI-250'))
        ) {
          migrated = true;
          return { ...item, kind: item.sku === 'SUP-PEI-250' ? 'tool' : 'consumable' };
        }
        return item;
      });
      if (deletedIds.size) migrated = true;
      const history = parsed.history.filter((entry: unknown) => !isRecord(entry) || !deletedIds.has(entry.itemId));
      if (history.length !== parsed.history.length) migrated = true;
      const rawOrders: unknown[] = Array.isArray(parsed.orders) ? parsed.orders : [];
      if (!Array.isArray(parsed.orders)) migrated = true;
      // Orders saved before stages existed had already deducted stock, so they count as completed.
      const orders = rawOrders.map((order) => {
        if (isRecord(order) && !ORDER_STATUSES.includes(order.status)) { migrated = true; return { ...order, status: 'completed' }; }
        return order;
      });
      let store = { ...parsed, items, history, orders } as Store;
      if (!localStorage.getItem(STARTER_CLEARED_KEY)) {
        store = removeStarterData(store);
        localStorage.setItem(STARTER_CLEARED_KEY, '1');
        migrated = true;
      }
      if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return store;
    }
  } catch { /* use a fresh local starter set if saved data is unreadable */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(starter));
  return starter;
}
export function getStore(): Store { return readStore(); }
let remoteWriter: ((store: Store) => void) | null = null;
/** Cloud sync registers here so every local save is also pushed to the shared shop record. */
export function setRemoteWriter(fn: ((store: Store) => void) | null) { remoteWriter = fn; }
/** Replace the local copy with data received from the cloud (no push back). */
export function applyRemoteStore(data: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(validateStore(data)));
  window.dispatchEvent(new Event(UPDATED));
}
function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(UPDATED));
  remoteWriter?.(store);
}
export function useInventory() {
  // Browser storage is only available after hydration; the server renders an empty store.
  const [store, setStore] = useState<Store>(EMPTY_STORE);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const refresh = () => setStore(readStore());
    refresh();
    setReady(true);
    window.addEventListener(UPDATED, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(UPDATED, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const addItem = (item: Omit<InventoryItem, 'id'|'updatedAt'>) => {
    const current = readStore(); const id = `item-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const record = { ...item, id, updatedAt:new Date().toISOString() };
    writeStore({ ...current, items:[record,...current.items] });
    addHistory(record, item.quantity, item.quantity, 'Opening balance');
  };
  const editItem = (item: InventoryItem) => {
    const current = readStore();
    const previous = current.items.find((entry) => entry.id === item.id);
    const updated = { ...item, updatedAt: new Date().toISOString() };
    const history = previous && previous.quantity !== updated.quantity
      ? [{
          id: `change-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          itemId: updated.id,
          itemName: updated.name,
          date: new Date().toISOString(),
          change: updated.quantity - previous.quantity,
          resultingQuantity: updated.quantity,
          note: 'Quantity changed while editing',
        }, ...current.history]
      : current.history;
    writeStore({
      ...current,
      items: current.items.map((entry) => entry.id === item.id ? updated : entry),
      history,
    });
  };
  const deleteItem = (id: string) => { const current=readStore(); writeStore({...current,items:current.items.filter(x=>x.id!==id)}); };
  const addHistory = (item: InventoryItem, change: number, resultingQuantity: number, note: string) => {
    const current=readStore();
    const record: StockChange={id:`change-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,itemId:item.id,itemName:item.name,date:new Date().toISOString(),change,resultingQuantity,note};
    writeStore({...current,history:[record,...current.history]});
  };
  const adjustStock = (item: InventoryItem, change: number, note: string) => {
    const current=readStore(); const quantity=Math.max(0,Math.round((item.quantity+change)*1000)/1000);
    const updated={...item,quantity,updatedAt:new Date().toISOString()};
    writeStore({...current,items:current.items.map(x=>x.id===item.id?updated:x)});
    addHistory(updated,quantity-item.quantity,quantity,note);
  };
  const addOrder = (draft: NewPrintOrder) => {
    const { store: next, order } = createOrder(readStore(), draft);
    writeStore(next);
    return order;
  };
  const startOrder = (id: string) => writeStore(startOrderInStore(readStore(), id));
  const completeOrder = (id: string) => writeStore(completeOrderInStore(readStore(), id));
  const removeOrder = (id: string) => writeStore(removeQueuedOrder(readStore(), id));
  const importStore = (data: unknown) => writeStore(validateStore(data));
  return { ...store, ready, addItem, editItem, deleteItem, adjustStock, addOrder, startOrder, completeOrder, removeOrder, importStore };
}

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const isFilament = (item: InventoryItem) => item.kind === 'material' && item.unit.trim().toLowerCase() === 'kg';
export const availableGramsOf = (item: InventoryItem) => Math.floor(item.quantity * 1000 + 1e-9);

/** Deducts an order's filament from its inventory item and logs the stock change. */
function deductFilament(store: Store, order: PrintOrder, date: string): Store {
  const item = store.items.find((entry) => entry.id === order.materialItemId);
  if (!item || !isFilament(item)) throw new Error('The filament for this order is no longer in inventory.');
  const available = availableGramsOf(item);
  if (order.grams > available) throw new Error(`Only ${available} g is left in ${item.name}; ${order.grams} g is needed.`);
  const resultingQuantity = Math.round((item.quantity - order.grams / 1000) * 1000) / 1000;
  const change: StockChange = {
    id: newId('change'), itemId: item.id, itemName: item.name, date,
    change: Math.round((resultingQuantity - item.quantity) * 1000) / 1000, resultingQuantity,
    note: `Order started: ${order.orderName} · ${order.grams} g`,
  };
  return {
    ...store,
    items: store.items.map((entry) => entry.id === item.id ? { ...item, quantity: resultingQuantity, updatedAt: date } : entry),
    history: [change, ...store.history],
  };
}

export function createOrder(store: Store, draft: NewPrintOrder, date = new Date().toISOString()): { store: Store; order: PrintOrder } {
  const item = store.items.find((entry) => entry.id === draft.materialItemId);
  if (!item || !isFilament(item)) throw new Error('Choose a filament item from inventory.');
  const grams = Number(draft.grams);
  if (!Number.isFinite(grams) || !Number.isInteger(grams) || grams <= 0) throw new Error('Enter a whole number of grams greater than zero.');
  const name = draft.orderName.trim();
  if (!name) throw new Error('Add an order name so this print is easy to find later.');
  const order: PrintOrder = {
    id: newId('order'), orderName: name, grams, materialItemId: item.id, materialName: item.name,
    material: item.material, color: item.color, materialCost: calcMaterialCost(grams, item.unitCost, item.rollWeightKg),
    date, status: 'queued',
  };
  const withOrder: Store = { ...store, orders: [order, ...store.orders] };
  if (draft.status === 'queued') return { store: withOrder, order };
  const started = startOrderInStore(withOrder, order.id, date);
  return { store: started, order: started.orders.find((entry) => entry.id === order.id)! };
}

/** Moves a not-started order into progress; this is the moment its filament leaves inventory. */
export function startOrderInStore(store: Store, orderId: string, date = new Date().toISOString()): Store {
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error('That order could not be found.');
  if (order.status !== 'queued') throw new Error('This order has already been started.');
  const item = store.items.find((entry) => entry.id === order.materialItemId);
  const deducted = deductFilament(store, order, date);
  const materialCost = item ? calcMaterialCost(order.grams, item.unitCost, item.rollWeightKg) : order.materialCost;
  return {
    ...deducted,
    orders: deducted.orders.map((entry) => entry.id === orderId ? { ...entry, status: 'in_progress', startedAt: date, materialCost } : entry),
  };
}

export function completeOrderInStore(store: Store, orderId: string, date = new Date().toISOString()): Store {
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error('That order could not be found.');
  if (order.status !== 'in_progress') throw new Error('Only orders in progress can be marked complete.');
  return { ...store, orders: store.orders.map((entry) => entry.id === orderId ? { ...entry, status: 'completed', completedAt: date } : entry) };
}

export function removeQueuedOrder(store: Store, orderId: string): Store {
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order || order.status !== 'queued') throw new Error('Only orders that have not started can be removed.');
  return { ...store, orders: store.orders.filter((entry) => entry.id !== orderId) };
}
