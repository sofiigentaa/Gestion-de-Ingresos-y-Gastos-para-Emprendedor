import { createClient, Session } from '@supabase/supabase-js';
import { Transaction, CategoryOption } from '../types';

// Modo nube (Supabase) solo si están las dos variables. Sin ellas la app
// funciona en modo local (datos en el navegador), útil para demos.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('tu-proyecto') &&
    !supabaseAnonKey.includes('tu_anon_key')
);

// La clave "anon" es pública por diseño: lo que protege los datos es el login
// + las políticas RLS de supabase/schema.sql (cada usuario ve solo lo suyo).
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export interface Result<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

function failure(error: unknown, fallback: string): Result<any> {
  const message = (error as any)?.message || '';
  if (/JWT|not authenticated|permission denied|row-level security/i.test(message)) {
    return { ok: false, error: 'Tu sesión venció o no tenés permiso. Volvé a iniciar sesión.' };
  }
  if (/Failed to fetch|NetworkError/i.test(message)) {
    return { ok: false, error: 'Sin conexión con la nube. Revisá internet y probá de nuevo.' };
  }
  return { ok: false, error: fallback };
}

// --- Sesión -----------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onSessionChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<Result> {
  if (!supabase) return { ok: false, error: 'La nube no está configurada.' };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    return { ok: false, error: /invalid/i.test(error.message) ? 'Email o contraseña incorrectos.' : 'No se pudo iniciar sesión.' };
  }
  return { ok: true, data: undefined };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

// --- Movimientos ------------------------------------------------------------

function toRow(tx: Transaction) {
  return {
    id: tx.id,
    date: tx.date,
    type: tx.type,
    amount: tx.amount,
    category_id: tx.categoryId,
    category_name: tx.categoryName,
    subcategory: tx.subcategory || null,
    description: tx.description,
    payment_method: tx.paymentMethod,
    supplier_or_client: tx.supplierOrClient || null,
    receipt_number: tx.receiptNumber || null,
    created_at: new Date(tx.createdAt || Date.now()).toISOString(),
  };
}

function fromRow(item: any): Transaction {
  return {
    id: item.id,
    date: item.date,
    type: item.type,
    amount: Number(item.amount),
    categoryId: item.category_id || '',
    categoryName: item.category_name || '',
    subcategory: item.subcategory || undefined,
    description: item.description || '',
    paymentMethod: item.payment_method || 'efectivo',
    supplierOrClient: item.supplier_or_client || undefined,
    receiptNumber: item.receipt_number || undefined,
    createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
  };
}

export async function fetchTransactionsFromSupabase(): Promise<Result<Transaction[]>> {
  if (!supabase) return { ok: false, error: 'La nube no está configurada.' };
  try {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) return failure(error, 'No se pudieron leer los movimientos de la nube.');
    return { ok: true, data: (data || []).map(fromRow) };
  } catch (err) {
    return failure(err, 'No se pudieron leer los movimientos de la nube.');
  }
}

export async function syncTransactionToSupabase(tx: Transaction): Promise<Result> {
  if (!supabase) return { ok: true, data: undefined };
  try {
    const { error } = await supabase.from('transactions').upsert(toRow(tx));
    if (error) return failure(error, 'No se pudo guardar el movimiento en la nube.');
    return { ok: true, data: undefined };
  } catch (err) {
    return failure(err, 'No se pudo guardar el movimiento en la nube.');
  }
}

export async function deleteTransactionFromSupabase(id: string): Promise<Result> {
  if (!supabase) return { ok: true, data: undefined };
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) return failure(error, 'No se pudo borrar el movimiento en la nube.');
    return { ok: true, data: undefined };
  } catch (err) {
    return failure(err, 'No se pudo borrar el movimiento en la nube.');
  }
}

// Reemplaza TODOS los movimientos del usuario (restaurar respaldo / restablecer).
export async function replaceAllTransactionsInSupabase(list: Transaction[]): Promise<Result> {
  if (!supabase) return { ok: true, data: undefined };
  try {
    // RLS limita el borrado a las filas del usuario que inició sesión.
    const del = await supabase.from('transactions').delete().neq('id', '');
    if (del.error) return failure(del.error, 'No se pudieron reemplazar los movimientos en la nube.');
    for (let i = 0; i < list.length; i += 500) {
      const { error } = await supabase.from('transactions').insert(list.slice(i, i + 500).map(toRow));
      if (error) return failure(error, 'No se pudieron cargar los movimientos en la nube.');
    }
    return { ok: true, data: undefined };
  } catch (err) {
    return failure(err, 'No se pudieron reemplazar los movimientos en la nube.');
  }
}

// --- Categorías (una fila de ajustes por usuario) ---------------------------

export async function fetchCategoriesFromSupabase(): Promise<Result<CategoryOption[] | null>> {
  if (!supabase) return { ok: true, data: null };
  try {
    const { data, error } = await supabase.from('user_settings').select('categories').maybeSingle();
    if (error) return failure(error, 'No se pudieron leer las categorías de la nube.');
    const cats = data?.categories;
    return { ok: true, data: Array.isArray(cats) && cats.length > 0 ? (cats as CategoryOption[]) : null };
  } catch (err) {
    return failure(err, 'No se pudieron leer las categorías de la nube.');
  }
}

export async function saveCategoriesToSupabase(categories: CategoryOption[]): Promise<Result> {
  if (!supabase) return { ok: true, data: undefined };
  try {
    const session = await getSession();
    if (!session) return { ok: false, error: 'Tu sesión venció. Volvé a iniciar sesión.' };
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: session.user.id, categories, updated_at: new Date().toISOString() });
    if (error) return failure(error, 'No se pudieron guardar las categorías en la nube.');
    return { ok: true, data: undefined };
  } catch (err) {
    return failure(err, 'No se pudieron guardar las categorías en la nube.');
  }
}
