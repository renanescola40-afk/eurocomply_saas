#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const enforceLiveRls = process.argv.includes('--production') || process.env.RELEASE_TARGET === 'production' || process.env.RELEASE_TARGET === 'enterprise';
const requiredFiles = {
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md': [
    'Release Go/No-Go Checklist',
    'Go',
    'Conditional Go',
    'No-Go',
    'Mandatory Go criteria',
    'Automatic No-Go criteria',
    'Evidence mapping',
    'Enterprise rule',
    'docs/RELEASE_APPROVAL_RECORD.md',
    'docs/RELEASE_EVIDENCE_CHECKLIST.md',
    'Supabase RLS live validation evidence is attached',
  ],
  'docs/RELEASE_CANDIDATE_VALIDATION.md': [
    'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
    'Go/No-Go checklist',
    'Go or explicitly approved Conditional Go',
  ],
  'docs/RELEASE_APPROVAL_LINKAGE.md': [
    'RELEASE_APPROVAL_RECORD.md',
    'RELEASE_EVIDENCE_CHECKLIST.md',
    'RELEASE_CANDIDATE_VALIDATION.md',
  ],
};

const failures = [];

for (const [file, tokens] of Object.entries(requiredFiles)) {
  let content = '';

  try {
    content = readFileSync(file, 'utf8');
  } catch {
    failures.push(`${file} is missing`);
    continue;
  }

  for (const token of tokens) {
    if (!content.includes(token)) {
      failures.push(`${file} is missing required token: ${token}`);
    }
  }
}

if (enforceLiveRls) {
  const gate = 'scripts/security/enforce-supabase-rls-live-complete.mjs';
  if (!existsSync(gate)) {
    failures.push(`${gate} is missing`);
  } else {
    const result = spawnSync(process.execPath, [gate], { stdio: 'inherit' });
    if (result.status !== 0) failures.push(`${gate} failed; production release remains blocked`);
  }
}

if (failures.length > 0) {
  console.error('Release Go/No-Go check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release Go/No-Go check passed.');
