import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('access export download evidence is append-only and service-role only', () => {
  const migration = read('supabase/migrations/20260728100000_enterprise_access_export_download_audit.sql');
  assert.match(migration, /enterprise_access_export_download_events/);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /deny_delete/);
  assert.match(migration, /grant execute [\s\S]* service_role/i);
  assert.match(migration, /export_job_id uuid.*on delete cascade/i);
  assert.match(migration, /grant select .* service_role/i);
  assert.doesNotMatch(migration, /grant all on public\.enterprise_access_export_download_events/i);
  assert.match(migration, /download_count = download_count \+ 1/);
});

test('signed downloads enforce tenant storage paths and integrity metadata', () => {
  const service = read('src/server/enterprise/access-export-downloads.ts');
  assert.match(service, /SHA256_PATTERN/);
  assert.match(service, /expectedPrefix = `\$\{organizationId\}\//);
  assert.match(service, /object_key\.includes\('\.\.'\)/);
  assert.match(service, /createSignedUrl/);
  assert.match(service, /SIGNED_URL_SECONDS = 120/);
  assert.match(service, /Math\.min\(SIGNED_URL_SECONDS, remainingSeconds\)/);
  assert.match(service, /remainingSeconds < 30/);
  assert.match(service, /new ApiSecurityError/);
  assert.match(service, /status: rateLimit\.reason \? 503 : 429/);
  assert.match(service, /failureMode: 'fail-closed'/);
});

test('download issuance uses the existing inventoried access-runtime route', () => {
  const route = read('src/app/api/team/access-runtime/route.ts');
  assert.match(route, /operation === 'download'/);
  assert.match(route, /requireTrustedMutation/);
  assert.match(route, /requireStepUpForRequest/);
  assert.match(route, /createAccessExportSignedDownload/);
  assert.match(route, /Referrer-Policy/);
  assert.doesNotMatch(route, /organizationId:\s*parsed\.data/);
});

test('access console exposes completed export downloads through step-up', () => {
  const console = read('src/components/team/enterprise-access-console.tsx');
  assert.match(console, /\{ kind: 'download'; jobId: string \}/);
  assert.match(console, /\{ operation: 'download', jobId: mutation\.jobId \}/);
  assert.match(console, /setPendingMutation\(\{ kind: 'download', jobId: job\.id \}\)/);
  assert.match(console, /rel = 'noopener noreferrer'/);
  assert.match(console, /job\.status !== 'completed' \|\| !job\.expires_at/);
});
