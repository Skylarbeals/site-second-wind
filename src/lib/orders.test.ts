import { describe, expect, it } from "vitest";
import {
  completeOrderInStore, createOrder, removeStarterData, startOrderInStore,
  type InventoryItem, type Store,
} from "./inventory";

const spool: InventoryItem = {
  id: "my-pla", name: "PLA Black", sku: "PLA-1", kind: "material", material: "PLA", color: "Black",
  quantity: 1, unit: "kg", threshold: 0.2, unitCost: 20, rollWeightKg: 1, location: "", supplier: "", updatedAt: "",
};
const base = (): Store => ({ items: [{ ...spool }], history: [], orders: [] });
const qty = (s: Store) => s.items[0]!.quantity;

describe("order stages and filament deduction", () => {
  it("a not-started order uses no filament", () => {
    const { store, order } = createOrder(base(), { orderName: "Clips", grams: 300, materialItemId: "my-pla", status: "queued" });
    expect(order.status).toBe("queued");
    expect(qty(store)).toBe(1);
  });

  it("starting an order deducts its grams from the spool", () => {
    const { store, order } = createOrder(base(), { orderName: "Clips", grams: 300, materialItemId: "my-pla", status: "queued" });
    const started = startOrderInStore(store, order.id);
    expect(qty(started)).toBe(0.7);
    expect(started.orders[0]!.status).toBe("in_progress");
  });

  it("an order entered as in progress deducts right away", () => {
    const { store } = createOrder(base(), { orderName: "Vase", grams: 250, materialItemId: "my-pla", status: "in_progress" });
    expect(qty(store)).toBe(0.75);
  });

  it("cannot start an order needing more filament than is in stock", () => {
    const { store, order } = createOrder(base(), { orderName: "Big", grams: 1500, materialItemId: "my-pla", status: "queued" });
    expect(() => startOrderInStore(store, order.id)).toThrow();
  });

  it("completing an order moves it to past without deducting again", () => {
    const { store, order } = createOrder(base(), { orderName: "Vase", grams: 250, materialItemId: "my-pla", status: "in_progress" });
    const done = completeOrderInStore(store, order.id);
    expect(done.orders[0]!.status).toBe("completed");
    expect(qty(done)).toBe(0.75);
  });
});

describe("sample stock removal", () => {
  it("removes the pre-loaded sample items but keeps the user's own", () => {
    const store: Store = { items: [{ ...spool }, { ...spool, id: "it-pla-black" }], history: [], orders: [] };
    expect(removeStarterData(store).items.map((i) => i.id)).toEqual(["my-pla"]);
  });
});
