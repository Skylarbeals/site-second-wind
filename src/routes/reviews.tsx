import { createFileRoute } from '@tanstack/react-router';
import { ReviewsPage } from '@/components/storefront/reviews';
export const Route = createFileRoute('/reviews')({
  head:()=>({meta:[{title:'Customer reviews — Print & Fire'},{name:'description',content:'Read and leave reviews with photos and star ratings for Print & Fire 3D prints.'},{property:'og:title',content:'Customer reviews — Print & Fire'},{property:'og:description',content:'Read and leave reviews with photos and star ratings for Print & Fire 3D prints.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: ReviewsPage,
});
