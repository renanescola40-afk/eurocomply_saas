import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const verifier = 'scripts/supabase/verify-team-membership-rpc-reconciliation.mjs';
const expected = [
  'function|change_organization_member_role_atomic|security_definer=true|config=search_path=pg_catalog, public',
  'function|remove_organization_member_atomic|security_definer=true|config=search_path=pg_catalog, public',
  'execute|change_organization_member_role_atomic|public=false|anon=false|authenticated=false|service_role=true',
  'execute|remove_organization_member_atomic|public=false|anon=false|authenticated=false|service_role=true',
  'history|20260922203500|reconcile_team_membership_runtime_rpcs',
];

test('accepts only the exact hardened production proof', () => {
  const dir = mkdtempSync(join(tmpdir(), 'membership-rpc-proof-'));
  const proof = join(dir, 'proof.txt');
  const out = join(dir, 'verification.json');
  writeFileSync(proof, expected.join('\n') + '\n');
  const run = spawnSync(process.execPath, [verifier, proof, out], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(result.status, 'PASS');
  assert.equal(result.checks.serviceRoleExecute, true);
  assert.equal(result.checks.authenticatedExecute, false);
});

test('fails closed if browser execution appears', () => {
  const dir = mkdtempSync(join(tmpdir(), 'membership-rpc-proof-'));
  const proof = join(dir, 'proof.txt');
  const out = join(dir, 'verification.json');
  const unsafe = expected.map((line) =>
    line.startsWith('execute|change_organization_member_role_atomic')
      ? line.replace('authenticated=false', 'authenticated=true')
      : line,
  );
  writeFileSync(proof, unsafe.join('\n') + '\n');
  const run = spawnSync(process.execPath, [verifier, proof, out], { encoding: 'utf8' });
  assert.notEqual(run.status, 0);
});
