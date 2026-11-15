import { createFileRoute } from '@tanstack/react-router';
import { ResetPasswordPage } from '@/components/storefront/auth';
export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Reset password — Print & Fire' }, { name: 'description', content: 'Securely set a new password for your Print & Fire account.' }, { property: 'og:title', content: 'Reset password — Print & Fire' }, { property: 'og:description', content: 'Securely set a new password for your Print & Fire account.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ResetPasswordPage,
});