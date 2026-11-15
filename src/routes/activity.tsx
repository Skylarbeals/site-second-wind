import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage } from "@/components/benchstock/pages";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Benchstock" },
      { name: "description", content: "A dated record of every stock movement in your print shop." },
      { property: "og:title", content: "Activity — Benchstock" },
      { property: "og:description", content: "A dated record of every stock movement in your print shop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});
