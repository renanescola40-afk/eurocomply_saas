#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registryPath = resolve(root, 'docs/compliance/evidence/qualified-review-campaign-registry.json');
const outputJson = process.env.QUALIFIED_REVIEW_OPERATIONS_JSON || resolve(root, 'artifacts/qualified-review-operations/report.json');
const outputMarkdown = process.env.QUALIFIED_REVIEW_OPERATIONS_MARKDOWN || resolve(root, 'artifacts/qualified-review-operations/report.md');
const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '0'.repeat(40);

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const requirements = registry.requirements ?? registry.workstreams ?? [];
const rows = requirements.map((item) => ({
  id: item.id ?? item.workstreamId,
  workstreamId: item.workstreamId ?? item.id,
  weight: Number(item.weight ?? 0),
  status: 'AWAITING_REAL_REVIEWER',
  blocker: 'Named qualified independent reviewer and accepted exact-SHA opinion required.',
}));
const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
const report = {
  schema: 'risck-comply.qualified-review-operations-report.v1',
  generatedAt: new Date().toISOString(),
  targetSha,
  status: 'NO_GO',
  totalHumanReviewWeight: totalWeight || 51,
  acceptedWeight: 0,
  remainingWeight: totalWeight || 51,
  requirements: rows,
  truthBoundary: 'This report creates assignments and operational readiness only. It does not claim that any legal or methodology review occurred.',
};

const markdown = [
  '# Qualified Review Operations Report',
  '',
  `- Target SHA: \`${targetSha}\``,
  `- Status: **${report.status}**`,
  `- Accepted qualified-review weight: **${report.acceptedWeight}%**`,
  `- Remaining qualified-review weight: **${report.remainingWeight}%**`,
  '',
  '| Workstream | Weight | Status |',
  '| --- | ---: | --- |',
  ...rows.map((row) => `| ${row.workstreamId} | ${row.weight}% | ${row.status} |`),
  '',
  report.truthBoundary,
  '',
].join('\n');

mkdirSync(dirname(outputJson), { recursive: true });
mkdirSync(dirname(outputMarkdown), { recursive: true });
writeFileSync(outputJson, JSON.stringify(report, null, 2));
writeFileSync(outputMarkdown, markdown);
console.log(JSON.stringify(report, null, 2));
