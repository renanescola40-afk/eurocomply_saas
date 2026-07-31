#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^[0-9a-f]{64}$/;
const REQUIRED_CONTROLS = [
  'repositoryGates',
  'runtimeCloseout',
  'migrationPostExecution',
  'branchProtection',
  'backupRestore',
  'externalSecurityReview',
  'qualifiedLegalReviews',
  'releaseApproval',
  'securityApproval',
  'operationsApproval',
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const validTimestamp = (value) => nonEmpty(value) && !Number.isNaN(Date.parse(value));

function normalizeControl(name, control, releaseSha) {
  const failures = [];
  if (!control || typeof control !== 'object' || Array.isArray(control)) {
    return { name, status: 'BLOCKED', failures: [`${name}_missing`], evidence: null };
  }
  if (control.status !== 'PASS') failures.push(`${name}_status_not_pass`);
  if (control.outcome !== 'passed') failures.push(`${name}_outcome_not_passed`);
  if (control.releaseSha !== releaseSha) failures.push(`${name}_sha_mismatch`);
  if (!DIGEST_RE.test(control.evidenceDigest ?? '')) failures.push(`${name}_digest_invalid`);
  if (!nonEmpty(control.evidenceUrl)) failures.push(`${name}_evidence_url_missing`);
  if (!validTimestamp(control.observedAt)) failures.push(`${name}_observed_at_invalid`);
  if (!nonEmpty(control.owner)) failures.push(`${name}_owner_missing`);
  if (control.synthetic === true) failures.push(`${name}_synthetic_evidence_forbidden`);
  return {
    name,
    status: failures.length === 0 ? 'PASS' : 'BLOCKED',
    failures,
    evidence: control,
  };
}

function distinctApprovers(approvals) {
  const names = approvals.map((item) => item?.approver?.trim().toLowerCase()).filter(Boolean);
  return names.length === new Set(names).size;
}

export function evaluateEnterpriseFinalDecision({ packet, packetBytes, expectedReleaseSha, now = new Date() }) {
  const failures = [];
  const blockers = [];
  const releaseSha = packet?.releaseSha;

  if (!SHA_RE.test(releaseSha ?? '')) failures.push('release_sha_invalid');
  if (expectedReleaseSha && releaseSha !== expectedReleaseSha) failures.push('release_sha_not_expected');
  if (packet?.schema !== 'risck-comply.enterprise-final-decision-input.v1') failures.push('schema_invalid');
  if (packet?.status !== 'READY_FOR_FINAL_DECISION') blockers.push('packet_not_ready_for_final_decision');

  const controls = REQUIRED_CONTROLS.map((name) => normalizeControl(name, packet?.controls?.[name], releaseSha));
  for (const control of controls) {
    failures.push(...control.failures);
    if (control.status !== 'PASS') blockers.push(`control_blocked:${control.name}`);
  }

  const digests = controls.map((control) => control.evidence?.evidenceDigest).filter((value) => DIGEST_RE.test(value ?? ''));
  if (digests.length !== new Set(digests).size) failures.push('duplicate_evidence_digest');

  const approvals = ['releaseApproval', 'securityApproval', 'operationsApproval']
    .map((name) => packet?.controls?.[name]);
  if (!distinctApprovers(approvals)) failures.push('independent_approvers_required');

  const expiry = packet?.validUntil;
  if (!validTimestamp(expiry)) failures.push('valid_until_invalid');
  else if (new Date(expiry) <= now) blockers.push('decision_packet_expired');

  if (packet?.riskAcceptance?.accepted === true) {
    blockers.push('unresolved_risk_acceptance_not_allowed_for_enterprise_go');
  }

  const accepted = failures.length === 0 && blockers.length === 0;
  return {
    schema: 'risck-comply.enterprise-final-decision.v1',
    generatedAt: now.toISOString(),
    releaseSha: SHA_RE.test(releaseSha ?? '') ? releaseSha : null,
    inputDigest: sha256(packetBytes),
    decision: accepted ? 'ENTERPRISE_GO' : 'ENTERPRISE_NO_GO',
    accepted,
    failures: [...new Set(failures)].sort(),
    blockers: [...new Set(blockers)].sort(),
    controls: controls.map(({ name, status, failures: controlFailures, evidence }) => ({
      name,
      status,
      failures: controlFailures,
      evidenceDigest: evidence?.evidenceDigest ?? null,
      evidenceUrl: evidence?.evidenceUrl ?? null,
      observedAt: evidence?.observedAt ?? null,
      owner: evidence?.owner ?? null,
    })),
    safety: {
      repositoryChecksAloneAreSufficient: false,
      syntheticEvidenceAccepted: false,
      automaticProductionWriteAllowed: false,
      legalComplianceDeclared: false,
      enterpriseGoRequiresAllControls: true,
    },
  };
}

export async function writeDecisionArtifacts(outputDir, result) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'enterprise-final-decision.json'), `${JSON.stringify(result, null, 2)}\n`);
  const blocked = result.controls.filter((control) => control.status !== 'PASS');
  const summary = [
    '# Enterprise final decision',
    '',
    `- Decision: \`${result.decision}\``,
    `- Release SHA: \`${result.releaseSha ?? 'invalid'}\``,
    `- Failures: ${result.failures.length}`,
    `- Blockers: ${result.blockers.length}`,
    `- Controls passed: ${result.controls.length - blocked.length}/${result.controls.length}`,
    '',
    ...(blocked.length ? ['## Blocked controls', '', ...blocked.map((control) => `- ${control.name}: ${control.failures.join(', ') || 'blocked'}`), ''] : []),
    'No repository check, template, self-attestation or synthetic evidence can independently produce Enterprise GO.',
    '',
  ].join('\n');
  await writeFile(path.join(outputDir, 'summary.md'), summary);
}

async function runCli() {
  const args = process.argv.slice(2);
  const allowNoGo = args.includes('--allow-no-go');
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const inputPath = positional[0] ?? 'docs/security/evidence/templates/enterprise-final-decision-input.json';
  const outputDir = positional[1] ?? 'artifacts/enterprise-final-decision';
  const expectedArg = args.find((arg) => arg.startsWith('--expected-sha='));
  const expectedReleaseSha = expectedArg?.split('=')[1] ?? process.env.TARGET_SHA ?? process.env.GITHUB_SHA;
  try {
    const packetBytes = await readFile(inputPath);
    const packet = JSON.parse(packetBytes.toString('utf8'));
    const result = evaluateEnterpriseFinalDecision({ packet, packetBytes, expectedReleaseSha });
    await writeDecisionArtifacts(outputDir, result);
    console.log(JSON.stringify(result, null, 2));
    if (!result.accepted && !allowNoGo) process.exit(2);
  } catch (error) {
    console.error(`Enterprise final decision compilation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
