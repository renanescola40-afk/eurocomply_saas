#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_PATHS = ['/', '/pricing', '/api/health'];
const DEFAULT_MAX_REQUESTS = 60;
const DEFAULT_CONCURRENCY = 4;
const HARD_MAX_REQUESTS = 500;
const HARD_MAX_CONCURRENCY = 10;
const evidencePath = 'docs/security/evidence/runtime/load-smoke-validation.json';
const UNSAFE_PATH_PATTERN = /[\\\u0000-\u001f\u007f]/;

export function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

export function parseAllowedHosts(value = '') {
  return new Set(
    String(value)
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedTarget(target, {
  allowedHosts = parseAllowedHosts(process.env.LOAD_TEST_ALLOWED_HOSTS),
  allowRemote = process.env.ALLOW_REMOTE_LOAD_TEST === 'true',
} = {}) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
  if (localHosts.has(host)) return true;
  return allowRemote && allowedHosts.has(host);
}

function positiveInteger(value, fallback, hardMaximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, hardMaximum);
}

export function normalizedPaths(value) {
  if (!value) return DEFAULT_PATHS;

  const paths = String(value)
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);

  const unsafePath = paths.find(
    (path) => !path.startsWith('/') || path.startsWith('//') || UNSAFE_PATH_PATTERN.test(path),
  );
  if (unsafePath) {
    throw new Error('LOAD_TEST_PATHS contains an unsafe or off-origin path. Use absolute same-origin paths beginning with a single forward slash.');
  }

  return paths.length > 0 ? [...new Set(paths)] : DEFAULT_PATHS;
}

export function resolveSameOriginTarget(baseUrl, path) {
  const base = baseUrl instanceof URL ? baseUrl : new URL(baseUrl);
  const target = new URL(path, base);

  if (target.origin !== base.origin) {
    throw new Error('LOAD_TEST_PATHS resolved outside LOAD_TEST_BASE_URL origin.');
  }

  return target;
}

async function requestOnce(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'user-agent': 'risck-comply-safe-load-smoke/1.0',
      },
      signal: controller.signal,
    });
    const durationMs = Math.round((performance.now() - started) * 100) / 100;
    await response.body?.cancel().catch(() => undefined);
    return {
      ok: response.status >= 200 && response.status < 500,
      status: response.status,
      durationMs,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
      error: error instanceof Error ? error.name : 'request_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

export async function runLoadSmoke({
  baseUrl,
  paths = DEFAULT_PATHS,
  requests = DEFAULT_MAX_REQUESTS,
  concurrency = DEFAULT_CONCURRENCY,
  timeoutMs = 10_000,
} = {}) {
  if (!baseUrl || !isAllowedTarget(baseUrl)) {
    throw new Error('LOAD_TEST_BASE_URL is missing or not allowlisted. Remote targets require ALLOW_REMOTE_LOAD_TEST=true and LOAD_TEST_ALLOWED_HOSTS.');
  }

  const normalizedBase = new URL(baseUrl);
  const safeRequests = positiveInteger(requests, DEFAULT_MAX_REQUESTS, HARD_MAX_REQUESTS);
  const safeConcurrency = positiveInteger(concurrency, DEFAULT_CONCURRENCY, HARD_MAX_CONCURRENCY);
  const safePaths = normalizedPaths(Array.isArray(paths) ? paths.join(',') : paths);
  const resolvedTargets = safePaths.map((path) => ({
    path,
    url: resolveSameOriginTarget(normalizedBase, path).toString(),
  }));
  const tasks = Array.from({ length: safeRequests }, (_, index) => {
    const target = resolvedTargets[index % resolvedTargets.length];
    return async () => ({
      path: target.path,
      targetHost: normalizedBase.host,
      ...(await requestOnce(target.url, timeoutMs)),
    });
  });

  const startedAt = new Date().toISOString();
  const started = performance.now();
  const results = await runPool(tasks, safeConcurrency);
  const finishedAt = new Date().toISOString();
  const elapsedMs = Math.round((performance.now() - started) * 100) / 100;
  const latencies = results.map((result) => result.durationMs);
  const failed = results.filter((result) => !result.ok);
  const statusCounts = Object.fromEntries(
    [...new Set(results.map((result) => String(result.status ?? result.error ?? 'unknown')))]
      .map((key) => [key, results.filter((result) => String(result.status ?? result.error ?? 'unknown') === key).length]),
  );

  return {
    schema: 'risck-comply.safe-load-smoke.v1',
    evidenceItem: 'load-smoke-validation',
    status: failed.length === 0 ? 'Complete' : 'Open',
    outcome: failed.length === 0 ? 'passed' : 'failed',
    generatedAt: finishedAt,
    startedAt,
    finishedAt,
    target: {
      host: normalizedBase.host,
      protocol: normalizedBase.protocol,
      paths: safePaths,
      rawUrlStored: false,
    },
    configuration: {
      requests: safeRequests,
      concurrency: safeConcurrency,
      timeoutMs,
      hardMaximumRequests: HARD_MAX_REQUESTS,
      hardMaximumConcurrency: HARD_MAX_CONCURRENCY,
    },
    metrics: {
      elapsedMs,
      requestsPerSecond: elapsedMs > 0 ? Math.round((safeRequests / (elapsedMs / 1000)) * 100) / 100 : null,
      successfulRequests: safeRequests - failed.length,
      failedRequests: failed.length,
      errorRate: Math.round((failed.length / safeRequests) * 10_000) / 100,
      latencyMs: {
        min: Math.min(...latencies),
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
        max: Math.max(...latencies),
      },
      statusCounts,
    },
    failures: failed.slice(0, 20).map(({ path, status, durationMs, error }) => ({ path, status, durationMs, error })),
    evidenceIntegrity: {
      containsSensitiveValues: false,
      authorizationHeaderStored: false,
      cookiesStored: false,
      responseBodiesStored: false,
      rawUrlsStored: false,
    },
    releaseGate: failed.length === 0
      ? 'Advisory baseline passed. This does not replace a controlled staging load test or production capacity review.'
      : 'No-Go for the tested target until failed routes are investigated. Do not increase load while errors remain.',
  };
}

async function main() {
  const result = await runLoadSmoke({
    baseUrl: process.env.LOAD_TEST_BASE_URL,
    paths: normalizedPaths(process.env.LOAD_TEST_PATHS),
    requests: process.env.LOAD_TEST_REQUESTS,
    concurrency: process.env.LOAD_TEST_CONCURRENCY,
    timeoutMs: positiveInteger(process.env.LOAD_TEST_TIMEOUT_MS, 10_000, 60_000),
  });

  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Wrote ${evidencePath}: ${result.outcome}`);
  if (result.outcome !== 'passed') process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Load smoke failed.');
    process.exitCode = 1;
  });
}
