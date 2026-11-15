import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import '@lovable.dev/cloud-auth-js/styles.css';
import { accountDestination } from '@/lib/customer-account';
import { useAccountSession } from './account-session';
import { StorefrontShell } from './catalog';

export function AccountSignInPage() {
  const navigate = useNavigate(); const { user, admin, ready } = useAccountSession();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user) void navigate({ to: accountDestination(admin), replace: true }); }, [ready, user, admin, navigate]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') {
        const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (result.error) throw result.error;
        if (!result.data.session) setNotice('Check your email to confirm your account, then sign in.');
        else await navigate({ to: '/account' });
      } else if (mode === 'forgot') {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setNotice('If this email has an account, a password reset link is on its way.');
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        const verified = await supabase.auth.getUser();
        if (!verified.data.user) throw new Error('Please confirm your email before signing in.');
        const role = await supabase.rpc('has_role', { _user_id: verified.data.user.id, _role: 'admin' });
        await navigate({ to: accountDestination(role.data === true) });
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Sign in could not be completed.'); } finally { setBusy(false); }
  };
  const social = async (provider: 'google' | 'lovable') => {
    setBusy(true); setError('');
    try { const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` }); if (result.error) throw result.error; if (result.redirected) return; const verified = await supabase.auth.getUser(); if (verified.data.user) { const role = await supabase.rpc('has_role', { _user_id: verified.data.user.id, _role: 'admin' }); await navigate({ to: accountDestination(role.data === true) }); } } catch (e) { setError(e instanceof Error ? e.message : 'Sign in could not be completed.'); } finally { setBusy(false); }
  };
  return <StorefrontShell><main className="storefront-main account-auth"><p className="storefront-kicker">PRINT & FIRE ACCOUNT</p><h1>{mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h1>{mode !== 'forgot' && <div className="storefront-filters" role="group" aria-label="Account access"><Button variant={mode === 'signin' ? 'default' : 'outline'} onClick={() => { setMode('signin'); setNotice(''); setError(''); }}>Sign in</Button><Button variant={mode === 'signup' ? 'default' : 'outline'} onClick={() => { setMode('signup'); setNotice(''); setError(''); }}>Create account</Button></div>}<form className="quote-form" onSubmit={submit}><label>Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>{mode !== 'forgot' && <label>Password<input required type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>}{error && <p role="alert" className="quote-error">{error}</p>}{notice && <p role="status">{notice}</p>}<Button type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</Button></form><Button variant="link" onClick={() => { setMode(mode === 'forgot' ? 'signin' : 'forgot'); setNotice(''); setError(''); }}>{mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}</Button>{mode !== 'forgot' && <div className="social-buttons"><Button className="google-auth-button" variant="outline" disabled={busy} onClick={() => void social('google')}><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>Continue with Google</Button><Button className="lovable-auth-button" disabled={busy} onClick={() => void social('lovable')}>Continue with Lovable</Button></div>}</main></StorefrontShell>;
}

export function ResetPasswordPage() {
  const [recovery, setRecovery] = useState(false); const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  useEffect(() => { const valid = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery' || sessionStorage.getItem('print-fire-recovery') === 'active'; if (valid) sessionStorage.setItem('print-fire-recovery', 'active'); void supabase.auth.getUser().then(({ data }) => { setRecovery(valid && !!data.user); setChecked(true); }); }, []);
  return <StorefrontShell><main className="storefront-main account-auth"><h1>Set a new password</h1>{!checked ? <p>Checking your reset link…</p> : done ? <p role="status">Your password has been updated.</p> : !recovery ? <p role="alert">Open the password reset link from your email to continue.</p> : <form className="quote-form" onSubmit={async e => { e.preventDefault(); setError(''); if (password !== confirm) { setError('Passwords do not match.'); return; } setBusy(true); const result = await supabase.auth.updateUser({ password }); setBusy(false); if (result.error) setError(result.error.message); else { setDone(true); sessionStorage.removeItem('print-fire-recovery'); } }}><label>New password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label>Confirm password<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>{error && <p role="alert" className="quote-error">{error}</p>}<Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save password'}</Button></form>}</main></StorefrontShell>;
}