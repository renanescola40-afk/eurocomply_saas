import { readFileSync, writeFileSync } from 'node:fs';

const [proofPath, outputPath] = process.argv.slice(2);
if (!proofPath || !outputPath) {
  throw new Error('usage: verify-team-membership-rpc-reconciliation.mjs <proof> <output>');
}

const lines = readFileSync(proofPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const expected = [
  'function|change_organization_member_role_atomic|security_definer=true|config=search_path=pg_catalog, public',
  'function|remove_organization_member_atomic|security_definer=true|config=search_path=pg_catalog, public',
  'execute|change_organization_member_role_atomic|public=false|anon=false|authenticated=false|service_role=true',
  'execute|remove_organization_member_atomic|public=false|anon=false|authenticated=false|service_role=true',
  'history|20260922203500|reconcile_team_membership_runtime_rpcs',
];

for (const line of expected) {
  if (!lines.includes(line)) {
    throw new Error(`team_membership_rpc_reconciliation_failed: missing ${line}`);
  }
}

if (lines.length !== expected.length) {
  throw new Error(`team_membership_rpc_reconciliation_failed: unexpected proof line count ${lines.length}`);
}

const result = {
  schema: 'risck-comply.team-membership-rpc-reconciliation.v1',
  status: 'PASS',
  checks: {
    roleChangeRpcPresent: true,
    memberRemovalRpcPresent: true,
    securityDefiner: true,
    fixedSearchPath: true,
    publicExecute: false,
    anonExecute: false,
    authenticatedExecute: false,
    serviceRoleExecute: true,
    migrationLedgerPresent: true,
  },
  containsSensitiveValues: false,
};

writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
