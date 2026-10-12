import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import App from './App.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { getSession, isSupabaseConfigured, onSessionChange } from './lib/supabase';
import './index.css';

// Con Supabase configurado, nadie ve datos sin iniciar sesión.
// Sin Supabase, la app funciona en modo local (demo en el navegador).
function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
    return onSessionChange(setSession);
  }, []);

  if (!isSupabaseConfigured) return <App />;
  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-sm text-slate-400">Cargando…</div>;
  }
  // key: al cambiar de usuario se vuelve a montar la app y se recargan sus datos
  return session ? <App key={session.user.id} /> : <LoginScreen />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
