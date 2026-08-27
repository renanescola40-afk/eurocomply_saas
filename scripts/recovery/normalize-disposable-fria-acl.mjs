#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  databaseUrlUsesPort,
  isLoopbackDatabaseUrl,
} from './manage-ephemeral-recovery-database.mjs';

const databaseUrl = process.env.DATABASE_URL || process.env.RECOVERY_ISOLATED_DATABASE_URL || '';
const recoveryHostPort = Number(process.env.RECOVERY_LOCAL_DB_HOST_PORT || '');
const schemaEffectReplay = String(process.env.RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REPLAY || '').toLowerCase();
const migrationHistoryCanonical = String(process.env.RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL || '').toLowerCase();

function fail(message) {
  throw new Error(message);
}

if (process.env.GITHUB_ACTIONS !== 'true') {
  fail('Disposable FRIA ACL normalization is restricted to GitHub Actions');
}
if (schemaEffectReplay !== 'true') {
  fail('Disposable FRIA ACL normalization requires reviewed schema-effect replay mode');
}
if (migrationHistoryCanonical !== 'false') {
  fail('Disposable FRIA ACL normalization requires noncanonical migration-history mode');
}
if (!Number.isInteger(recoveryHostPort) || recoveryHostPort <= 0 || recoveryHostPort > 65535) {
  fail('RECOVERY_LOCAL_DB_HOST_PORT must identify the isolated database port');
}
if (!isLoopbackDatabaseUrl(databaseUrl) || !databaseUrlUsesPort(databaseUrl, recoveryHostPort)) {
  fail('DATABASE_URL must point to the managed isolated loopback PostgreSQL port');
}

const tables = [
  'ai_fria_assessments',
  'ai_fria_evidence',
  'ai_fria_decisions',
];

const requiredPresenceSql = tables
  .map((table) => `to_regclass('public.${table}') is not null`)
  .join(' and ');
const revokeSql = tables
  .map((table) => `revoke insert, update, delete, truncate on table public.${table} from anon, authenticated;`)
  .join('\n');

const sql = `
do $fria_acl_replay_guard$
begin
  if not (${requiredPresenceSql}) then
    raise exception 'required FRIA tables are missing from disposable replay';
  end if;
end
$fria_acl_replay_guard$;

${revokeSql}

select count(*)::int
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('ai_fria_assessments', 'ai_fria_evidence', 'ai_fria_decisions')
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
`;

const remaining = execFileSync(
  'psql',
  [databaseUrl, '--no-psqlrc', '--set=ON_ERROR_STOP=on', '--tuples-only', '--no-align', '--quiet', '-c', sql],
  {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024,
  },
).trim();

if (remaining !== '0') {
  fail(`Disposable FRIA ACL normalization left ${remaining || 'unknown'} direct mutation grants`);
}

process.stdout.write(
  'Disposable FRIA ACL replay normalized direct mutation privileges for anon/authenticated on the isolated loopback database only; canonical migration bytes and Production were not changed.\n',
);
