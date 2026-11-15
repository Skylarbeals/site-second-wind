import { createFileRoute, Navigate } from '@tanstack/react-router';
import { AuthGate } from '@/components/benchstock/auth-gate';
export const Route = createFileRoute('/auth')({
  head: () => ({meta:[{title:'Workshop sign in — Benchstock'},{name:'description',content:'Private sign in for the Print & Fire workshop team.'},{property:'og:title',content:'Workshop sign in — Benchstock'},{property:'og:description',content:'Private sign in for the Print & Fire workshop team.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component: SignInPage,
});
function SignInPage() { return <AuthGate><Navigate to="/admin"/></AuthGate>; }