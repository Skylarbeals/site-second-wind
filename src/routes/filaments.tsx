import { createFileRoute } from '@tanstack/react-router';
import { FilamentsPage } from '@/components/storefront/catalog';
import { catalogOptions } from '@/lib/storefront.queries';
export const Route = createFileRoute('/filaments')({
  loader:({context})=>context.queryClient.ensureQueryData(catalogOptions),
  head:()=>({meta:[{title:'Filaments and materials — Print & Fire'},{name:'description',content:'Choose filament materials and colors for a custom 3D print.'},{property:'og:title',content:'Filaments and materials — Print & Fire'},{property:'og:description',content:'Choose filament materials and colors for a custom 3D print.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: FilamentsPage,
});