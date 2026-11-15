import { createFileRoute } from '@tanstack/react-router';
import { QuotePage } from '@/components/storefront/quote';
import { catalogOptions } from '@/lib/storefront.queries';
export const Route = createFileRoute('/quote')({
  loader:({context})=>context.queryClient.ensureQueryData(catalogOptions),
  head:()=>({meta:[{title:'Custom 3D print quote — Print & Fire'},{name:'description',content:'Privately upload your 3D model and request a custom print quote.'},{property:'og:title',content:'Custom 3D print quote — Print & Fire'},{property:'og:description',content:'Privately upload your 3D model and request a custom print quote.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: QuotePage,
});