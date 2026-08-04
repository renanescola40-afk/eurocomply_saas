#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { p0RegisterRequiredItems } from './p0-runtime-evidence-catalog.mjs';

const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const evidenceTemplatePath = '.github/ISSUE_TEMPLATE/p0-runtime-evidence.yml';
const requiredItems = p0RegisterRequiredItems;
const requiredPolicyTokens = [
  'Policy metadata only',
  'generate-p0-runtime-evidence-register.mjs',
  'Every row below remains `Open` in version control',
  'Only the generated exact-SHA register',
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
    .map(([item, status, evidence, owner, nextAction = '']) => ({
      item,
      status,
      evidence,
      owner,
      nextAction,
    }));
}

if (!existsSync(registerPath)) {
  failures.push(`${registerPath} is missing`);
} else {
  const source = readFileSync(registerPath, 'utf8');
  const rows = parseRows(source);
  const rowByItem = new Map(rows.map((row) => [row.item, row]));

  for (const token of requiredPolicyTokens) {
    if (!source.includes(token)) failures.push(`${registerPath} missing truth-boundary token: ${token}`);
  }
  if (/Current final decision|Assessment date:/i.test(source)) {
    failures.push(`${registerPath} must not contain a current release decision or dated assessment snapshot`);
  }

  for (const item of requiredItems) {
    if (!rowByItem.has(item)) failures.push(`${registerPath} missing required evidence item: ${item}`);
  }

  for (const row of rows) {
    if (!requiredItems.includes(row.item)) {
      failures.push(`${registerPath} contains an unregistered evidence item: ${row.item}`);
    }
    if (row.status !== 'Open') {
      failures.push(`${registerPath} policy rows must remain fail-closed Open: ${row.item}`);
    }
    if (!row.evidence || row.evidence.length < 20) {
      failures.push(`${registerPath} missing useful evidence requirement for ${row.item}`);
    }
    if (!row.owner || row.owner.length < 5) {
      failures.push(`${registerPath} missing owner for ${row.item}`);
    }
    if (!row.nextAction || row.nextAction.length < 12) {
      failures.push(`${registerPath} missing next action for ${row.item}`);
    }
  }

  if (rows.length !== requiredItems.length) {
    failures.push(`${registerPath} must contain exactly ${requiredItems.length} canonical policy rows; found ${rows.length}`);
  }
}

if (!existsSync(evidenceTemplatePath)) {
  failures.push(`${evidenceTemplatePath} is missing`);
} else {
  const template = readFileSync(evidenceTemplatePath, 'utf8');
  for (const token of requiredTemplateTokens) {
    if (!template.includes(token)) {
      failures.push(`${evidenceTemplatePath} missing required template token: ${token}`);
    }
  }
}

console.log('RISCK COMPLY P0 runtime evidence register policy check');
console.log('-------------------------------------------------------');

if (failures.length > 0) {
  console.error('P0 runtime evidence register policy failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`P0 policy register: ok (${requiredItems.length} canonical fail-closed rows)`);
}
