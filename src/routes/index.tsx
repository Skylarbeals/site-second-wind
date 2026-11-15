import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "@/components/benchstock/pages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Benchstock — Print shop overview" },
      { name: "description", content: "See what is in stock, what is running low and what moved in your 3D print shop." },
      { property: "og:title", content: "Benchstock — Print shop overview" },
      { property: "og:description", content: "See what is in stock, what is running low and what moved in your 3D print shop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});
