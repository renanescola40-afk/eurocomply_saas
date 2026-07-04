#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const PLAYWRIGHT_BIN = process.platform === 'win32'
  ? join('node_modules', '.bin', 'playwright.cmd')
  : join('node_modules', '.bin', 'playwright');
const PLAYWRIGHT_ARGS = ['test', 'tests/e2e/route-health.spec.ts', '--project=chromium'];

function failMissingPlaywright() {
  console.error([
    'Route health E2E cannot start because Playwright is not installed in node_modules.',
    '',
    'Run the local validation bootstrap first:',
    '  npm ci',
    '  npx playwright install --with-deps chromium',
    '',
    'Then retry:',
    '  npm run quality:routes:e2e',
    '',
    'The production release runner already performs npm ci and Playwright browser installation before E2E checks.',
  ].join('\n'));
  process.exit(1);
}

if (!existsSync(PLAYWRIGHT_BIN)) {
  failMissingPlaywright();
}

function normalizeUrl(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return url.toString().replace(/\/$/, '');
  } catch {
    console.warn(`Ignoring invalid route-health URL: ${trimmed}`);
    return null;
  }
}

function firstUrlFromEnv(keys) {
  for (const key of keys) {
    const url = normalizeUrl(process.env[key]);
    if (url) return { key, url };
  }
  return null;
}

function explicitDeploymentTargets() {
  const raw = process.env.E2E_BASE_URLS ?? '';
  return raw
    .split(',')
    .map((entry) => normalizeUrl(entry))
    .filter(Boolean)
    .map((url, index) => ({ name: `deployment-${index + 1}`, url, source: 'E2E_BASE_URLS' }));
}

const targetCandidates = [
  {
    name: 'preview',
    keys: ['E2E_PREVIEW_URL', 'PREVIEW_DEPLOYMENT_URL', 'VERCEL_BRANCH_URL', 'VERCEL_URL'],
  },
  {
    name: 'production',
    keys: ['E2E_PRODUCTION_URL', 'PRODUCTION_DEPLOYMENT_URL', 'NEXT_PUBLIC_SITE_URL', 'SITE_URL'],
  },
];

const targets = [];

if (process.env.ROUTE_HEALTH_SKIP_LOCAL !== 'true') {
  targets.push({ name: 'local', url: null, source: 'local webServer' });
}

for (const target of targetCandidates) {
  const found = firstUrlFromEnv(target.keys);
  if (found) {
    targets.push({ name: target.name, url: found.url, source: found.key });
  } else {
    console.log(`Route health ${target.name} target skipped: set one of ${target.keys.join(', ')} when that deployment exists.`);
  }
}

targets.push(...explicitDeploymentTargets());

const uniqueTargets = [];
const seen = new Set();
for (const target of targets) {
  const key = `${target.name}:${target.url ?? 'local'}`;
  if (seen.has(key)) continue;
  seen.add(key);
  uniqueTargets.push(target);
}

let failed = false;

for (const target of uniqueTargets) {
  const env = { ...process.env, ROUTE_HEALTH_TARGET: target.name };

  if (target.url) {
    env.E2E_BASE_URL = target.url;
  } else {
    delete env.E2E_BASE_URL;
  }

  console.log(`\n▶ Route health E2E target: ${target.name} (${target.url ?? target.source})`);
  const result = spawnSync(PLAYWRIGHT_BIN, PLAYWRIGHT_ARGS, {
    cwd: process.cwd(),
    env,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Route health E2E target ${target.name} failed to start:`, result.error);
    failed = true;
    continue;
  }

  if (result.status !== 0) {
    console.error(`Route health E2E target ${target.name} failed with status ${result.status}.`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('\nRoute health E2E passed for all configured local, preview and production targets.');
