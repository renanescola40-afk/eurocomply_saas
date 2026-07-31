import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SCHEMA = 'risck-comply.enterprise-closeout-queue.v1';
const CONTROL_DOMAINS = [
  ['repositoryGates', 'engineering', 90],
  ['runtimeCloseout', 'operations', 100],
  ['migrationPostExecution', 'database', 100],
  ['branchProtection', 'repository-owner', 95],
  ['backupRestore', 'operations', 100],
  ['externalSecurityReview', 'security-reviewer', 90],
  ['qualifiedLegalReviews', 'qualified-legal-reviewers', 90],
  ['releaseApproval', 'release-manager', 100],
  ['securityApproval', 'security-approver', 100],
  ['operationsApproval', 'operations-approver', 100],
];

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function buildEnterpriseCloseoutQueue({ decision, expectedSha, now = new Date() }) {
  const failures = [];
  if (!decision || typeof decision !== 'object') failures.push('decision_document_required');
  if (!nonEmpty(expectedSha)) failures.push('expected_sha_required');
  if (decision?.releaseSha !== expectedSha) failures.push('release_sha_mismatch');
  if (!['ENTERPRISE_GO', 'ENTERPRISE_NO_GO'].includes(decision?.decision)) failures.push('invalid_enterprise_decision');

  const controls = decision?.controls && typeof decision.controls === 'object' ? decision.controls : {};
  const queue = CONTROL_DOMAINS.map(([control, defaultOwner, priority]) => {
    const evidence = controls[control] ?? {};
    const passed = evidence.status === 'PASS' && evidence.outcome === 'passed';
    const owner = nonEmpty(evidence.requiredOwner) ? evidence.requiredOwner : defaultOwner;
    const reason = passed ? null : (evidence.reason ?? evidence.blocker ?? 'accepted_evidence_missing');
    const external = ['repository-owner', 'security-reviewer', 'qualified-legal-reviewers'].includes(owner)
      || evidence.ownerControlled === true;
    return {
      control,
      state: passed ? 'COMPLETE' : (external ? 'OWNER_ACTION_REQUIRED' : 'EXECUTION_REQUIRED'),
      priority,
      requiredOwner: owner,
      reason,
      requiredAction: passed ? null : (evidence.requiredAction ?? `Complete ${control} evidence for the exact release SHA.`),
      requiredEvidence: passed ? null : (evidence.requiredEvidence ?? `${control} PASS/passed evidence bound to ${expectedSha}`),
      sourceEvidenceDigest: nonEmpty(evidence.digest) ? evidence.digest : null,
      expiresAt: evidence.expiresAt ?? null,
      releaseImpact: passed ? 'none' : 'blocks_enterprise_go',
    };
  }).sort((a, b) => b.priority - a.priority || a.control.localeCompare(b.control));

  const incomplete = queue.filter((item) => item.state !== 'COMPLETE');
  const completed = queue.length - incomplete.length;
  const progressPercent = Math.round((completed / queue.length) * 100);
  const result = {
    schema: SCHEMA,
    generatedAt: now.toISOString(),
    releaseSha: expectedSha,
    sourceDecision: decision?.decision ?? null,
    sourceDecisionDigest: digest(decision ?? null),
    status: failures.length ? 'INVALID' : incomplete.length ? 'BLOCKED' : 'READY_FOR_FINAL_APPROVAL',
    progressPercent,
    counts: {
      total: queue.length,
      complete: completed,
      executionRequired: queue.filter((item) => item.state === 'EXECUTION_REQUIRED').length,
      ownerActionRequired: queue.filter((item) => item.state === 'OWNER_ACTION_REQUIRED').length,
    },
    failures,
    queue,
    safety: {
      evidenceGenerated: false,
      productionChanged: false,
      approvalsGranted: false,
      enterpriseGoGrantedByThisArtifact: false,
    },
  };
  result.queueDigest = digest({ releaseSha: result.releaseSha, queue: result.queue });
  return result;
}

export async function writeCloseoutQueue(outputDir, result) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'enterprise-closeout-queue.json'), `${JSON.stringify(result, null, 2)}\n`);
  const pending = result.queue.filter((item) => item.state !== 'COMPLETE');
  const lines = [
    '# Enterprise closeout execution queue', '',
    `- Release SHA: \`${result.releaseSha}\``,
    `- Status: \`${result.status}\``,
    `- Progress: ${result.progressPercent}%`,
    `- Remaining controls: ${pending.length}`, '',
  ];
  for (const item of pending) {
    lines.push(`## ${item.control}`, '', `- State: \`${item.state}\``, `- Owner: ${item.requiredOwner}`, `- Action: ${item.requiredAction}`, `- Evidence: ${item.requiredEvidence}`, '');
  }
  lines.push('This queue does not create evidence, approve controls, modify production, or grant Enterprise GO.', '');
  await writeFile(path.join(outputDir, 'enterprise-closeout-queue.md'), lines.join('\n'));
}

async function runCli() {
  const [decisionPath = 'artifacts/enterprise-final-decision/enterprise-final-decision.json', outputDir = 'artifacts/enterprise-closeout-queue'] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const expectedSha = process.argv.find((arg) => arg.startsWith('--expected-sha='))?.split('=')[1] ?? process.env.TARGET_SHA ?? process.env.GITHUB_SHA;
  try {
    const decision = JSON.parse(await readFile(decisionPath, 'utf8'));
    const result = buildEnterpriseCloseoutQueue({ decision, expectedSha });
    await writeCloseoutQueue(outputDir, result);
    console.log(JSON.stringify(result, null, 2));
    if (result.failures.length) process.exit(2);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
