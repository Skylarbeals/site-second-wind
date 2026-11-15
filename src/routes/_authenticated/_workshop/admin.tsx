import { createFileRoute } from '@tanstack/react-router';
import { Overview } from '@/components/benchstock/pages';
export const Route = createFileRoute('/_authenticated/_workshop/admin')({
  head:()=>({meta:[{title:'Workshop overview — Benchstock'},{name:'description',content:'Private stock and active print overview.'},{property:'og:title',content:'Workshop overview — Benchstock'},{property:'og:description',content:'Private stock and active print overview.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: Overview,
});