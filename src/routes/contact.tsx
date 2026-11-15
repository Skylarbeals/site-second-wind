import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '@/components/storefront/reviews';
export const Route = createFileRoute('/contact')({
  head:()=>({meta:[{title:'Contact us — Print & Fire'},{name:'description',content:'Get in touch with Print & Fire about custom 3D prints and orders.'},{property:'og:title',content:'Contact us — Print & Fire'},{property:'og:description',content:'Get in touch with Print & Fire about custom 3D prints and orders.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: ContactPage,
});
