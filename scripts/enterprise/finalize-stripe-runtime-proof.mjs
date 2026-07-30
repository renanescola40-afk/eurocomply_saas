#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'artifacts/stripe-runtime-proof');
const proofPath = resolve(outputDir, 'proof.json');
const evidencePath = resolve(outputDir, 'evidence.json');
const summaryPath = resolve(outputDir, 'summary.md');
const catalogPath = resolve(outputDir, 'catalog.txt');

function readRequiredJson(filePath, label) {
  let source;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`${label} not found: ${filePath}`, { cause: error });
    }
    throw error;
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${filePath}`, { cause: error });
  }
}

function fileIsAbsent(filePath) {
  try {
    statSync(filePath);
    return false;
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
}

function writeTextAtomic(targetPath, content) {
  const tempPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tempPath, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    renameSync(tempPath, targetPath);
  } catch (error) {
    rmSync(tempPath, { force: true });
    throw error;
  }
}

const proof = readRequiredJson(proofPath, 'Stripe runtime proof');
const evidence = readRequiredJson(evidencePath, 'Stripe runtime evidence');
const rawEvidenceDeleted = fileIsAbsent(catalogPath);

const requiredPromotionChecks = [
  'eventProcessed',
  'snapshotObserved',
  'policyObserved',
  'limitsMatch',
  'reconciliationObserved',
  'rawEvidenceDeleted',
];

evidence.checks = {
  ...(evidence.checks ?? {}),
  rawEvidenceDeleted,
};

const failedPromotionChecks = requiredPromotionChecks.filter((name) => evidence.checks?.[name] !== true);
const passed =
  failedPromotionChecks.length === 0 &&
  evidence.stripeTestModeConfirmed === true &&
  /^[0-9a-f]{40}$/i.test(String(evidence.releaseSha ?? ''));

const finalizedAt = new Date().toISOString();
evidence.status = passed ? 'Complete' : 'Open';
evidence.validationStatus = passed ? 'passed' : 'failed';
evidence.outcome = passed ? 'passed' : 'failed';
evidence.reviewedAt = finalizedAt;
evidence.failedChecks = failedPromotionChecks;
evidence.containsSensitiveValues = false;
evidence.runtimeProof = {
  ...(evidence.runtimeProof ?? {}),
  executed: true,
  headSha: evidence.releaseSha,
  artifactDigest: `sha256:${evidence.catalogSha256}`,
};

proof.status = passed ? 'Complete' : 'Open';
proof.validationStatus = passed ? 'passed' : 'failed';
proof.finalizedAt = finalizedAt;
proof.failedChecks = [
  ...Object.entries(proof.checks ?? {}).filter(([, ok]) => ok !== true).map(([name]) => name),
  ...(rawEvidenceDeleted ? [] : ['rawEvidenceDeleted']),
];
proof.evidenceIntegrity = {
  ...(proof.evidenceIntegrity ?? {}),
  rawCatalogDeleted: rawEvidenceDeleted,
};
proof.truthBoundary = {
  ...(proof.truthBoundary ?? {}),
  provesSingleObservedEvent: passed,
  provesReplaySafety: evidence.checks?.replaySafe === true,
};

writeTextAtomic(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
writeTextAtomic(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeTextAtomic(summaryPath, [
  '# Stripe entitlement runtime proof',
  '',
  `- Status: **${proof.status}**`,
  `- Validation: **${proof.validationStatus}**`,
  `- Release SHA: \`${proof.releaseSha}\``,
  `- Environment: \`${proof.targetEnvironment}\``,
  `- Event suffix: \`${proof.stripe?.eventIdSuffix ?? 'unknown'}\``,
  `- Organisation suffix: \`${proof.organization?.idSuffix ?? 'unknown'}\``,
  `- Catalog SHA-256: \`${proof.evidenceIntegrity?.catalogSha256 ?? 'missing'}\``,
  `- Raw catalog deleted: **${rawEvidenceDeleted ? 'yes' : 'no'}**`,
  '',
  '## Runtime controls',
  '',
  ...Object.entries(proof.checks ?? {}).map(([name, ok]) => `- ${ok ? 'PASS' : 'FAIL'} — ${name}`),
  `- ${rawEvidenceDeleted ? 'PASS' : 'FAIL'} — rawEvidenceDeleted`,
  '',
  passed
    ? 'The exact-SHA, test-mode Stripe event is correlated to its entitlement snapshot, canonical seat policy and reconciliation evidence.'
    : `Proof remains open: ${proof.failedChecks.join(', ') || 'unknown control'}.`,
  '',
  'Replay safety is a separate observed control and is not inferred from this single-delivery proof.',
  'This artifact does not prove all future events, production load capacity, contractual authority or legal compliance.',
].join('\n'));

console.log(JSON.stringify({
  status: proof.status,
  validationStatus: proof.validationStatus,
  promotionChecks: evidence.checks,
  failedChecks: proof.failedChecks,
  rawEvidenceDeleted,
}, null, 2));
