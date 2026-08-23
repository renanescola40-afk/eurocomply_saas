#!/usr/bin/env node

import { readFileSync, rmSync, writeFileSync } from 'node:fs';

function requireEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

const rawPath = requireEnv('RAW');
const outputPath = requireEnv('OUTPUT');
const sensitiveValues = [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'E2E_FRIA_OWNER_EMAIL',
  'E2E_FRIA_OWNER_PASSWORD',
  'E2E_FRIA_REVIEWER_EMAIL',
  'E2E_FRIA_APPROVER_EMAIL',
  'E2E_FRIA_APPROVER_PASSWORD',
  'E2E_UNLICENSED_OWNER_EMAIL',
  'E2E_UNLICENSED_OWNER_PASSWORD',
].map((key) => process.env[key]).filter(Boolean).sort((a, b) => b.length - a.length);

function sanitize(value) {
  let safe = String(value ?? '');
  for (const secret of sensitiveValues) safe = safe.split(secret).join('[redacted]');
  return safe
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-token]')
    .replace(/([?&](?:access_token|refresh_token|token|code|password)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[redacted-identifier]')
    .replace(/\b(?:access_token|refresh_token|token|password)\s*[:=]\s*[^\s,;]+/gi, '[redacted-secret]')
    .replace(/\b(?:authorization|cookie|set-cookie)\s*[:=]\s*[^\s,;]+/gi, '[redacted-header]');
}

function sanitizeError(error) {
  return {
    message: sanitize(error?.message),
    stack: sanitize(error?.stack),
  };
}

function collectFailures(suites, failures = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          if (result.status === 'passed' || result.status === 'skipped') continue;
          failures.push({
            title: sanitize(spec.title),
            projectName: sanitize(test.projectName),
            status: sanitize(result.status),
            retry: result.retry ?? 0,
            errors: (result.errors ?? []).map(sanitizeError),
          });
        }
      }
    }
    collectFailures(suite.suites, failures);
  }
  return failures;
}

let report = { suites: [], errors: [] };
try {
  report = JSON.parse(readFileSync(rawPath, 'utf8'));
} catch {
  // The health record remains useful if the reporter itself was interrupted.
}

const diagnostics = {
  schema: 'risck-comply.fria-playwright-failure.v2',
  outcome: 'failed',
  targetSha: process.env.EXPECTED_HEAD_SHA ?? null,
  appHealthy: process.env.APP_HEALTHY === 'true',
  authHealthy: process.env.AUTH_HEALTHY === 'true',
  // Playwright reports globalSetup/globalTeardown failures at the report root,
  // not beneath a test result. Preserve only their redacted message/stack so a
  // fail-closed runtime gate remains diagnosable without publishing secrets.
  globalErrors: (report.errors ?? []).slice(0, 5).map(sanitizeError),
  failures: collectFailures(report.suites),
  evidenceIntegrity: {
    credentialsStored: false,
    emailsStored: false,
    tokensStored: false,
    cookiesStored: false,
    rawTraceStored: false,
  },
};

writeFileSync(outputPath, `${JSON.stringify(diagnostics, null, 2)}\n`, { mode: 0o600 });
try { rmSync(rawPath); } catch {}
