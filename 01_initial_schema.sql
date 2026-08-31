-- =========================================================================================
-- MASTER MIGRATION SCRIPT - POPCLUB (V3 - FINAL FIX)
-- Execute este script no SQL Editor do Supabase.
-- =========================================================================================

-- REMOVE EXTENSÃO PÚBLICA SE CRIADA ACIDENTALMENTE (Supabase usa a schema 'extensions')
DROP EXTENSION IF EXISTS pgcrypto CASCADE;
-- Garante que a extensão existe no schema correto do Supabase
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- ==========================================
-- 1. ESTRUTURAS EXISTENTES (PRODUTOS E CATEGORIAS)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  category TEXT, 
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. USUÁRIOS E PERFIS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_auth_role() RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users view own profile" ON public.user_profiles;
CREATE POLICY "Users view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id OR public.get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 3. LOCALIZAÇÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT, 
  address_line TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION, 
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own locations" ON public.user_locations;
CREATE POLICY "Users view own locations" ON public.user_locations FOR SELECT USING (auth.uid() = user_id OR public.get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Users insert own locations" ON public.user_locations;
CREATE POLICY "Users insert own locations" ON public.user_locations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own locations" ON public.user_locations;
CREATE POLICY "Users update own locations" ON public.user_locations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own locations" ON public.user_locations;
CREATE POLICY "Users delete own locations" ON public.user_locations FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 4. PAGAMENTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, 
  provider TEXT, 
  last_four TEXT,
  brand TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payment methods" ON public.payment_methods;
CREATE POLICY "Users view own payment methods" ON public.payment_methods FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own payment methods" ON public.payment_methods;
CREATE POLICY "Users insert own payment methods" ON public.payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own payment methods" ON public.payment_methods;
CREATE POLICY "Users delete own payment methods" ON public.payment_methods FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 5. CUPONS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.get_auth_role() = 'admin');

-- ==========================================
-- 6. PEDIDOS E ITENS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'delivering', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_location_id UUID REFERENCES public.user_locations(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE USING (public.get_auth_role() = 'admin');

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_time DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.get_auth_role() = 'admin'))
);

DROP POLICY IF EXISTS "Users create own order items" ON public.order_items;
CREATE POLICY "Users create own order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
);

-- ==========================================
-- 7. AVALIAÇÕES (REVIEWS)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, product_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users create review for completed orders" ON public.reviews;
CREATE POLICY "Users create review for completed orders" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = reviews.order_id AND o.status = 'completed')
);

-- ==========================================
-- 8. PREFERÊNCIAS E TRIGGERS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  push_notifications BOOLEAN DEFAULT true,
  newsletter BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system'
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own preferences" ON public.user_preferences;
CREATE POLICY "Users view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own preferences" ON public.user_preferences;
CREATE POLICY "Users update own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, email, full_name, avatar_url, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(md5(random()::text), 1, 8)),
    new.email,
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    CASE WHEN new.email = 'admin@popclub.com' THEN 'admin' ELSE 'client' END
  );
  
  INSERT INTO public.user_preferences (user_id) VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.user_profiles
  WHERE username = p_username
  LIMIT 1;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- ==========================================
-- 9. CORREÇÃO DA SEMENTE ADMIN
-- ==========================================

DO $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Busca se o admin@popclub.com já existe na tabela auth.users
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@popclub.com' LIMIT 1;
  
  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    -- Se não existir, insere e o Trigger cuidará de criar o user_profiles
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'admin@popclub.com',
      extensions.crypt('@64844048', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "admin", "full_name": "Administrador"}',
      now(),
      now()
    );
    
    -- Inserir identidade do Supabase Auth v2
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      admin_uid,
      format('{"sub":"%s","email":"%s"}', admin_uid::text, 'admin@popclub.com')::jsonb,
      'email',
      admin_uid,
      now(),
      now(),
      now()
    );
  ELSE
    -- Se já existia em auth.users (talvez de um teste antigo), precisamos forçar a atualização
    -- da senha usando a extensão correta e garantir que o user_profile existe
    UPDATE auth.users 
    SET encrypted_password = extensions.crypt('@64844048', extensions.gen_salt('bf'))
    WHERE id = admin_uid;
    
    -- Garante que a identidade exista se foi deletada acidentalmente
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), admin_uid, format('{"sub":"%s","email":"%s"}', admin_uid::text, 'admin@popclub.com')::jsonb, 'email', admin_uid, now(), now(), now()
    ) ON CONFLICT DO NOTHING;
    
    INSERT INTO public.user_profiles (id, username, email, full_name, role)
    VALUES (admin_uid, 'admin', 'admin@popclub.com', 'Administrador', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', username = 'admin';
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (admin_uid)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
