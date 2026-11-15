import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/components/benchstock/pages";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Benchstock" },
      { name: "description", content: "Every filament spool, tool and consumable in your print shop, with reorder alerts." },
      { property: "og:title", content: "Inventory — Benchstock" },
      { property: "og:description", content: "Every filament spool, tool and consumable in your print shop, with reorder alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});
