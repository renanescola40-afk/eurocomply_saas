import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['src/app', 'src/components', 'src/hooks', 'src/server', 'src/lib'];
const QUERY_ROOTS = ['src/app', 'src/server', 'src/lib'];
const NEXT_CONFIG = 'next.config.ts';
const SENSITIVE_ROUTE_FILES = [
  'src/app/[locale]/dashboard/organizations/page.tsx',
  'src/app/[locale]/dashboard/organizations/billing/page.tsx',
  'src/app/[locale]/dashboard/organizations/documents/page.tsx',
];

function walk(dir, predicate = () => true) {
  const absolute = join(ROOT, dir);
  if (!existsSync(absolute)) return [];

  const entries = readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(absolute, entry.name);
    const normalized = relative(ROOT, fullPath).split(sep).join('/');

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') return [];
      return walk(normalized, predicate);
    }

    if (!entry.isFile()) return [];
    return predicate(normalized) ? [normalized] : [];
  });
}

function read(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}

function uniq(values) {
  return Array.from(new Set(values));
}

function auditClientComponents() {
  const files = SOURCE_ROOTS.flatMap((root) => walk(root, (path) => /\.(ts|tsx)$/.test(path)));
  const clientFiles = files.filter((path) => /^["']use client["'];?/.test(read(path).trimStart()));
  const clientPages = clientFiles.filter((path) => /src\/app\/.*\/(page|layout)\.tsx$/.test(path));
  const likelyHeavyClientFiles = clientFiles.filter((path) => {
    const source = read(path);
    return /from ['"](?:recharts|framer-motion|react-day-picker|cmdk|embla-carousel-react)['"]/.test(source);
  });

  return { totalSourceFiles: files.length, clientFiles, clientPages, likelyHeavyClientFiles };
}

function auditImageRemotePatterns() {
  if (!existsSync(join(ROOT, NEXT_CONFIG))) {
    return { ok: false, failures: [`${NEXT_CONFIG} not found`] };
  }

  const source = read(NEXT_CONFIG);
  const failures = [];

  if (/hostname\s*:\s*["']\*\*["']/.test(source)) {
    failures.push('next.config images.remotePatterns still allows hostname "**"');
  }

  if (!source.includes('NEXT_IMAGE_REMOTE_HOSTS') || !source.includes('DEFAULT_IMAGE_REMOTE_HOSTS')) {
    failures.push('next.config should use an explicit trusted image host allowlist');
  }

  if (!source.includes('normalizeTrustedImageHostname') || !source.includes("candidate.includes('*')")) {
    failures.push('next.config should reject wildcard image hostnames from environment configuration');
  }

  if (/img-src 'self' data: blob: https:/.test(source)) {
    failures.push('Content-Security-Policy img-src should not allow every HTTPS image host');
  }

  return { ok: failures.length === 0, failures };
}

function auditSensitiveCaching() {
  const failures = [];

  for (const path of SENSITIVE_ROUTE_FILES) {
    if (!existsSync(join(ROOT, path))) {
      failures.push(`${path}: sensitive route file missing`);
      continue;
    }

    const source = read(path);
    if (!source.includes("fetchCache = 'force-no-store'") && !source.includes('fetchCache = "force-no-store"')) {
      failures.push(`${path}: missing force-no-store fetch cache guard`);
    }

    if (!source.includes('noStore()')) {
      failures.push(`${path}: missing noStore() call`);
    }
  }

  return { ok: failures.length === 0, failures };
}

function auditSupabaseQueries() {
  const files = QUERY_ROOTS.flatMap((root) => walk(root, (path) => /\.(ts|tsx)$/.test(path)));
  const selectStar = [];
  const unboundedTenantQueries = [];
  const unpaginatedOrderedQueries = [];

  for (const path of files) {
    const source = read(path);
    if (!source.includes('.from(')) continue;

    if (/\.select\(\s*["']\*["']/.test(source)) {
      selectStar.push(path);
    }

    const queryBlocks = source.split(/\n\s*(?:const|let|return|await|void)\s+/g);
    for (const block of queryBlocks) {
      if (!block.includes('.from(')) continue;
      const normalizedBlock = block.replace(/\s+/g, ' ');
      const tableName = normalizedBlock.match(/\.from\(\s*["']([^"']+)["']/)?.[1] ?? 'unknown';
      const tenantScopedByOrganization = normalizedBlock.includes(".eq('organization_id'") || normalizedBlock.includes('.eq("organization_id"');
      const tenantScopedByUser = tableName === 'organization_members' && (normalizedBlock.includes(".eq('user_id'") || normalizedBlock.includes('.eq("user_id"'));
      const routeOrServerQuery = path.startsWith('src/server/') || path.startsWith('src/app/api/') || path.startsWith('src/lib/');

      if (routeOrServerQuery && !tenantScopedByOrganization && !tenantScopedByUser && !['subscriptions'].includes(tableName)) {
        unboundedTenantQueries.push(`${path} -> ${tableName}`);
      }

      if (normalizedBlock.includes('.order(') && !normalizedBlock.includes('.limit(') && !normalizedBlock.includes('.range(')) {
        unpaginatedOrderedQueries.push(`${path} -> ${tableName}`);
      }
    }
  }

  return {
    selectStar: uniq(selectStar),
    unboundedTenantQueries: uniq(unboundedTenantQueries),
    unpaginatedOrderedQueries: uniq(unpaginatedOrderedQueries),
  };
}

function auditBuildManifest() {
  const candidates = ['.next/build-manifest.json', '.next/app-build-manifest.json'];
  const present = candidates.filter((path) => existsSync(join(ROOT, path)));

  if (present.length === 0) {
    return { available: false, message: 'Run `npm run build` first to include .next manifest size evidence.' };
  }

  const files = [];
  for (const manifestPath of present) {
    const manifest = JSON.parse(read(manifestPath));
    const values = Object.values(manifest.pages ?? manifest.pagesBrowser ?? manifest).flat().filter((value) => typeof value === 'string');
    for (const assetPath of values) {
      const diskPath = join(ROOT, '.next', assetPath.replace(/^\/_next\//, ''));
      if (existsSync(diskPath)) {
        files.push({ assetPath, bytes: statSync(diskPath).size });
      }
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const largest = files.sort((a, b) => b.bytes - a.bytes).slice(0, 10);
  return { available: true, totalBytes, largest };
}

const clientAudit = auditClientComponents();
const imageAudit = auditImageRemotePatterns();
const cacheAudit = auditSensitiveCaching();
const queryAudit = auditSupabaseQueries();
const buildManifest = auditBuildManifest();
const hardFailures = [
  ...imageAudit.failures,
  ...cacheAudit.failures,
  ...queryAudit.selectStar.map((path) => `${path}: avoid select('*') in production queries`),
];

console.log('EuroComply performance audit');
console.log('============================');
console.log(`Source files scanned: ${clientAudit.totalSourceFiles}`);
console.log(`Client boundary files: ${clientAudit.clientFiles.length}`);
console.log(`Client page/layout files: ${clientAudit.clientPages.length}`);
if (clientAudit.clientPages.length > 0) {
  console.log('Client pages/layouts to review:');
  for (const path of clientAudit.clientPages.slice(0, 30)) console.log(`- ${path}`);
}
if (clientAudit.likelyHeavyClientFiles.length > 0) {
  console.log('Heavy client dependency files to review/lazy-load:');
  for (const path of clientAudit.likelyHeavyClientFiles.slice(0, 30)) console.log(`- ${path}`);
}

console.log('\nImage remotePatterns:');
console.log(imageAudit.ok ? '- ok: trusted allowlist detected' : imageAudit.failures.map((failure) => `- ${failure}`).join('\n'));

console.log('\nSensitive route caching:');
console.log(cacheAudit.ok ? '- ok: sensitive routes are force no-store' : cacheAudit.failures.map((failure) => `- ${failure}`).join('\n'));

console.log('\nSupabase query audit:');
console.log(`- select('*') findings: ${queryAudit.selectStar.length}`);
console.log(`- tenant scope review findings: ${queryAudit.unboundedTenantQueries.length}`);
console.log(`- ordered query pagination findings: ${queryAudit.unpaginatedOrderedQueries.length}`);
for (const finding of queryAudit.unpaginatedOrderedQueries.slice(0, 30)) console.log(`  - ${finding}`);

console.log('\nBundle manifest:');
if (buildManifest.available) {
  console.log(`- discovered ${(buildManifest.totalBytes / 1024).toFixed(1)} KiB across manifest assets`);
  for (const file of buildManifest.largest) console.log(`  - ${(file.bytes / 1024).toFixed(1)} KiB ${file.assetPath}`);
} else {
  console.log(`- ${buildManifest.message}`);
}

if (hardFailures.length > 0) {
  console.error('\nPerformance audit hard failures:');
  for (const failure of hardFailures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
