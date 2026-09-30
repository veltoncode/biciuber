-- ==============================================================================
-- MIGRAÇÃO: Correção de "Admin Blindness" (Políticas de RLS para Administradores)
-- ==============================================================================

-- 1. Criação da tabela profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS em profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy de leitura do próprio perfil
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Leitura do próprio perfil'
    ) THEN
        CREATE POLICY "Leitura do próprio perfil"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (id = auth.uid());
    END IF;
END $$;

-- 2. Vincular o usuário admin existente à tabela profiles e metadata
INSERT INTO public.profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'hsarges@icloud.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

UPDATE auth.users
SET 
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'hsarges@icloud.com';

-- 3. Função RPC is_admin() com SECURITY DEFINER e search_path seguro
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Abordagem Primária: Verifica na tabela profiles
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- Fallback: Verifica no JWT (app_metadata ou user_metadata)
  IF coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4. Policy de SELECT na tabela drivers para Admin
DROP POLICY IF EXISTS "Admin pode ler todos os motoristas" ON public.drivers;

CREATE POLICY "Admin pode ler todos os motoristas"
ON public.drivers
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 5. Policy de UPDATE na tabela drivers para Admin
DROP POLICY IF EXISTS "Admin pode aprovar motoristas" ON public.drivers;

CREATE POLICY "Admin pode aprovar motoristas"
ON public.drivers
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
