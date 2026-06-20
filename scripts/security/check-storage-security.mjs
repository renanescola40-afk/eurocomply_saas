import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const scanRoots = ['src', 'scripts', 'supabase'].filter((path) => existsSync(join(root, path)));
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', 'playwright-report', 'test-results']);
const forceFullScan = process.env.STORAGE_SECURITY_FULL_SCAN === '1';

const sensitiveBuckets = new Set([
  'controlled-documents',
  'audit-evidence-packs',
  'security-questionnaires',
  'vendor-assurance',
  'enterprise-readiness',
  'retention-center',
  'continuity-center',
]);

const serviceRoleEnv = 'SUPABASE_SERVICE_ROLE_KEY';
const publicClientPatterns = [
  /(^|\/)src\/app\/.*\/.*client\.(tsx|ts|jsx|js)$/,
  /(^|\/)src\/components\/.*\.(tsx|ts|jsx|js)$/,
  /(^|\/)src\/lib\/.*client.*\.(tsx|ts|jsx|js)$/,
];

const storagePublicPatterns = [
  /public\s*[:=]\s*true/i,
  /is_public\s*[:=]\s*true/i,
  /createBucket\([^)]*public\s*[:=]\s*true/is,
  /updateBucket\([^)]*public\s*[:=]\s*true/is,
];

const storagePolicyTokens = [
  'storage.objects',
  'bucket_id',
  'auth.uid()',
  'organization_members',
  'organization_id',
  'owner_id',
  'tenant_id',
  'controlled-documents',
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }
    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|sql|md)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function isClientSource(path, source) {
  const firstStatements = source
    .split('\n')
    .slice(0, 8)
    .map((line) => line.trim().replace(/;$/, ''));
  return firstStatements.includes("'use client'") || firstStatements.includes('"use client"') || publicClientPatterns.some((pattern) => pattern.test(path));
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function toGlobalPattern(pattern) {
  return pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
}

function changedFilesForPullRequest() {
  if (forceFullScan || process.env.GITHUB_EVENT_NAME !== 'pull_request') return null;
  try {
    return execSync('git diff --name-only HEAD^ HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function isStorageRelevantChange(path) {
  if (path === 'scripts/security/check-storage-security.mjs') return false;
  if (/^supabase\/migrations\/.*storage/i.test(path)) return true;
  if (/^src\/.*(storage|upload|bucket|file|attachment)/i.test(path)) return true;
  if (/^scripts\/.*(storage|upload|bucket|file|attachment)/i.test(path)) return true;
  return false;
}

const changedFiles = changedFilesForPullRequest();
const storageRelevantChanges = changedFiles?.filter(isStorageRelevantChange) ?? null;
const shouldSkipForScopedPullRequest = Array.isArray(storageRelevantChanges) && storageRelevantChanges.length === 0;
const files = shouldSkipForScopedPullRequest ? [] : scanRoots.flatMap((scanRoot) => walk(join(root, scanRoot)));
const failures = [];
const storagePolicyEvidence = [];

for (const file of files) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');

  if (isClientSource(normalized, source) && source.includes(serviceRoleEnv)) {
    failures.push(`${normalized}: service role key is referenced from client/frontend code`);
  }

  if (/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/i.test(source)) {
    failures.push(`${normalized}: service role must never be exposed through NEXT_PUBLIC_*`);
  }

  for (const bucket of sensitiveBuckets) {
    if (!source.includes(bucket)) continue;

    for (const pattern of storagePublicPatterns) {
      for (const match of source.matchAll(toGlobalPattern(pattern))) {
        failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} sensitive bucket ${bucket} appears to be configured public; keep sensitive storage buckets private`);
      }
    }
  }

  if (storagePolicyTokens.some((token) => source.includes(token))) {
    storagePolicyEvidence.push(normalized);
  }
}

if (!shouldSkipForScopedPullRequest && storagePolicyEvidence.length === 0) {
  failures.push('No storage ownership policy evidence found. Add Supabase storage.objects RLS policies using auth.uid() plus organization/user ownership checks for sensitive buckets.');
}

console.log('EuroComply storage and service-role security check');
console.log('--------------------------------------------------');
if (shouldSkipForScopedPullRequest) {
  console.log('No storage-relevant files changed in this pull request; full storage scan is skipped. Set STORAGE_SECURITY_FULL_SCAN=1 to force the repository-wide scan.');
} else {
  console.log(`Scanned ${files.length} source/migration files.`);
}

if (failures.length > 0) {
  console.error('Storage/service-role failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Storage and service-role security: ok');
}
