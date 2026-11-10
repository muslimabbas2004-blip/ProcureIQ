import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/Auth';
import Brand from '../components/Brand';
import { DEMO_PASSWORD } from '../services/authService';

export default function Login() {
  const { signIn } = useAuth();
  const go = useNavigate();
  const [email, setEmail] = useState('procurement@demo.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(''); setBusy(true);
    try { await signIn(email, password); go('/app'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-14 bg-gradient-to-br from-slate-950 via-navy to-slate-800 text-white">
        <Brand dark />
        <div className="max-w-md"><p className="text-teal text-sm font-semibold tracking-wide uppercase mb-4">Procurement intelligence</p><h1 className="font-display text-4xl font-bold leading-tight">A clearer view of every purchase.</h1><p className="text-slate-300 mt-5 leading-relaxed">Bring your suppliers, materials and purchase history together to make confident decisions.</p></div>
        <p className="text-sm text-slate-400">Your procurement workspace</p>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-6">
          <div><Brand className="lg:hidden" /><p className="text-sm font-semibold text-royal mt-6 lg:mt-0">Welcome back</p><h2 className="font-display text-3xl font-bold text-slate-900 mt-2">Sign in to your workspace</h2><p className="text-sm text-slate-500 mt-2">Enter your details to continue to ProcureIQ.</p></div>
          <div className="space-y-4">
            <div><label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label><input id="login-email" className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label><input id="login-password" className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white" type="password" autoComplete="current-password" required placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} /></div>
          </div>
          {error && <p className="text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg p-3" role="alert">{error}</p>}
          <button className="btn w-full py-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-600"><div className="flex items-center gap-2 font-semibold text-slate-800"><ShieldCheck size={16} className="text-teal" /> Demo access</div><p className="text-xs mt-2">Choose an account, then enter password <strong>{DEMO_PASSWORD}</strong>.</p><div className="flex flex-wrap gap-2 mt-3"><button type="button" onClick={() => setEmail('procurement@demo.com')} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:border-royal hover:text-royal">Purchase team</button><button type="button" onClick={() => setEmail('admin@demo.com')} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:border-royal hover:text-royal">Administrator</button></div></div>
          <Link to="/" className="inline-block text-sm text-slate-500 hover:text-royal">← Back to home</Link>
        </form>
      </div>
    </div>
  );
}
