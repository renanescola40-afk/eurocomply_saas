#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const evidenceTemplatePath = '.github/ISSUE_TEMPLATE/p0-runtime-evidence.yml';
const allowedStatuses = new Set(['Open', 'Complete', 'Exception']);
const requiredItems = [
  'Branch protection applied on `main`',
  'Required status checks configured',
  'Production provider configuration evidence',
  'Supabase live RLS validation completed',
  'External review',
  'Deterministic npm lockfile committed',
  'Floating dependency specs removed',
];
const requiredTemplateTokens = [
  'P0 Runtime Evidence',
  'Evidence item',
  'Requested register status',
  'Evidence summary',
  'Evidence location',
  'Redaction confirmation',
  'Reviewer / owner',
  'Exception details',
];
const failures = [];

function parseRows(source) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 4 && cells[0] !== 'Evidence item')
    .map(([item, status, evidence, owner]) => ({ item, status, evidence, owner }));
}

if (!existsSync(registerPath)) {
  failures.push(`${registerPath} is missing`);
} else {
  const source = readFileSync(registerPath, 'utf8');
  const rows = parseRows(source);
  const rowByItem = new Map(rows.map((row) => [row.item, row]));

  for (const item of requiredItems) {
    if (!rowByItem.has(item)) failures.push(`${registerPath} missing required evidence item: ${item}`);
  }

  for (const row of rows) {
    if (!allowedStatuses.has(row.status)) failures.push(`${registerPath} invalid status for ${row.item}: ${row.status}`);
    if (!row.evidence || row.evidence.length < 12) failures.push(`${registerPath} missing useful evidence requirement for ${row.item}`);
    if (!row.owner || row.owner.length < 5) failures.push(`${registerPath} missing owner for ${row.item}`);
    if (row.status === 'Complete' && !/(evidence|screenshot|export|output|report|review|commit|settings|artifact|link|json)/i.test(row.evidence)) failures.push(`${registerPath} Complete item must reference reviewable evidence: ${row.item}`);
    if (row.status === 'Exception' && !/(exception|risk|owner|due|expiry|approval)/i.test(row.evidence)) failures.push(`${registerPath} Exception item must reference risk acceptance evidence: ${row.item}`);
  }
}

if (!existsSync(evidenceTemplatePath)) {
  failures.push(`${evidenceTemplatePath} is missing`);
} else {
  const template = readFileSync(evidenceTemplatePath, 'utf8');
  for (const token of requiredTemplateTokens) {
    if (!template.includes(token)) failures.push(`${evidenceTemplatePath} missing required template token: ${token}`);
  }
}

console.log('EuroComply P0 runtime evidence register check');
console.log('------------------------------------------------');

if (failures.length > 0) {
  console.error('P0 runtime evidence register failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('P0 runtime evidence register: ok');
}
