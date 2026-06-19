#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const productionTargets = new Set(['production', 'enterprise']);
const nonProductionTargets = new Set(['local', 'development', 'dev', 'preview', 'test']);
const lifecycleEvent = process.env.npm_lifecycle_event ?? '';
const releaseTarget = process.env.RELEASE_TARGET ?? '';
const isPullRequest = process.env.GITHUB_EVENT_NAME === 'pull_request' || process.env.GITHUB_EVENT_NAME === 'pull_request_target';
const isReleaseLifecycle = lifecycleEvent === 'release:readiness' || lifecycleEvent === 'security:release-go-no-go';
const enforceLiveRls = process.argv.includes('--production')
  || productionTargets.has(releaseTarget)
  || (isReleaseLifecycle && !isPullRequest && !nonProductionTargets.has(releaseTarget));

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

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    failures.push(`${file} is missing`);
    return null;
  }
}

function checkRequiredDocs() {
  for (const [file, tokens] of Object.entries(requiredFiles)) {
    const content = readText(file);
    if (!content) continue;

    for (const token of tokens) {
      if (!content.includes(token)) failures.push(`${file} is missing required token: ${token}`);
    }
  }
}

function enforceSupabaseLiveRlsComplete() {
  const gate = 'scripts/security/enforce-supabase-rls-live-complete.mjs';
  if (!existsSync(gate)) {
    failures.push(`${gate} is missing`);
    return;
  }

  const result = spawnSync(process.execPath, [gate], { stdio: 'inherit' });
  if (result.status !== 0) failures.push(`${gate} failed; production release remains blocked`);
}

checkRequiredDocs();
if (enforceLiveRls) enforceSupabaseLiveRlsComplete();

if (failures.length > 0) {
  console.error('Release Go/No-Go check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release Go/No-Go check passed.');
