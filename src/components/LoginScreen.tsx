import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { signIn } from '../lib/supabase';
import { BRAND } from '../config/brand';

// Login con Supabase Auth. Los usuarios se crean desde el panel de Supabase
// (Authentication → Users → Add user): no hay registro abierto.
export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const result = await signIn(email, password);
    setSending(false);
    if (!result.ok) setError(result.error || 'No se pudo iniciar sesión.');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} data-testid="login-form" className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7 space-y-5">
        <div className="flex items-center gap-3">
          <img src={BRAND.logo} alt={`${BRAND.name} Logo`} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-tight text-slate-900 leading-tight">{BRAND.name}</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600">{BRAND.tagline}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Ingresá para ver tus ingresos y gastos
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </label>

        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl transition-colors"
        >
          <LogIn className="w-4 h-4" />
          {sending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};
