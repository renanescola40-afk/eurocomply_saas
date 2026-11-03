import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findUnsafeClientEnvReferences } from '../../scripts/security/client-env-access.mjs';

const cases = [
  ['static public variable stays permitted', 'const url = process.env.NEXT_PUBLIC_APP_URL;', 0],
  ['approved publishable value stays permitted', 'const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;', 0],
  ['approved PostHog project key stays permitted', 'const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;', 0],
  ['approved PostHog endpoint stays permitted', 'const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;', 0],
  ['approved PostHog asset endpoint stays permitted', 'const host = process.env.NEXT_PUBLIC_POSTHOG_ASSET_HOST;', 0],
  ['approved analytics consent policy stays permitted', 'const consent = process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT;', 0],
  ['approved session replay policy stays permitted', 'const replay = process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY;', 0],
  ['secret masquerading as public is blocked', 'const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;', 1],
  ['unapproved NEXT_PUBLIC name is blocked', 'const key = process.env.NEXT_PUBLIC_CONFIDENTIAL;', 1],
  ['optional public property is blocked', 'const key = process?.env.NEXT_PUBLIC_APP_URL;', 1],
  ['server credential dot access blocked', 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY;', 1],
  ['bracket secret blocked', "const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];", 1],
  ['double-quoted bracket secret blocked', 'const key = process.env["STRIPE_SECRET_KEY"];', 1],
  ['destructuring from env blocked', 'const { SUPABASE_SERVICE_ROLE_KEY } = process.env;', 1],
  ['computed access blocked', 'const key = process.env[name];', 1],
  ['optional computed access blocked', 'const key = process?.env?.[name];', 1],
  ['public bracket access blocked (strict)', "const url = process.env['NEXT_PUBLIC_APP_URL'];", 1],
  ['bracket env alias blocked', 'const key = process["env"].SUPABASE_SERVICE_ROLE_KEY;', 1],
  ['optional bracket env alias blocked', 'const key = process?.["env"].SUPABASE_SERVICE_ROLE_KEY;', 1],
  ['harmless source without env access allowed', 'export const answer = 42;', 0],
  ['multiple unsafe accesses all captured', 'const x = process.env.FOO + process.env["BAR"];', 2],
];

for (const [description, source, expectedCount] of cases) {
  test(description, () => {
    assert.equal(findUnsafeClientEnvReferences(source).length, expectedCount);
  });
}

const scannerPath = fileURLToPath(new URL('../../scripts/security/check-client-boundaries.mjs', import.meta.url));

function runClientBoundaryScanner(source) {
  const workspace = mkdtempSync(join(tmpdir(), 'risck-sec05-client-'));
  try {
    const fixtureDir = join(workspace, 'src', 'app', 'fixture');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, 'page.tsx'), "'use client';\n" + source + '\n', 'utf8');
    return spawnSync(process.execPath, [scannerPath], {
      cwd: workspace,
      encoding: 'utf8',
      env: { ...process.env, STRICT_CLIENT_BOUNDARY_SCAN: '' },
    });
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

test('whole scanner fails closed on bracket credential access without strict env flag', () => {
  const result = runClientBoundaryScanner("export const credential = process.env['SUPABASE_SERVICE_ROLE_KEY'];");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /client boundary references process\.env/);
});

test('whole scanner allows a direct public variable', () => {
  const result = runClientBoundaryScanner('export const endpoint = process.env.NEXT_PUBLIC_APP_URL;');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('whole scanner rejects unapproved public variable by default', () => {
  const result = runClientBoundaryScanner('export const credential = process.env.NEXT_PUBLIC_CONFIDENTIAL;');
  assert.equal(result.status, 1, result.stdout + result.stderr);
});
