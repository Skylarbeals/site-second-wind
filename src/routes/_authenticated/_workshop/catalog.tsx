import { createFileRoute } from '@tanstack/react-router';
import { CatalogManager } from '@/components/benchstock/catalog-manager';
export const Route = createFileRoute('/_authenticated/_workshop/catalog')({
  head:()=>({meta:[{title:'Storefront catalog — Benchstock'},{name:'description',content:'Private product and material listing management.'},{property:'og:title',content:'Storefront catalog — Benchstock'},{property:'og:description',content:'Private product and material listing management.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: CatalogManager,
});