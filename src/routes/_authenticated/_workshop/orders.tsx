import { createFileRoute } from "@tanstack/react-router";
import OrdersPage from "@/components/benchstock/orders";

export const Route = createFileRoute("/_authenticated/_workshop/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Benchstock" },
      { name: "description", content: "Log 3D print orders, deduct filament from stock and track material cost." },
      { property: "og:title", content: "Orders — Benchstock" },
      { property: "og:description", content: "Log 3D print orders, deduct filament from stock and track material cost." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});
