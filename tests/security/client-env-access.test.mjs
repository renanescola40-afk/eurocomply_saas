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
  ['secret masquerading as public is blocked', 'const key = process.env.NEXT_PUBLIC_' + 'SUPABASE_SERVICE_ROLE_KEY;', 1],
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

function runClientBoundaryScanner(source, { addDirective = true } = {}) {
  const workspace = mkdtempSync(join(tmpdir(), 'risck-sec05-client-'));
  try {
    const fixtureDir = join(workspace, 'src', 'app', 'fixture');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, 'page.tsx'), (addDirective ? "'use client';\n" : '') + source + '\n', 'utf8');
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

test('whole scanner blocks a forbidden env behind twelve leading line comments', () => {
  const header = Array.from({ length: 12 }, (_, i) => `// license line ${i}`).join('\n');
  const result = runClientBoundaryScanner(header + "\n'use client';\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;", { addDirective: false });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /client boundary references process\.env/);
});

test('whole scanner blocks a forbidden env behind a multiline block comment', () => {
  const result = runClientBoundaryScanner('/* large\n * legal notice\n */\n"use client";\nconst key = process.env.STRIPE_SECRET_KEY;', { addDirective: false });
  assert.equal(result.status, 1, result.stdout + result.stderr);
});

test('whole scanner recognizes use client after another directive', () => {
  const result = runClientBoundaryScanner('"use strict";\n"use client";\nconst key = process.env.STRIPE_SECRET_KEY;', { addDirective: false });
  assert.equal(result.status, 1, result.stdout + result.stderr);
});

test('whole scanner does not treat comment-only use client text as a directive', () => {
  const result = runClientBoundaryScanner('// "use client" is only documentation\nconst key = process.env.STRIPE_SECRET_KEY;', { addDirective: false });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

const aliasRegressionCases = [
  ['global process object cannot be aliased', 'const runtime = process; const key = runtime.env.SUPABASE_SERVICE_ROLE_KEY;', 1],
  ['destructuring env from process is blocked', 'const { env } = process; const key = env.STRIPE_SECRET_KEY;', 1],
  ['destructuring renamed env is blocked', 'const { env: secrets } = process; const key = secrets.STRIPE_SECRET_KEY;', 1],
  ['globalThis process property is blocked', 'const key = globalThis.process.env.SUPABASE_SERVICE_ROLE_KEY;', 1],
  ['globalThis string bracket alias is blocked', 'const key = globalThis["process"]["env"].STRIPE_SECRET_KEY;', 1],
  ['globalThis template bracket alias is blocked', 'const key = globalThis[`process`].env.SECRET;', 1],
  ['globalThis process destructuring alias is blocked', 'const { process: runtime } = globalThis; const key = runtime.env.SECRET;', 1],
  ['process in comments is not an executable reference', '// process.env.SUPABASE_SERVICE_ROLE_KEY\nconst x = 1;', 0],
  ['process inside a plain string is not executable', 'const label = "process.env.SUPABASE_SERVICE_ROLE_KEY";', 0],
  ['process as an ordinary domain object property is not global process', 'const record = event.process;', 0],
  ['process as an object literal key is not global process', 'const result = { process: "complete" };', 0],
  ['template literal expression is executable', 'const label = `${process.env.STRIPE_SECRET_KEY}`;', 1],
];
for (const [description, source, expectedCount] of aliasRegressionCases) {
  test(description, () => {
    assert.equal(findUnsafeClientEnvReferences(source).length, expectedCount);
  });
}

test('whole scanner rejects process object alias in a client component', () => {
  const result = runClientBoundaryScanner('const runtime = process; export const key = runtime.env.STRIPE_SECRET_KEY;');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /indirect process alias/);
});

test('whole scanner rejects globalThis bracket process indirection', () => {
  const result = runClientBoundaryScanner('export const key = globalThis["process"]["env"].SUPABASE_SERVICE_ROLE_KEY;');
  assert.equal(result.status, 1, result.stdout + result.stderr);
});

const approvedAnalyticsCases = [
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_POSTHOG_ASSET_HOST',
  'NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT',
  'NEXT_PUBLIC_POSTHOG_SESSION_REPLAY',
];

for (const name of approvedAnalyticsCases) {
  test(`approved public analytics name ${name} remains permitted`, () => {
    assert.deepEqual(findUnsafeClientEnvReferences(`export const value = process.env.${name};`), []);
    assert.equal(findUnsafeClientEnvReferences(`const secret = process.env["${name}"];`).length, 1);
  });
}

test('unapproved analytics-looking variables do not silently become public', () => {
  assert.equal(findUnsafeClientEnvReferences('const secret = process.env.NEXT_PUBLIC_' + 'POSTHOG_PRIVATE_TOKEN;').length, 1);
});
