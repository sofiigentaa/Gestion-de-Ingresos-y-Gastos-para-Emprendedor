-- Ingresos y Gastos — estructura y seguridad para Supabase
-- Pegar en Supabase → SQL Editor → Run (una sola vez; se puede volver a correr).
-- Cada usuario ve y modifica SOLO sus movimientos (RLS por user_id).

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  date TEXT NOT NULL CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'),
  type TEXT NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  category_id TEXT,
  category_name TEXT,
  subcategory TEXT,
  description TEXT,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  supplier_or_client TEXT,
  receipt_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si la tabla ya existía de antes (sin dueño), se agrega la columna.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON public.transactions (user_id, date);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  categories JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos propios" ON public.transactions;
CREATE POLICY "movimientos propios" ON public.transactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ajustes propios" ON public.user_settings;
CREATE POLICY "ajustes propios" ON public.user_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Sin login (clave "anon") no se puede hacer nada.
REVOKE ALL ON public.transactions, public.user_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions, public.user_settings TO authenticated;

-- Si había movimientos cargados antes de este cambio (sin dueño), asignarlos
-- a la cuenta del negocio reemplazando el email y ejecutando:
-- UPDATE public.transactions SET user_id = (SELECT id FROM auth.users WHERE email = 'duena@ejemplo.com') WHERE user_id IS NULL;
