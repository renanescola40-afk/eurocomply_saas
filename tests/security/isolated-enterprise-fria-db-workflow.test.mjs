import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile('.github/workflows/isolated-enterprise-fria-db-proof.yml', 'utf8');
const manager = await readFile('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const friaAclNormalizer = await readFile('scripts/recovery/normalize-disposable-fria-acl.mjs', 'utf8');

test('workflow executes only for successful main or explicit manual confirmation', () => {
  assert.match(workflow, /workflows: \[Full Security Suite\]/);
  assert.match(workflow, /head_branch == 'main'/);
  assert.match(workflow, /RUN_ISOLATED_ENTERPRISE_FRIA_DB_PROOF/);
  assert.match(workflow, /commits\/main/);
  assert.match(workflow, /git rev-parse origin\/main/);
});

test('workflow is read-only and uses the reviewed disposable schema boundary', () => {
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /contents: write|actions: write|pull_request_target/);
  assert.match(workflow, /supabase\/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520/);
  assert.match(workflow, /version: 2\.101\.0/);
  assert.match(workflow, /run-reviewed-ephemeral-schema-boundary-v4\.mjs/);
  assert.match(workflow, /normalize-disposable-fria-acl\.mjs/);
  assert.match(workflow, /manage-ephemeral-recovery-database\.mjs stop/);
  assert.doesNotMatch(workflow, /supabase@2\.39\.2|db reset --local --no-seed|run-ephemeral-project-schema-replay\.mjs/);
  assert.match(workflow, /persist-credentials: false/);
});

test('workflow and recovery manager preserve the noncanonical schema-effect evidence boundary', () => {
  assert.match(workflow, /RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REPLAY: 'true'/);
  assert.match(manager, /RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REPLAY === 'true'/);
  assert.match(manager, /Reviewed schema effects were not fully replayed into the disposable database/);
  assert.match(manager, /reviewed schema-effect replay identities; migration history remains noncanonical/);
  assert.match(manager, /Exact-SHA project migrations were not fully applied/);
});

test('disposable FRIA ACL normalization is loopback-only and cannot weaken the final proof', () => {
  assert.match(friaAclNormalizer, /GITHUB_ACTIONS !== 'true'/);
  assert.match(friaAclNormalizer, /RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REPLAY/);
  assert.match(friaAclNormalizer, /RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL/);
  assert.match(friaAclNormalizer, /isLoopbackDatabaseUrl\(databaseUrl\)/);
  assert.match(friaAclNormalizer, /databaseUrlUsesPort\(databaseUrl, recoveryHostPort\)/);
  for (const table of ['ai_fria_assessments', 'ai_fria_evidence', 'ai_fria_decisions']) {
    assert.ok(
      friaAclNormalizer.includes(
        `revoke insert, update, delete, truncate on table public.\${table} from anon, authenticated;`,
      ),
    );
  }
  assert.match(friaAclNormalizer, /privilege_type in \('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'\)/);
  assert.match(friaAclNormalizer, /remaining !== '0'/);
  assert.doesNotMatch(friaAclNormalizer, /tganhbbhfxcpblmgqprg|supabase\.co|risckcomply\.com/);
});

test('workflow binds the proof to the reviewed loopback database without retaining credentials', () => {
  assert.match(workflow, /DATABASE_URL: \$\{\{ env\.RECOVERY_ISOLATED_DATABASE_URL \}\}/);
  assert.match(workflow, /isolated-enterprise-fria-db-proof-\$\{\{ env\.TARGET_SHA \}\}/);
  assert.match(workflow, /retention-days: 90/);
  assert.doesNotMatch(workflow, /DATABASE_URL.*upload-artifact/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
