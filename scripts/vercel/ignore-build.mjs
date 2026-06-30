#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const IGNORABLE_FILE_NAMES = new Set([
  'README.md',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'agent_log.json',
]);

const IGNORABLE_PREFIXES = [
  'docs/',
  'agent_log.d/',
  'release-validation/',
];

const IGNORABLE_SUFFIXES = [
  '.md',
  '.mdx',
];

function normalizePath(path) {
  return String(path || '')
    .trim()
    .replace(/^\.\//, '')
    .replace(/\\/g, '/');
}

export function isIgnorableVercelBuildPath(path) {
  const normalized = normalizePath(path);
  if (!normalized) return false;

  if (IGNORABLE_FILE_NAMES.has(normalized)) return true;
  if (IGNORABLE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (IGNORABLE_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return true;

  return false;
}

export function shouldIgnoreBuildForChangedFiles(paths) {
  const changed = [...new Set((paths || []).map(normalizePath).filter(Boolean))];

  if (changed.length === 0) {
    return {
      ignore: false,
      reason: 'no changed files detected; fail open and build',
      changed,
      buildRelevant: [],
    };
  }

  const buildRelevant = changed.filter((path) => !isIgnorableVercelBuildPath(path));
  return {
    ignore: buildRelevant.length === 0,
    reason: buildRelevant.length === 0
      ? 'only docs/evidence/log files changed'
      : 'build-relevant files changed',
    changed,
    buildRelevant,
  };
}

function changedFilesFromGit() {
  const refsToTry = [
    ['diff', '--name-only', 'HEAD^', 'HEAD'],
    ['diff', '--name-only', 'HEAD~1', 'HEAD'],
  ];

  for (const args of refsToTry) {
    try {
      const output = execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return output.split('\n').map((line) => line.trim()).filter(Boolean);
    } catch {
      // Try the next ref shape. Vercel checkouts can differ for merge commits.
    }
  }

  return [];
}

export function runVercelIgnoreBuild() {
  const result = shouldIgnoreBuildForChangedFiles(changedFilesFromGit());

  if (result.ignore) {
    console.log(`Vercel build ignored: ${result.reason}.`);
    console.log(`Changed files: ${result.changed.join(', ')}`);
    return 0;
  }

  console.log(`Vercel build required: ${result.reason}.`);
  if (result.buildRelevant.length > 0) {
    console.log(`Build-relevant files: ${result.buildRelevant.join(', ')}`);
  }
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exit(runVercelIgnoreBuild());
}
