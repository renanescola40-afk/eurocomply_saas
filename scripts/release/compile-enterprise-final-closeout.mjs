#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_DOMAINS = [
  'repository_gates',
  'runtime_closeout',
  'migration_post_execution',
  'branch_protection',
  'backup_restore',
  'external_security_review',
  'qualified_legal_review',
  'release_approval',
  'security_approval',
  'operations_approval',
];

const argv = process.argv.slice(2);
const inputIndex = argv.indexOf('--input');
const outputIndex = argv.indexOf('--output');
const shaIndex = argv.indexOf('--sha');

if (inputIndex < 0 || outputIndex < 0 || shaIndex < 0) {
  console.error('Usage: compile-enterprise-final-closeout.mjs --input <dir> --output <dir> --sha <40-char-sha>');
  process.exit(2);
}

const inputDir = path.resolve(argv[inputIndex + 1]);
const outputDir = path.resolve(argv[outputIndex + 1]);
const expectedSha = argv[shaIndex + 1];

if (!/^[0-9a-f]{40}$/i.test(expectedSha)) {
  throw new Error('Expected SHA must be a full 40-character commit SHA');
}

const readJson = (name) => {
  const file = path.join(inputDir, name);
  if (!fs.existsSync(file)) throw new Error(`Missing required artifact: ${name}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const stableDigest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const now = new Date();
const intake = readJson('enterprise-evidence-intake.json');
const decision = readJson('enterprise-final-decision.json');
const queue = readJson('enterprise-closeout-queue.json');

const blockers = [];
const evidenceDigests = new Set();

const assertSha = (name, value) => {
  if (value !== expectedSha) blockers.push(`${name}: SHA mismatch (${value ?? 'missing'})`);
};

assertSha('intake', intake.sha);
assertSha('decision', decision.sha);
assertSha('queue', queue.sha);

if (intake.accepted !== true) blockers.push('Evidence intake was not accepted');
if (intake.enterpriseGoGrantedByThisArtifact !== false) blockers.push('Evidence intake truth boundary was modified');
if (intake.repositoryChecksAreRuntimeProof !== false) blockers.push('Repository checks were incorrectly treated as runtime proof');

const domains = Array.isArray(intake.domains) ? intake.domains : [];
for (const domain of REQUIRED_DOMAINS) {
  const record = domains.find((entry) => entry?.domain === domain);
  if (!record) {
    blockers.push(`${domain}: missing intake record`);
    continue;
  }
  if (record.status !== 'COMPLETE' || record.outcome !== 'passed') blockers.push(`${domain}: not COMPLETE/passed`);
  if (!record.owner || !record.reviewer || record.owner === record.reviewer) blockers.push(`${domain}: independent owner/reviewer required`);
  if (!record.workflowRunUrl || !/^https:\/\/github\.com\//.test(record.workflowRunUrl)) blockers.push(`${domain}: workflow provenance missing`);
  if (!record.evidenceDigest || !/^[0-9a-f]{64}$/i.test(record.evidenceDigest)) blockers.push(`${domain}: invalid evidence digest`);
  else if (evidenceDigests.has(record.evidenceDigest)) blockers.push(`${domain}: duplicate evidence digest`);
  else evidenceDigests.add(record.evidenceDigest);
  if (!record.expiresAt || new Date(record.expiresAt) <= now) blockers.push(`${domain}: evidence expired or expiry missing`);
  if (record.synthetic === true || record.template === true) blockers.push(`${domain}: synthetic/template evidence rejected`);
  assertSha(domain, record.sha);
}

if (decision.decision !== 'ENTERPRISE_GO') blockers.push('Authoritative final decision is not ENTERPRISE_GO');
if (decision.enterpriseGoGrantedByThisArtifact !== true) blockers.push('Authoritative decision does not grant Enterprise GO');
if (decision.unresolvedRiskAcceptance === true) blockers.push('Unresolved risk acceptance remains open');

const queueItems = Array.isArray(queue.items) ? queue.items : [];
if (queueItems.length !== REQUIRED_DOMAINS.length) blockers.push('Closeout queue does not contain exactly ten domains');
for (const domain of REQUIRED_DOMAINS) {
  const item = queueItems.find((entry) => entry?.domain === domain);
  if (!item || item.state !== 'COMPLETE') blockers.push(`${domain}: closeout queue not COMPLETE`);
}

const result = {
  schemaVersion: 1,
  generatedAt: now.toISOString(),
  sha: expectedSha,
  status: blockers.length === 0 ? 'CLOSED' : 'BLOCKED',
  enterpriseGo: blockers.length === 0,
  completedDomains: REQUIRED_DOMAINS.length - blockers.filter((value) => REQUIRED_DOMAINS.some((domain) => value.startsWith(`${domain}:`))).length,
  totalDomains: REQUIRED_DOMAINS.length,
  blockers,
  sourceDigests: {
    intake: stableDigest(intake),
    decision: stableDigest(decision),
    queue: stableDigest(queue),
  },
  truthBoundary: {
    repositoryChecksAreRuntimeProof: false,
    customerSpecificLegalComplianceProven: false,
    productionWritePerformed: false,
  },
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'enterprise-final-closeout.json'), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(
  path.join(outputDir, 'enterprise-final-closeout.md'),
  `# Enterprise Final Closeout\n\n- SHA: \`${expectedSha}\`\n- Status: **${result.status}**\n- Enterprise GO: **${result.enterpriseGo ? 'YES' : 'NO'}**\n- Domains: ${result.completedDomains}/${result.totalDomains}\n\n## Blockers\n\n${blockers.length ? blockers.map((item) => `- ${item}`).join('\n') : '- None'}\n`,
);

if (blockers.length > 0) {
  console.error(`Enterprise final closeout blocked by ${blockers.length} condition(s).`);
  process.exit(1);
}

console.log('Enterprise final closeout compiled successfully.');
