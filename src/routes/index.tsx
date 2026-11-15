import { createFileRoute } from "@tanstack/react-router";
import { ShopPage } from '@/components/storefront/catalog';
import { catalogOptions } from '@/lib/storefront.queries';

export const Route = createFileRoute("/")({
  loader: ({context}) => context.queryClient.ensureQueryData(catalogOptions),
  head: () => ({
    meta: [
      { title: "Print & Fire — 3D prints and custom parts" },
      { name: "description", content: "Browse ready-to-ship 3D prints or send your model for a custom Print & Fire quote." },
      { property: "og:title", content: "Print & Fire — 3D prints and custom parts" },
      { property: "og:description", content: "Browse ready-to-ship 3D prints or send your model for a custom Print & Fire quote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShopPage,
});
