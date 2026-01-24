-- User Setup Migration
-- Creates users and user_roles entries automatically on first login

-- ============================================
-- AUTO-CREATE USER ON AUTH
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- Check if this is the first user (make them super_admin)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (NEW.id, 'super_admin', NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SETUP EXISTING AUTH USERS
-- ============================================

-- For any existing auth users who don't have a users entry yet
INSERT INTO public.users (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Make the first existing user a super_admin if no super_admin exists
INSERT INTO public.user_roles (user_id, role, school_id)
SELECT id, 'super_admin', NULL
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, school_id) DO NOTHING;

-- ============================================
-- FIX RLS FOR SCHOOLS
-- ============================================

-- Allow super_admin to see all schools even without school_id in user_roles
DROP POLICY IF EXISTS schools_select ON schools;

CREATE POLICY schools_select ON schools FOR SELECT USING (
  -- Super admins can see all schools
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
  OR
  -- Others can see schools they have explicit access to
  id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND school_id IS NOT NULL)
);
