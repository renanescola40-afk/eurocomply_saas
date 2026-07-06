#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = process.env.RELEASE_DIAGNOSTICS_DIR || 'release-validation/production-diagnostics';
const summaryPath = join(outputDir, 'summary.json');
const markdownPath = join(outputDir, 'summary.md');

const requiredEnv = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    category: 'Supabase runtime',
    why: 'Required for live Supabase-backed runtime and RLS validation.',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    category: 'Supabase runtime',
    why: 'Required for browser/client Supabase flows and live RLS validation.',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    category: 'Supabase runtime',
    why: 'Required only for trusted server-side validation scripts and must never be exposed to the browser.',
    secret: true,
  },
  {
    name: 'PRODUCTION_DEPLOYMENT_URL',
    alternates: ['E2E_PRODUCTION_URL', 'NEXT_PUBLIC_SITE_URL', 'SITE_URL'],
    category: 'Deployment smoke',
    why: 'Required so production smoke tests know which deployment URL to validate.',
  },
  {
    name: 'RELEASE_ROLLBACK_TARGET',
    category: 'Rollback',
    why: 'Required for rollback dry-run. Must be a full 40-character commit SHA for the target rollback commit.',
  },
  {
    name: 'LAST_KNOWN_GOOD_DEPLOYMENT_URL',
    category: 'Rollback',
    why: 'Required to prove the last known good deployment target exists before rollback.',
  },
  {
    name: 'RELEASE_COMMIT_SHA',
    alternates: ['GITHUB_SHA', 'VERCEL_GIT_COMMIT_SHA'],
    category: 'Build metadata',
    why: 'Required to record the last validated commit.',
  },
  {
    name: 'RELEASE_BUILD_SHA',
    alternates: ['NEXT_PUBLIC_BUILD_SHA', 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA'],
    category: 'Build metadata',
    why: 'Required to tie runtime evidence to the build that is being released.',
  },
];

const requiredEvidence = [
  {
    path: 'docs/security/evidence/runtime/deployment-smoke-validation.json',
    category: 'Deployment smoke evidence',
  },
  {
    path: 'docs/security/evidence/runtime/rollback-dry-run-validation.json',
    category: 'Rollback evidence',
  },
  {
    path: 'docs/security/evidence/runtime/supabase-live-rls-validation.json',
    category: 'Supabase RLS runtime evidence',
  },
];

function now() {
  return new Date().toISOString();
}

function readEvidence(path) {
  if (!existsSync(path)) {
    return { path, present: false, status: 'Open', outcome: 'missing', generatedAt: null };
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      path,
      present: true,
      status: parsed.status || 'Open',
      outcome: parsed.outcome || 'unknown',
      generatedAt: parsed.generatedAt || parsed.timestamp || null,
    };
  } catch {
    return { path, present: true, status: 'Open', outcome: 'invalid_json', generatedAt: null };
  }
}

function isPresent(name) {
  return Boolean(String(process.env[name] || '').trim());
}

function envStatus(item) {
  const candidates = [item.name, ...(item.alternates || [])];
  const configuredBy = candidates.find(isPresent) || null;
  const value = configuredBy ? String(process.env[configuredBy] || '').trim() : '';
  const issues = [];

  if (!configuredBy) {
    issues.push('missing');
  }

  if (item.name === 'RELEASE_ROLLBACK_TARGET' && configuredBy && !/^[0-9a-f]{40}$/i.test(value)) {
    issues.push('must_be_full_40_character_commit_sha');
  }

  return {
    name: item.name,
    alternates: item.alternates || [],
    category: item.category,
    configured: Boolean(configuredBy),
    configuredBy,
    valid: issues.length === 0,
    issues,
    why: item.why,
    secret: Boolean(item.secret),
  };
}

mkdirSync(outputDir, { recursive: true });

const generatedAt = now();
const env = requiredEnv.map(envStatus);
const evidence = requiredEvidence.map((item) => ({ ...item, ...readEvidence(item.path) }));

const envFailures = env.filter((item) => !item.valid);
const evidenceFailures = evidence.filter((item) => !(item.present && item.status === 'Complete' && item.outcome === 'passed'));
const overallResult = envFailures.length === 0 && evidenceFailures.length === 0 ? 'ready' : 'blocked';

const summary = {
  generatedAt,
  overallResult,
  releaseGate: overallResult === 'ready'
    ? 'Production release prerequisites appear configured. Run npm run release:production-final to prove the full gate.'
    : 'Production release is blocked. Do not claim 100% production readiness until every missing env/evidence item is resolved and npm run release:production-final passes.',
  env,
  evidence,
  nextActions: [
    'Configure missing production env vars in the deployment provider secret store, not in GitHub files.',
    'Use a full 40-character commit SHA for RELEASE_ROLLBACK_TARGET.',
    'Run live Supabase RLS validation only against the intended production/staging project with approved credentials.',
    'Run npm run release:production-final again after env and runtime evidence are ready.',
  ],
  evidenceIntegrity: {
    containsSensitiveValues: false,
    note: 'This diagnostic records only whether variables are present and valid. It never writes secret values.',
  },
};

writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(markdownPath, [
  '# Production readiness diagnostics',
  '',
  `Generated at: ${generatedAt}`,
  `Overall result: **${overallResult}**`,
  '',
  '## Environment',
  '',
  '| Category | Variable | Configured | Valid | Issues |',
  '| --- | --- | --- | --- | --- |',
  ...env.map((item) => `| ${item.category} | \`${item.name}\` | ${item.configured ? `yes (${item.configuredBy})` : 'no'} | ${item.valid ? 'yes' : 'no'} | ${item.issues.join(', ') || ''} |`),
  '',
  '## Runtime evidence',
  '',
  '| Category | Path | Present | Status | Outcome |',
  '| --- | --- | --- | --- | --- |',
  ...evidence.map((item) => `| ${item.category} | \`${item.path}\` | ${item.present ? 'yes' : 'no'} | ${item.status} | ${item.outcome} |`),
  '',
  '## Next actions',
  '',
  ...summary.nextActions.map((item) => `- ${item}`),
  '',
  'No secret values are written by this diagnostic.',
].join('\n'));

console.log(`Production readiness diagnostics: ${overallResult}`);
console.log(`Summary written to ${summaryPath}`);
console.log(`Markdown written to ${markdownPath}`);

if (overallResult !== 'ready') {
  process.exit(1);
}
