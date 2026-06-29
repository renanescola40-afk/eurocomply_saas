import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

function readRequiredFile(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      walk(path, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(path);
    }
  }

  return acc;
}

function containsAll(source, tokens) {
  return tokens.every((token) => source.includes(token));
}

console.log('EuroComply CSV export security check');
console.log('--------------------------------------');

const csvHelperPath = 'src/lib/exports/csv.ts';
const csvTestPath = 'tests/unit/csv.test.ts';
const packagePath = 'package.json';

const csvSource = readRequiredFile(csvHelperPath);
const testSource = readRequiredFile(csvTestPath);
const packageSource = readRequiredFile(packagePath);

if (!containsAll(csvSource, [
  'CSV_FORMULA_PREFIX_PATTERN',
  'neutralizeCsvFormula',
  'sanitizeCsvFilename',
  'Content-Disposition',
  'Cache-Control',
  'no-store',
  'X-Content-Type-Options',
  'nosniff',
])) {
  failures.push(`${csvHelperPath} must neutralize formulas, sanitize filenames, and set download security headers`);
}

if (!/^[\s\S]*\[=\+\\-@\]/.test(csvSource) && !csvSource.includes('=+\\-@')) {
  failures.push(`${csvHelperPath} must check spreadsheet formula trigger characters`);
}

if (!containsAll(testSource, [
  'neutralizes spreadsheet formulas',
  'sanitizes download filenames',
  'cache and sniffing protections',
  'csvDownloadResponse',
])) {
  failures.push(`${csvTestPath} must cover formula injection, filename sanitization, and response headers`);
}

const reportRoutes = walk('src/app/api/reports').filter((path) => path.endsWith('.csv/route.ts'));
if (reportRoutes.length === 0) {
  failures.push('No CSV report routes found under src/app/api/reports');
}

for (const path of reportRoutes) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes('csvDownloadResponse')) {
    failures.push(`${path} must use csvDownloadResponse instead of building CSV responses manually`);
  }

  if (source.includes('NextResponse.json')) {
    failures.push(`${path} must use noStoreJson for JSON failures instead of NextResponse.json`);
  }

  if (/error\s*:\s*error\.message/.test(source) || source.includes('error.message')) {
    failures.push(`${path} must not expose provider/SQL error.message in responses or logs`);
  }

  if (source.includes('from(') && !source.includes(".eq('organization_id'") && !source.includes('.eq("organization_id"')) {
    failures.push(`${path} must scope Supabase reads by organization_id`);
  }

  if (!source.includes("policy: 'export'")) {
    failures.push(`${path} must use the export rate-limit policy`);
  }
}

for (const path of walk('src')) {
  if (path === csvHelperPath) continue;

  const source = readFileSync(path, 'utf8');
  const buildsCsvResponse = source.includes('text/csv') || path.endsWith('.csv/route.ts');
  if (buildsCsvResponse && path.includes('/api/') && !source.includes('csvDownloadResponse')) {
    failures.push(`${path} builds CSV responses outside the hardened helper`);
  }
}

if (!packageSource.includes('"security:csv-exports"') || !packageSource.includes('security:csv-exports')) {
  failures.push(`${packagePath} must expose security:csv-exports`);
}

const securityCiOrder = /security:csv-exports[\s\S]*security:responses/;
if (!securityCiOrder.test(packageSource)) {
  failures.push('security:ci must run security:csv-exports before response/log/API gates');
}

if (failures.length > 0) {
  console.error('CSV export security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CSV export security: ok');
}
