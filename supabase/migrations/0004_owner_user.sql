-- Creates the single owner account used for passphrase-based access.
-- Default passphrase: "fintrack" — change it in Settings after first login.
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  email_change,
  phone,
  phone_change,
  phone_change_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'owner@fintrack.local',
  crypt('fintrack', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '', '', '', '', '', '', '', ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'owner@fintrack.local'
);
