#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const indexPath = path.join('docs', 'security', 'evidence', 'p1', 'P1_EVIDENCE_INDEX.json');
const outputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'P1_PROGRESS.md');

function fail(message) {
  console.error(`[p1-progress] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail(`index not found: ${indexPath}`);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
if (!Array.isArray(index.controls)) {
  fail('index.controls must be an array');
}

const total = index.controls.length;
const complete = index.controls.filter((control) => control.status === 'Complete').length;
const percent = total === 0 ? 0 : Math.round((complete / total) * 100);

const lines = [
  '# P1 Enterprise Security Progress',
  '',
  `Generated from: \`${indexPath}\``,
  '',
  `Progress: **${complete}/${total} = ${percent}%**`,
  '',
  '| Control | Name | Status | Evidence |',
  '|---|---|---|---|',
];

for (const control of index.controls) {
  const statusIcon = control.status === 'Complete' ? '✅' : control.status === 'Exception' ? '⚠️' : '❌';
  const name = control.name || control.control || '';
  lines.push(`| ${control.controlId} | ${name} | ${statusIcon} ${control.status} | \`${control.evidencePath}\` |`);
}

lines.push('', 'This dashboard is generated from the P1 evidence index. It does not create evidence and does not mark controls complete.');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
console.log(`[p1-progress] wrote ${outputPath}`);
