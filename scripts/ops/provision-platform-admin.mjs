#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const allowedRoles = new Set(['owner', 'sales_admin', 'sales_rep', 'support_admin']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  return email.includes('@') ? email : null;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = normalizeEmail(process.env.PLATFORM_ADMIN_EMAIL);
const role = String(process.env.PLATFORM_ADMIN_ROLE ?? 'owner').trim().toLowerCase();

if (!url) fail('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!key) fail('SUPABASE_SERVICE_ROLE_KEY is required in the local shell or protected CI environment.');
if (!email) fail('PLATFORM_ADMIN_EMAIL must be the exact Supabase Auth email to provision.');
if (!allowedRoles.has(role)) fail(`PLATFORM_ADMIN_ROLE must be one of: ${[...allowedRoles].join(', ')}.`);

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(targetEmail) {
  const perPage = 100;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((user) => normalizeEmail(user.email) === targetEmail);
    if (match) return match;
    if (users.length < perPage) return null;
  }

  return null;
}

try {
  const user = await findUserByEmail(email);
  if (!user) fail('No Supabase Auth user matched PLATFORM_ADMIN_EMAIL. Ask the user to sign in once, then re-run this script.');

  const { error } = await supabase.from('platform_admin_users').upsert(
    {
      user_id: user.id,
      role,
      enabled: true,
      created_by: user.id,
    },
    { onConflict: 'user_id' },
  );

  if (error) throw error;

  console.log(`Provisioned platform admin ${email} as ${role}.`);
} catch (error) {
  fail(error instanceof Error ? error.message : 'Unable to provision platform admin.');
}
