-- MIGRATION DB SUPABASE : SOCIAL SPATIAL GRAPH & SYNC AUTH USERS

-- 1. EXTENSIONS POSTGIS ET UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. TABLE DES PROFILS UTILISATEURS SPATIAUX (PUBLIC SCHEMA)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  spiritual_status VARCHAR(150) DEFAULT 'Membre actif Dieu & Moi',
  location GEOGRAPHY(Point, 4326),
  presence_status VARCHAR(20) DEFAULT 'online' CHECK (presence_status IN ('online', 'in_prayer', 'away', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SYNCHRONISATION AUTOMATIQUE DE AUTH.USERS VERS PUBLIC.USER_PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url, spiritual_status, presence_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Membre Dieu & Moi'),
    NEW.raw_user_meta_data->>'avatar_url',
    'Membre actif Dieu & Moi',
    'online'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. SYNCHRONISATION IMMÉDIATE DES 3 UTILISATEURS DÉJÀ INSCRITS DANS AUTH.USERS
INSERT INTO public.user_profiles (id, full_name, avatar_url, spiritual_status, presence_status)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1), 'Membre Dieu & Moi'),
  raw_user_meta_data->>'avatar_url',
  'Membre actif Dieu & Moi',
  'online'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. ACCÈS REST PUBLIC (ANON, AUTHENTICATED, SERVICE_ROLE)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des profils" ON public.user_profiles;
CREATE POLICY "Lecture publique des profils"
  ON public.user_profiles FOR SELECT
  USING (true);

GRANT ALL ON public.user_profiles TO anon, authenticated, service_role;
