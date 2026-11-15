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
export type PrintOrder = {
  id: string; orderName: string; grams: number; materialItemId: string;
  materialName: string; material: string; color: string; materialCost: number; date: string;
};
export type NewPrintOrder = Pick<PrintOrder, 'orderName' | 'grams' | 'materialItemId'>;
type Store = { items: InventoryItem[]; history: StockChange[]; orders: PrintOrder[] };
const STORAGE_KEY = 'benchstock-local-v1';
const UPDATED = 'benchstock-change';
const ROLL_WEIGHTS: RollWeightKg[] = [0.5, 1, 2, 3];

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
    return entry as unknown as PrintOrder;
  }) : [];

  return { items, history, orders };
}

const starter: Store = {
  items: [
    { id:'it-pla-black', name:'PLA — Matte Black', sku:'FIL-PLA-BLK', kind:'material', material:'PLA', color:'Matte black', quantity:6.4, unit:'kg', threshold:2, unitCost:18.5, rollWeightKg:1, location:'Rack A · 01', supplier:'Prusa Research', updatedAt:new Date().toISOString() },
    { id:'it-petg-clear', name:'PETG — Clear', sku:'FIL-PETG-CLR', kind:'material', material:'PETG', color:'Clear', quantity:1.2, unit:'kg', threshold:2, unitCost:21, rollWeightKg:1, location:'Rack A · 03', supplier:'Atomic Filament', updatedAt:new Date().toISOString() },
    { id:'it-pla-sage', name:'PLA — Soft Sage', sku:'FIL-PLA-SGE', kind:'material', material:'PLA', color:'Soft sage', quantity:3.7, unit:'kg', threshold:1.5, unitCost:19.25, rollWeightKg:1, location:'Rack B · 02', supplier:'Prusa Research', updatedAt:new Date().toISOString() },
    { id:'it-resin-grey', name:'ABS-like Resin — Grey', sku:'RES-ABS-GRY', kind:'material', material:'ABS-like resin', color:'Stone grey', quantity:2.1, unit:'L', threshold:1, unitCost:32, location:'Cabinet C · 01', supplier:'Elegoo', updatedAt:new Date().toISOString() },
    { id:'it-nozzle', name:'Brass nozzles 0.4 mm', sku:'SUP-NOZ-04', kind:'consumable', material:'Brass', color:'Gold', quantity:4, unit:'pcs', threshold:5, unitCost:2.8, location:'Parts drawer · 04', supplier:'E3D', updatedAt:new Date().toISOString() },
    { id:'it-buildplate', name:'PEI build plate, 250 mm', sku:'TLS-PEI-250', kind:'tool', material:'Spring steel / PEI', color:'Textured', quantity:3, unit:'pcs', threshold:1, unitCost:28, location:'Parts drawer · 01', supplier:'Prusa Research', updatedAt:new Date().toISOString() },
    { id:'it-gluestick', name:'PVA glue sticks', sku:'CON-GLU-PVA', kind:'consumable', material:'PVA', color:'Clear', quantity:2, unit:'pcs', threshold:3, unitCost:1.6, location:'Bench · Shelf 2', supplier:'Local hardware', updatedAt:new Date().toISOString() },
    { id:'it-caliper', name:'Digital caliper, 150 mm', sku:'TLS-CAL-150', kind:'tool', material:'Stainless steel', color:'Silver', quantity:1, unit:'pcs', threshold:1, unitCost:24.5, location:'Bench · Drawer 1', supplier:'Mitutoyo', updatedAt:new Date().toISOString() },
    { id:'it-flush-cutters', name:'Flush cutters', sku:'TLS-CUT-FL', kind:'tool', material:'Steel', color:'Black / red', quantity:2, unit:'pcs', threshold:1, unitCost:8.5, location:'Bench · Pegboard', supplier:'Local hardware', updatedAt:new Date().toISOString() },
  ],
  history: [
    { id:'hist-1', itemId:'it-pla-black', itemName:'PLA — Matte Black', date:new Date(Date.now()-3600000).toISOString(), change:-0.35, resultingQuantity:6.4, note:'Bench use · lamp prototype' },
    { id:'hist-3', itemId:'it-petg-clear', itemName:'PETG — Clear', date:new Date(Date.now()-86400000*2).toISOString(), change:1, resultingQuantity:1.2, note:'Received from Atomic Filament' },
  ],
  orders: [],
};

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(starter)); return starter; }
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
      const orders = Array.isArray(parsed.orders) ? parsed.orders : [];
      if (!Array.isArray(parsed.orders)) migrated = true;
      const store = { ...parsed, items, history, orders } as Store;
      if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return store;
    }
  } catch { /* use a fresh local starter set if saved data is unreadable */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(starter));
  return starter;
}
export function getStore(): Store { return readStore(); }
function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(UPDATED));
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
      items: current.items.map((entry: unknown) => entry.id === item.id ? updated : entry),
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
    const current = readStore();
    const item = current.items.find((entry) => entry.id === draft.materialItemId);
    if (!item || item.kind !== 'material' || item.unit.trim().toLowerCase() !== 'kg') {
      throw new Error('Choose a filament item from inventory.');
    }
    const grams = Number(draft.grams);
    if (!Number.isFinite(grams) || !Number.isInteger(grams) || grams <= 0) throw new Error('Enter a whole number of grams greater than zero.');
    const availableGrams = Math.floor(item.quantity * 1000 + 1e-9);
    if (grams > availableGrams) throw new Error(`Only ${availableGrams} g is available in ${item.name}.`);
    const materialCost = calcMaterialCost(grams, item.unitCost, item.rollWeightKg);
    const resultingQuantity = Math.round((item.quantity - grams / 1000) * 1000) / 1000;
    const date = new Date().toISOString();
    const updatedItem = { ...item, quantity: resultingQuantity, updatedAt: date };
    const order: PrintOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      orderName: draft.orderName.trim(),
      grams,
      materialItemId: item.id,
      materialName: item.name,
      material: item.material,
      color: item.color,
      materialCost,
      date,
    };
    const change: StockChange = {
      id: `change-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      itemId: item.id,
      itemName: item.name,
      date,
      change: resultingQuantity - item.quantity,
      resultingQuantity,
      note: `Order: ${order.orderName} · ${grams} g`,
    };
    writeStore({
      ...current,
      items: current.items.map((entry: unknown) => entry.id === item.id ? updatedItem : entry),
      history: [change, ...current.history],
      orders: [order, ...current.orders],
    });
    return order;
  };
  const importStore = (data: unknown) => writeStore(validateStore(data));
  return { ...store, ready, addItem, editItem, deleteItem, adjustStock, addOrder, importStore };
}
