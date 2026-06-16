#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';

const evidenceDir = 'docs/evidence/phase2';
const previewUrl = process.env.PHASE2_PREVIEW_URL;
const productionUrl = process.env.PHASE2_PRODUCTION_URL;
const healthPath = process.env.PHASE2_HEALTH_PATH ?? '/';
const timeoutMs = Number(process.env.PHASE2_SMOKE_TIMEOUT_MS ?? 30000);

function requireUrl(name, value) {
  if (!value) {
    console.error(name + ' is required.');
    process.exit(1);
  }

  try {
    return new URL(value);
  } catch {
    console.error(name + ' must be a valid URL.');
    process.exit(1);
  }
}

function withPath(base, path) {
  const url = new URL(base.toString());
  url.pathname = path.startsWith('/') ? path : '/' + path;
  return url;
}

async function checkUrl(label, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();
  let status = 'failed';
  let statusCode = 'n/a';
  let error = '';

  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
    });
    statusCode = String(response.status);
    status = response.status >= 200 && response.status < 500 ? 'passed' : 'failed';
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timeout);
  }

  const endedAt = new Date().toISOString();
  const exitCode = status === 'passed' ? 0 : 1;
  const log = [
    '# Phase 2 Day 3 smoke: ' + label,
    '',
    '## url',
    url.toString(),
    '',
    '## startedAt: ' + startedAt,
    '## endedAt: ' + endedAt,
    '## statusCode: ' + statusCode,
    '## exitCode: ' + exitCode,
    '',
    '## error',
    error,
    '',
  ].join('\n');

  return { exitCode, log };
}

mkdirSync(evidenceDir, { recursive: true });

const preview = requireUrl('PHASE2_PREVIEW_URL', previewUrl);
const production = requireUrl('PHASE2_PRODUCTION_URL', productionUrl);

const healthChecks = [
  ['preview-health', withPath(preview, healthPath), evidenceDir + '/day3-health-check.log'],
  ['production-smoke', production, evidenceDir + '/day3-smoke-test.log'],
];

for (const [label, url, logPath] of healthChecks) {
  const result = await checkUrl(label, url);
  writeFileSync(logPath, result.log);
  if (result.exitCode !== 0) {
    console.error('Phase 2 Day 3 failed at ' + label + '. See ' + logPath);
    process.exit(result.exitCode);
  }
}

console.log('Phase 2 Day 3 smoke evidence captured.');
