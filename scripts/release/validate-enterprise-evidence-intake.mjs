#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const REQUIRED_DOMAINS = [
  'repository-gates',
  'runtime-closeout',
  'migration-post-execution',
  'branch-protection',
  'backup-restore',
  'external-security-review',
  'qualified-legal-reviews',
  'release-approval',
  'security-approval',
  'operations-approval',
];

function fail(message) {
  console.error(`[enterprise-evidence-intake] ${message}`);
  process.exitCode = 1;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isIsoDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

const [inputPath, outputPath = 'enterprise-evidence-intake-result.json'] = process.argv.slice(2);
if (!inputPath) {
  fail('Usage: validate-enterprise-evidence-intake.mjs <intake.json> [output.json]');
} else {
  try {
    const intake = JSON.parse(await readFile(inputPath, 'utf8'));
    const expectedSha = process.env.EXPECTED_RELEASE_SHA || intake.releaseSha;
    const errors = [];
    const seenDigests = new Set();
    const seenReviewers = new Map();

    if (!/^[a-f0-9]{40}$/i.test(expectedSha || '')) errors.push('releaseSha must be a full commit SHA');
    if (intake.releaseSha !== expectedSha) errors.push('intake releaseSha does not match expected release SHA');
    if (!Array.isArray(intake.packets)) errors.push('packets must be an array');

    const packets = Array.isArray(intake.packets) ? intake.packets : [];
    const byDomain = new Map(packets.map((packet) => [packet.domain, packet]));

    for (const domain of REQUIRED_DOMAINS) {
      const packet = byDomain.get(domain);
      if (!packet) {
        errors.push(`missing packet: ${domain}`);
        continue;
      }
      if (packet.releaseSha !== expectedSha) errors.push(`${domain}: stale or mismatched releaseSha`);
      if (packet.status !== 'COMPLETE') errors.push(`${domain}: status must be COMPLETE`);
      if (packet.outcome !== 'passed') errors.push(`${domain}: outcome must be passed`);
      if (packet.synthetic === true || packet.template === true) errors.push(`${domain}: synthetic/template evidence rejected`);
      if (!packet.evidence || typeof packet.evidence !== 'object') errors.push(`${domain}: evidence object required`);
      if (!packet.provenance?.workflowRunId || !packet.provenance?.workflowUrl) errors.push(`${domain}: workflow provenance required`);
      if (!packet.reviewer?.id || packet.reviewer.id === packet.owner?.id) errors.push(`${domain}: independent reviewer required`);
      if (!isIsoDate(packet.reviewedAt)) errors.push(`${domain}: reviewedAt must be ISO date`);
      if (!isIsoDate(packet.validUntil) || Date.parse(packet.validUntil) <= Date.now()) errors.push(`${domain}: evidence expired or invalid`);

      const evidenceDigest = packet.evidenceDigest || digest(packet.evidence);
      if (seenDigests.has(evidenceDigest)) errors.push(`${domain}: duplicate evidence digest`);
      seenDigests.add(evidenceDigest);

      if (packet.reviewer?.id) {
        const domains = seenReviewers.get(packet.reviewer.id) || [];
        domains.push(domain);
        seenReviewers.set(packet.reviewer.id, domains);
      }
    }

    const accepted = errors.length === 0;
    const result = {
      schemaVersion: 1,
      releaseSha: expectedSha,
      accepted,
      decisionCandidate: accepted ? 'READY_FOR_ENTERPRISE_FINAL_DECISION' : 'EVIDENCE_INTAKE_REJECTED',
      acceptedDomains: accepted ? REQUIRED_DOMAINS : REQUIRED_DOMAINS.filter((domain) => byDomain.get(domain)?.status === 'COMPLETE'),
      errors,
      packetCount: packets.length,
      uniqueEvidenceDigests: seenDigests.size,
      intakeDigest: digest(intake),
      generatedAt: new Date().toISOString(),
      enterpriseGoGrantedByThisArtifact: false,
      repositoryChecksAreRuntimeProof: false,
    };

    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    if (!accepted) fail(`${errors.length} validation error(s); see ${outputPath}`);
    else console.log(`Enterprise evidence intake accepted for ${expectedSha}`);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
