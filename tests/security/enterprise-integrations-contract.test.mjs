import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260721113000_enterprise_integrations_platform.sql';
const securityPath = 'src/server/enterprise-integrations/security.ts';
const migration = await readFile(migrationPath, 'utf8');
const security = await readFile(securityPath, 'utf8');

const tables = [
  'enterprise_service_accounts',
  'enterprise_api_keys',
  'enterprise_webhook_subscriptions',
  'enterprise_webhook_deliveries',
  'enterprise_identity_connections',
  'enterprise_scim_tokens',
  'enterprise_integration_audit_events',
];

test('migration creates complete tenant-scoped integrations control plane', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
  }
  assert.ok((migration.match(/organization_id uuid not null/g) ?? []).length >= tables.length);
});

test('credential storage is digest-only and lifecycle bounded', () => {
  assert.match(migration, /secret_hash text not null check \(char_length\(secret_hash\) = 64\)/);
  assert.match(migration, /token_hash text not null check \(char_length\(token_hash\) = 64\)/);
  assert.match(migration, /expires_at timestamptz not null/);
  assert.match(migration, /status in \('active','rotating','revoked','expired'\)/);
  assert.doesNotMatch(migration, /plaintext_secret|raw_token|api_key_value/i);
});

test('webhook delivery contract includes replay, idempotency, retries and dead letters', () => {
  assert.match(migration, /unique \(subscription_id, event_id\)/);
  assert.match(migration, /unique \(organization_id, idempotency_key\)/);
  assert.match(migration, /dead_letter/);
  assert.match(migration, /lease_expires_at/);
  assert.match(migration, /next_attempt_at/);
  assert.match(security, /timestamp\.\$\{body\}/);
  assert.match(security, /timingSafeEqual/);
  assert.match(security, /maximumAgeSeconds/);
});

test('identity lifecycle includes OIDC, SAML, SCIM and group-role mapping', () => {
  assert.match(migration, /protocol in \('oidc','saml'\)/);
  assert.match(migration, /group_role_mapping jsonb/);
  assert.match(migration, /enforce_sso boolean/);
  assert.match(migration, /enterprise_scim_tokens/);
  assert.match(migration, /verified_domain/);
});

test('ordinary authenticated users cannot mutate integration audit history', () => {
  assert.match(migration, /revoke update, delete on public\.enterprise_integration_audit_events from authenticated/);
  assert.match(migration, /previous_hash text/);
  assert.match(migration, /event_hash text not null/);
});

test('outbound payload sanitizer blocks common secret and PII keys', () => {
  assert.match(security, /token\|secret\|password\|authorization\|cookie\|session\|email\|phone\|address/i);
  assert.match(security, /WEBHOOK_PAYLOAD_TOO_DEEP/);
  assert.match(security, /slice\(0, 4096\)/);
});
