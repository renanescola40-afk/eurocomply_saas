#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));

const inputPath = path.resolve(String(args.input || 'enterprise-closeout-queue.json'));
const outputDir = path.resolve(String(args.output || 'artifacts/enterprise-owner-execution-packets'));
const expectedSha = String(args.sha || process.env.GITHUB_SHA || '').trim();

function fail(message) {
  console.error(`[owner-packets] ${message}`);
  process.exit(1);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

if (!expectedSha || !/^[a-f0-9]{40}$/i.test(expectedSha)) fail('A valid exact 40-character SHA is required.');
if (!fs.existsSync(inputPath)) fail(`Closeout queue not found: ${inputPath}`);

const raw = fs.readFileSync(inputPath, 'utf8');
let queue;
try { queue = JSON.parse(raw); } catch { fail('Closeout queue must be valid JSON.'); }

const queueSha = queue.sha || queue.releaseSha || queue.commitSha;
if (queueSha !== expectedSha) fail(`Queue SHA ${queueSha || '<missing>'} does not match expected SHA ${expectedSha}.`);
if (!Array.isArray(queue.items) || queue.items.length === 0) fail('Closeout queue must contain non-empty items.');

const ownerDefaults = {
  repository_gates: 'Release Engineering',
  runtime_closeout: 'SRE / Operations',
  migration_post_execution: 'Database Operations',
  branch_protection: 'Repository Owner',
  backup_restore: 'SRE / Database Operations',
  external_security_review: 'Security Owner',
  qualified_legal_reviews: 'Legal / Compliance Owner',
  release_approval: 'Release Approver',
  security_approval: 'Security Approver',
  operations_approval: 'Operations Approver',
};

const dependencyMap = {
  runtime_closeout: ['repository_gates'],
  migration_post_execution: ['repository_gates'],
  backup_restore: ['runtime_closeout'],
  external_security_review: ['repository_gates'],
  qualified_legal_reviews: ['repository_gates'],
  release_approval: ['runtime_closeout', 'migration_post_execution', 'branch_protection', 'backup_restore'],
  security_approval: ['external_security_review', 'runtime_closeout', 'branch_protection'],
  operations_approval: ['runtime_closeout', 'migration_post_execution', 'backup_restore'],
};

const now = new Date();
const packets = queue.items.map((item, index) => {
  const domain = String(item.domain || item.id || '').trim();
  if (!domain) fail(`Queue item ${index} has no domain.`);
  const state = String(item.state || item.status || '').trim();
  if (!['COMPLETE', 'EXECUTION_REQUIRED', 'OWNER_ACTION_REQUIRED'].includes(state)) {
    fail(`Queue item ${domain} has unsupported state: ${state || '<missing>'}.`);
  }

  const owner = String(item.owner || ownerDefaults[domain] || '').trim();
  if (!owner) fail(`Queue item ${domain} has no accountable owner.`);

  const dueDays = state === 'COMPLETE' ? 0 : Number(item.dueDays || (state === 'EXECUTION_REQUIRED' ? 7 : 14));
  if (!Number.isFinite(dueDays) || dueDays < 0 || dueDays > 90) fail(`Queue item ${domain} has invalid dueDays.`);
  const dueAt = state === 'COMPLETE' ? null : new Date(now.getTime() + dueDays * 86400000).toISOString();

  const requiredEvidence = Array.isArray(item.requiredEvidence)
    ? item.requiredEvidence.filter(Boolean)
    : [item.requiredEvidence || item.evidenceRequired].filter(Boolean);
  if (state !== 'COMPLETE' && requiredEvidence.length === 0) fail(`Queue item ${domain} requires explicit evidence.`);

  const packet = {
    schemaVersion: 1,
    packetId: `${expectedSha.slice(0, 12)}:${domain}`,
    releaseSha: expectedSha,
    domain,
    state,
    accountableOwner: owner,
    independentReviewerRequired: state !== 'COMPLETE',
    independentReviewer: null,
    dependencies: dependencyMap[domain] || [],
    requiredAction: state === 'COMPLETE' ? null : String(item.requiredAction || item.action || '').trim(),
    requiredEvidence,
    acceptanceCriteria: Array.isArray(item.acceptanceCriteria)
      ? item.acceptanceCriteria.filter(Boolean)
      : [
          'Evidence is genuine, current, and bound to the exact release SHA.',
          'Evidence includes provenance and an immutable digest.',
          'An independent reviewer accepts the evidence without unresolved critical findings.',
          'The authoritative Enterprise Final Decision is recompiled after acceptance.',
        ],
    prohibitedSubstitutions: [
      'Repository checks cannot substitute for production runtime evidence.',
      'Templates, comments, screenshots without provenance, and self-attestation cannot satisfy the control.',
      'A stale SHA or copied evidence cannot satisfy the packet.',
    ],
    createdAt: now.toISOString(),
    dueAt,
    expiresAt: state === 'COMPLETE' ? null : new Date(now.getTime() + 30 * 86400000).toISOString(),
    completion: {
      completed: state === 'COMPLETE',
      completedAt: state === 'COMPLETE' ? now.toISOString() : null,
      evidenceDigests: [],
      reviewerDecision: state === 'COMPLETE' ? 'SOURCE_QUEUE_COMPLETE' : null,
    },
  };

  if (state !== 'COMPLETE' && !packet.requiredAction) fail(`Queue item ${domain} requires an explicit action.`);
  return packet;
});

const ids = new Set(packets.map((packet) => packet.packetId));
if (ids.size !== packets.length) fail('Duplicate execution packet IDs detected.');

const domains = new Set(packets.map((packet) => packet.domain));
for (const packet of packets) {
  for (const dependency of packet.dependencies) {
    if (!domains.has(dependency)) fail(`Packet ${packet.domain} depends on missing domain ${dependency}.`);
  }
}

fs.mkdirSync(outputDir, { recursive: true });
for (const packet of packets) {
  const body = `${JSON.stringify(packet, null, 2)}\n`;
  fs.writeFileSync(path.join(outputDir, `${packet.domain}.json`), body);
}

const summary = {
  schemaVersion: 1,
  releaseSha: expectedSha,
  sourceQueueDigest: digest(raw),
  generatedAt: now.toISOString(),
  totalPackets: packets.length,
  completePackets: packets.filter((packet) => packet.state === 'COMPLETE').length,
  executionRequired: packets.filter((packet) => packet.state === 'EXECUTION_REQUIRED').length,
  ownerActionRequired: packets.filter((packet) => packet.state === 'OWNER_ACTION_REQUIRED').length,
  percentComplete: Math.round((packets.filter((packet) => packet.state === 'COMPLETE').length / packets.length) * 100),
  enterpriseGoGrantedByThisArtifact: false,
  packets: packets.map((packet) => ({
    packetId: packet.packetId,
    domain: packet.domain,
    state: packet.state,
    accountableOwner: packet.accountableOwner,
    dependencies: packet.dependencies,
    dueAt: packet.dueAt,
  })),
};
const summaryBody = `${JSON.stringify(summary, null, 2)}\n`;
fs.writeFileSync(path.join(outputDir, 'summary.json'), summaryBody);
fs.writeFileSync(path.join(outputDir, 'SHA256SUMS'), `${digest(summaryBody)}  summary.json\n`);

console.log(JSON.stringify(summary, null, 2));
