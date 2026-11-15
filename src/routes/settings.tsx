import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/benchstock/pages";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Benchstock" },
      { name: "description", content: "Back up, restore and export your print shop inventory." },
      { property: "og:title", content: "Settings — Benchstock" },
      { property: "og:description", content: "Back up, restore and export your print shop inventory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});
