import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkLegalAssuranceSourceChain, LEGAL_ASSURANCE_MIGRATIONS } from '../../scripts/security/check-legal-assurance-chain.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'risck-legal-chain-'));
  const migrationDir = join(dir, 'supabase', 'migrations');
  mkdirSync(migrationDir, { recursive: true });
  mkdirSync(join(dir, 'src/server/legal-assurance'), { recursive: true });
  const base = ['begin;', ...[
    'law_firms', 'counsel_profiles', 'legal_review_requests',
    'legal_review_packages', 'legal_review_decisions', 'legal_review_artifacts',
  ].map(x => `create table if not exists public.${x} (id uuid);`),
  ...['organizations', 'organization_members', 'ai_systems'].map(x => `select to_regclass('public.${x}');`), 'commit;'].join('\n');
  for (const name of LEGAL_ASSURANCE_MIGRATIONS) writeFileSync(join(migrationDir, name), name === LEGAL_ASSURANCE_MIGRATIONS[0] ? base : 'begin;\ncommit;');
  const path = join(migrationDir, LEGAL_ASSURANCE_MIGRATIONS[4]);
  writeFileSync(path, ['begin;',
    ...['legal_review_artifacts', 'legal_review_decisions', 'legal_review_requests', 'counsel_profiles'].map(x=>`select to_regclass('public.${x}');`),
    "insert into storage.buckets (id) values ('legal-assurance-artifacts');", 'public = false',
    ...['reads', 'uploads', 'updates', 'deletes'].map((x, i) => {
      const operation = ['select', 'insert', 'update', 'delete'][i];
      const deny = "(bucket_id = 'legal-assurance-artifacts' and false)";
      const condition = operation === 'insert' ? `with check ${deny}`
        : operation === 'update' ? `using ${deny} with check ${deny}` : `using ${deny}`;
      return `create policy "No direct legal assurance artifact ${x}" on storage.objects for ${operation} to authenticated ${condition};`;
    }),
    'revoke all on function app_private.enforce_legal_decision_artifact_reference() from public;',
    'create trigger legal_review_decision_artifact_reference_guard before insert on public.legal_review_decisions execute function app_private.enforce_legal_decision_artifact_reference();',
    'commit;'].join('\n'));
  const core = join(dir, 'src/server/legal-assurance/core.ts');
  writeFileSync(core, "const LEGAL_ASSURANCE_ENV_KEY = 'LEGAL_ASSURANCE_ENABLED';\nfunction isLegalAssuranceEnabled(env: Environment = process.env) { return env[LEGAL_ASSURANCE_ENV_KEY]?.trim().toLowerCase() === 'true'; }");
  return {dir,migrationDir,artifactPath:path,core,cleanup(){rmSync(dir,{recursive:true,force:true})}};
}

function checkMutation(fn, expected) {
  const f=fixture();try { fn(f);const result=checkLegalAssuranceSourceChain(f.dir);assert.equal(result.status,'NO_GO_SOURCE');assert.ok(result.failures.some(x=>x.includes(expected)),result.failures.join('; ')); } finally { f.cleanup(); }
}

test('offline happy-path checks source only, never runtime readiness',()=>{const f=fixture();try{const result=checkLegalAssuranceSourceChain(f.dir);assert.equal(result.status,'PASS_SOURCE_ONLY');assert.equal(result.runtimeSchemaVerified,false);assert.equal(result.migrations,5)}finally{f.cleanup()}});
test('missing migration is fail closed',()=>checkMutation(f=>rmSync(join(f.migrationDir,LEGAL_ASSURANCE_MIGRATIONS[2])),'missing_migration'));
test('missing base table is fail closed',()=>checkMutation(f=>{const p=join(f.migrationDir,LEGAL_ASSURANCE_MIGRATIONS[0]);writeFileSync(p,readFileSync(p,'utf8').replace('create table if not exists public.counsel_profiles','-- removed counsel_profiles'));},'base_table_definition_missing:counsel_profiles'));
test('nontransactional migration is fail closed',()=>checkMutation(f=>writeFileSync(join(f.migrationDir,LEGAL_ASSURANCE_MIGRATIONS[1]),'select 1;'),'nontransactional'));
test('missing storage deny predicate is fail closed',()=>checkMutation(f=>writeFileSync(f.artifactPath,readFileSync(f.artifactPath,'utf8').replaceAll(' and false',' and true')),'browser_storage_deny_predicate_missing'));
test('missing legal trigger guard is fail closed',()=>checkMutation(f=>writeFileSync(f.artifactPath,readFileSync(f.artifactPath,'utf8').replaceAll('legal_review_decision_artifact_reference_guard','missing_name')),'artifact_reference_trigger_guard_missing'));
test('feature flag default-off contract is fail closed',()=>checkMutation(f=>writeFileSync(f.core,"export const LEGAL_ASSURANCE_ENABLED = true;"),'legal_feature_flag_default_off_not_proven'));
test('one permissive legal Storage read policy must fail even when other policies deny', () => checkMutation(f => {
  const sql = readFileSync(f.artifactPath, 'utf8');
  const broken = sql.replace(/(create policy "No direct legal assurance artifact reads"[^;]*?)and false/i, '$1and true');
  assert.notEqual(broken, sql);
  writeFileSync(f.artifactPath, broken);
}, 'browser_storage_deny_predicate_missing'));

test('commenting out the policy cannot count as a real browser deny', () => checkMutation(f => {
  const sql = readFileSync(f.artifactPath, 'utf8');
  const broken = sql.replace(/(create policy "No direct legal assurance artifact uploads"[^;]*?;)/i, '/* $1 */');
  assert.notEqual(broken, sql);
  writeFileSync(f.artifactPath, broken);
}, 'missing_browser_deny_policy:No direct legal assurance artifact uploads'));
