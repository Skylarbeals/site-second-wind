import { createFileRoute } from "@tanstack/react-router";
import { OrderBoardPage } from "@/components/benchstock/order-board";

export const Route = createFileRoute("/_authenticated/order-board")({
  head: () => ({
    meta: [
      { title: "Order board — Benchstock" },
      { name: "description", content: "See 3D print orders in progress, waiting to start, and finished." },
      { property: "og:title", content: "Order board — Benchstock" },
      { property: "og:description", content: "See 3D print orders in progress, waiting to start, and finished." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderBoardPage,
});
