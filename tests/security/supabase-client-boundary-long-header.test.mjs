import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const scanner = resolve('scripts/security/check-supabase-service-role-boundary.mjs');

function scanFixture(source, filename = 'sample.tsx') {
  const directory = mkdtempSync(join(tmpdir(), 'risck-client-guard-'));
  try {
    mkdirSync(join(directory, 'src'));
    writeFileSync(join(directory, 'src', filename), source, { mode: 0o600 });
    const result = spawnSync(process.execPath, [scanner], {
      cwd: directory, encoding: 'utf8', timeout: 15_000,
      env: { PATH: process.env.PATH ?? '' },
    });
    if (result.error) throw result.error;
    return {
      status: result.status,
      output: [result.stdout, result.stderr].join('\n'),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('long comment header cannot hide a client import of privileged admin', () => {
  const banner = Array.from({ length: 18 }, (_, i) => '// banner ' + i).join('\n');
  const result = scanFixture(banner + "\n'use client';\nimport { createAdminClient } from '@/lib/supabase/admin';\n");
  assert.equal(result.status, 1);
  assert.match(result.output, /client boundary imports or references a Supabase admin/);
});

test('multiline banner, BOM and double-quoted directive still detect a service role secret', () => {
  const result = scanFixture('\uFEFF/*\n' + 'legal notice\n'.repeat(20) +
    '*/\n"use client";\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;\n');
  assert.equal(result.status, 1);
  assert.match(result.output, /client boundary references a Supabase service role secret/);
});

test('standalone commented-out directive is not misclassified as client code', () => {
  const result = scanFixture("// 'use client'\nexport const object = { name: 'safe' };\n");
  assert.equal(result.status, 0);
});

test('use client string following executable import is not a directive', () => {
  const result = scanFixture("import './server-only';\n'use client';\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;\n");
  assert.equal(result.status, 0);
});

test('proper client module with no secrets remains accepted', () => {
  const result = scanFixture("'use client';\nexport const label = 'ok';\n");
  assert.equal(result.status, 0);
});

test('secret-like public environment name is always rejected regardless of client directive', () => {
  const result = scanFixture("export const publicKey = process.env.NEXT_PUBLIC_" + "SUPABASE_SERVICE_ROLE_KEY;\n", 'environment.ts');
  assert.equal(result.status, 1);
  assert.match(result.output, /NEXT_PUBLIC service-role-like variable/);
});

test('client named module still cannot import admin despite no directive', () => {
  const result = scanFixture("import { createAdminClient } from '@/lib/supabase/admin';\n", 'widget-client.tsx');
  assert.equal(result.status, 1);
  assert.match(result.output, /client boundary imports or references a Supabase admin/);
});

test('client directive followed by line comment remains detected', () => {
  const result = scanFixture("'use client' // navigation component\nimport { createAdminClient } from '@/lib/supabase/admin';\n");
  assert.equal(result.status, 1);
  assert.match(result.output, /client boundary imports or references a Supabase admin/);
});

test('client directive followed by block comment remains detected', () => {
  const result = scanFixture('"use client" /* banner */;\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;\n');
  assert.equal(result.status, 1);
  assert.match(result.output, /client boundary references a Supabase service role secret/);
});
