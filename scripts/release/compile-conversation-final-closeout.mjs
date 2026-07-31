#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [targetSha, evidenceDir = 'docs/security/evidence/accepted', outputDir = 'artifacts/conversation-final-closeout'] = process.argv.slice(2);
if (!/^[a-f0-9]{40}$/.test(targetSha ?? '')) throw new Error('A full 40-character target SHA is required.');

const controls = [
  ['repository', 'enterprise-final-closeout.json'],
  ['runtime', 'enterprise-runtime-closeout.json'],
  ['migrations', 'supabase-production-migration-attestation.json'],
  ['rls', 'supabase-live-rls-validation.json'],
  ['backupRestore', 'backup-restore-tested.json'],
  ['billing', 'stripe-production-validation.json'],
  ['observability', 'observability-production-validation.json'],
  ['externalSecurity', 'external-security-review.json'],
  ['legal', 'qualified-legal-review.json'],
  ['approvals', 'enterprise-final-approvals.json'],
];

const blockers = [];
const accepted = [];
const digests = new Set();

for (const [domain, filename] of controls) {
  const file = path.join(evidenceDir, filename);
  let raw;
  try { raw = await readFile(file, 'utf8'); }
  catch { blockers.push({ domain, code: 'MISSING_EVIDENCE', file }); continue; }

  let evidence;
  try { evidence = JSON.parse(raw); }
  catch { blockers.push({ domain, code: 'INVALID_JSON', file }); continue; }

  const sha = evidence.commitSha ?? evidence.sha ?? evidence.targetSha;
  if (sha !== targetSha) blockers.push({ domain, code: 'SHA_MISMATCH', expected: targetSha, observed: sha ?? null });
  if (!['Complete', 'COMPLETE', 'passed', 'PASS', 'CLOSED'].includes(evidence.status) && evidence.outcome !== 'passed') {
    blockers.push({ domain, code: 'NOT_PASSED', status: evidence.status ?? null, outcome: evidence.outcome ?? null });
  }
  if (evidence.synthetic === true || evidence.template === true) blockers.push({ domain, code: 'NON_REAL_EVIDENCE' });
  if (evidence.expiresAt && Date.parse(evidence.expiresAt) <= Date.now()) blockers.push({ domain, code: 'EXPIRED' });
  if (evidence.owner && evidence.reviewer && evidence.owner === evidence.reviewer) blockers.push({ domain, code: 'SELF_REVIEWED' });

  const digest = createHash('sha256').update(raw).digest('hex');
  if (digests.has(digest)) blockers.push({ domain, code: 'DUPLICATE_EVIDENCE_DIGEST', digest });
  digests.add(digest);
  accepted.push({ domain, file, digest });
}

const status = blockers.length === 0 ? 'CLOSED' : 'BLOCKED';
const result = {
  schema: 'risck-comply.conversation-final-closeout.v1',
  generatedAt: new Date().toISOString(),
  targetSha,
  status,
  repositoryControlledWorkComplete: true,
  enterpriseGo: blockers.length === 0,
  acceptedControls: accepted,
  blockers,
  truthBoundary: {
    repositoryChecksAreRuntimeProof: false,
    customerSpecificLegalComplianceProven: false,
    euAiActComplianceGuaranteed: false,
    externalCertificationGranted: false,
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'conversation-final-closeout.json'), JSON.stringify(result, null, 2) + '\n');
const markdown = `# Conversation final closeout\n\n- Target SHA: \`${targetSha}\`\n- Status: **${status}**\n- Enterprise GO: **${result.enterpriseGo}**\n- Accepted controls: ${accepted.length}/${controls.length}\n- Blockers: ${blockers.length}\n\n${blockers.map((b) => `- ${b.domain}: ${b.code}`).join('\n') || '- None'}\n`;
await writeFile(path.join(outputDir, 'conversation-final-closeout.md'), markdown);
process.stdout.write(markdown);
if (blockers.length > 0) process.exitCode = 2;
