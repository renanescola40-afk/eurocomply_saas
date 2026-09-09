#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { compileForwardReconciliationManifest } from '../supabase/forward-reconciliation-control-plane.mjs';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'config', 'supabase-forward-reconciliation.json');
const DEFAULT_REPORT_PATH = join(
  ROOT,
  'docs',
  'security',
  'evidence',
  'runtime',
  'supabase-forward-reconciliation-evidence.json',
);

const EXPECTED_CHANGE_SET = '2026-09-09-supabase-advisor-rpc-hardening-v41';
const SOURCE_CHANGE_SET = '2026-09-08-post-audit-containment-forward-reconciliation-v40';
const V40_SOURCE_CHANGE_SET = '2026-09-06-cross-tenant-reference-integrity-v39';
const VERIFIED_PRODUCTION_LEDGER_HEAD = '20260907142133';
const V41_ADVISOR_MIGRATION = '20260909006900_harden_security_advisor_rpc_surface.sql';

const REFORWARD_PAIRS = [
  {
    source: '20260906000000_reconcile_final_public_release_payment_storage_hardening.sql',
    target: '20260908000000_reconcile_final_public_release_payment_storage_hardening.sql',
    sourceBlob: '59776363b3b888149a7328c7c40d4c5a4478cd15',
  },
  {
    source: '20260906003000_billing_ai_system_commercial_quota.sql',
    target: '20260908003000_billing_ai_system_commercial_quota.sql',
    sourceBlob: '043a92254d71756e83739e94cad532e63c555f6f',
  },
  {
    source: '20260906003500_billing_self_serve_member_capacity.sql',
    target: '20260908003500_billing_self_serve_member_capacity.sql',
    sourceBlob: 'cb63c261c602ebbe052c3653b63a8efc177ffab7',
  },
  {
    source: '20260906004000_billing_document_storage_quota.sql',
    target: '20260908004000_billing_document_storage_quota.sql',
    sourceBlob: 'd77639186774755cb07e7da331f175030b02417d',
  },
  {
    source: '20260906004500_billing_entitlement_catalog_truth.sql',
    target: '20260908004500_billing_entitlement_catalog_truth.sql',
    sourceBlob: '10704bdc812aaf75c3e90c9a9d24173817f45827',
  },
  {
    source: '20260906005000_billing_initial_checkout_singleflight.sql',
    target: '20260908005000_billing_initial_checkout_singleflight.sql',
    sourceBlob: '5cc0f4d2831fd94ac4ff1e639a6db6f4d669b996',
  },
  {
    source: '20260906006000_billing_completed_checkout_authority_guard.sql',
    target: '20260908006000_billing_completed_checkout_authority_guard.sql',
    sourceBlob: '3a3ed99fa97117520b515fd85fec6acc01c399bd',
  },
  {
    source: '20260906006400_reconcile_paid_governance_runtime_foundations.sql',
    target: '20260908006400_reconcile_paid_governance_runtime_foundations.sql',
    sourceBlob: '6efd43f0e6d1943bc5882f7ee3c5d749398dceae',
  },
  {
    source: '20260906006500_billing_professional_task_plan_isolation.sql',
    target: '20260908006500_billing_professional_task_plan_isolation.sql',
    sourceBlob: '54d4c2d7944c68ece093988e7c6b863e444d88cc',
  },
  {
    source: '20260906006600_billing_business_feature_plan_isolation.sql',
    target: '20260908006600_billing_business_feature_plan_isolation.sql',
    sourceBlob: '5e8eac31df71dadc962a0cb6d105fbeaab2b81c9',
  },
  {
    source: '20260906006700_billing_governance_workflow_plan_isolation.sql',
    target: '20260908006700_billing_governance_workflow_plan_isolation.sql',
    sourceBlob: '9599cb78128856a711b7c7a08ca7f74eef60da72',
  },
  {
    source: '20260906006800_harden_cross_tenant_reference_integrity.sql',
    target: '20260908006800_harden_cross_tenant_reference_integrity.sql',
    sourceBlob: '2df91b10927effde5bed1de68e7df3d94118aed5',
  },
];

function fail(message) {
  throw new Error(message);
}

function currentGitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function gitBlobSha(relativePath) {
  try {
    return execFileSync('git', ['hash-object', '--', relativePath], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    fail(`Unable to hash migration source: ${relativePath}`);
  }
}

function migrationPath(filename) {
  return join('supabase', 'migrations', filename);
}

function assertTruthBoundary(config) {
  const truth = config?.truthBoundary ?? {};
  if (truth.automaticClassification !== false) fail('automaticClassification must remain false');
  if (truth.productionWriteAuthorizedByConfig !== false) fail('productionWriteAuthorizedByConfig must remain false');
  if (truth.migrationHistoryRepairAllowed !== false) fail('migrationHistoryRepairAllowed must remain false');
  if (truth.unrestrictedDbPushAllowed !== false) fail('unrestrictedDbPushAllowed must remain false');
  if (truth.onlyListedForwardMigrationsMayBeRehearsedOrRequested !== true) {
    fail('onlyListedForwardMigrationsMayBeRehearsedOrRequested must remain true');
  }
}

function verifyByteIdenticalReforward() {
  for (const pair of REFORWARD_PAIRS) {
    const sourcePath = migrationPath(pair.source);
    const targetPath = migrationPath(pair.target);
    const observedSourceBlob = gitBlobSha(sourcePath);
    const observedTargetBlob = gitBlobSha(targetPath);

    if (observedSourceBlob !== pair.sourceBlob) {
      fail(`Reviewed V39 source bytes drifted: ${pair.source}`);
    }
    if (observedTargetBlob !== observedSourceBlob) {
      fail(`V40 re-forward is not byte-identical to V39 source: ${pair.target}`);
    }

    const sourceBytes = readFileSync(join(ROOT, sourcePath));
    const targetBytes = readFileSync(join(ROOT, targetPath));
    if (!sourceBytes.equals(targetBytes)) {
      fail(`V40 byte comparison failed: ${pair.target}`);
    }

    const targetSql = targetBytes.toString('utf8');
    if (targetSql.includes('append_audit_event_chained')) {
      fail(`V40 migration would touch emergency audit-chain containment: ${pair.target}`);
    }

    const targetVersion = pair.target.slice(0, 14);
    if (targetVersion <= VERIFIED_PRODUCTION_LEDGER_HEAD) {
      fail(`V40 migration is not strictly forward of Production head ${VERIFIED_PRODUCTION_LEDGER_HEAD}: ${pair.target}`);
    }
  }
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (config.changeSet !== EXPECTED_CHANGE_SET) {
    fail(`Unexpected reconciliation changeSet: ${String(config.changeSet)}`);
  }
  if (config.sourceChangeSet !== SOURCE_CHANGE_SET) {
    fail(`Unexpected reconciliation sourceChangeSet: ${String(config.sourceChangeSet)}`);
  }
  assertTruthBoundary(config);

  const expectedSelected = [
    ...REFORWARD_PAIRS.map((pair) => pair.target),
    V41_ADVISOR_MIGRATION,
  ];
  const selected = (config.migrations ?? []).map((record) => record?.filename);
  if (JSON.stringify(selected) !== JSON.stringify(expectedSelected)) {
    fail(`bounded selected migration set drifted: expected ${expectedSelected.join(', ')}`);
  }

  const gitSha = currentGitSha();
  if (!gitSha || !/^[a-f0-9]{40}$/.test(gitSha)) fail('Unable to resolve an exact git HEAD');

  const expectedHeadSha = String(process.env.EXPECTED_HEAD_SHA ?? '').trim();
  if (expectedHeadSha) {
    if (!/^[a-f0-9]{40}$/.test(expectedHeadSha)) {
      fail('EXPECTED_HEAD_SHA must be a full 40-character Git SHA');
    }
    if (gitSha !== expectedHeadSha) {
      fail(`Exact-SHA mismatch: expected ${expectedHeadSha}, assessed ${gitSha}`);
    }
  }

  verifyByteIdenticalReforward();

  const manifest = await compileForwardReconciliationManifest({
    config,
    rootDir: ROOT,
    subjectSha: expectedHeadSha || gitSha,
  });

  const records = manifest.migrations.map((migration, index) => {
    const reforwardPair = REFORWARD_PAIRS[index] ?? null;
    return {
      position: index + 1,
      filename: migration.filename,
      timestamp: migration.version,
      bytes: migration.sizeBytes,
      sha256: migration.sha256,
      lineageKind: reforwardPair ? 'byte-identical-v40-reforward' : 'reviewed-v41-hardening',
      sourceFilename: reforwardPair?.source ?? null,
      sourceGitBlob: reforwardPair?.sourceBlob ?? null,
    };
  });

  const report = {
    schema: 'risck-comply.supabase-forward-reconciliation-evidence.v1',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
    gitSha,
    expectedHeadSha: expectedHeadSha || null,
    exactShaVerified: Boolean(expectedHeadSha && gitSha === expectedHeadSha),
    changeSet: EXPECTED_CHANGE_SET,
    sourceChangeSet: SOURCE_CHANGE_SET,
    v40SourceChangeSet: V40_SOURCE_CHANGE_SET,
    selectedCount: records.length,
    selectedSetSha256: manifest.selectionDigest.replace(/^sha256:/, ''),
    productionWriteAuthorized: false,
    migrationHistoryRepairAuthorized: false,
    unrestrictedDbPushAuthorized: false,
    automaticClassificationPerformed: false,
    humanDecisionRequired: true,
    productionLedgerHeadBeforeSelection: VERIFIED_PRODUCTION_LEDGER_HEAD,
    byteIdenticalReforwardVerified: true,
    byteIdenticalV40ReforwardCount: REFORWARD_PAIRS.length,
    appendedV41HardeningCount: 1,
    emergencyAuditContainmentPreserved: true,
    records,
  };

  const reportPath = String(process.env.SUPABASE_FORWARD_RECONCILIATION_REPORT ?? '').trim()
    || (process.argv.includes('--write') ? DEFAULT_REPORT_PATH : '');
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `selected_count=${records.length}\nselected_set_sha256=${report.selectedSetSha256}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }

  process.stdout.write(`Bounded Supabase forward reconciliation verified: ${records.length} migrations\n`);
  process.stdout.write(`Source change set: ${SOURCE_CHANGE_SET}\n`);
  process.stdout.write(`V40 source change set: ${V40_SOURCE_CHANGE_SET}\n`);
  process.stdout.write(`Production ledger head before selection: ${VERIFIED_PRODUCTION_LEDGER_HEAD}\n`);
  process.stdout.write(`Byte-identical V40 re-forward count: ${REFORWARD_PAIRS.length}\n`);
  process.stdout.write('Reviewed V41 advisor hardening count: 1\n');
  process.stdout.write('Emergency audit-chain containment preserved: true\n');
  process.stdout.write(`Selected-set SHA-256: ${report.selectedSetSha256}\n`);
  process.stdout.write('Production write authorization: false\n');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
