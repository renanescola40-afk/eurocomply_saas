#!/usr/bin/env node

import { randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function requireEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function password() {
  return `Rc!${randomBytes(24).toString('base64url')}9a`;
}

function mask(value) {
  if (value) process.stdout.write(`::add-mask::${value}\n`);
}

function exportEnv(name, value) {
  if (!process.env.GITHUB_ENV) throw new Error('github_env_required');
  mask(value);
  appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

async function createUser(admin, label, suffix) {
  const email = `fria-${label}-${suffix}@example.test`;
  const secret = password();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: secret,
    email_confirm: true,
    user_metadata: { purpose: `fria-ephemeral-${label}`, preferred_language: 'en' },
  });
  if (error || !data.user?.id) throw new Error(`fria_${label}_user_create_failed`);
  return { id: data.user.id, email, password: secret };
}

async function insertOne(admin, table, row, label) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error || !data?.id) throw new Error(`${label}_create_failed`);
  return data;
}

async function main() {
  if (env('GITHUB_ACTIONS') !== 'true') throw new Error('github_actions_required');
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('fria_ephemeral_supabase_must_be_loopback');
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const suffix = `${Date.now()}-${randomUUID()}`;
  const owner = await createUser(admin, 'owner', suffix);
  const reviewer = await createUser(admin, 'reviewer', suffix);
  const approver = await createUser(admin, 'approver', suffix);

  const organization = await insertOne(admin, 'organizations', {
    name: `FRIA Disposable QA ${suffix}`,
    slug: `fria-qa-${suffix}`,
    created_by: owner.id,
  }, 'fria_organization');

  for (const [identity, role] of [[owner, 'owner'], [reviewer, 'admin'], [approver, 'admin']]) {
    await insertOne(admin, 'organization_members', {
      organization_id: organization.id,
      user_id: identity.id,
      role,
    }, `fria_${role}_membership`);
  }

  exportEnv('E2E_FRIA_OWNER_EMAIL', owner.email);
  exportEnv('E2E_FRIA_OWNER_PASSWORD', owner.password);
  exportEnv('E2E_FRIA_REVIEWER_EMAIL', reviewer.email);
  exportEnv('E2E_FRIA_APPROVER_EMAIL', approver.email);
  exportEnv('E2E_FRIA_APPROVER_PASSWORD', approver.password);
  appendFileSync(process.env.GITHUB_ENV, 'E2E_ALLOW_SYNTHETIC_APP_WRITES=true\n', 'utf8');

  process.stdout.write('Disposable FRIA owner/reviewer/approver identities and tenant created on loopback Supabase.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
