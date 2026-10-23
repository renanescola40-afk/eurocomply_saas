#!/usr/bin/env node
// Build QA-only SQL; this utility NEVER connects to any provider.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const supported = new Set([48, 51, 55]);
const throughArg = process.argv.find((a) => a.startsWith('--through='));
const through = Number(throughArg?.split('=')[1] ?? 55);
if (!supported.has(through)) throw new Error('Only reviewed through=48,51,55 supported.');
const outArg = process.argv.find((a) => a.startsWith('--output='));
const output = outArg ? outArg.slice('--output='.length) : 'artifacts/g1-qa-rollback-replay-' + through + '.sql';
if (!output || output === '-' || path.isAbsolute(output) || output.split(/[\\/]/).includes('..')) {
  throw new Error('QA output must be a relative artifact file.');
}
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Git checkout SHA required.');
if (process.env.G1_EXPECTED_SOURCE_SHA && sha !== process.env.G1_EXPECTED_SOURCE_SHA) {
  throw new Error('Source SHA mismatch.');
}
const rootFile = 'docs/enterprise/replay/G1_QA_REPLAY_001_045_ROLLBACK_ONLY.sql';
const entries = [
  ['supabase/migrations/20260822123600_v19_finalize_enterprise_contract_mode_compatibility.sql', true],
  ['supabase/migrations/20260822123602_v19_reconcile_enterprise_contract_control_rpcs.sql', true],
  ['docs/enterprise/replay/G1_QA_MIGRATION_048_AI_STRUCTURAL_PREREQUISITE.sql', false],
  ['docs/enterprise/replay/G1_QA_MIGRATION_048_IDENTITY_MFA_PREREQUISITE.sql', false],
  ['docs/enterprise/replay/G1_QA_MIGRATION_048_FIVE_TABLE_CREATORS_PREREQUISITE.sql', false],
  ['docs/enterprise/replay/G1_QA_MIGRATION_048_CANONICAL_RLS_PREREQUISITE.sql', false],
  ['supabase/migrations/20260822123604_v19_reconcile_enterprise_core_active_runtime.sql', true],
];
if (through >= 51) entries.push(
  ['supabase/migrations/20260822123606_v19_reconcile_live_rls_validation_inventory_privileges.sql', true],
  ['supabase/migrations/20260822123608_v19_reconcile_new_organization_compatibility_envelope.sql', true],
  ['supabase/migrations/20260822123610_v19_reconcile_enterprise_invitation_seat_authority.sql', true],
);
if (through >= 55) entries.push(
  ['supabase/migrations/20260822123612_v19_harden_enterprise_invitation_actor_boundary.sql', true],
  ['supabase/migrations/20260822123614_v19_preserve_completed_onboarding_state.sql', true],
  ['supabase/migrations/20260822123616_v19_reconcile_active_onboarding_runtime.sql', true],
  ['supabase/migrations/20260822123618_v19_harden_active_onboarding_enterprise_boundaries.sql', true],
);
const catalog = [];
async function load(file) {
  const content = await readFile(file, 'utf8');
  if (!content.trim()) throw new Error('Empty source: ' + file);
  catalog.push({file, sha256: createHash('sha256').update(content).digest('hex')});
  return content;
}
let root = await load(rootFile);
if (!/\nROLLBACK;\s*$/i.test(root) || !/^BEGIN;\s*$/m.test(root)) {
  throw new Error('Original 1-45 SQL boundaries unexpected.');
}
root = root.replace(/\nROLLBACK;\s*$/i, '\n');
root = root.replace(/^BEGIN;\s*$/m, [
 'BEGIN;',
 'DO $qa_isolation$',
 'BEGIN',
 " IF (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')<>0",
 ' OR EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) THEN',
 " RAISE EXCEPTION 'QA replay refused: database is not empty'; END IF;",
 'END $qa_isolation$;'
].join('\n'));
let sql = root;
for (const [file, transactional] of entries) {
  let content = await load(file);
  if (transactional) {
    if (!/^begin;\s*/i.test(content) || !/\ncommit;\s*$/i.test(content)) {
      throw new Error('Unexpected migration transaction: ' + file);
    }
    content = content.replace(/^begin;\s*/i, '-- QA original BEGIN stripped\n')
      .replace(/\ncommit;\s*$/i, '\n-- QA original COMMIT stripped');
  }
  sql += '\n-- QA_SOURCE_FILE ' + file + '\n' + content + '\n';
}
sql += [
 'DO $qa_postflight$ BEGIN',
 " IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='ai_systems'",
 " AND policyname IN ('rls_ai_systems_select_member','rls_ai_systems_insert_writer',",
 " 'rls_ai_systems_update_writer','rls_ai_systems_delete_admin'))<>4 THEN",
 " RAISE EXCEPTION 'QA replay missing four expected canonical AI RLS policies'; END IF;",
 'END $qa_postflight$;',
 'ROLLBACK;',
 "SELECT 'QA_ROLLBACK_REPLAY_OK'::text AS result,",
 " (SELECT count(*) FROM information_schema.tables WHERE table_schema='public'",
 " AND table_type='BASE TABLE') AS app_tables_after_rollback;"
].join('\n');
if ((sql.match(/^\s*BEGIN;/gim) ?? []).length !== 1 ||
    (sql.match(/^\s*ROLLBACK;/gim) ?? []).length !== 1 ||
    (sql.match(/^\s*COMMIT;/gim) ?? []).length !== 0) {
  throw new Error('Fail closed: SQL cannot commit and must contain one BEGIN and ROLLBACK.');
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, sql, 'utf8');
const manifest = {
 kind: 'RISCK_G1_QA_ROLLBACK_SQL_BUILDER',
 headSha: sha,
 through,
 sqlSha256: createHash('sha256').update(sql).digest('hex'),
 output,
 files: catalog,
 proofBoundary: 'Source assembly only. Must separately execute on verified isolated empty QA.',
 noProductionAuthorization: true,
 noExecutionByBuilder: true
};
await writeFile(output + '.manifest.json', JSON.stringify(manifest, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify({ through, sha, output, files: catalog.length, digest: manifest.sqlSha256 }) + '\n');
