import { createClient } from '@supabase/supabase-js';
import { Transaction } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('tu-proyecto') && 
  !supabaseAnonKey.includes('tu_anon_key')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export async function fetchTransactionsFromSupabase(): Promise<Transaction[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Error al cargar de Supabase:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((item) => ({
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
    }));
  } catch (err) {
    console.error('Error al conectar con Supabase:', err);
    return null;
  }
}

export async function syncTransactionToSupabase(tx: Transaction): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('transactions').upsert({
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
    });

    if (error) {
      console.warn('Error al guardar en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error al conectar con Supabase:', err);
    return false;
  }
}

export async function deleteTransactionFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.warn('Error al borrar de Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error al conectar con Supabase:', err);
    return false;
  }
}
