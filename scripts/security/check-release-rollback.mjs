#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const doc = (name) => `docs/${name}.md`;
const ownerEnv = ['RELEASE', 'ROLLBACK', 'OWNER'].join('_');
const placeholder = /^(?:tbd|todo|n\/a|none|placeholder)$/i;
const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing required rollback release artifact`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function requireText(path, content, tokens) {
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${path}: missing token ${JSON.stringify(token)}`);
  }
}

function valueAfterLabel(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^-\\s*${escaped}:\\s*(?<value>.+)$`, 'im'));
  const value = match?.groups?.value?.trim() ?? '';
  return value && !placeholder.test(value) ? value : '';
}

const rollback = read(doc('RELEASE_ROLLBACK_PLAN'));
const candidate = read(doc('RELEASE_CANDIDATE_VALIDATION'));
const evidence = read(doc('RELEASE_EVIDENCE_CHECKLIST'));
const approval = read(doc('RELEASE_APPROVAL_RECORD'));
const goNoGo = read(doc('RELEASE_GO_NO_GO_CHECKLIST'));

requireText(doc('RELEASE_ROLLBACK_PLAN'), rollback, [
  'Release Rollback Plan',
  'previous known-good commit SHA',
  'rollback ownership',
  'Application rollback',
  'Database rollback',
  'Configuration rollback',
  'Post-rollback validation',
]);
requireText(doc('RELEASE_CANDIDATE_VALIDATION'), candidate, ['release candidate']);
requireText(doc('RELEASE_EVIDENCE_CHECKLIST'), evidence, ['rollback', 'Release decision']);
requireText(doc('RELEASE_GO_NO_GO_CHECKLIST'), goNoGo, ['rollback', 'No-Go']);
requireText(doc('RELEASE_APPROVAL_RECORD'), approval, ['Rollback owner:', 'Final sign-off']);

const owner = process.env[ownerEnv]?.trim() ?? valueAfterLabel(approval, 'Rollback owner');
if (!owner) failures.push(`Release rollback readiness requires Rollback owner. Set ${ownerEnv} or fill Rollback owner in the approval record.`);

if (failures.length > 0) {
  console.error('Release rollback readiness failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release rollback readiness: ok');
