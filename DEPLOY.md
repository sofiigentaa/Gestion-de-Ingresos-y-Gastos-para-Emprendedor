# Cómo publicar Ingresos y Gastos en Render con Supabase

## 1. Supabase
1. Crear un proyecto en https://supabase.com (región São Paulo).
2. **SQL Editor → New query**: pegar `supabase/schema.sql` → **Run**.
   Crea las tablas y las políticas RLS: cada usuario ve solo sus movimientos y sin login no se ve nada.
3. **Authentication → Providers → Email**: desactivar **"Allow new users to sign up"** (nadie puede registrarse solo).
4. **Authentication → Users → Add user**: crear el usuario del negocio (email + contraseña).
5. **Project Settings → API**: copiar *Project URL* y la clave *anon public*.

## 2. Render
1. **New → Blueprint** → este repositorio (es un sitio estático, gratis).
2. Cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. **Apply**. Entrar a la URL y loguearse con el usuario del paso 1.4.

## Si ya tenía datos en Supabase
Correr el `UPDATE` que está al final de `supabase/schema.sql` con el email del negocio,
así los movimientos viejos quedan asignados a esa cuenta.

## Demo local
`npm run dev` sin variables: modo local con datos de ejemplo, sin login.
Con `VITE_BRAND=demo` se muestra una marca ficticia.
