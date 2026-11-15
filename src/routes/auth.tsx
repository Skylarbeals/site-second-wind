import { createFileRoute } from '@tanstack/react-router';
import { AccountSignInPage } from '@/components/storefront/auth';
export const Route = createFileRoute('/auth')({
  head: () => ({meta:[{title:'Sign in or create account — Print & Fire'},{name:'description',content:'Sign in to track print requests and messages, or open the private workshop as an administrator.'},{property:'og:title',content:'Sign in or create account — Print & Fire'},{property:'og:description',content:'Sign in to track print requests and messages, or open the private workshop as an administrator.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: AccountSignInPage,
});