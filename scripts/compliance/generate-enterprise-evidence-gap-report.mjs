#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const registryPath = path.join('docs', 'compliance', 'evidence', 'enterprise-evidence-closure-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const productRegistry = JSON.parse(fs.readFileSync(path.join('docs', 'compliance', 'eu-ai-act-product-coverage-registry.json'), 'utf8'));
const weights = new Map(productRegistry.workstreams.map((item) => [item.id, item.weight]));

const gaps = registry.requirements
  .filter((item) => !fs.existsSync(item.path))
  .map((item) => ({ ...item, weight: weights.get(item.workstream) ?? 0 }))
  .sort((a, b) => b.weight - a.weight || a.workstream.localeCompare(b.workstream));

const grouped = Object.values(gaps.reduce((acc, gap) => {
  acc[gap.workstream] ??= { workstream: gap.workstream, weight: gap.weight, missing: [] };
  acc[gap.workstream].missing.push({ id: gap.id, kind: gap.kind, path: gap.path });
  return acc;
}, {}));

const report = {
  schema: 'risck-comply.enterprise-evidence-gap-report.v1',
  generatedAt: new Date().toISOString(),
  exactSha: process.env.GITHUB_SHA ?? null,
  totalRequirements: registry.requirements.length,
  missingRequirements: gaps.length,
  affectedWeight: grouped.reduce((sum, item) => sum + item.weight, 0),
  workstreams: grouped,
};

const outputDir = path.join('artifacts', 'enterprise-evidence-closure');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'gap-report.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# Enterprise Evidence Gap Report',
  '',
  `- Exact SHA: \`${report.exactSha ?? 'local'}\``,
  `- Missing requirements: **${report.missingRequirements}/${report.totalRequirements}**`,
  `- Affected product weight: **${report.affectedWeight}/100**`,
  '',
  ...grouped.flatMap((group) => [
    `## ${group.workstream} (${group.weight} points)`,
    '',
    ...group.missing.map((item) => `- [ ] ${item.kind}: \`${item.path}\``),
    '',
  ]),
].join('\n');
fs.writeFileSync(path.join(outputDir, 'gap-report.md'), `${markdown}\n`);
console.log(markdown);
