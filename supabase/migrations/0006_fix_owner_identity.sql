-- Adds the missing auth.identities record for the owner user.
-- Supabase GoTrue requires an identity entry to authenticate via email/password.
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.email,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(), now(), now()
FROM auth.users u
WHERE u.email = 'owner@fintrack.local'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
  );
