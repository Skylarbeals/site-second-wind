import { createFileRoute } from '@tanstack/react-router';
import { CustomerAccountPage } from '@/components/storefront/account';
export const Route = createFileRoute('/_authenticated/account')({
  head: () => ({ meta: [{ title: 'My orders and messages — Print & Fire' }, { name: 'description', content: 'Track your own print requests and message the Print & Fire workshop.' }, { property: 'og:title', content: 'My orders and messages — Print & Fire' }, { property: 'og:description', content: 'Track your own print requests and message the Print & Fire workshop.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: CustomerAccountPage,
});